"""
Allergen Auto-Detection Module
Automatically detects allergens from ingredient names using
FSSAI-defined allergen categories and common ingredient keywords.
Enhanced with Mistral AI for fuzzy matching of unusual ingredients.
"""
import json
import logging

logger = logging.getLogger(__name__)

# FSSAI mandates declaration of these allergen groups
ALLERGEN_MAP = {
    'Milk / Dairy': [
        'milk', 'cream', 'butter', 'ghee', 'curd', 'yogurt', 'yoghurt',
        'paneer', 'cheese', 'khoya', 'mawa', 'whey', 'casein', 'lactose',
        'buttermilk', 'lassi', 'dahi', 'rabdi', 'shrikhand', 'basundi',
        'kalakand', 'rasgulla', 'rasmalai', 'malai', 'condensed milk',
        'skimmed milk', 'whole milk', 'milk powder', 'dairy',
    ],
    'Wheat / Gluten': [
        'wheat', 'maida', 'atta', 'flour', 'gluten', 'semolina', 'suji',
        'sooji', 'rawa', 'daliya', 'dalia', 'seitan', 'bread', 'roti',
        'naan', 'chapati', 'paratha', 'puri', 'pasta', 'noodle',
        'barley', 'rye', 'oats', 'triticale', 'bulgur', 'couscous',
        'biscuit', 'cake', 'cookie', 'cracker',
    ],
    'Nuts (Tree Nuts)': [
        'almond', 'badam', 'cashew', 'kaju', 'walnut', 'akhrot',
        'pistachio', 'pista', 'hazelnut', 'macadamia', 'pecan',
        'brazil nut', 'pine nut', 'chestnut', 'praline',
    ],
    'Peanuts': [
        'peanut', 'groundnut', 'moongphali', 'mungfali',
    ],
    'Soy': [
        'soy', 'soya', 'tofu', 'tempeh', 'edamame', 'soybean',
        'soy sauce', 'soy milk', 'soy protein', 'soy lecithin',
    ],
    'Eggs': [
        'egg', 'anda', 'albumin', 'meringue', 'mayonnaise', 'mayo',
    ],
    'Fish': [
        'fish', 'machli', 'salmon', 'tuna', 'cod', 'sardine',
        'anchovy', 'mackerel', 'hilsa', 'pomfret', 'rohu', 'surmai',
        'bangda', 'rawas', 'bombay duck', 'bombil',
    ],
    'Shellfish / Crustaceans': [
        'shrimp', 'prawn', 'crab', 'lobster', 'crayfish', 'shellfish',
        'crustacean', 'jhinga', 'oyster', 'mussel', 'clam', 'squid',
        'scallop', 'octopus',
    ],
    'Sesame': [
        'sesame', 'til', 'gingelly', 'tahini',
    ],
    'Mustard': [
        'mustard', 'sarson', 'rai', 'mustard oil', 'mustard seed',
    ],
    'Celery': [
        'celery', 'ajwain', 'ajmoda',
    ],
    'Lupin': [
        'lupin', 'lupine',
    ],
    'Sulphites': [
        'sulphite', 'sulfite', 'sulphur dioxide', 'sulfur dioxide',
        'sodium metabisulphite', 'potassium metabisulphite',
    ],
    'Coconut': [
        'coconut', 'nariyal', 'copra', 'coconut milk', 'coconut oil',
        'coconut cream', 'desiccated coconut',
    ],
}


def detect_allergens(ingredient_names):
    """
    Detect allergens from a list of ingredient names.

    Args:
        ingredient_names: list of ingredient name strings

    Returns:
        dict with:
            'detected': list of detected allergen categories
            'details': dict mapping allergen category → list of triggering ingredients
            'allergen_string': FSSAI-formatted allergen declaration string
    """
    detected = {}

    for ing_name in ingredient_names:
        name_lower = ing_name.lower().strip()

        for allergen_category, keywords in ALLERGEN_MAP.items():
            for keyword in keywords:
                if keyword in name_lower:
                    if allergen_category not in detected:
                        detected[allergen_category] = set()
                    detected[allergen_category].add(ing_name)
                    break

    if not detected:
        return {
            'detected': [],
            'details': {},
            'allergen_string': 'No known allergens',
        }

    allergen_list = sorted(detected.keys())
    details = {k: sorted(list(v)) for k, v in detected.items()}

    # Build FSSAI-format allergen declaration
    allergen_string = "Contains: " + ", ".join(allergen_list)

    return {
        'detected': allergen_list,
        'details': details,
        'allergen_string': allergen_string,
    }


