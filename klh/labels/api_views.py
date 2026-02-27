"""
REST-style JSON API views for the React frontend.
JWT-based authentication. No DRF dependency.
"""
import csv
import io
import json
import datetime
import jwt
import logging

from django.conf import settings
from django.http import JsonResponse, HttpResponse, FileResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from functools import wraps

from .models import (
    Recipe, RecipeIngredient, Ingredient, IngredientNutrient,
    GeneratedLabel, Nutrient, NutrientCategory, IngredientCategory,
    RecipeVersion, UserDefaults,
)
from .fssai_compliance import FSSAIComplianceChecker
from .label_generator import NutritionLabelPDF, generate_label_html, get_hindi_name
from .parser import RecipeParser, match_ingredient_to_db
from .allergen_detector import detect_allergens, detect_allergens_enhanced, detect_allergens_from_recipe

logger = logging.getLogger(__name__)

# In-memory token blacklist (revoked tokens)
_revoked_tokens = set()

# Simple in-memory rate limiter for auth endpoints
_rate_limit_store = {}  # ip -> [timestamp, ...]
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX = 10     # max attempts per window


def _check_rate_limit(request):
    """Return True if rate-limited, False if allowed."""
    ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))
    if ',' in ip:
        ip = ip.split(',')[0].strip()
    now = datetime.datetime.now(datetime.timezone.utc).timestamp()
    attempts = _rate_limit_store.get(ip, [])
    # Prune old entries
    attempts = [t for t in attempts if now - t < RATE_LIMIT_WINDOW]
    if not attempts:
        _rate_limit_store.pop(ip, None)
        return False
    if len(attempts) >= RATE_LIMIT_MAX:
        _rate_limit_store[ip] = attempts
        return True
    attempts.append(now)
    _rate_limit_store[ip] = attempts
    return False


# ── JWT helpers ─────────────────────────────────────────────────────
def _generate_jwt(user):
    """Create a JWT token for the given user."""
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        'user_id': user.id,
        'username': user.username,
        'exp': now + datetime.timedelta(
            hours=getattr(settings, 'JWT_EXPIRATION_HOURS', 24)
        ),
        'iat': now,
    }
    return jwt.encode(
        payload,
        getattr(settings, 'JWT_SECRET', settings.SECRET_KEY),
        algorithm=getattr(settings, 'JWT_ALGORITHM', 'HS256'),
    )


def _decode_jwt(token):
    """Decode and validate a JWT token. Returns payload or None."""
    if token in _revoked_tokens:
        return None
    try:
        return jwt.decode(
            token,
            getattr(settings, 'JWT_SECRET', settings.SECRET_KEY),
            algorithms=[getattr(settings, 'JWT_ALGORITHM', 'HS256')],
        )
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def jwt_required(view_func):
    """Decorator that enforces JWT auth on a view."""
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        auth = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth.startswith('Bearer '):
            return JsonResponse({'error': 'Authentication required'}, status=401)
        payload = _decode_jwt(auth[7:])
        if payload is None:
            return JsonResponse({'error': 'Invalid or expired token'}, status=401)
        try:
            request.jwt_user = User.objects.get(id=payload['user_id'])
        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found'}, status=401)
        return view_func(request, *args, **kwargs)
    return wrapper


# ── helpers ─────────────────────────────────────────────────────────
def _json_body(request):
    """Parse JSON body from request."""
    try:
        return json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return {}


def _recipe_to_dict(recipe, include_nutrition=False):
    """Serialize a Recipe to a plain dict."""
    data = {
        'id': recipe.id,
        'name': recipe.name,
        'description': recipe.description,
        'serving_size': recipe.serving_size,
        'serving_unit': recipe.serving_unit,
        'servings_per_pack': recipe.servings_per_pack,
        'brand_name': recipe.brand_name,
        'manufacturer': recipe.manufacturer,
        'fssai_license': recipe.fssai_license,
        'allergen_info': recipe.allergen_info,
        'created_at': recipe.created_at.isoformat() if recipe.created_at else None,
        'updated_at': recipe.updated_at.isoformat() if recipe.updated_at else None,
        'total_weight': recipe.total_weight,
        'ingredients': [
            {
                'id': ri.id,
                'ingredient_id': ri.ingredient_id,
                'ingredient_name': ri.ingredient.name,
                'weight_grams': ri.weight_grams,
            }
            for ri in recipe.ingredients.select_related('ingredient').all()
        ],
    }
    if include_nutrition:
        data['nutrition'] = _nutrition_list(recipe)
    return data


def _nutrition_list(recipe):
    """Build a JSON-safe sorted nutrition list for a recipe."""
    nutrition_data = recipe.calculate_nutrition()
    result = []
    for nid, d in nutrition_data.items():
        n = d['nutrient']
        result.append({
            'nutrient_id': n.id,
            'name': n.name,
            'name_hindi': get_hindi_name(n.name),
            'unit': n.unit,
            'category': n.category.name if n.category else '',
            'category_order': n.category.display_order if n.category else 99,
            'display_order': n.display_order,
            'total_value': d['total_value'],
            'per_serving': d['per_serving'],
            'per_100g': d['per_100g'],
            'percent_dv': d['percent_dv'],
            'is_mandatory': n.is_mandatory,
        })
    result.sort(key=lambda x: (x['category_order'], x['display_order']))
    return result


def _user_dict(user):
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
    }


# ── Auth (JWT) ──────────────────────────────────────────────────────
@csrf_exempt
@require_http_methods(["POST"])
def api_login(request):
    if _check_rate_limit(request):
        return JsonResponse({'error': 'Too many attempts. Please try again later.'}, status=429)
    body = _json_body(request)
    username = body.get('username', '').strip()
    password = body.get('password', '')
    if not username or not password:
        return JsonResponse({'error': 'Username and password are required'}, status=400)
    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse({'error': 'Invalid credentials'}, status=401)
    token = _generate_jwt(user)
    return JsonResponse({'success': True, 'user': _user_dict(user), 'token': token})


@csrf_exempt
@require_http_methods(["POST"])
def api_register(request):
    if _check_rate_limit(request):
        return JsonResponse({'error': 'Too many attempts. Please try again later.'}, status=429)
    body = _json_body(request)
    username = body.get('username', '').strip()
    email = body.get('email', '').strip()
    password = body.get('password', '')
    first_name = body.get('first_name', '').strip()
    last_name = body.get('last_name', '').strip()

    if not username or not password:
        return JsonResponse({'error': 'Username and password are required'}, status=400)
    if len(password) < 6:
        return JsonResponse({'error': 'Password must be at least 6 characters'}, status=400)
    if User.objects.filter(username=username).exists():
        return JsonResponse({'error': 'Username already taken'}, status=400)
    if email and User.objects.filter(email=email).exists():
        return JsonResponse({'error': 'Email already registered'}, status=400)

    user = User.objects.create_user(
        username=username, email=email, password=password,
        first_name=first_name, last_name=last_name,
    )
    token = _generate_jwt(user)
    return JsonResponse({'success': True, 'user': _user_dict(user), 'token': token}, status=201)


@csrf_exempt
@require_http_methods(["POST"])
def api_logout(request):
    """Revoke the current JWT token."""
    auth = request.META.get('HTTP_AUTHORIZATION', '')
    if auth.startswith('Bearer '):
        _revoked_tokens.add(auth[7:])
    return JsonResponse({'success': True})


@csrf_exempt
@require_http_methods(["POST"])
@jwt_required
def api_token_refresh(request):
    """Issue a fresh JWT token and revoke the old one."""
    old_token = request.META.get('HTTP_AUTHORIZATION', '')[7:]
    new_token = _generate_jwt(request.jwt_user)
    _revoked_tokens.add(old_token)
    return JsonResponse({'success': True, 'token': new_token})


@csrf_exempt
@jwt_required
def api_profile(request):
    return JsonResponse(_user_dict(request.jwt_user))


# ── Dashboard ───────────────────────────────────────────────────────
@csrf_exempt
@jwt_required
def api_dashboard(request):
    user = request.jwt_user
    total_recipes = Recipe.objects.filter(user=user).count()
    total_ingredients = Ingredient.objects.count()
    total_labels = GeneratedLabel.objects.filter(recipe__user=user).count()
    compliant = GeneratedLabel.objects.filter(recipe__user=user, is_fssai_compliant=True).count()
    compliance_pct = round((compliant / total_labels * 100) if total_labels > 0 else 0)

    # Per-recipe compliance breakdown for the dashboard overview
    recipes_qs = Recipe.objects.filter(user=user).prefetch_related(
        'ingredients__ingredient__nutrients__nutrient'
    ).order_by('-created_at')

    issues_count = 0
    warnings_count = 0
    fop_high_count = 0
    allergen_missing = 0
    for r in recipes_qs:
        try:
            nd = r.calculate_nutrition()
            if nd:
                chk = FSSAIComplianceChecker(r, nd)
                chk.check_all()
                issues_count += len(chk.issues)
                warnings_count += len(chk.warnings)
                fop = chk.get_fop_indicators()
                if any(f['level'] == 'HIGH' for f in fop):
                    fop_high_count += 1
                if not r.allergen_info:
                    allergen_missing += 1
        except Exception:
            pass

    recent_recipes = recipes_qs.annotate(
        ingredient_count=Count('ingredients')
    )[:5]

    return JsonResponse({
        'stats': {
            'total_recipes': total_recipes,
            'total_ingredients': total_ingredients,
            'total_labels': total_labels,
            'compliance_pct': compliance_pct,
        },
        'compliance_breakdown': {
            'mandatory_nutrients': 'Passed' if issues_count == 0 else f'{issues_count} issue(s)',
            'mandatory_status': 'success' if issues_count == 0 else 'error',
            'serving_declaration': 'Passed',
            'serving_status': 'success',
            'fop_indicators': 'Passed' if fop_high_count == 0 else f'{fop_high_count} recipe(s) HIGH',
            'fop_status': 'success' if fop_high_count == 0 else 'warning',
            'allergen_info': 'Passed' if allergen_missing == 0 else f'{allergen_missing} missing',
            'allergen_status': 'success' if allergen_missing == 0 else 'warning',
        },
        'recent_recipes': [
            {
                'id': r.id,
                'name': r.name,
                'brand_name': r.brand_name,
                'ingredient_count': r.ingredient_count,
                'created_at': r.created_at.isoformat(),
            }
            for r in recent_recipes
        ],
    })


