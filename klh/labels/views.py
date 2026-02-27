from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse, FileResponse, JsonResponse
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db.models import Q, Count

from .models import (
    Recipe, RecipeIngredient, Ingredient,
    GeneratedLabel, Nutrient, IngredientCategory,
)
from .forms import RecipeForm, RecipeIngredientFormSet, RecipeParseForm
from .fssai_compliance import FSSAIComplianceChecker
from .label_generator import NutritionLabelPDF, generate_label_html
from .parser import RecipeParser, match_ingredient_to_db


def home(request):
    """Dashboard / landing page."""
    recipes = Recipe.objects.annotate(
        ingredient_count=Count('ingredients')
    ).order_by('-created_at')[:10]
    total_ingredients = Ingredient.objects.count()
    total_recipes = Recipe.objects.count()
    total_labels = GeneratedLabel.objects.count()

    return render(request, 'labels/home.html', {
        'recipes': recipes,
        'total_ingredients': total_ingredients,
        'total_recipes': total_recipes,
        'total_labels': total_labels,
    })


@login_required
def recipe_list(request):
    """List all recipes."""
    query = request.GET.get('q', '')
    recipes = Recipe.objects.annotate(ingredient_count=Count('ingredients'))
    if query:
        recipes = recipes.filter(
            Q(name__icontains=query) | Q(brand_name__icontains=query)
        )
    recipes = recipes.order_by('-created_at')
    return render(request, 'labels/recipe_list.html', {
        'recipes': recipes, 'query': query
    })


@login_required
def recipe_create(request):
    """Create recipe with manual ingredient selection."""
    if request.method == 'POST':
        form = RecipeForm(request.POST)
        formset = RecipeIngredientFormSet(request.POST)
        if form.is_valid() and formset.is_valid():
            recipe = form.save()
            formset.instance = recipe
            formset.save()
            messages.success(request, f'Recipe "{recipe.name}" created successfully!')
            return redirect('recipe_detail', pk=recipe.pk)
    else:
        form = RecipeForm()
        formset = RecipeIngredientFormSet()

    return render(request, 'labels/recipe_form.html', {
        'form': form, 'formset': formset, 'title': 'Create Recipe'
    })


@login_required
def recipe_edit(request, pk):
    """Edit existing recipe."""
    recipe = get_object_or_404(Recipe, pk=pk)
    if request.method == 'POST':
        form = RecipeForm(request.POST, instance=recipe)
        formset = RecipeIngredientFormSet(request.POST, instance=recipe)
        if form.is_valid() and formset.is_valid():
            form.save()
            formset.save()
            messages.success(request, f'Recipe "{recipe.name}" updated!')
            return redirect('recipe_detail', pk=recipe.pk)
    else:
        form = RecipeForm(instance=recipe)
        formset = RecipeIngredientFormSet(instance=recipe)

    return render(request, 'labels/recipe_form.html', {
        'form': form, 'formset': formset, 'title': f'Edit: {recipe.name}',
        'recipe': recipe,
    })


@login_required
def recipe_detail(request, pk):
    """View recipe details with nutrition calculation."""
    recipe = get_object_or_404(Recipe, pk=pk)
    nutrition_data = recipe.calculate_nutrition()

    # Run FSSAI compliance check
    checker = FSSAIComplianceChecker(recipe, nutrition_data)
    is_compliant, compliance_notes = checker.check_all()
    fop_indicators = checker.get_fop_indicators()

    # Generate HTML label
    label_html = generate_label_html(recipe, nutrition_data, fop_indicators)

    # Sort nutrition data for display
    sorted_nutrition = sorted(
        nutrition_data.values(),
        key=lambda x: (x['nutrient'].category.display_order, x['nutrient'].display_order)
    )

    return render(request, 'labels/recipe_detail.html', {
        'recipe': recipe,
        'nutrition_data': sorted_nutrition,
        'is_compliant': is_compliant,
        'compliance_notes': compliance_notes,
        'fop_indicators': fop_indicators,
        'label_html': label_html,
    })


@login_required
def recipe_delete(request, pk):
    """Delete a recipe."""
    recipe = get_object_or_404(Recipe, pk=pk)
    if request.method == 'POST':
        name = recipe.name
        recipe.delete()
        messages.success(request, f'Recipe "{name}" deleted.')
        return redirect('recipe_list')
    return render(request, 'labels/recipe_confirm_delete.html', {'recipe': recipe})


@login_required
def recipe_parse(request):
    """Parse free-text recipe using LLM/regex parser."""
    if request.method == 'POST':
        form = RecipeParseForm(request.POST)
        if form.is_valid():
            parser = RecipeParser()
            parsed = parser.parse_text(form.cleaned_data['recipe_text'])

            # Match to database
            matched = []
            unmatched = []
            for item in parsed:
                ing, confidence = match_ingredient_to_db(item['name'])
                if ing:
                    matched.append({
                        'parsed_name': item['name'],
                        'db_ingredient': ing,
                        'weight_grams': item['weight_grams'],
                        'confidence': confidence,
                    })
                else:
                    unmatched.append(item)

            # Store in session for next step
            request.session['parsed_recipe'] = {
                'name': form.cleaned_data['recipe_name'],
                'serving_size': form.cleaned_data['serving_size'],
                'serving_unit': form.cleaned_data['serving_unit'],
                'brand_name': form.cleaned_data.get('brand_name', ''),
                'matched': [
                    {
                        'ingredient_id': m['db_ingredient'].id,
                        'ingredient_name': m['db_ingredient'].name,
                        'parsed_name': m['parsed_name'],
                        'weight_grams': m['weight_grams'],
                        'confidence': m['confidence'],
                    } for m in matched
                ],
                'unmatched': unmatched,
            }

            return render(request, 'labels/recipe_parse_review.html', {
                'form': form,
                'matched': matched,
                'unmatched': unmatched,
                'recipe_name': form.cleaned_data['recipe_name'],
                'all_ingredients': Ingredient.objects.all(),
            })
    else:
        form = RecipeParseForm()

    return render(request, 'labels/recipe_parse.html', {'form': form})