def _ai_allergen_check(unmatched_ingredients):
    """
    Use Mistral AI to check if ingredients that didn't match
    keywords contain hidden allergens. Returns dict of allergen → [ingredients].
    """
    if not unmatched_ingredients:
        return {}

    try:
        from .ai_utils import ai_chat_json
    except Exception:
        return {}

    prompt = (
        "You are an FSSAI food allergen expert.\n"
        "Analyze these ingredients and identify if ANY contain or are derived from "
        "these allergen categories: Milk/Dairy, Wheat/Gluten, Nuts (Tree Nuts), "
        "Peanuts, Soy, Eggs, Fish, Shellfish/Crustaceans, Sesame, Mustard, "
        "Celery, Lupin, Sulphites, Coconut.\n\n"
        f"Ingredients to check:\n"
        + "\n".join(f"- {ing}" for ing in unmatched_ingredients) +
        "\n\nReturn a JSON object where keys are allergen category names and "
        "values are arrays of ingredient names from the list that match. "
        "Only include categories that have matches. If none match, return {}.\n"
        "Return ONLY the JSON object, no other text."
    )

    try:
        result = ai_chat_json(prompt, temperature=0.1, max_tokens=1024)
        if isinstance(result, dict):
            return result
    except Exception as e:
        logger.warning(f"AI allergen check failed: {e}")

    return {}


def detect_allergens_enhanced(ingredient_names):
    """
    Enhanced allergen detection: keyword matching + AI fuzzy matching.
    First runs fast keyword matching, then sends unmatched ingredients
    to AI for deeper analysis of hidden/derived allergens.

    Args:
        ingredient_names: list of ingredient name strings

    Returns:
        dict with:
            'detected': list of detected allergen categories
            'details': dict mapping allergen category → list of triggering ingredients
            'allergen_string': FSSAI-formatted allergen declaration string
            'ai_enhanced': bool indicating if AI was used
            'ai_findings': dict of AI-discovered allergens (if any)
    """
    # Step 1: Fast keyword matching
    base_result = detect_allergens(ingredient_names)
    matched_ingredients = set()
    for ings in base_result['details'].values():
        matched_ingredients.update(ing.lower().strip() for ing in ings)

    # Step 2: Find ingredients not matched by keywords
    unmatched = [
        name for name in ingredient_names
        if name.lower().strip() not in matched_ingredients
    ]

    # Step 3: AI check on unmatched ingredients
    ai_findings = _ai_allergen_check(unmatched)

    if not ai_findings:
        return {**base_result, 'ai_enhanced': bool(unmatched), 'ai_findings': {}}

    # Merge AI findings into base result
    details = dict(base_result['details'])
    for category, ings in ai_findings.items():
        if category not in details:
            details[category] = []
        for ing in ings:
            if ing not in details[category]:
                details[category].append(ing)

    allergen_list = sorted(details.keys())
    if allergen_list:
        allergen_string = "Contains: " + ", ".join(allergen_list)
    else:
        allergen_string = 'No known allergens'

    return {
        'detected': allergen_list,
        'details': details,
        'allergen_string': allergen_string,
        'ai_enhanced': True,
        'ai_findings': ai_findings,
    }


def detect_allergens_from_recipe(recipe):
    """
    Detect allergens from a Recipe model instance.
    Uses AI-enhanced detection for better accuracy.

    Args:
        recipe: Recipe model instance

    Returns:
        Same dict as detect_allergens_enhanced()
    """
    ingredient_names = [
        ri.ingredient.name
        for ri in recipe.ingredients.select_related('ingredient').all()
    ]
    return detect_allergens_enhanced(ingredient_names)