# ── Recipes ─────────────────────────────────────────────────────────
@csrf_exempt
@jwt_required
def api_recipe_list(request):
    query = request.GET.get('q', '')
    recipes = Recipe.objects.filter(user=request.jwt_user).annotate(ingredient_count=Count('ingredients'))
    if query:
        recipes = recipes.filter(
            Q(name__icontains=query) | Q(brand_name__icontains=query)
        )
    recipes = recipes.order_by('-created_at')
    items = []
    for r in recipes:
        # Compute compliance status per recipe
        compliance = 'pending'
        try:
            nutrition_data = r.calculate_nutrition()
            if nutrition_data:
                chk = FSSAIComplianceChecker(r, nutrition_data)
                is_ok, _ = chk.check_all()
                compliance = 'compliant' if is_ok else 'non-compliant'
        except Exception:
            pass

        items.append({
            'id': r.id,
            'name': r.name,
            'brand_name': r.brand_name,
            'description': r.description,
            'ingredient_count': r.ingredient_count,
            'serving_size': r.serving_size,
            'serving_unit': r.serving_unit,
            'manufacturer': r.manufacturer,
            'allergen_info': r.allergen_info,
            'compliance': compliance,
            'created_at': r.created_at.isoformat(),
        })
    return JsonResponse({'recipes': items})


@csrf_exempt
@require_http_methods(["POST"])
@jwt_required
def api_recipe_create(request):
    body = _json_body(request)
    name = body.get('name', '').strip()
    if not name:
        return JsonResponse({'error': 'Recipe name is required'}, status=400)

    try:
        serving_sz = float(body.get('serving_size', 100))
        servings_pp = float(body.get('servings_per_pack', 1))
    except (ValueError, TypeError):
        return JsonResponse({'error': 'serving_size and servings_per_pack must be numbers'}, status=400)

    recipe = Recipe.objects.create(
        user=request.jwt_user,
        name=name,
        description=body.get('description', ''),
        serving_size=serving_sz,
        serving_unit=body.get('serving_unit', 'g'),
        servings_per_pack=servings_pp,
        brand_name=body.get('brand_name', ''),
        manufacturer=body.get('manufacturer', ''),
        fssai_license=body.get('fssai_license', ''),
        allergen_info=body.get('allergen_info', ''),
    )
    ingredients_added = 0
    for item in body.get('ingredients', []):
        try:
            ing_id = item.get('ingredient_id')
            if ing_id:
                ing = Ingredient.objects.get(id=int(ing_id))
            else:
                ing_name = item.get('ingredient_name', item.get('name', ''))
                matched, _ = match_ingredient_to_db(ing_name)
                if not matched:
                    continue
                ing = matched
            weight = float(item.get('weight_grams', 0))
            if weight <= 0:
                continue
            RecipeIngredient.objects.create(recipe=recipe, ingredient=ing, weight_grams=weight)
            ingredients_added += 1
        except (Ingredient.DoesNotExist, KeyError, ValueError, TypeError):
            continue

    return JsonResponse(_recipe_to_dict(recipe, include_nutrition=True), status=201)


@csrf_exempt
@jwt_required
def api_recipe_detail(request, pk):
    recipe = get_object_or_404(Recipe, pk=pk, user=request.jwt_user)
    return JsonResponse(_recipe_to_dict(recipe, include_nutrition=True))


@csrf_exempt
@jwt_required
def api_recipe_delete(request, pk):
    if request.method != 'DELETE':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    recipe = get_object_or_404(Recipe, pk=pk, user=request.jwt_user)
    name = recipe.name
    recipe.delete()
    return JsonResponse({'success': True, 'message': f'Recipe "{name}" deleted'})


@csrf_exempt
@require_http_methods(["PATCH", "PUT"])
@jwt_required
def api_recipe_update(request, pk):
    """Update an existing recipe (metadata and/or ingredients)."""
    recipe = get_object_or_404(Recipe, pk=pk, user=request.jwt_user)
    body = _json_body(request)

    # Update scalar fields if provided
    for field in ('name', 'description', 'serving_unit', 'brand_name',
                  'manufacturer', 'fssai_license', 'allergen_info'):
        if field in body:
            setattr(recipe, field, body[field])

    if 'serving_size' in body:
        try:
            recipe.serving_size = float(body['serving_size'])
        except (ValueError, TypeError):
            return JsonResponse({'error': 'serving_size must be a number'}, status=400)

    if 'servings_per_pack' in body:
        try:
            recipe.servings_per_pack = float(body['servings_per_pack'])
        except (ValueError, TypeError):
            return JsonResponse({'error': 'servings_per_pack must be a number'}, status=400)

    recipe.save()

    # Replace ingredients if provided
    if 'ingredients' in body:
        recipe.ingredients.all().delete()
        for item in body['ingredients']:
            try:
                ing_id = item.get('ingredient_id')
                if ing_id:
                    ing = Ingredient.objects.get(id=int(ing_id))
                else:
                    ing_name = item.get('ingredient_name', item.get('name', ''))
                    matched, _ = match_ingredient_to_db(ing_name)
                    if not matched:
                        continue
                    ing = matched
                weight = float(item.get('weight_grams', 0))
                if weight <= 0:
                    continue
                RecipeIngredient.objects.create(recipe=recipe, ingredient=ing, weight_grams=weight)
            except (Ingredient.DoesNotExist, KeyError, ValueError, TypeError):
                continue

    return JsonResponse(_recipe_to_dict(recipe, include_nutrition=True))


@csrf_exempt
@require_http_methods(["POST"])
@jwt_required
def api_recipe_parse(request):
    """Parse free-text recipe via Mistral AI/regex and return matched ingredients."""
    body = _json_body(request)
    text = body.get('recipe_text', '')
    if not text:
        return JsonResponse({'error': 'recipe_text is required'}, status=400)

    parser = RecipeParser()
    parsed = parser.parse_text(text)

    matched, unmatched = [], []
    for item in parsed:
        ing, confidence = match_ingredient_to_db(item['name'])
        if ing:
            matched.append({
                'parsed_name': item['name'],
                'ingredient_id': ing.id,
                'ingredient_name': ing.name,
                'weight_grams': item['weight_grams'],
                'confidence': confidence,
            })
        else:
            unmatched.append(item)

    return JsonResponse({'matched': matched, 'unmatched': unmatched})


# ── Analysis ────────────────────────────────────────────────────────
@csrf_exempt
@jwt_required
def api_recipe_analyze(request, pk):
    """Full nutrition analysis for a recipe."""
    recipe = get_object_or_404(Recipe, pk=pk, user=request.jwt_user)
    nutrition_data = recipe.calculate_nutrition()
    checker = FSSAIComplianceChecker(recipe, nutrition_data)
    fop_indicators = checker.get_fop_indicators()
    nutrients = _nutrition_list(recipe)

    return JsonResponse({
        'recipe': _recipe_to_dict(recipe),
        'nutrition': nutrients,
        'fop_indicators': fop_indicators,
    })


# ── Compliance ──────────────────────────────────────────────────────
@csrf_exempt
@jwt_required
def api_recipe_compliance(request, pk):
    """FSSAI compliance check for a recipe, with AI-powered recommendations."""
    recipe = get_object_or_404(Recipe, pk=pk, user=request.jwt_user)
    nutrition_data = recipe.calculate_nutrition()
    checker = FSSAIComplianceChecker(recipe, nutrition_data)
    is_compliant, compliance_notes = checker.check_all()
    fop_indicators = checker.get_fop_indicators()

    # AI-powered recommendations (non-blocking — returns empty on failure)
    ai_recs = checker.get_ai_recommendations()

    return JsonResponse({
        'recipe_id': recipe.id,
        'recipe_name': recipe.name,
        'is_compliant': is_compliant,
        'compliance_notes': compliance_notes,
        'issues': checker.issues,
        'warnings': checker.warnings,
        'info': checker.info,
        'fop_indicators': fop_indicators,
        'ai_recommendations': ai_recs.get('recommendations', []),
        'ai_summary': ai_recs.get('summary', ''),
        'ai_powered': ai_recs.get('ai_powered', False),
    })


# ── Label ───────────────────────────────────────────────────────────
@csrf_exempt
@jwt_required
def api_recipe_label(request, pk):
    """Generate label data (HTML) for preview."""
    recipe = get_object_or_404(Recipe, pk=pk, user=request.jwt_user)
    nutrition_data = recipe.calculate_nutrition()
    checker = FSSAIComplianceChecker(recipe, nutrition_data)
    is_compliant, compliance_notes = checker.check_all()
    fop_indicators = checker.get_fop_indicators()
    label_html = generate_label_html(recipe, nutrition_data, fop_indicators)
    nutrients = _nutrition_list(recipe)

    return JsonResponse({
        'recipe': _recipe_to_dict(recipe),
        'label_html': label_html,
        'nutrition': nutrients,
        'is_compliant': is_compliant,
        'compliance_notes': compliance_notes,
        'fop_indicators': fop_indicators,
        'ingredient_list': recipe.get_ingredient_list_string(),
    })


# ── Export (PDF, JSON, CSV, HTML) ───────────────────────────────────
@csrf_exempt
@require_http_methods(["POST"])
@jwt_required
def api_recipe_export(request, pk):
    """Generate and save label, return download URL."""
    recipe = get_object_or_404(Recipe, pk=pk, user=request.jwt_user)
    body = _json_body(request)
    fmt = body.get('format', 'pdf')

    if fmt not in ('pdf', 'json', 'csv', 'html'):
        return JsonResponse({'error': f'Unsupported format: {fmt}'}, status=400)

    nutrition_data = recipe.calculate_nutrition()
    checker = FSSAIComplianceChecker(recipe, nutrition_data)
    is_compliant, compliance_notes = checker.check_all()
    fop_indicators = checker.get_fop_indicators()

    nutrition_snapshot = {}
    for nid, data in nutrition_data.items():
        nutrition_snapshot[str(nid)] = {
            'name': data['nutrient'].name,
            'unit': data['nutrient'].unit,
            'per_serving': data['per_serving'],
            'per_100g': data['per_100g'],
            'percent_dv': data['percent_dv'],
        }

    label = GeneratedLabel.objects.create(
        recipe=recipe, format=fmt, file_path='',
        nutrition_data=nutrition_snapshot,
        is_fssai_compliant=is_compliant, compliance_notes=compliance_notes,
    )

    if fmt == 'pdf':
        pdf_gen = NutritionLabelPDF(
            recipe, nutrition_data, (is_compliant, compliance_notes), fop_indicators
        )
        filepath = pdf_gen.generate()
        label.file_path = filepath
        label.save()

    return JsonResponse({
        'success': True,
        'label_id': label.id,
        'format': fmt,
        'download_url': f'/api/recipes/{pk}/export/download/?format={fmt}&label_id={label.id}',
        'is_compliant': is_compliant,
    })