@login_required
def recipe_parse_confirm(request):
    """Confirm and save parsed recipe."""
    if request.method != 'POST':
        return redirect('recipe_parse')

    parsed_data = request.session.get('parsed_recipe')
    if not parsed_data:
        messages.error(request, 'No parsed recipe data found. Please try again.')
        return redirect('recipe_parse')

    # Create recipe
    recipe = Recipe.objects.create(
        name=parsed_data['name'],
        serving_size=parsed_data['serving_size'],
        serving_unit=parsed_data['serving_unit'],
        brand_name=parsed_data.get('brand_name', ''),
    )

    # Add matched ingredients
    for m in parsed_data['matched']:
        try:
            ing = Ingredient.objects.get(id=m['ingredient_id'])
            RecipeIngredient.objects.create(
                recipe=recipe,
                ingredient=ing,
                weight_grams=m['weight_grams'],
            )
        except Ingredient.DoesNotExist:
            pass

    # Handle manually mapped ingredients from form
    for key, value in request.POST.items():
        if key.startswith('manual_ing_'):
            idx = key.replace('manual_ing_', '')
            weight_key = f'manual_weight_{idx}'
            if value and weight_key in request.POST:
                try:
                    ing = Ingredient.objects.get(id=int(value))
                    weight = float(request.POST[weight_key])
                    RecipeIngredient.objects.get_or_create(
                        recipe=recipe,
                        ingredient=ing,
                        defaults={'weight_grams': weight},
                    )
                except (Ingredient.DoesNotExist, ValueError):
                    pass

    # Clear session
    if 'parsed_recipe' in request.session:
        del request.session['parsed_recipe']

    messages.success(request, f'Recipe "{recipe.name}" created from parsed text!')
    return redirect('recipe_detail', pk=recipe.pk)


@login_required
def generate_label_pdf(request, pk):
    """Generate and download PDF label for a recipe."""
    recipe = get_object_or_404(Recipe, pk=pk)
    nutrition_data = recipe.calculate_nutrition()

    checker = FSSAIComplianceChecker(recipe, nutrition_data)
    is_compliant, compliance_notes = checker.check_all()
    fop_indicators = checker.get_fop_indicators()

    # Generate PDF
    pdf_gen = NutritionLabelPDF(recipe, nutrition_data, (is_compliant, compliance_notes), fop_indicators)
    filepath = pdf_gen.generate()

    # Save label record
    nutrition_snapshot = {}
    for nid, data in nutrition_data.items():
        nutrition_snapshot[str(nid)] = {
            'name': data['nutrient'].name,
            'per_serving': data['per_serving'],
            'per_100g': data['per_100g'],
            'percent_dv': data['percent_dv'],
            'unit': data['nutrient'].unit,
        }

    GeneratedLabel.objects.create(
        recipe=recipe,
        format='pdf',
        file_path=filepath,
        nutrition_data=nutrition_snapshot,
        is_fssai_compliant=is_compliant,
        compliance_notes=compliance_notes,
    )

    # Serve file
    return FileResponse(
        open(filepath, 'rb'),
        content_type='application/pdf',
        as_attachment=True,
        filename=f"nutrition_label_{recipe.name.replace(' ', '_')}.pdf",
    )


@login_required
def ingredient_list(request):
    """Browse ingredient database."""
    query = request.GET.get('q', '')
    category_id = request.GET.get('category', '')
    ingredients = Ingredient.objects.select_related('category').all()

    if query:
        ingredients = ingredients.filter(
            Q(name__icontains=query) | Q(aliases__icontains=query)
        )
    if category_id:
        ingredients = ingredients.filter(category_id=category_id)

    categories = IngredientCategory.objects.annotate(
        count=Count('ingredients')
    ).order_by('name')

    return render(request, 'labels/ingredient_list.html', {
        'ingredients': ingredients,
        'categories': categories,
        'query': query,
        'selected_category': category_id,
    })


@login_required
def ingredient_detail(request, pk):
    """View ingredient nutritional data."""
    ingredient = get_object_or_404(
        Ingredient.objects.select_related('category'), pk=pk
    )
    nutrients = ingredient.nutrients.select_related(
        'nutrient', 'nutrient__category'
    ).order_by('nutrient__category__display_order', 'nutrient__display_order')

    return render(request, 'labels/ingredient_detail.html', {
        'ingredient': ingredient,
        'nutrients': nutrients,
    })


def api_ingredient_search(request):
    """API endpoint for ingredient autocomplete."""
    q = request.GET.get('q', '')
    if len(q) < 2:
        return JsonResponse({'results': []})

    ingredients = Ingredient.objects.filter(
        Q(name__icontains=q) | Q(aliases__icontains=q)
    )[:10]

    results = [{'id': i.id, 'name': i.name, 'category': i.category.name if i.category else ''}
               for i in ingredients]
    return JsonResponse({'results': results})
