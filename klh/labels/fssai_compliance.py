"""
FSSAI Compliance checker for nutrition labels.
Implements rules from FSSAI (Food Safety and Standards (Labelling and Display)
Regulations, 2020) for pre-packaged food labels.
Enhanced with Mistral AI-powered recommendations.
"""
import logging

logger = logging.getLogger(__name__)


class FSSAIComplianceChecker:
    """
    Validates nutrition labels against FSSAI regulations.
    Returns compliance status and list of issues/notes.
    """

    # FSSAI-mandated nutrients that MUST appear on every label
    MANDATORY_NUTRIENTS = [
        'Energy', 'Total Fat', 'Saturated Fat', 'Trans Fat',
        'Total Carbohydrate', 'Total Sugars', 'Added Sugars',
        'Protein', 'Sodium', 'Dietary Fibre',
    ]

    # Front-of-pack thresholds (per 100g for solid foods)
    # "High in" warnings as per FSSAI regulations
    HIGH_FAT_THRESHOLD = 17.5  # g per 100g
    HIGH_SUGAR_THRESHOLD = 22.5  # g per 100g (total sugars)
    HIGH_SODIUM_THRESHOLD = 600  # mg per 100g (equivalent to 1.5g salt)
    HIGH_SATURATED_FAT_THRESHOLD = 5.0  # g per 100g

    # Required label elements
    REQUIRED_FIELDS = [
        'product_name', 'ingredient_list', 'net_quantity',
        'serving_size', 'nutrition_table',
    ]

    def __init__(self, recipe, nutrition_data):
        """
        Args:
            recipe: Recipe model instance
            nutrition_data: dict from recipe.calculate_nutrition()
        """
        self.recipe = recipe
        self.nutrition_data = nutrition_data
        self.issues = []
        self.warnings = []
        self.info = []

    def check_all(self):
        """Run all compliance checks. Returns (is_compliant, notes_string)."""
        self.issues = []
        self.warnings = []
        self.info = []

        self._check_mandatory_nutrients()
        self._check_serving_size_declaration()
        self._check_fop_warnings()
        self._check_ingredient_list()
        self._check_allergen_declaration()
        self._check_fssai_license()
        self._check_trans_fat()

        is_compliant = len(self.issues) == 0
        notes = self._format_notes()
        return is_compliant, notes

    def _check_mandatory_nutrients(self):
        """Check that all FSSAI-mandatory nutrients are present."""
        present_names = set()
        for nid, data in self.nutrition_data.items():
            present_names.add(data['nutrient'].name)

        for mn in self.MANDATORY_NUTRIENTS:
            if mn not in present_names:
                self.issues.append(
                    f"MISSING MANDATORY NUTRIENT: '{mn}' is required by "
                    f"FSSAI regulations but is not present in the nutrition data."
                )

    def _check_serving_size_declaration(self):
        """Verify serving size is properly declared."""
        if not self.recipe.serving_size or self.recipe.serving_size <= 0:
            self.issues.append(
                "SERVING SIZE: Must be declared as per FSSAI regulations."
            )
        if not self.recipe.serving_unit:
            self.issues.append(
                "SERVING UNIT: Must specify unit (g/ml) for serving size."
            )
        if not self.recipe.servings_per_pack or self.recipe.servings_per_pack <= 0:
            self.warnings.append(
                "SERVINGS PER PACK: Should declare number of servings per package."
            )

    def _check_fop_warnings(self):
        """Check Front-of-Pack (FOP) warning thresholds."""
        per_100g = {}
        for nid, data in self.nutrition_data.items():
            per_100g[data['nutrient'].name] = data.get('per_100g', 0)

        total_fat = per_100g.get('Total Fat', 0)
        sat_fat = per_100g.get('Saturated Fat', 0)
        sugars = per_100g.get('Total Sugars', 0)
        sodium = per_100g.get('Sodium', 0)

        if total_fat > self.HIGH_FAT_THRESHOLD:
            self.warnings.append(
                f"HIGH IN FAT: Total fat ({total_fat}g/100g) exceeds "
                f"threshold ({self.HIGH_FAT_THRESHOLD}g/100g). "
                f"FOP warning label 'HIGH IN FAT' required."
            )

        if sat_fat > self.HIGH_SATURATED_FAT_THRESHOLD:
            self.warnings.append(
                f"HIGH IN SATURATED FAT: ({sat_fat}g/100g) exceeds "
                f"threshold ({self.HIGH_SATURATED_FAT_THRESHOLD}g/100g). "
                f"FOP warning may be required."
            )

        if sugars > self.HIGH_SUGAR_THRESHOLD:
            self.warnings.append(
                f"HIGH IN SUGAR: Total sugars ({sugars}g/100g) exceeds "
                f"threshold ({self.HIGH_SUGAR_THRESHOLD}g/100g). "
                f"FOP warning label 'HIGH IN SUGAR' required."
            )

        if sodium > self.HIGH_SODIUM_THRESHOLD:
            self.warnings.append(
                f"HIGH IN SODIUM: ({sodium}mg/100g) exceeds "
                f"threshold ({self.HIGH_SODIUM_THRESHOLD}mg/100g). "
                f"FOP warning label 'HIGH IN SODIUM/SALT' required."
            )

    def _check_ingredient_list(self):
        """Check ingredient list requirements."""
        ingredients = self.recipe.ingredients.all()
        if not ingredients.exists():
            self.issues.append(
                "INGREDIENT LIST: Recipe must have at least one ingredient. "
                "FSSAI requires full ingredient list in descending order of weight."
            )
        else:
            self.info.append(
                f"INGREDIENT LIST: {ingredients.count()} ingredients declared. "
                f"Listed in descending order of composition by weight as required."
            )

    def _check_allergen_declaration(self):
        """Check allergen information."""
        if not self.recipe.allergen_info:
            self.warnings.append(
                "ALLERGEN DECLARATION: No allergen information provided. "
                "FSSAI requires declaration of common allergens (milk, nuts, "
                "gluten, soy, eggs, fish, crustaceans, etc.) if present."
            )
        else:
            self.info.append("ALLERGEN DECLARATION: Provided.")

    def _check_fssai_license(self):
        """Check FSSAI license number format."""
        lic = self.recipe.fssai_license.strip()
        if not lic:
            self.warnings.append(
                "FSSAI LICENSE: No FSSAI license number provided. "
                "Required on all packaged food products."
            )
        elif len(lic) != 14 or not lic.isdigit():
            self.warnings.append(
                f"FSSAI LICENSE: '{lic}' may not be valid. "
                f"FSSAI license numbers are typically 14 digits."
            )
        else:
            self.info.append(f"FSSAI LICENSE: {lic} (format valid).")

    def _check_trans_fat(self):
        """Check trans fat declaration (FSSAI special requirement)."""
        for nid, data in self.nutrition_data.items():
            if data['nutrient'].name == 'Trans Fat':
                per_100g = data.get('per_100g', 0)
                # FSSAI mandates trans fat should not exceed 2% of total fat
                total_fat_per_100g = 0
                for nid2, data2 in self.nutrition_data.items():
                    if data2['nutrient'].name == 'Total Fat':
                        total_fat_per_100g = data2.get('per_100g', 0)
                        break
                if total_fat_per_100g > 0 and per_100g > 0:
                    trans_pct = (per_100g / total_fat_per_100g) * 100
                    if trans_pct > 2:
                        self.warnings.append(
                            f"TRANS FAT: {per_100g}g/100g ({trans_pct:.1f}% of total fat). "
                            f"FSSAI sets a limit on industrial trans fat."
                        )
                return

    def _format_notes(self):
        """Format all notes into a readable string."""
        lines = []
        if self.issues:
            lines.append("=== COMPLIANCE ISSUES (Must Fix) ===")
            for i, issue in enumerate(self.issues, 1):
                lines.append(f"  {i}. {issue}")
        if self.warnings:
            lines.append("\n=== WARNINGS (Recommended) ===")
            for i, w in enumerate(self.warnings, 1):
                lines.append(f"  {i}. {w}")
        if self.info:
            lines.append("\n=== INFO ===")
            for i, info in enumerate(self.info, 1):
                lines.append(f"  {i}. {info}")
        if not self.issues and not self.warnings:
            lines.append("✓ All FSSAI compliance checks passed.")
        return '\n'.join(lines)

    def get_fop_indicators(self):
        """
        Returns Front-of-Pack color indicators (traffic light system).
        Returns list of dicts: {nutrient, value, level, color}
        """
        per_100g = {}
        for nid, data in self.nutrition_data.items():
            per_100g[data['nutrient'].name] = data.get('per_100g', 0)

        indicators = []
        checks = [
            ('Total Fat', self.HIGH_FAT_THRESHOLD, 'g'),
            ('Saturated Fat', self.HIGH_SATURATED_FAT_THRESHOLD, 'g'),
            ('Total Sugars', self.HIGH_SUGAR_THRESHOLD, 'g'),
            ('Sodium', self.HIGH_SODIUM_THRESHOLD, 'mg'),
        ]

        for nutrient_name, threshold, unit in checks:
            value = per_100g.get(nutrient_name, 0)
            if value > threshold:
                level, color = 'HIGH', 'red'
            elif value > threshold * 0.5:
                level, color = 'MEDIUM', 'amber'
            else:
                level, color = 'LOW', 'green'

            indicators.append({
                'nutrient': nutrient_name,
                'value': value,
                'unit': unit,
                'level': level,
                'color': color,
            })

        return indicators

    def get_ai_recommendations(self):
        """
        Use Mistral AI to generate actionable compliance
        recommendations based on the current issues, warnings, and nutrition data.
        Returns a dict with 'recommendations' (list of strings) and 'summary' (string).
        """
        try:
            from .ai_utils import ai_chat_json
        except Exception:
            return {'recommendations': [], 'summary': '', 'ai_powered': False}

        # Build context for the AI
        per_100g = {}
        for nid, data in self.nutrition_data.items():
            per_100g[data['nutrient'].name] = {
                'value': data.get('per_100g', 0),
                'unit': data['nutrient'].unit if hasattr(data['nutrient'], 'unit') else 'g',
            }

        prompt = (
            "You are an FSSAI food labelling compliance expert.\n\n"
            f"Product: {self.recipe.name}\n"
            f"Brand: {self.recipe.brand_name}\n"
            f"Serving Size: {self.recipe.serving_size}{self.recipe.serving_unit}\n\n"
            f"Nutrition per 100g:\n"
            + "\n".join(f"  - {k}: {v['value']}{v['unit']}" for k, v in per_100g.items())
            + "\n\n"
            f"Current compliance issues: {self.issues if self.issues else 'None'}\n"
            f"Current warnings: {self.warnings if self.warnings else 'None'}\n\n"
            "Provide:\n"
            "1. A brief compliance summary (1-2 sentences).\n"
            "2. Up to 5 specific, actionable recommendations to improve FSSAI compliance.\n"
            "3. Reformulation suggestions if any nutrient is 'HIGH'.\n\n"
            "Return a JSON object with:\n"
            '  "summary": "brief compliance summary",\n'
            '  "recommendations": ["rec1", "rec2", ...]\n'
            "Return ONLY the JSON, no other text."
        )

        try:
            result = ai_chat_json(prompt, temperature=0.2, max_tokens=1024)
            if isinstance(result, dict):
                return {
                    'recommendations': result.get('recommendations', []),
                    'summary': result.get('summary', ''),
                    'ai_powered': True,
                }
        except Exception as e:
            logger.warning(f"AI compliance recommendations failed: {e}")

        return {'recommendations': [], 'summary': '', 'ai_powered': False}