@csrf_exempt
@jwt_required
def api_recipe_export_download(request, pk):
    """Download label in the requested format (PDF, JSON, CSV, HTML)."""
    recipe = get_object_or_404(Recipe, pk=pk, user=request.jwt_user)
    fmt = request.GET.get('format', 'pdf')
    label_id = request.GET.get('label_id')

    if label_id:
        label = get_object_or_404(GeneratedLabel, pk=label_id, recipe=recipe)
    else:
        label = recipe.labels.order_by('-created_at').first()

    if not label:
        return JsonResponse({'error': 'No label generated yet'}, status=404)

    nutrition_data = recipe.calculate_nutrition()
    checker = FSSAIComplianceChecker(recipe, nutrition_data)
    is_compliant, compliance_notes = checker.check_all()
    fop_indicators = checker.get_fop_indicators()
    safe_name = recipe.name.replace(' ', '_')

    # ── PDF ──
    if fmt == 'pdf':
        if label.file_path:
            try:
                return FileResponse(
                    open(label.file_path, 'rb'),
                    content_type='application/pdf',
                    as_attachment=True,
                    filename=f'nutrition_label_{safe_name}.pdf',
                )
            except FileNotFoundError:
                pass
        pdf_gen = NutritionLabelPDF(
            recipe, nutrition_data, (is_compliant, compliance_notes), fop_indicators
        )
        filepath = pdf_gen.generate()
        label.file_path = filepath
        label.save()
        return FileResponse(
            open(filepath, 'rb'),
            content_type='application/pdf',
            as_attachment=True,
            filename=f'nutrition_label_{safe_name}.pdf',
        )

    # ── JSON ──
    if fmt == 'json':
        nutrients = _nutrition_list(recipe)
        export_data = {
            'recipe': {
                'name': recipe.name,
                'brand_name': recipe.brand_name,
                'serving_size': recipe.serving_size,
                'serving_unit': recipe.serving_unit,
                'servings_per_pack': recipe.servings_per_pack,
                'manufacturer': recipe.manufacturer,
                'fssai_license': recipe.fssai_license,
                'allergen_info': recipe.allergen_info,
                'ingredients': recipe.get_ingredient_list_string(),
            },
            'nutrition': nutrients,
            'fop_indicators': fop_indicators,
            'compliance': {'is_compliant': is_compliant, 'notes': compliance_notes},
            'generated_at': datetime.datetime.now().isoformat(),
        }
        response = HttpResponse(
            json.dumps(export_data, indent=2),
            content_type='application/json',
        )
        response['Content-Disposition'] = f'attachment; filename="nutrition_label_{safe_name}.json"'
        return response

    # ── CSV ──
    if fmt == 'csv':
        nutrients = _nutrition_list(recipe)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Nutrition Label Export'])
        writer.writerow(['Recipe', recipe.name])
        writer.writerow(['Brand', recipe.brand_name])
        writer.writerow(['Serving Size', f'{recipe.serving_size}{recipe.serving_unit}'])
        writer.writerow(['Servings per Pack', recipe.servings_per_pack])
        writer.writerow(['FSSAI License', recipe.fssai_license])
        writer.writerow(['Ingredients', recipe.get_ingredient_list_string()])
        writer.writerow(['Allergens', recipe.allergen_info])
        writer.writerow(['Compliant', 'Yes' if is_compliant else 'No'])
        writer.writerow([])
        writer.writerow(['Nutrient', 'Unit', 'Per Serving', 'Per 100g', '%DV'])
        for n in nutrients:
            dv = f"{n['percent_dv']}%" if n['percent_dv'] is not None else '-'
            writer.writerow([n['name'], n['unit'], n['per_serving'], n['per_100g'], dv])
        writer.writerow([])
        writer.writerow(['FOP Indicator', 'Value', 'Level'])
        for fop in fop_indicators:
            writer.writerow([fop['nutrient'], f"{fop['value']}{fop['unit']}/100g", fop['level']])

        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="nutrition_label_{safe_name}.csv"'
        return response

    # ── HTML ──
    if fmt == 'html':
        label_html = generate_label_html(recipe, nutrition_data, fop_indicators)
        full_html = (
            '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
            f'<title>Nutrition Label - {recipe.name}</title>'
            '<style>body{font-family:Arial,sans-serif;max-width:400px;margin:40px auto}'
            '.nutrition-label{border:2px solid #000;padding:16px}</style>'
            f'</head><body>{label_html}</body></html>'
        )
        response = HttpResponse(full_html, content_type='text/html')
        response['Content-Disposition'] = f'attachment; filename="nutrition_label_{safe_name}.html"'
        return response

    return JsonResponse({'error': 'Unsupported format'}, status=400)


# ── AI Analysis (Mistral) ────────────────────────────────────────────
@csrf_exempt
@require_http_methods(["POST"])
@jwt_required
def api_ai_analyze(request):
    """Use Mistral AI to provide nutritional insights."""
    from .ai_utils import ai_chat

    body = _json_body(request)
    prompt = body.get('prompt', '')
    recipe_id = body.get('recipe_id')

    if not prompt and not recipe_id:
        return JsonResponse({'error': 'Provide a prompt or recipe_id'}, status=400)

    try:
        system_msg = "You are an expert food nutritionist and FSSAI compliance advisor. Respond concisely with actionable insights."

        if recipe_id:
            recipe = get_object_or_404(Recipe, pk=recipe_id, user=request.jwt_user)
            nutrition = _nutrition_list(recipe)
            nutrition_text = '\n'.join(
                f"- {n['name']}: {n['per_serving']}{n['unit']} per serving"
                for n in nutrition
            )
            ingredients_text = recipe.get_ingredient_list_string()
            user_prompt = (
                f"Recipe: {recipe.name}\n"
                f"Brand: {recipe.brand_name}\n"
                f"Serving Size: {recipe.serving_size}{recipe.serving_unit}\n"
                f"Ingredients: {ingredients_text}\n\n"
                f"Nutrition per serving:\n{nutrition_text}\n\n"
                f"User query: {prompt or 'Provide a detailed nutritional analysis.'}"
            )
        else:
            user_prompt = prompt

        response_text = ai_chat(user_prompt, system=system_msg, temperature=0.4, max_tokens=2048)
        return JsonResponse({'success': True, 'response': response_text})
    except Exception as e:
        logger.error(f"AI analysis error: {e}")
        return JsonResponse({'error': 'AI analysis failed. Please try again later.'}, status=500)


# ── Ingredients ─────────────────────────────────────────────────────
@csrf_exempt
@jwt_required
def api_ingredient_list(request):
    query = request.GET.get('q', '')
    category = request.GET.get('category', '')
    ingredients = Ingredient.objects.select_related('category').all()

    if query:
        ingredients = ingredients.filter(
            Q(name__icontains=query) | Q(aliases__icontains=query)
        )
    if category:
        ingredients = ingredients.filter(category__name__iexact=category)

    items = []
    for ing in ingredients[:200]:
        nutrient_vals = {}
        for inv in ing.nutrients.select_related('nutrient').all():
            nutrient_vals[inv.nutrient.name.lower()] = {
                'value': inv.value_per_100g,
                'unit': inv.nutrient.unit,
            }
        items.append({
            'id': ing.id,
            'name': ing.name,
            'category': ing.category.name if ing.category else '',
            'energy': nutrient_vals.get('energy', {}).get('value', 0),
            'protein': nutrient_vals.get('protein', {}).get('value', 0),
            'fat': nutrient_vals.get('total fat', {}).get('value', 0),
            'carbs': nutrient_vals.get('total carbohydrate', {}).get('value', 0),
        })

    categories = list(
        IngredientCategory.objects.values_list('name', flat=True).order_by('name')
    )
    return JsonResponse({'ingredients': items, 'categories': categories})


@csrf_exempt
@jwt_required
def api_ingredient_detail(request, pk):
    ingredient = get_object_or_404(
        Ingredient.objects.select_related('category'), pk=pk
    )
    nutrients = []
    for inv in ingredient.nutrients.select_related('nutrient', 'nutrient__category').all():
        nutrients.append({
            'name': inv.nutrient.name,
            'unit': inv.nutrient.unit,
            'value_per_100g': inv.value_per_100g,
            'category': inv.nutrient.category.name if inv.nutrient.category else '',
        })
    return JsonResponse({
        'id': ingredient.id,
        'name': ingredient.name,
        'category': ingredient.category.name if ingredient.category else '',
        'description': ingredient.description,
        'aliases': ingredient.get_aliases_list(),
        'nutrients': nutrients,
    })


@csrf_exempt
def api_ingredient_search(request):
    """Public endpoint for ingredient autocomplete (no auth for UX)."""
    q = request.GET.get('q', '').strip()
    if len(q) == 0:
        # Return popular / first 20 ingredients for empty query
        ingredients = Ingredient.objects.select_related('category').all()[:20]
    elif len(q) == 1:
        ingredients = Ingredient.objects.filter(
            Q(name__istartswith=q)
        ).select_related('category')[:15]
    else:
        ingredients = Ingredient.objects.filter(
            Q(name__icontains=q) | Q(aliases__icontains=q)
        ).select_related('category')[:15]
    results = [
        {'id': i.id, 'name': i.name, 'category': i.category.name if i.category else ''}
        for i in ingredients
    ]
    return JsonResponse({'results': results})


# ── Allergen Auto-Detection ─────────────────────────────────────────
@csrf_exempt
@require_http_methods(["POST"])
@jwt_required
def api_detect_allergens(request):
    """
    Detect allergens from a list of ingredient names or a recipe ID.
    Body: { "ingredient_names": [...] } OR { "recipe_id": 123 }
    """
    body = _json_body(request)
    recipe_id = body.get('recipe_id')
    ingredient_names = body.get('ingredient_names', [])

    if recipe_id:
        recipe = get_object_or_404(Recipe, pk=recipe_id, user=request.jwt_user)
        result = detect_allergens_from_recipe(recipe)
        return JsonResponse({'success': True, **result})

    if ingredient_names:
        result = detect_allergens_enhanced(ingredient_names)
        return JsonResponse({'success': True, **result})

    return JsonResponse({'error': 'Provide ingredient_names or recipe_id'}, status=400)


