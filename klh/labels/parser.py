"""
Recipe ingredient parser using Mistral AI with regex fallback.
Parses free-text recipe descriptions into structured ingredient lists.
"""
import re
import json
import logging

from django.conf import settings

logger = logging.getLogger(__name__)


class RecipeParser:
    """
    Parses recipe text into structured ingredient data.
    Supports Mistral AI-based and regex-based parsing.
    """

    # Common unit conversions to grams
    UNIT_TO_GRAMS = {
        'g': 1, 'gm': 1, 'gms': 1, 'gram': 1, 'grams': 1,
        'kg': 1000, 'kilogram': 1000, 'kilograms': 1000,
        'mg': 0.001, 'milligram': 0.001, 'milligrams': 0.001,
        'ml': 1, 'milliliter': 1, 'milliliters': 1,  # approx for water-like
        'l': 1000, 'liter': 1000, 'liters': 1000, 'litre': 1000,
        'cup': 240, 'cups': 240,
        'tbsp': 15, 'tablespoon': 15, 'tablespoons': 15,
        'tsp': 5, 'teaspoon': 5, 'teaspoons': 5,
        'oz': 28.35, 'ounce': 28.35, 'ounces': 28.35,
        'lb': 453.6, 'pound': 453.6, 'pounds': 453.6,
        'pinch': 0.5, 'dash': 0.5,
        'piece': 50, 'pieces': 50,  # rough estimate
        'no': 50, 'nos': 50, 'number': 50,
    }

    def parse_text(self, text):
        """
        Parse free-text recipe into structured ingredients.
        Tries Mistral AI first, falls back to regex.
        Returns list of dicts: [{"name": str, "weight_grams": float}, ...]
        """
        # Try Mistral AI
        try:
            from .ai_utils import ai_chat_json
            prompt = self._build_parse_prompt(text)
            return ai_chat_json(prompt, temperature=0.1, max_tokens=2048)
        except Exception as e:
            logger.warning(f"AI parsing failed: {e}")

        # Final fallback: regex
        return self._parse_with_regex(text)

    def _build_parse_prompt(self, text):
        return f"""Parse the following recipe text and extract all ingredients with their weights in grams.
Return a JSON array of objects with "name" and "weight_grams" fields.
For the name, use common English/Indian ingredient names.
Convert all measurements to grams (use standard conversions: 1 cup = 240g, 1 tbsp = 15g, 1 tsp = 5g, etc.).
For liquids (water, milk, oil, etc.), treat ml as grams (density ≈ 1).
If no weight is specified, estimate a reasonable amount.

Recipe text:
{text}

Return ONLY the JSON array, no other text."""

    def _parse_with_regex(self, text):
        """
        Simple regex-based parser for structured ingredient lines.
        Expected formats:
          - "100g wheat flour"
          - "wheat flour - 100g"
          - "2 cups rice"
          - "1 tbsp oil"
          - "salt 5g"
        """
        ingredients = []
        lines = text.strip().split('\n')

        for line in lines:
            line = line.strip().strip('-•*').strip()
            if not line:
                continue

            result = self._parse_line(line)
            if result:
                ingredients.append(result)

        return ingredients

    def _parse_line(self, line):
        """Parse a single ingredient line."""
        line = line.lower().strip()

        # Pattern: "100g ingredient" or "100 g ingredient"
        match = re.match(
            r'^(\d+(?:\.\d+)?)\s*(g|gm|gms|gram|grams|kg|mg|ml|l|cup|cups|tbsp|tablespoon|tsp|teaspoon|oz|lb|pinch|piece|pieces|no|nos)\s+(.+)',
            line
        )
        if match:
            amount = float(match.group(1))
            unit = match.group(2)
            name = match.group(3).strip().rstrip(',.')
            grams = amount * self.UNIT_TO_GRAMS.get(unit, 1)
            return {"name": name.title(), "weight_grams": round(grams, 1)}

        # Pattern: "ingredient - 100g" or "ingredient 100g"
        match = re.match(
            r'^(.+?)\s*[-–:]\s*(\d+(?:\.\d+)?)\s*(g|gm|gms|gram|grams|kg|mg|ml|l|cup|cups|tbsp|tsp|oz|lb|pinch|piece|pieces|no|nos)',
            line
        )
        if match:
            name = match.group(1).strip().rstrip(',.')
            amount = float(match.group(2))
            unit = match.group(3)
            grams = amount * self.UNIT_TO_GRAMS.get(unit, 1)
            return {"name": name.title(), "weight_grams": round(grams, 1)}

        # Pattern: "ingredient 100g" (no separator)
        match = re.match(
            r'^(.+?)\s+(\d+(?:\.\d+)?)\s*(g|gm|gms|gram|grams|kg|mg|ml|l|cup|cups|tbsp|tsp|oz|lb|pinch)\s*$',
            line
        )
        if match:
            name = match.group(1).strip().rstrip(',.')
            amount = float(match.group(2))
            unit = match.group(3)
            grams = amount * self.UNIT_TO_GRAMS.get(unit, 1)
            return {"name": name.title(), "weight_grams": round(grams, 1)}

        # Pattern with number and unit at start: "2 cups rice"
        match = re.match(
            r'^(\d+(?:\.\d+)?)\s+(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|piece|pieces|pinch)\s+(.+)',
            line
        )
        if match:
            amount = float(match.group(1))
            unit = match.group(2)
            name = match.group(3).strip().rstrip(',.')
            grams = amount * self.UNIT_TO_GRAMS.get(unit, 1)
            return {"name": name.title(), "weight_grams": round(grams, 1)}

        # Last resort: just treat the whole line as ingredient name with default weight
        if line and not line.startswith('#'):
            return {"name": line.title(), "weight_grams": 10.0}

        return None


def match_ingredient_to_db(parsed_name, ingredient_queryset=None):
    """
    Match a parsed ingredient name to the database.
    Uses exact match, then alias search, then partial match.
    Returns (Ingredient instance, confidence_score) or (None, 0).
    """
    from .models import Ingredient

    if ingredient_queryset is None:
        ingredient_queryset = Ingredient.objects.all()

    name_lower = parsed_name.lower().strip()

    # 1. Exact match
    try:
        ing = ingredient_queryset.get(name__iexact=parsed_name)
        return ing, 1.0
    except Ingredient.DoesNotExist:
        pass

    # 2. Search in aliases
    for ing in ingredient_queryset.all():
        aliases = ing.get_aliases_list()
        if name_lower in aliases:
            return ing, 0.95

    # 3. Partial name match (contains)
    matches = ingredient_queryset.filter(name__icontains=parsed_name)
    if matches.exists():
        return matches.first(), 0.7

    # 4. Search each word
    words = name_lower.split()
    for word in words:
        if len(word) > 3:  # skip short words
            matches = ingredient_queryset.filter(name__icontains=word)
            if matches.exists():
                return matches.first(), 0.5

    # 5. Alias partial match
    for ing in ingredient_queryset.all():
        for alias in ing.get_aliases_list():
            if name_lower in alias or alias in name_lower:
                return ing, 0.4

    return None, 0