# ── Batch CSV Recipe Upload ─────────────────────────────────────────
@csrf_exempt
@require_http_methods(["POST"])
@jwt_required
def api_batch_upload(request):
    """
    Upload a CSV file with multiple recipes.
    CSV columns: name, description, brand_name, manufacturer, fssai_license,
                 allergen_info, serving_size, serving_unit, servings_per_pack,
                 ingredients (semicolon-separated: "ingredient_name:weight_grams")
    """
    csv_file = request.FILES.get('csv_file')
    if not csv_file:
        return JsonResponse({'error': 'No CSV file uploaded'}, status=400)

    if not csv_file.name.endswith('.csv'):
        return JsonResponse({'error': 'File must be a .csv'}, status=400)

    try:
        content = csv_file.read().decode('utf-8')
    except UnicodeDecodeError:
        try:
            csv_file.seek(0)
            content = csv_file.read().decode('latin-1')
        except Exception:
            return JsonResponse({'error': 'Unable to read CSV file encoding'}, status=400)

    reader = csv.DictReader(io.StringIO(content))
    created_recipes = []
    errors = []
    row_num = 0

    for row in reader:
        row_num += 1
        name = row.get('name', '').strip()
        if not name:
            errors.append({'row': row_num, 'error': 'Missing recipe name'})
            continue

        try:
            serving_sz = float(row.get('serving_size', 100))
        except (ValueError, TypeError):
            serving_sz = 100
        try:
            servings_pp = float(row.get('servings_per_pack', 1))
        except (ValueError, TypeError):
            servings_pp = 1

        recipe = Recipe.objects.create(
            user=request.jwt_user,
            name=name,
            description=row.get('description', ''),
            serving_size=serving_sz,
            serving_unit=row.get('serving_unit', 'g'),
            servings_per_pack=servings_pp,
            brand_name=row.get('brand_name', ''),
            manufacturer=row.get('manufacturer', ''),
            fssai_license=row.get('fssai_license', ''),
            allergen_info=row.get('allergen_info', ''),
        )

        # Parse ingredients column: "Rice:200;Wheat:150;Salt:5"
        ingredients_str = row.get('ingredients', '')
        ingredients_added = 0
        if ingredients_str:
            for item in ingredients_str.split(';'):
                item = item.strip()
                if not item:
                    continue
                parts = item.split(':')
                ing_name = parts[0].strip()
                try:
                    weight = float(parts[1].strip()) if len(parts) > 1 else 100
                except (ValueError, TypeError):
                    weight = 100

                matched, _ = match_ingredient_to_db(ing_name)
                if matched:
                    RecipeIngredient.objects.create(
                        recipe=recipe, ingredient=matched, weight_grams=weight
                    )
                    ingredients_added += 1

        # Auto-detect allergens if allergen_info is empty
        if not recipe.allergen_info.strip():
            allergen_result = detect_allergens_from_recipe(recipe)
            if allergen_result['detected']:
                recipe.allergen_info = allergen_result['allergen_string']
                recipe.save()

        created_recipes.append({
            'row': row_num,
            'id': recipe.id,
            'name': recipe.name,
            'ingredients_added': ingredients_added,
        })

    return JsonResponse({
        'success': True,
        'created': len(created_recipes),
        'errors': len(errors),
        'recipes': created_recipes,
        'error_details': errors,
    })


# ── User Settings ───────────────────────────────────────────────────
@csrf_exempt
@jwt_required
def api_user_settings(request):
    """Get or update user settings / profile / defaults."""
    user = request.jwt_user

    if request.method == 'GET':
        defaults, _ = UserDefaults.objects.get_or_create(user=user)
        return JsonResponse({
            'profile': {
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'date_joined': user.date_joined.isoformat(),
            },
            'defaults': {
                'default_serving_size': defaults.default_serving_size,
                'default_serving_unit': defaults.default_serving_unit,
                'default_servings_per_pack': defaults.default_servings_per_pack,
                'default_brand_name': defaults.default_brand_name,
                'default_manufacturer': defaults.default_manufacturer,
                'default_fssai_license': defaults.default_fssai_license,
            },
            'stats': {
                'total_recipes': Recipe.objects.filter(user=user).count(),
                'total_labels': GeneratedLabel.objects.filter(recipe__user=user).count(),
            },
        })

    elif request.method in ('PUT', 'PATCH'):
        body = _json_body(request)

        # Update profile fields
        if 'first_name' in body:
            user.first_name = body['first_name'].strip()
        if 'last_name' in body:
            user.last_name = body['last_name'].strip()
        if 'email' in body:
            new_email = body['email'].strip()
            if new_email and new_email != user.email:
                if User.objects.filter(email=new_email).exclude(pk=user.pk).exists():
                    return JsonResponse({'error': 'Email already in use'}, status=400)
                user.email = new_email

        # Password change
        old_pw = body.get('current_password', '')
        new_pw = body.get('new_password', '')
        if new_pw:
            if not old_pw:
                return JsonResponse({'error': 'Current password is required'}, status=400)
            if not user.check_password(old_pw):
                return JsonResponse({'error': 'Current password is incorrect'}, status=400)
            if len(new_pw) < 8:
                return JsonResponse({'error': 'New password must be at least 8 characters'}, status=400)
            user.set_password(new_pw)

        user.save()

        # Update defaults if provided
        defaults_data = body.get('defaults')
        if defaults_data and isinstance(defaults_data, dict):
            defaults, _ = UserDefaults.objects.get_or_create(user=user)
            for field in ('default_brand_name', 'default_manufacturer',
                          'default_fssai_license', 'default_serving_unit'):
                if field in defaults_data:
                    setattr(defaults, field, defaults_data[field])
            for field in ('default_serving_size', 'default_servings_per_pack'):
                if field in defaults_data:
                    try:
                        setattr(defaults, field, float(defaults_data[field]))
                    except (ValueError, TypeError):
                        pass
            defaults.save()

        return JsonResponse({
            'success': True,
            'profile': {
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            },
        })

    return JsonResponse({'error': 'Method not allowed'}, status=405)


# ── UNIFIED AUTO-ANALYZE (Level 1 + 2 Full Pipeline) ───────────────
def _create_version_snapshot(recipe, nutrition_list, compliance_data, fop_indicators, label_url=''):
    """Create an auto-save version snapshot for a recipe."""
    last_ver = recipe.versions.order_by('-version_number').first()
    next_ver = (last_ver.version_number + 1) if last_ver else 1

    snapshot = {
        'recipe': _recipe_to_dict(recipe),
        'nutrition': nutrition_list,
        'compliance': compliance_data,
        'fop_indicators': fop_indicators,
        'label_download_url': label_url,
        'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }

    version = RecipeVersion.objects.create(
        recipe=recipe,
        version_number=next_ver,
        snapshot=snapshot,
        is_compliant=compliance_data.get('is_compliant', False),
        change_summary=f"Auto-analyzed v{next_ver}",
    )
    return version


@csrf_exempt
@require_http_methods(["POST"])
@jwt_required
def api_auto_analyze(request):
    """
    LEVEL 1+2 FULL AUTOMATION PIPELINE
    One endpoint → parse → normalize → lookup → calculate → compliance → label → save → return.
    
    Accepts EITHER:
      - A full recipe payload with ingredients list (manual mode)
      - A recipe_text field for AI/regex parsing (parse mode)
      - A recipe_id for re-analyzing an existing recipe
    
    Returns: everything in one shot (nutrition, compliance, FOP, label HTML,
             PDF download URL, version info).
    """
    body = _json_body(request)
    user = request.jwt_user
    recipe_id = body.get('recipe_id')
    recipe_text = body.get('recipe_text', '').strip()
    is_reanalyze = bool(recipe_id) and not body.get('name')

    # ── STEP 1: Parse / Create / Load Recipe ──────────────────────
    if is_reanalyze:
        # Re-analyze existing recipe
        recipe = get_object_or_404(Recipe, pk=recipe_id, user=user)
    else:
        # Create new recipe
        name = body.get('name', '').strip()
        if not name:
            return JsonResponse({'error': 'Recipe name is required'}, status=400)

        try:
            serving_sz = float(body.get('serving_size', 100))
            servings_pp = float(body.get('servings_per_pack', 1))
        except (ValueError, TypeError):
            serving_sz, servings_pp = 100, 1

        recipe = Recipe.objects.create(
            user=user,
            name=name,
            description=body.get('description', ''),
            serving_size=serving_sz,
            serving_unit=body.get('serving_unit', 'g'),
            servings_per_pack=servings_pp,
            brand_name=body.get('brand_name', ''),
            manufacturer=body.get('manufacturer', ''),
            fssai_license=body.get('fssai_license', ''),
            allergen_info=body.get('allergen_info', ''),
        )

        # Parse ingredients
        raw_ingredients = body.get('ingredients', [])
        parsed_from_text = []

        if recipe_text and not raw_ingredients:
            # AI/regex parse mode
            parser = RecipeParser()
            parsed_items = parser.parse_text(recipe_text)
            for item in parsed_items:
                matched, confidence = match_ingredient_to_db(item['name'])
                if matched:
                    parsed_from_text.append({
                        'ingredient_id': matched.id,
                        'ingredient_name': matched.name,
                        'weight_grams': item['weight_grams'],
                        'confidence': confidence,
                        'parsed_name': item['name'],
                    })
            raw_ingredients = parsed_from_text

        # ── STEP 2: Normalize + Map to DB ─────────────────────────
        ingredients_added = 0
        unmatched = []
        for item in raw_ingredients:
            try:
                ing_id = item.get('ingredient_id')
                if ing_id:
                    ing = Ingredient.objects.get(id=int(ing_id))
                else:
                    ing_name = item.get('ingredient_name', item.get('name', ''))
                    matched, conf = match_ingredient_to_db(ing_name)
                    if not matched:
                        unmatched.append(ing_name)
                        continue
                    ing = matched
                weight = float(item.get('weight_grams', 0))
                if weight <= 0:
                    continue
                RecipeIngredient.objects.get_or_create(
                    recipe=recipe, ingredient=ing,
                    defaults={'weight_grams': weight}
                )
                ingredients_added += 1
            except (Ingredient.DoesNotExist, KeyError, ValueError, TypeError):
                continue

    # ── STEP 3: Auto-detect allergens ─────────────────────────────
    if not recipe.allergen_info.strip():
        try:
            allergen_result = detect_allergens_from_recipe(recipe)
            if allergen_result.get('detected'):
                recipe.allergen_info = allergen_result['allergen_string']
                recipe.save()
        except Exception:
            pass

    # ── STEP 4: Calculate Nutrition ───────────────────────────────
    nutrition_data = recipe.calculate_nutrition()
    nutrients = _nutrition_list(recipe)

    # ── STEP 5: FSSAI Compliance Check ────────────────────────────
    checker = FSSAIComplianceChecker(recipe, nutrition_data)
    is_compliant, compliance_notes = checker.check_all()
    fop_indicators = checker.get_fop_indicators()

    compliance_data = {
        'is_compliant': is_compliant,
        'compliance_notes': compliance_notes,
        'issues': checker.issues,
        'warnings': checker.warnings,
        'info': checker.info,
    }

    # AI-powered compliance recommendations (non-blocking)
    try:
        ai_recs = checker.get_ai_recommendations()
        compliance_data['ai_recommendations'] = ai_recs.get('recommendations', [])
        compliance_data['ai_summary'] = ai_recs.get('summary', '')
        compliance_data['ai_powered'] = ai_recs.get('ai_powered', False)
    except Exception:
        compliance_data['ai_recommendations'] = []
        compliance_data['ai_summary'] = ''
        compliance_data['ai_powered'] = False

    # ── STEP 6: Generate Label HTML ───────────────────────────────
    label_html = generate_label_html(recipe, nutrition_data, fop_indicators)

    # ── STEP 7: Auto-generate PDF ─────────────────────────────────
    try:
        nutrition_snapshot = {}
        for nid, data in nutrition_data.items():
            nutrition_snapshot[str(nid)] = {
                'name': data['nutrient'].name,
                'unit': data['nutrient'].unit,
                'per_serving': data['per_serving'],
                'per_100g': data['per_100g'],
                'percent_dv': data['percent_dv'],
            }

        label_record = GeneratedLabel.objects.create(
            recipe=recipe, format='pdf', file_path='',
            nutrition_data=nutrition_snapshot,
            is_fssai_compliant=is_compliant,
            compliance_notes=compliance_notes,
        )

        pdf_gen = NutritionLabelPDF(
            recipe, nutrition_data, (is_compliant, compliance_notes), fop_indicators
        )
        filepath = pdf_gen.generate()
        label_record.file_path = filepath
        label_record.save()
        pdf_download_url = f'/api/recipes/{recipe.id}/export/download/?format=pdf&label_id={label_record.id}'
    except Exception as e:
        logger.warning(f"Auto PDF generation failed: {e}")
        pdf_download_url = ''
        label_record = None

    # ── STEP 8: Auto Save + Version ───────────────────────────────
    version = _create_version_snapshot(
        recipe, nutrients, compliance_data, fop_indicators, pdf_download_url
    )

    # ── STEP 9: Return everything ─────────────────────────────────
    return JsonResponse({
        'success': True,
        'recipe': _recipe_to_dict(recipe, include_nutrition=True),
        'nutrition': nutrients,
        'compliance': compliance_data,
        'fop_indicators': fop_indicators,
        'label_html': label_html,
        'pdf_download_url': pdf_download_url,
        'label_id': label_record.id if label_record else None,
        'version': {
            'number': version.version_number,
            'created_at': version.created_at.isoformat(),
        },
        'ingredient_list': recipe.get_ingredient_list_string(),
        'allergen_info': recipe.allergen_info,
        'unmatched_ingredients': unmatched if not is_reanalyze else [],
        'pipeline': [
            'parse', 'normalize', 'lookup', 'calculate',
            'compliance', 'round', 'label', 'pdf', 'save',
        ],
    }, status=201 if not is_reanalyze else 200)


@csrf_exempt
@require_http_methods(["POST"])
@jwt_required
def api_live_calculate(request):
    """
    LEVEL 3: Live recalculation endpoint.
    Given ingredients + serving info, returns nutrition WITHOUT saving.
    Used for real-time frontend updates as user modifies ingredients.
    """
    body = _json_body(request)
    ingredients_data = body.get('ingredients', [])
    serving_size = float(body.get('serving_size', 100))

    # Build temporary nutrition calculation
    total_nutrition = {}
    total_weight = 0.0

    for item in ingredients_data:
        try:
            ing_id = item.get('ingredient_id')
            if not ing_id:
                continue
            weight = float(item.get('weight_grams', 0))
            if weight <= 0:
                continue
            total_weight += weight

            for inv in IngredientNutrient.objects.filter(
                ingredient_id=int(ing_id)
            ).select_related('nutrient', 'nutrient__category'):
                nid = inv.nutrient_id
                value = (weight / 100.0) * inv.value_per_100g
                if nid not in total_nutrition:
                    total_nutrition[nid] = {
                        'nutrient': inv.nutrient,
                        'total_value': 0,
                    }
                total_nutrition[nid]['total_value'] += value
        except (ValueError, TypeError):
            continue

    # Calculate per_serving, per_100g, %DV
    result = []
    tw = total_weight or 1
    for nid, data in total_nutrition.items():
        n = data['nutrient']
        total = data['total_value']
        per_serving = (total / tw) * serving_size
        per_100g = (total / tw) * 100

        percent_dv = None
        if n.daily_value:
            percent_dv = round((per_serving / n.daily_value) * 100, 1)

        result.append({
            'nutrient_id': n.id,
            'name': n.name,
            'name_hindi': get_hindi_name(n.name),
            'unit': n.unit,
            'category': n.category.name if n.category else '',
            'total_value': round(total, 2),
            'per_serving': round(per_serving, 2),
            'per_100g': round(per_100g, 2),
            'percent_dv': percent_dv,
            'is_mandatory': n.is_mandatory,
        })

    result.sort(key=lambda x: x.get('name', ''))

    # Quick FOP check
    per_100g_map = {r['name']: r['per_100g'] for r in result}
    fop = []
    checks = [
        ('Total Fat', 17.5, 'g'), ('Saturated Fat', 5.0, 'g'),
        ('Total Sugars', 22.5, 'g'), ('Sodium', 600, 'mg'),
    ]
    for name, threshold, unit in checks:
        val = per_100g_map.get(name, 0)
        if val > threshold:
            level, color = 'HIGH', 'red'
        elif val > threshold * 0.5:
            level, color = 'MEDIUM', 'amber'
        else:
            level, color = 'LOW', 'green'
        fop.append({'nutrient': name, 'value': round(val, 2), 'unit': unit, 'level': level, 'color': color})

    return JsonResponse({
        'nutrition': result,
        'fop_indicators': fop,
        'total_weight': round(total_weight, 1),
    })


# ── Recipe Version History ──────────────────────────────────────────
@csrf_exempt
@jwt_required
def api_recipe_versions(request, pk):
    """Get version history for a recipe."""
    recipe = get_object_or_404(Recipe, pk=pk, user=request.jwt_user)
    versions = recipe.versions.all()[:20]
    return JsonResponse({
        'recipe_id': recipe.id,
        'recipe_name': recipe.name,
        'versions': [
            {
                'version_number': v.version_number,
                'is_compliant': v.is_compliant,
                'change_summary': v.change_summary,
                'created_at': v.created_at.isoformat(),
                'snapshot': v.snapshot,
            }
            for v in versions
        ],
    })


# ── Google OAuth ────────────────────────────────────────────────────
@csrf_exempt
@require_http_methods(["POST"])
def api_google_login(request):
    """
    Verify Google ID token, find or create user, return JWT.
    Frontend sends { credential: <google_id_token> }
    """
    if _check_rate_limit(request):
        return JsonResponse({'error': 'Too many attempts.'}, status=429)

    body = _json_body(request)
    credential = body.get('credential', '')
    if not credential:
        return JsonResponse({'error': 'Google credential is required'}, status=400)

    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        GOOGLE_CLIENT_ID = getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', '')
        if not GOOGLE_CLIENT_ID:
            return JsonResponse({'error': 'Google OAuth not configured'}, status=500)

        # Verify the Google ID token
        idinfo = id_token.verify_oauth2_token(
            credential, google_requests.Request(), GOOGLE_CLIENT_ID
        )

        # Token is valid — extract user info
        email = idinfo.get('email', '')
        first_name = idinfo.get('given_name', '')
        last_name = idinfo.get('family_name', '')
        google_id = idinfo.get('sub', '')

        if not email:
            return JsonResponse({'error': 'Could not get email from Google'}, status=400)

        # Find or create user
        user = User.objects.filter(email=email).first()
        if not user:
            # Auto-create user from Google account
            username = email.split('@')[0]
            # Ensure unique username
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

            user = User.objects.create_user(
                username=username,
                email=email,
                password=None,  # No password for OAuth users
                first_name=first_name,
                last_name=last_name,
            )
            # Mark as unusable password (OAuth only)
            user.set_unusable_password()
            user.save()

        token = _generate_jwt(user)
        return JsonResponse({
            'success': True,
            'user': _user_dict(user),
            'token': token,
            'is_new_user': not user.last_login,
        })

    except ValueError as e:
        logger.warning(f"Google OAuth validation failed: {e}")
        return JsonResponse({'error': 'Invalid Google token'}, status=401)
    except ImportError:
        return JsonResponse({'error': 'google-auth library not installed'}, status=500)
    except Exception as e:
        logger.error(f"Google OAuth error: {e}")
        return JsonResponse({'error': 'Google authentication failed'}, status=500)


# ── User Defaults ───────────────────────────────────────────────────
@csrf_exempt
@jwt_required
def api_user_defaults(request):
    """Get or update user recipe defaults (persisted to DB)."""
    user = request.jwt_user
    defaults, _ = UserDefaults.objects.get_or_create(user=user)

    if request.method == 'GET':
        return JsonResponse({
            'default_brand_name': defaults.default_brand_name,
            'default_manufacturer': defaults.default_manufacturer,
            'default_fssai_license': defaults.default_fssai_license,
            'default_serving_size': defaults.default_serving_size,
            'default_serving_unit': defaults.default_serving_unit,
            'default_servings_per_pack': defaults.default_servings_per_pack,
        })

    elif request.method in ('PUT', 'PATCH'):
        body = _json_body(request)
        for field in ('default_brand_name', 'default_manufacturer',
                      'default_fssai_license', 'default_serving_unit'):
            if field in body:
                setattr(defaults, field, body[field])
        for field in ('default_serving_size', 'default_servings_per_pack'):
            if field in body:
                try:
                    setattr(defaults, field, float(body[field]))
                except (ValueError, TypeError):
                    pass
        defaults.save()
        return JsonResponse({'success': True})

    return JsonResponse({'error': 'Method not allowed'}, status=405)


# ── Regulatory Alerts ───────────────────────────────────────────────
@csrf_exempt
@jwt_required
def api_regulatory_alerts(request):
    """Return current FSSAI regulatory alerts and updates."""
    # Static curated alerts based on recent FSSAI regulations
    alerts = [
        {
            'id': 1,
            'title': 'FSSAI Mandates Front-of-Pack (FOP) Labelling',
            'title_hindi': 'FSSAI ने फ्रंट-ऑफ-पैक (FOP) लेबलिंग अनिवार्य किया',
            'severity': 'high',
            'category': 'Labelling',
            'date': '2024-10-01',
            'description': 'FSSAI has mandated that all packaged food products must display '
                           'Front-of-Pack nutrition labels showing High/Medium/Low indicators '
                           'for sugar, salt, and saturated fat per 100g.',
            'affected_nutrients': ['Total Sugars', 'Sodium', 'Saturated Fat'],
            'regulation_ref': 'FSSAI Direction 2024/FOP-Labels',
            'is_active': True,
        },
        {
            'id': 2,
            'title': 'Trans Fat Limit Reduced to 2%',
            'title_hindi': 'ट्रांस फैट की सीमा घटाकर 2% की गई',
            'severity': 'critical',
            'category': 'Composition',
            'date': '2024-01-01',
            'description': 'FSSAI has reduced the permissible limit of industrial trans fatty '
                           'acids in oils, fats and foods containing oils/fats to 2% by weight. '
                           'Products exceeding this limit must reformulate.',
            'affected_nutrients': ['Trans Fat'],
            'regulation_ref': 'FSS (Prohibition & Restriction) Amendment 2023',
            'is_active': True,
        },
        {
            'id': 3,
            'title': 'Added Sugar Declaration Mandatory',
            'title_hindi': 'मिलाई गई शर्करा की घोषणा अनिवार्य',
            'severity': 'high',
            'category': 'Labelling',
            'date': '2024-04-01',
            'description': 'All packaged foods must now separately declare "Added Sugars" '
                           'in the nutrition table, distinct from "Total Sugars".',
            'affected_nutrients': ['Added Sugars', 'Total Sugars'],
            'regulation_ref': 'FSS (Labelling & Display) Amendment 2023',
            'is_active': True,
        },
        {
            'id': 4,
            'title': 'Mandatory Allergen Declaration Update',
            'title_hindi': 'अनिवार्य एलर्जी घोषणा अपडेट',
            'severity': 'medium',
            'category': 'Allergens',
            'date': '2024-06-15',
            'description': 'FSSAI has expanded the list of mandatory allergen declarations '
                           'to include sesame, mustard, and celery in addition to the existing '
                           '8 major allergens (milk, eggs, fish, crustaceans, tree nuts, '
                           'peanuts, wheat/gluten, soybeans).',
            'affected_nutrients': [],
            'regulation_ref': 'FSS (Labelling & Display) 2024 Update',
            'is_active': True,
        },
        {
            'id': 5,
            'title': 'Fortification Standards for Staple Foods',
            'title_hindi': 'मुख्य खाद्य पदार्थों के लिए फोर्टिफिकेशन मानक',
            'severity': 'medium',
            'category': 'Fortification',
            'date': '2024-03-01',
            'description': 'Updated standards for fortification of wheat flour, rice, '
                           'edible oil, milk, and salt. Products claiming fortification '
                           'must meet minimum nutrient levels as specified.',
            'affected_nutrients': ['Iron', 'Vitamin A', 'Vitamin D', 'Folic Acid', 'Vitamin B12'],
            'regulation_ref': 'FSS (Fortification of Foods) Regulations 2024',
            'is_active': True,
        },
        {
            'id': 6,
            'title': 'Daily Value Updates Based on ICMR-NIN 2024',
            'title_hindi': 'ICMR-NIN 2024 के आधार पर दैनिक मूल्य अपडेट',
            'severity': 'info',
            'category': 'Nutrition',
            'date': '2024-08-01',
            'description': 'Reference Daily Values for select nutrients have been updated '
                           'based on ICMR-NIN Dietary Guidelines 2024. Check if your labels '
                           'use the latest %DV calculations.',
            'affected_nutrients': ['Protein', 'Calcium', 'Iron', 'Zinc'],
            'regulation_ref': 'ICMR-NIN RDA 2024',
            'is_active': True,
        },
        {
            'id': 7,
            'title': 'Clean Label Claims Regulation',
            'title_hindi': 'क्लीन लेबल दावों का विनियमन',
            'severity': 'low',
            'category': 'Claims',
            'date': '2024-09-01',
            'description': 'New guidelines for "natural", "organic", "preservative-free" '
                           'and similar clean label claims. Products must substantiate '
                           'claims with documented evidence.',
            'affected_nutrients': [],
            'regulation_ref': 'FSSAI Advisory 2024/Claims',
            'is_active': True,
        },
        {
            'id': 8,
            'title': 'Bilingual Labelling Enforcement',
            'title_hindi': 'द्विभाषी लेबलिंग का प्रवर्तन',
            'severity': 'high',
            'category': 'Labelling',
            'date': '2024-07-01',
            'description': 'Stricter enforcement of bilingual (English + Hindi/regional language) '
                           'requirement on all packaged food labels. Non-compliant products '
                           'may face penalties.',
            'affected_nutrients': [],
            'regulation_ref': 'FSS (Labelling & Display) Regulation 2.2.2',
            'is_active': True,
        },
    ]

    # Check if user has recipes affected by any alert
    user_recipes = Recipe.objects.filter(user=request.jwt_user)
    total_recipes = user_recipes.count()

    # Pre-compute per-nutrient-name → set of recipe IDs (single query per nutrient group)
    # so we avoid N+1 inside the alert loop
    all_affected_nutrients = set()
    for alert in alerts:
        all_affected_nutrients.update(alert.get('affected_nutrients', []))

    # One query: find which user recipes use ingredients that have each nutrient
    from django.db.models import Q as _Q
    nutrient_recipe_map = {}  # nutrient_name -> set of recipe_ids
    if all_affected_nutrients:
        hits = (
            RecipeIngredient.objects.filter(
                recipe__user=request.jwt_user,
                ingredient__nutrients__nutrient__name__in=all_affected_nutrients,
                ingredient__nutrients__value_per_100g__gt=0,
            )
            .values_list('recipe_id', 'ingredient__nutrients__nutrient__name')
            .distinct()
        )
        for recipe_id, nutrient_name in hits:
            nutrient_recipe_map.setdefault(nutrient_name, set()).add(recipe_id)

    # Recipe name cache to avoid extra queries
    recipe_name_cache = {r.id: r.name for r in user_recipes.only('id', 'name')}

    # ── Impact analysis per alert ──────────────────────────────────
    for alert in alerts:
        affected = alert.get('affected_nutrients', [])
        if not affected:
            alert['impacted_recipes'] = 0
            alert['impact_details'] = []
            continue

        impacted_ids = set()
        for nutrient_name in affected:
            impacted_ids |= nutrient_recipe_map.get(nutrient_name, set())

        impact_details = [
            {'id': rid, 'name': recipe_name_cache.get(rid, f'Recipe {rid}')}
            for rid in list(impacted_ids)[:3]
        ]

        alert['impacted_recipes'] = len(impacted_ids)
        alert['impact_details'] = impact_details

    # ── AI-powered regulatory guidance ───────────────────────────────
    ai_guidance = ''
    try:
        from .ai_utils import ai_chat
        if total_recipes > 0:
            impacted_summary = []
            for a in alerts:
                if a.get('impacted_recipes', 0) > 0:
                    impacted_summary.append(
                        f"- {a['title']}: {a['impacted_recipes']} recipe(s) affected"
                    )
            if impacted_summary:
                guidance_prompt = (
                    "You are an FSSAI regulatory compliance advisor.\n"
                    f"A food manufacturer has {total_recipes} recipes.\n"
                    "These regulatory alerts impact their products:\n"
                    + "\n".join(impacted_summary) +
                    "\n\nProvide a brief (3-5 sentences) prioritized action plan "
                    "for addressing these regulatory changes. Focus on the most "
                    "critical items first. Be specific and actionable."
                )
                ai_guidance = ai_chat(guidance_prompt, temperature=0.3, max_tokens=512)
    except Exception as e:
        logger.warning(f"AI regulatory guidance failed: {e}")

    return JsonResponse({
        'alerts': alerts,
        'total_recipes': total_recipes,
        'last_updated': datetime.datetime.now().strftime('%Y-%m-%d %H:%M'),
        'ai_guidance': ai_guidance,
    })


# ── Translate Label ─────────────────────────────────────────────────
@csrf_exempt
@require_http_methods(["POST"])
@jwt_required
def api_translate_label(request):
    """
    Translate nutrition label text into regional Indian languages via Mistral AI.
    Body: { "recipe_id": 123, "language": "tamil" }
    Supported: tamil, telugu, kannada, bengali, marathi, hindi
    """
    from .ai_utils import ai_chat

    body = _json_body(request)
    recipe_id = body.get('recipe_id')
    language = body.get('language', 'hindi').lower()

    SUPPORTED = {
        'hindi': 'Hindi (हिन्दी)',
        'tamil': 'Tamil (தமிழ்)',
        'telugu': 'Telugu (తెలుగు)',
        'kannada': 'Kannada (ಕನ್ನಡ)',
        'bengali': 'Bengali (বাংলা)',
        'marathi': 'Marathi (मराठी)',
    }

    if language not in SUPPORTED:
        return JsonResponse({
            'error': f'Unsupported language. Supported: {", ".join(SUPPORTED.keys())}'
        }, status=400)

    if not recipe_id:
        return JsonResponse({'error': 'recipe_id is required'}, status=400)

    recipe = get_object_or_404(Recipe, pk=recipe_id, user=request.jwt_user)
    nutrition = _nutrition_list(recipe)
    ingredients_text = recipe.get_ingredient_list_string()

    # Build the label content to translate
    label_content = f"Product Name: {recipe.name}\n"
    label_content += f"Brand: {recipe.brand_name}\n"
    label_content += f"Ingredients: {ingredients_text}\n"
    label_content += f"Allergen Info: {recipe.allergen_info}\n"
    label_content += f"Serving Size: {recipe.serving_size}{recipe.serving_unit}\n"
    label_content += "Nutrition Information (per serving):\n"
    for n in nutrition:
        label_content += f"  {n['name']}: {n['per_serving']}{n['unit']}\n"

    prompt = (
        f"Translate the following food product label into {SUPPORTED[language]}.\n"
        f"Keep all numbers and units as-is. Translate ingredient names, nutrient names, "
        f"and label fields accurately using standard food terminology in {language}.\n"
        f"Format the output cleanly.\n\n"
        f"{label_content}\n"
        f"Return ONLY the translated label text."
    )

    try:
        translated = ai_chat(prompt, temperature=0.2, max_tokens=2048)
        return JsonResponse({
            'success': True,
            'language': language,
            'language_display': SUPPORTED[language],
            'original': label_content,
            'translated': translated,
        })
    except Exception as e:
        logger.error(f"Translation failed: {e}")
        return JsonResponse({'error': 'Translation failed'}, status=500)


# ── Smart Reformulation ─────────────────────────────────────────────
@csrf_exempt
@require_http_methods(["POST"])
@jwt_required
def api_reformulate(request):
    """
    AI-powered ingredient reformulation with ingredient-level attribution.
    Body: { "recipe_id": 123 }

    Logic:
    1. Calculate nutrition + FOP indicators
    2. For each HIGH nutrient, compute per-ingredient contribution (grams/mg)
    3. Find real DB substitutes that have lower values of the offending nutrient
    4. Pass rich context (attribution + substitutes) to AI
    5. AI picks the best swaps; we then compute estimated post-swap nutrient values
    6. Return attribution, suggestions, and before/after comparison
    """
    from .ai_utils import ai_chat_json

    body = _json_body(request)
    recipe_id = body.get('recipe_id')
    if not recipe_id:
        return JsonResponse({'error': 'recipe_id is required'}, status=400)

    recipe = get_object_or_404(Recipe, pk=recipe_id, user=request.jwt_user)
    nutrition_data = recipe.calculate_nutrition()
    checker = FSSAIComplianceChecker(recipe, nutrition_data)
    checker.check_all()
    fop = checker.get_fop_indicators()

    # Thresholds map (matches fssai_compliance.py)
    THRESHOLDS = {
        'Total Fat':      {'threshold': 17.5, 'unit': 'g'},
        'Saturated Fat':  {'threshold': 5.0,  'unit': 'g'},
        'Total Sugars':   {'threshold': 22.5, 'unit': 'g'},
        'Sodium':         {'threshold': 600,  'unit': 'mg'},
    }

    high_nutrients = [ind for ind in fop if ind['level'] == 'HIGH']
    if not high_nutrients:
        return JsonResponse({
            'success': True,
            'needs_reformulation': False,
            'message': 'All FOP indicators are within acceptable levels.',
            'suggestions': [],
            'attribution': {},
        })

    total_weight = recipe.total_weight or 1.0

    # ── Step 1: Per-ingredient nutrient contribution ──────────────────
    # ingredient_nutrients[ri.id] = {nutrient_name: absolute_grams_in_recipe}
    ingredient_data = []
    for ri in recipe.ingredients.select_related('ingredient').all():
        ing_nutrients = {}
        for inv in ri.ingredient.nutrients.select_related('nutrient').all():
            abs_val = (ri.weight_grams / 100.0) * inv.value_per_100g
            ing_nutrients[inv.nutrient.name] = {
                'abs': round(abs_val, 4),
                'per_100g_ing': round(inv.value_per_100g, 4),
                'unit': inv.nutrient.unit,
            }
        ingredient_data.append({
            'id': ri.ingredient.id,
            'ri_id': ri.id,
            'name': ri.ingredient.name,
            'category': ri.ingredient.category.name if ri.ingredient.category else '',
            'weight_grams': float(ri.weight_grams),
            'nutrients': ing_nutrients,
        })

    # ── Step 2: Attribution per HIGH nutrient ─────────────────────────
    attribution = {}
    for high in high_nutrients:
        nutrient_name = high['nutrient']
        contribs = []
        for ing in ingredient_data:
            n = ing['nutrients'].get(nutrient_name)
            if n and n['abs'] > 0:
                # contribution to per-100g value of the recipe
                contrib_per_100g = (n['abs'] / total_weight) * 100
                contribs.append({
                    'ingredient': ing['name'],
                    'weight_grams': ing['weight_grams'],
                    'contribution_abs': round(n['abs'], 3),
                    'contribution_per_100g': round(contrib_per_100g, 3),
                    'pct_of_total': round((n['abs'] / max(high['value'] * total_weight / 100, 0.001)) * 100, 1),
                })
        contribs.sort(key=lambda x: x['contribution_abs'], reverse=True)
        attribution[nutrient_name] = {
            'current_per_100g': round(high['value'], 3),
            'threshold': THRESHOLDS.get(nutrient_name, {}).get('threshold', 0),
            'unit': high['unit'],
            'top_contributors': contribs[:5],
        }

    # ── Step 3: Find real DB substitutes with lower offending nutrients ──
    # For the top contributing ingredient in each HIGH nutrient, query DB
    substitutes_context = {}
    high_nutrient_names = list(attribution.keys())
    for nutrient_name, attr in attribution.items():
        if not attr['top_contributors']:
            continue
        top_ing_name = attr['top_contributors'][0]['ingredient']
        top_ing_obj = Ingredient.objects.filter(name=top_ing_name).first()
        if not top_ing_obj:
            continue
        # Find same-category ingredients with lower per-100g value of this nutrient
        same_cat = Ingredient.objects.filter(
            category=top_ing_obj.category
        ).exclude(id=top_ing_obj.id)
        candidates = []
        for cand in same_cat[:60]:
            inv = cand.nutrients.select_related('nutrient').filter(
                nutrient__name=nutrient_name
            ).first()
            if inv is not None and inv.value_per_100g < (
                top_ing_obj.nutrients.filter(nutrient__name=nutrient_name)
                .values_list('value_per_100g', flat=True).first() or 9999
            ):
                energy_inv = cand.nutrients.select_related('nutrient').filter(
                    nutrient__name='Energy'
                ).first()
                candidates.append({
                    'name': cand.name,
                    f'{nutrient_name}_per_100g': round(inv.value_per_100g, 2),
                    'energy_per_100g': round(energy_inv.value_per_100g, 1) if energy_inv else None,
                })
        candidates.sort(key=lambda x: x[f'{nutrient_name}_per_100g'])
        substitutes_context[top_ing_name] = candidates[:5]

    # ── Step 4: Build AI prompt with precise attribution + substitutes ─
    prompt_lines = [
        "You are an expert food scientist and FSSAI compliance advisor.",
        "",
        f"Product: {recipe.name}",
        f"Total recipe weight: {total_weight:.0f}g",
        f"Serving size: {recipe.serving_size}{recipe.serving_unit}",
        "",
        "=== CURRENT INGREDIENTS ===",
    ]
    for ing in ingredient_data:
        prompt_lines.append(f"  • {ing['name']}: {ing['weight_grams']}g")

    prompt_lines += ["", "=== HIGH FOP NUTRIENTS (must reduce below threshold) ==="]
    for nutrient_name, attr in attribution.items():
        prompt_lines.append(
            f"  • {nutrient_name}: {attr['current_per_100g']}{attr['unit']}/100g "
            f"(threshold: {attr['threshold']}{attr['unit']}/100g, "
            f"excess: +{round(attr['current_per_100g'] - attr['threshold'], 2)}{attr['unit']})"
        )
        prompt_lines.append("    Top contributing ingredients:")
        for c in attr['top_contributors'][:3]:
            prompt_lines.append(
                f"      - {c['ingredient']} ({c['weight_grams']}g): "
                f"contributes {c['contribution_per_100g']}{attr['unit']}/100g recipe "
                f"({c['pct_of_total']}% of total {nutrient_name})"
            )

    if substitutes_context:
        prompt_lines += ["", "=== AVAILABLE SUBSTITUTES FROM INGREDIENT DATABASE ==="]
        for ing_name, subs in substitutes_context.items():
            if subs:
                prompt_lines.append(f"  For {ing_name}:")
                for s in subs:
                    vals = ", ".join(f"{k}={v}" for k, v in s.items() if k != 'name')
                    prompt_lines.append(f"    - {s['name']}: {vals}")

    prompt_lines += [
        "",
        "=== TASK ===",
        "Provide specific ingredient swaps or weight reductions that will bring ALL HIGH nutrients",
        "below their thresholds. Prefer substitutes from the database when available.",
        "For each suggestion, you MUST use the actual ingredient names and weights from above.",
        "",
        "Return a JSON array. Each item must have:",
        '  "original_ingredient": exact name from the ingredient list above',
        '  "action": "replace" | "reduce" | "remove"',
        '  "replacement": new ingredient name (only for replace; use DB substitutes if listed)',
        '  "current_weight": current weight in grams (copy from list above)',
        '  "new_weight": suggested new weight in grams (number, required for reduce/replace)',
        '  "target_nutrient": which HIGH nutrient this primarily addresses',
        '  "reason": 1-2 sentence science-based explanation',
        '  "estimated_reduction_pct": your estimate of % reduction in that nutrient (number)',
        "",
        "Return ONLY the JSON array. Max 5 suggestions. Be precise and grounded in the numbers."
    ]

    prompt = "\n".join(prompt_lines)

    try:
        suggestions_raw = ai_chat_json(prompt, temperature=0.2, max_tokens=2048)
        if not isinstance(suggestions_raw, list):
            suggestions_raw = []

        # ── Step 5: Compute estimated before/after for each suggestion ──
        suggestions = []
        for s in suggestions_raw:
            original = s.get('original_ingredient', '')
            action = s.get('action', 'reduce')
            new_weight = s.get('new_weight')
            current_weight = s.get('current_weight')
            target_nutrient = s.get('target_nutrient', '')
            estimated_pct = s.get('estimated_reduction_pct')

            # Find the original ingredient entry
            orig_ing = next((i for i in ingredient_data if i['name'].lower() == original.lower()), None)

            before_val = attribution.get(target_nutrient, {}).get('current_per_100g', 0)
            after_val = None

            if orig_ing and new_weight is not None and target_nutrient in attribution:
                orig_n = orig_ing['nutrients'].get(target_nutrient, {})
                orig_abs = orig_n.get('abs', 0)
                weight_ratio = float(new_weight) / max(orig_ing['weight_grams'], 0.01)
                new_abs = orig_abs * weight_ratio

                if action == 'replace':
                    # Try to find the replacement in DB
                    rep_name = s.get('replacement', '')
                    rep_ing = Ingredient.objects.filter(name__iexact=rep_name).first()
                    if rep_ing:
                        rep_inv = rep_ing.nutrients.filter(nutrient__name=target_nutrient).first()
                        if rep_inv:
                            new_abs = (float(new_weight) / 100.0) * rep_inv.value_per_100g
                elif action == 'remove':
                    new_abs = 0.0

                # New total absolute value of this nutrient in recipe
                other_abs = sum(
                    i['nutrients'].get(target_nutrient, {}).get('abs', 0)
                    for i in ingredient_data
                    if i['name'].lower() != original.lower()
                )
                new_total_abs = other_abs + new_abs
                new_per_100g = (new_total_abs / total_weight) * 100
                after_val = round(new_per_100g, 2)

            suggestion_entry = {
                'original_ingredient': original,
                'action': action,
                'replacement': s.get('replacement'),
                'current_weight': current_weight or (orig_ing['weight_grams'] if orig_ing else None),
                'new_weight': new_weight,
                'target_nutrient': target_nutrient,
                'reason': s.get('reason', ''),
                'estimated_reduction_pct': estimated_pct,
                'before_per_100g': round(before_val, 2) if before_val else None,
                'after_per_100g': after_val,
                'unit': attribution.get(target_nutrient, {}).get('unit', 'g'),
                'threshold': THRESHOLDS.get(target_nutrient, {}).get('threshold'),
            }
            suggestions.append(suggestion_entry)

        return JsonResponse({
            'success': True,
            'needs_reformulation': True,
            'high_nutrients': [
                {
                    'nutrient': h['nutrient'],
                    'value': h['value'],
                    'unit': h['unit'],
                    'threshold': THRESHOLDS.get(h['nutrient'], {}).get('threshold', 0),
                    'excess': round(h['value'] - THRESHOLDS.get(h['nutrient'], {}).get('threshold', h['value']), 2),
                }
                for h in high_nutrients
            ],
            'attribution': attribution,
            'suggestions': suggestions,
        })

    except Exception as e:
        logger.error(f"Reformulation failed: {e}")
        return JsonResponse({'error': 'Reformulation analysis failed'}, status=500)


# ── Share (WhatsApp / Email link) ───────────────────────────────────
@csrf_exempt
@require_http_methods(["POST"])
@jwt_required
def api_share_label(request):
    """
    Generate shareable links for WhatsApp / Email.
    Body: { "recipe_id": 123, "channel": "whatsapp" | "email" }
    Returns the share URL with pre-filled text.
    """
    body = _json_body(request)
    recipe_id = body.get('recipe_id')
    channel = body.get('channel', 'whatsapp')

    if not recipe_id:
        return JsonResponse({'error': 'recipe_id is required'}, status=400)

    recipe = get_object_or_404(Recipe, pk=recipe_id, user=request.jwt_user)
    nutrition = _nutrition_list(recipe)

    # Build summary text
    summary = f" *{recipe.name}* — Nutrition Label (Satvika)\n"
    summary += f"Brand: {recipe.brand_name}\n"
    summary += f"Serving: {recipe.serving_size}{recipe.serving_unit}\n\n"
    summary += "Key Nutrition (per serving):\n"

    key_nutrients = ['Energy', 'Total Fat', 'Total Carbohydrate', 'Protein', 'Sodium', 'Total Sugars']
    for n in nutrition:
        if n['name'] in key_nutrients:
            summary += f"  • {n['name']}: {n['per_serving']}{n['unit']}\n"

    if recipe.allergen_info:
        summary += f"\n Allergens: {recipe.allergen_info}\n"

    summary += "\nGenerated with Satvika — FSSAI-compliant Nutrition Label Generator"

    import urllib.parse
    encoded = urllib.parse.quote(summary)

    if channel == 'whatsapp':
        share_url = f"https://wa.me/?text={encoded}"
    elif channel == 'email':
        subject = urllib.parse.quote(f"Nutrition Label: {recipe.name}")
        share_url = f"mailto:?subject={subject}&body={encoded}"
    else:
        return JsonResponse({'error': 'Channel must be whatsapp or email'}, status=400)

    return JsonResponse({
        'success': True,
        'channel': channel,
        'share_url': share_url,
        'summary_text': summary,
    })


# ── Batch Process All Labels ────────────────────────────────────────
@csrf_exempt
@require_http_methods(["POST"])
@jwt_required
def api_batch_process(request):
    """
    Batch-generate labels + compliance for ALL user recipes (or a subset).
    Body: { "recipe_ids": [1,2,3] }  (optional — defaults to all)
    Returns per-recipe compliance summary + label generation status.
    """
    body = _json_body(request)
    recipe_ids = body.get('recipe_ids')
    user = request.jwt_user

    if recipe_ids:
        recipes = Recipe.objects.filter(user=user, id__in=recipe_ids)
    else:
        recipes = Recipe.objects.filter(user=user)

    results = []
    compliant_count = 0
    total = recipes.count()

    for recipe in recipes:
        try:
            nutrition_data = recipe.calculate_nutrition()
            checker = FSSAIComplianceChecker(recipe, nutrition_data)
            is_compliant, notes = checker.check_all()
            fop = checker.get_fop_indicators()

            if is_compliant:
                compliant_count += 1

            # Auto-generate PDF
            pdf_url = ''
            try:
                nutrition_snapshot = {}
                for nid, data in nutrition_data.items():
                    nutrition_snapshot[str(nid)] = {
                        'name': data['nutrient'].name,
                        'unit': data['nutrient'].unit,
                        'per_serving': data['per_serving'],
                        'per_100g': data['per_100g'],
                        'percent_dv': data['percent_dv'],
                    }
                label_record = GeneratedLabel.objects.create(
                    recipe=recipe, format='pdf', file_path='',
                    nutrition_data=nutrition_snapshot,
                    is_fssai_compliant=is_compliant,
                    compliance_notes=notes,
                )
                pdf_gen = NutritionLabelPDF(recipe, nutrition_data, (is_compliant, notes), fop)
                filepath = pdf_gen.generate()
                label_record.file_path = filepath
                label_record.save()
                pdf_url = f'/api/recipes/{recipe.id}/export/download/?format=pdf&label_id={label_record.id}'
            except Exception as e:
                logger.warning(f"Batch PDF failed for recipe {recipe.id}: {e}")

            results.append({
                'recipe_id': recipe.id,
                'name': recipe.name,
                'is_compliant': is_compliant,
                'issues_count': len(checker.issues),
                'warnings_count': len(checker.warnings),
                'fop_summary': [{'nutrient': f['nutrient'], 'level': f['level'], 'color': f['color']} for f in fop],
                'pdf_url': pdf_url,
                'status': 'success',
            })
        except Exception as e:
            logger.error(f"Batch process failed for recipe {recipe.id}: {e}")
            results.append({
                'recipe_id': recipe.id,
                'name': recipe.name,
                'status': 'error',
                'error': str(e),
            })

    return JsonResponse({
        'success': True,
        'total': total,
        'compliant': compliant_count,
        'non_compliant': total - compliant_count,
        'compliance_rate': round((compliant_count / total * 100) if total > 0 else 0, 1),
        'results': results,
    })


# ── Suggest Recipe Name from Ingredients ────────────────────────────
@csrf_exempt
@require_http_methods(["POST"])
@jwt_required
def api_suggest_recipe_name(request):
    """
    Given a list of ingredient names, suggest recipe names using Mistral AI.
    Body: { "ingredients": ["wheat flour", "sugar", "milk"] }
    Returns: { "suggestions": ["Milk Cake", "Sweet Roti", ...] }
    """
    body = _json_body(request)
    ingredient_names = body.get('ingredients', [])
    if not ingredient_names:
        return JsonResponse({'error': 'ingredients list is required'}, status=400)

    names_str = ', '.join(ingredient_names)
    try:
        from .ai_utils import ai_chat_json
        result = ai_chat_json(
            f"""Given these ingredients: {names_str}

Suggest 5 Indian/international recipe names that commonly use these ingredients.
Return a JSON array of strings (just the recipe names).
Keep names short, practical, and realistic.
Example: ["Masala Oats", "Vegetable Pulao", "Paneer Tikka"]

Return ONLY the JSON array.""",
            temperature=0.7,
            max_tokens=300,
        )
        if isinstance(result, list):
            return JsonResponse({'suggestions': result[:5]})
        return JsonResponse({'suggestions': []})
    except Exception as e:
        logger.warning(f"Recipe name suggestion failed: {e}")
        return JsonResponse({'suggestions': []})


# ── Suggest Ingredients from Recipe Name ────────────────────────────
@csrf_exempt
@require_http_methods(["POST"])
@jwt_required
def api_suggest_ingredients(request):
    """
    Given a recipe name, suggest ingredients with estimated weights.
    Body: { "recipe_name": "Masala Oats" }
    Returns: { "ingredients": [{"name": "Oats", "weight_grams": 50, "ingredient_id": 12}, ...] }
    """
    body = _json_body(request)
    recipe_name = body.get('recipe_name', '').strip()
    if not recipe_name:
        return JsonResponse({'error': 'recipe_name is required'}, status=400)

    try:
        from .ai_utils import ai_chat_json
        result = ai_chat_json(
            f"""For the recipe "{recipe_name}", provide a typical ingredient list with weights in grams.
This should be a standard recipe for one serving (approximately 100-300g total).
Return a JSON array of objects with "name" and "weight_grams" fields.
Use common English ingredient names.
Be realistic with weights.

Example: [{{"name": "Oats", "weight_grams": 50}}, {{"name": "Salt", "weight_grams": 2}}]

Return ONLY the JSON array.""",
            temperature=0.3,
            max_tokens=1024,
        )

        if not isinstance(result, list):
            return JsonResponse({'ingredients': []})

        # Match each suggested ingredient to the database
        matched = []
        for item in result:
            name = item.get('name', '')
            weight = item.get('weight_grams', 10)
            if not name:
                continue
            ing, confidence = match_ingredient_to_db(name)
            matched.append({
                'name': ing.name if ing else name,
                'ingredient_id': ing.id if ing else None,
                'weight_grams': weight,
                'confidence': confidence if ing else 0,
                'category': ing.category.name if ing and ing.category else '',
            })

        return JsonResponse({'ingredients': matched})
    except Exception as e:
        logger.warning(f"Ingredient suggestion failed: {e}")
        return JsonResponse({'ingredients': []})

