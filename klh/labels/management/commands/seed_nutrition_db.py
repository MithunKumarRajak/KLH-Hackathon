"""
Management command to seed the nutritional database with:
- Nutrient categories and nutrients (FSSAI-mandated per Food Safety and
  Standards (Labelling and Display) Regulations, 2020)
- Ingredient categories
- Common ingredients with nutritional data per 100g (IFCT/USDA-based)
  **NOTE**: Base seed data is for DEMO purposes. Production use requires
  verification against official IFCT (Indian Food Composition Tables) 2017
  Edition and/or USDA FoodData Central for accuracy.
- Sample recipes for demonstration and testing (NOT for production labels)

DATA SOURCES:
- FSSAI Daily Values: Based on Indian RDA per FSSAI Guidelines
- Ingredient Data: Adapted from IFCT 2017 and USDA FoodData Central
- Sample Recipes: Fictional demo data for testing

⚠️  PRODUCTION DISCLAIMER:
For generating official nutrition labels, verify all ingredient data
against authoritative sources before using in actual product labels.
"""
from django.core.management.base import BaseCommand
from labels.models import (
    NutrientCategory, Nutrient, IngredientCategory, Ingredient,
    IngredientNutrient, Recipe, RecipeIngredient,
)


class Command(BaseCommand):
    help = 'Seed the database with nutritional data, ingredients, and sample recipes'

    def handle(self, *args, **options):
        self.stdout.write("Seeding nutrient categories and nutrients...")
        self._seed_nutrients()
        self.stdout.write("Seeding ingredient categories...")
        self._seed_ingredient_categories()
        self.stdout.write("Seeding ingredients with nutritional data...")
        self._seed_ingredients()
        self.stdout.write("Seeding sample recipes...")
        self._seed_sample_recipes()
        self.stdout.write(self.style.SUCCESS("Database seeded successfully!"))

    def _seed_nutrients(self):
        categories_data = [
            {"name": "Energy", "display_order": 1},
            {"name": "Macronutrients", "display_order": 2},
            {"name": "Fat Breakdown", "display_order": 3},
            {"name": "Carbohydrate Breakdown", "display_order": 4},
            {"name": "Minerals", "display_order": 5},
            {"name": "Vitamins", "display_order": 6},
        ]
        cats = {}
        for cd in categories_data:
            obj, _ = NutrientCategory.objects.get_or_create(
                name=cd['name'], defaults={'display_order': cd['display_order']}
            )
            cats[cd['name']] = obj

        # FSSAI-mandated nutrients with recommended daily values (Indian RDA)
        nutrients_data = [
            # Energy
            {"name": "Energy", "unit": "kcal", "category": "Energy",
             "daily_value": 2000, "display_order": 1, "is_mandatory": True},
            # Macronutrients
            {"name": "Total Fat", "unit": "g", "category": "Macronutrients",
             "daily_value": 67, "display_order": 1, "is_mandatory": True},
            {"name": "Protein", "unit": "g", "category": "Macronutrients",
             "daily_value": 55, "display_order": 2, "is_mandatory": True},
            {"name": "Total Carbohydrate", "unit": "g", "category": "Macronutrients",
             "daily_value": 300, "display_order": 3, "is_mandatory": True},
            # Fat breakdown
            {"name": "Saturated Fat", "unit": "g", "category": "Fat Breakdown",
             "daily_value": 22, "display_order": 1, "is_mandatory": True},
            {"name": "Trans Fat", "unit": "g", "category": "Fat Breakdown",
             "daily_value": 2, "display_order": 2, "is_mandatory": True},
            {"name": "Monounsaturated Fat", "unit": "g", "category": "Fat Breakdown",
             "daily_value": None, "display_order": 3, "is_mandatory": False},
            {"name": "Polyunsaturated Fat", "unit": "g", "category": "Fat Breakdown",
             "daily_value": None, "display_order": 4, "is_mandatory": False},
            {"name": "Cholesterol", "unit": "mg", "category": "Fat Breakdown",
             "daily_value": 300, "display_order": 5, "is_mandatory": True},
            # Carb breakdown
            {"name": "Total Sugars", "unit": "g", "category": "Carbohydrate Breakdown",
             "daily_value": 50, "display_order": 1, "is_mandatory": True},
            {"name": "Added Sugars", "unit": "g", "category": "Carbohydrate Breakdown",
             "daily_value": 50, "display_order": 2, "is_mandatory": True},
            {"name": "Dietary Fibre", "unit": "g", "category": "Carbohydrate Breakdown",
             "daily_value": 25, "display_order": 3, "is_mandatory": True},
            # Minerals
            {"name": "Sodium", "unit": "mg", "category": "Minerals",
             "daily_value": 2300, "display_order": 1, "is_mandatory": True},
            {"name": "Calcium", "unit": "mg", "category": "Minerals",
             "daily_value": 1000, "display_order": 2, "is_mandatory": True},
            {"name": "Iron", "unit": "mg", "category": "Minerals",
             "daily_value": 14, "display_order": 3, "is_mandatory": True},  # Updated from 17mg to 14mg per FSSAI guidelines
            {"name": "Potassium", "unit": "mg", "category": "Minerals",
             "daily_value": 3500, "display_order": 4, "is_mandatory": True},
            # Vitamins
            {"name": "Vitamin A", "unit": "µg", "category": "Vitamins",
             "daily_value": 800, "display_order": 1, "is_mandatory": False},
            {"name": "Vitamin C", "unit": "mg", "category": "Vitamins",
             "daily_value": 90, "display_order": 2, "is_mandatory": False},
            {"name": "Vitamin D", "unit": "µg", "category": "Vitamins",
             "daily_value": 15, "display_order": 3, "is_mandatory": False},
            {"name": "Vitamin B12", "unit": "µg", "category": "Vitamins",
             "daily_value": 2.4, "display_order": 4, "is_mandatory": False},
        ]
        for nd in nutrients_data:
            Nutrient.objects.get_or_create(
                name=nd['name'],
                defaults={
                    'unit': nd['unit'],
                    'category': cats[nd['category']],
                    'daily_value': nd['daily_value'],
                    'display_order': nd['display_order'],
                    'is_mandatory': nd['is_mandatory'],
                }
            )

    def _seed_ingredient_categories(self):
        for name in [
            'Cereals & Grains', 'Pulses & Legumes', 'Vegetables', 'Fruits',
            'Dairy', 'Meat & Poultry', 'Fish & Seafood', 'Oils & Fats',
            'Nuts & Seeds', 'Spices & Condiments', 'Sweeteners',
            'Beverages', 'Bakery Ingredients', 'Others',
        ]:
            IngredientCategory.objects.get_or_create(name=name)

    def _seed_ingredients(self):
        """Seed common Indian ingredients with nutritional data per 100g."""
        cats = {c.name: c for c in IngredientCategory.objects.all()}
        nutrients = {n.name: n for n in Nutrient.objects.all()}

        # Each ingredient: (name, category, aliases, {nutrient: value_per_100g})
        ingredients_data = [
            # --- Cereals & Grains ---
            ("Wheat Flour (Atta)", "Cereals & Grains", "atta, whole wheat flour, gehun ka atta", {
                "Energy": 341, "Total Fat": 1.5, "Protein": 12.1, "Total Carbohydrate": 71.2,
                "Saturated Fat": 0.3, "Trans Fat": 0, "Total Sugars": 0.4, "Added Sugars": 0,
                "Dietary Fibre": 12.5, "Sodium": 2, "Calcium": 48, "Iron": 4.9,
                "Potassium": 363, "Cholesterol": 0,
            }),
            ("Rice (Raw, Milled)", "Cereals & Grains", "chawal, white rice, basmati", {
                "Energy": 345, "Total Fat": 0.5, "Protein": 6.8, "Total Carbohydrate": 78.2,
                "Saturated Fat": 0.1, "Trans Fat": 0, "Total Sugars": 0.1, "Added Sugars": 0,
                "Dietary Fibre": 0.2, "Sodium": 5, "Calcium": 10, "Iron": 0.7,
                "Potassium": 115, "Cholesterol": 0,
            }),
            ("Oats", "Cereals & Grains", "rolled oats, oatmeal, jau", {
                "Energy": 389, "Total Fat": 6.9, "Protein": 16.9, "Total Carbohydrate": 66.3,
                "Saturated Fat": 1.2, "Trans Fat": 0, "Total Sugars": 0.0, "Added Sugars": 0,
                "Dietary Fibre": 10.6, "Sodium": 2, "Calcium": 54, "Iron": 4.7,
                "Potassium": 429, "Cholesterol": 0,
            }),
            ("Maida (Refined Flour)", "Cereals & Grains", "all purpose flour, maida", {
                "Energy": 348, "Total Fat": 0.9, "Protein": 11.0, "Total Carbohydrate": 74.1,
                "Saturated Fat": 0.2, "Trans Fat": 0, "Total Sugars": 0.3, "Added Sugars": 0,
                "Dietary Fibre": 2.7, "Sodium": 2, "Calcium": 23, "Iron": 2.7,
                "Potassium": 107, "Cholesterol": 0,
            }),
            ("Semolina (Suji/Rava)", "Cereals & Grains", "suji, rava, sooji", {
                "Energy": 348, "Total Fat": 0.8, "Protein": 10.4, "Total Carbohydrate": 74.8,
                "Saturated Fat": 0.1, "Trans Fat": 0, "Total Sugars": 0.2, "Added Sugars": 0,
                "Dietary Fibre": 3.9, "Sodium": 1, "Calcium": 16, "Iron": 1.2,
                "Potassium": 186, "Cholesterol": 0,
            }),
            # --- Pulses & Legumes ---
            ("Chana Dal (Bengal Gram Dal)", "Pulses & Legumes", "chana dal, split chickpea", {
                "Energy": 360, "Total Fat": 5.3, "Protein": 20.8, "Total Carbohydrate": 59.8,
                "Saturated Fat": 0.5, "Trans Fat": 0, "Total Sugars": 4.8, "Added Sugars": 0,
                "Dietary Fibre": 11.5, "Sodium": 37, "Calcium": 56, "Iron": 5.3,
                "Potassium": 846, "Cholesterol": 0,
            }),
            ("Toor Dal (Red Gram Dal)", "Pulses & Legumes", "arhar dal, pigeon pea, tuvar dal", {
                "Energy": 335, "Total Fat": 1.5, "Protein": 22.3, "Total Carbohydrate": 62.8,
                "Saturated Fat": 0.3, "Trans Fat": 0, "Total Sugars": 3.0, "Added Sugars": 0,
                "Dietary Fibre": 15.0, "Sodium": 28, "Calcium": 73, "Iron": 3.8,
                "Potassium": 1130, "Cholesterol": 0,
            }),
            ("Moong Dal (Green Gram Dal)", "Pulses & Legumes", "moong dal, mung bean, split green gram", {
                "Energy": 348, "Total Fat": 1.2, "Protein": 24.5, "Total Carbohydrate": 59.9,
                "Saturated Fat": 0.2, "Trans Fat": 0, "Total Sugars": 3.0, "Added Sugars": 0,
                "Dietary Fibre": 8.2, "Sodium": 30, "Calcium": 75, "Iron": 3.9,
                "Potassium": 843, "Cholesterol": 0,
            }),
            # --- Dairy ---
            ("Milk (Whole, Cow)", "Dairy", "cow milk, full cream milk, doodh", {
                "Energy": 67, "Total Fat": 3.6, "Protein": 3.2, "Total Carbohydrate": 4.7,
                "Saturated Fat": 2.1, "Trans Fat": 0.1, "Total Sugars": 4.7, "Added Sugars": 0,
                "Dietary Fibre": 0, "Sodium": 50, "Calcium": 120, "Iron": 0.1,
                "Potassium": 150, "Cholesterol": 14, "Vitamin A": 46, "Vitamin D": 1.3,
            }),
            ("Milk (Toned)", "Dairy", "toned milk, low fat milk", {
                "Energy": 50, "Total Fat": 1.5, "Protein": 3.3, "Total Carbohydrate": 5.1,
                "Saturated Fat": 0.9, "Trans Fat": 0, "Total Sugars": 5.1, "Added Sugars": 0,
                "Dietary Fibre": 0, "Sodium": 52, "Calcium": 125, "Iron": 0.1,
                "Potassium": 156, "Cholesterol": 8,
            }),
            ("Paneer", "Dairy", "cottage cheese, Indian cheese", {
                "Energy": 265, "Total Fat": 20.8, "Protein": 18.3, "Total Carbohydrate": 1.2,
                "Saturated Fat": 13.3, "Trans Fat": 0.5, "Total Sugars": 1.2, "Added Sugars": 0,
                "Dietary Fibre": 0, "Sodium": 22, "Calcium": 476, "Iron": 0.2,
                "Potassium": 100, "Cholesterol": 51,
            }),
            ("Ghee", "Dairy", "clarified butter, desi ghee", {
                "Energy": 900, "Total Fat": 99.5, "Protein": 0, "Total Carbohydrate": 0,
                "Saturated Fat": 61.9, "Trans Fat": 4.0, "Total Sugars": 0, "Added Sugars": 0,
                "Dietary Fibre": 0, "Sodium": 0, "Calcium": 0, "Iron": 0,
                "Potassium": 0, "Cholesterol": 256, "Vitamin A": 684,
            }),
            ("Curd (Yogurt)", "Dairy", "dahi, yogurt, yoghurt", {
                "Energy": 60, "Total Fat": 3.1, "Protein": 3.1, "Total Carbohydrate": 5.0,
                "Saturated Fat": 2.0, "Trans Fat": 0, "Total Sugars": 5.0, "Added Sugars": 0,
                "Dietary Fibre": 0, "Sodium": 46, "Calcium": 149, "Iron": 0.1,
                "Potassium": 234, "Cholesterol": 10,
            }),
            ("Butter", "Dairy", "makhan, unsalted butter", {
                "Energy": 717, "Total Fat": 81.0, "Protein": 0.9, "Total Carbohydrate": 0.1,
                "Saturated Fat": 51.4, "Trans Fat": 3.3, "Total Sugars": 0.1, "Added Sugars": 0,
                "Dietary Fibre": 0, "Sodium": 576, "Calcium": 24, "Iron": 0,
                "Potassium": 24, "Cholesterol": 215,
            }),
            # --- Oils & Fats ---
            ("Sunflower Oil", "Oils & Fats", "surajmukhi tel", {
                "Energy": 884, "Total Fat": 100, "Protein": 0, "Total Carbohydrate": 0,
                "Saturated Fat": 10.3, "Trans Fat": 0, "Total Sugars": 0, "Added Sugars": 0,
                "Dietary Fibre": 0, "Sodium": 0, "Calcium": 0, "Iron": 0,
                "Potassium": 0, "Cholesterol": 0, "Monounsaturated Fat": 19.5,
                "Polyunsaturated Fat": 65.7,
            }),
            ("Mustard Oil", "Oils & Fats", "sarson ka tel", {
                "Energy": 884, "Total Fat": 100, "Protein": 0, "Total Carbohydrate": 0,
                "Saturated Fat": 11.6, "Trans Fat": 0, "Total Sugars": 0, "Added Sugars": 0,
                "Dietary Fibre": 0, "Sodium": 0, "Calcium": 0, "Iron": 0,
                "Potassium": 0, "Cholesterol": 0, "Monounsaturated Fat": 59.2,
                "Polyunsaturated Fat": 21.2,
            }),
            ("Coconut Oil", "Oils & Fats", "nariyal tel", {
                "Energy": 862, "Total Fat": 100, "Protein": 0, "Total Carbohydrate": 0,
                "Saturated Fat": 82.5, "Trans Fat": 0, "Total Sugars": 0, "Added Sugars": 0,
                "Dietary Fibre": 0, "Sodium": 0, "Calcium": 0, "Iron": 0,
                "Potassium": 0, "Cholesterol": 0,
            }),
            ("Olive Oil", "Oils & Fats", "jaitoon ka tel", {
                "Energy": 884, "Total Fat": 100, "Protein": 0, "Total Carbohydrate": 0,
                "Saturated Fat": 13.8, "Trans Fat": 0, "Total Sugars": 0, "Added Sugars": 0,
                "Dietary Fibre": 0, "Sodium": 2, "Calcium": 1, "Iron": 0.6,
                "Potassium": 1, "Cholesterol": 0, "Monounsaturated Fat": 73.0,
                "Polyunsaturated Fat": 10.5,
            }),
            # --- Vegetables ---
            ("Tomato", "Vegetables", "tamatar", {
                "Energy": 20, "Total Fat": 0.1, "Protein": 0.9, "Total Carbohydrate": 3.9,
                "Saturated Fat": 0, "Trans Fat": 0, "Total Sugars": 2.6, "Added Sugars": 0,
                "Dietary Fibre": 1.2, "Sodium": 5, "Calcium": 10, "Iron": 0.3,
                "Potassium": 237, "Cholesterol": 0, "Vitamin A": 42, "Vitamin C": 14,
            }),
            ("Onion", "Vegetables", "pyaz, pyaaz", {
                "Energy": 40, "Total Fat": 0.1, "Protein": 1.1, "Total Carbohydrate": 9.3,
                "Saturated Fat": 0, "Trans Fat": 0, "Total Sugars": 4.2, "Added Sugars": 0,
                "Dietary Fibre": 1.7, "Sodium": 4, "Calcium": 23, "Iron": 0.2,
                "Potassium": 146, "Cholesterol": 0, "Vitamin C": 7.4,
            }),
            ("Potato", "Vegetables", "aloo, aaloo", {
                "Energy": 77, "Total Fat": 0.1, "Protein": 2.0, "Total Carbohydrate": 17.5,
                "Saturated Fat": 0, "Trans Fat": 0, "Total Sugars": 0.8, "Added Sugars": 0,
                "Dietary Fibre": 2.2, "Sodium": 6, "Calcium": 12, "Iron": 0.8,
                "Potassium": 421, "Cholesterol": 0, "Vitamin C": 19.7,
            }),
            ("Spinach", "Vegetables", "palak", {
                "Energy": 23, "Total Fat": 0.4, "Protein": 2.9, "Total Carbohydrate": 3.6,
                "Saturated Fat": 0.1, "Trans Fat": 0, "Total Sugars": 0.4, "Added Sugars": 0,
                "Dietary Fibre": 2.2, "Sodium": 79, "Calcium": 99, "Iron": 2.7,
                "Potassium": 558, "Cholesterol": 0, "Vitamin A": 469, "Vitamin C": 28.1,
            }),
            ("Green Peas", "Vegetables", "matar, hara matar", {
                "Energy": 81, "Total Fat": 0.4, "Protein": 5.4, "Total Carbohydrate": 14.5,
                "Saturated Fat": 0.1, "Trans Fat": 0, "Total Sugars": 5.7, "Added Sugars": 0,
                "Dietary Fibre": 5.1, "Sodium": 5, "Calcium": 25, "Iron": 1.5,
                "Potassium": 244, "Cholesterol": 0, "Vitamin A": 38, "Vitamin C": 40,
            }),
            # --- Nuts & Seeds ---
            ("Almonds", "Nuts & Seeds", "badam", {
                "Energy": 579, "Total Fat": 49.9, "Protein": 21.2, "Total Carbohydrate": 21.6,
                "Saturated Fat": 3.7, "Trans Fat": 0, "Total Sugars": 4.4, "Added Sugars": 0,
                "Dietary Fibre": 12.5, "Sodium": 1, "Calcium": 269, "Iron": 3.7,
                "Potassium": 733, "Cholesterol": 0, "Vitamin A": 0,
            }),
            ("Cashew Nuts", "Nuts & Seeds", "kaju", {
                "Energy": 553, "Total Fat": 43.8, "Protein": 18.2, "Total Carbohydrate": 30.2,
                "Saturated Fat": 7.8, "Trans Fat": 0, "Total Sugars": 5.9, "Added Sugars": 0,
                "Dietary Fibre": 3.3, "Sodium": 12, "Calcium": 37, "Iron": 6.7,
                "Potassium": 660, "Cholesterol": 0,
            }),
            ("Peanuts", "Nuts & Seeds", "moongphali, groundnut", {
                "Energy": 567, "Total Fat": 49.2, "Protein": 25.8, "Total Carbohydrate": 16.1,
                "Saturated Fat": 6.8, "Trans Fat": 0, "Total Sugars": 4.7, "Added Sugars": 0,
                "Dietary Fibre": 8.5, "Sodium": 18, "Calcium": 92, "Iron": 4.6,
                "Potassium": 705, "Cholesterol": 0,
            }),
            # --- Sweeteners ---
            ("Sugar (White)", "Sweeteners", "cheeni, sucrose, table sugar", {
                "Energy": 387, "Total Fat": 0, "Protein": 0, "Total Carbohydrate": 100,
                "Saturated Fat": 0, "Trans Fat": 0, "Total Sugars": 100, "Added Sugars": 100,
                "Dietary Fibre": 0, "Sodium": 1, "Calcium": 1, "Iron": 0.1,
                "Potassium": 2, "Cholesterol": 0,
            }),
            ("Jaggery", "Sweeteners", "gur, gud", {
                "Energy": 383, "Total Fat": 0.1, "Protein": 0.4, "Total Carbohydrate": 98,
                "Saturated Fat": 0, "Trans Fat": 0, "Total Sugars": 84, "Added Sugars": 84,
                "Dietary Fibre": 0, "Sodium": 30, "Calcium": 80, "Iron": 11,
                "Potassium": 740, "Cholesterol": 0,
            }),
            ("Honey", "Sweeteners", "shahad, madh", {
                "Energy": 304, "Total Fat": 0, "Protein": 0.3, "Total Carbohydrate": 82.4,
                "Saturated Fat": 0, "Trans Fat": 0, "Total Sugars": 82.1, "Added Sugars": 82.1,
                "Dietary Fibre": 0.2, "Sodium": 4, "Calcium": 6, "Iron": 0.4,
                "Potassium": 52, "Cholesterol": 0,
            }),
            # --- Spices & Condiments ---
            ("Salt", "Spices & Condiments", "namak, table salt, iodized salt", {
                "Energy": 0, "Total Fat": 0, "Protein": 0, "Total Carbohydrate": 0,
                "Saturated Fat": 0, "Trans Fat": 0, "Total Sugars": 0, "Added Sugars": 0,
                "Dietary Fibre": 0, "Sodium": 38758, "Calcium": 24, "Iron": 0.3,
                "Potassium": 8, "Cholesterol": 0,
            }),
            ("Turmeric Powder", "Spices & Condiments", "haldi", {
                "Energy": 312, "Total Fat": 5.1, "Protein": 6.3, "Total Carbohydrate": 64.9,
                "Saturated Fat": 1.5, "Trans Fat": 0, "Total Sugars": 3.2, "Added Sugars": 0,
                "Dietary Fibre": 21.1, "Sodium": 38, "Calcium": 183, "Iron": 41.4,
                "Potassium": 2525, "Cholesterol": 0,
            }),
            ("Red Chilli Powder", "Spices & Condiments", "lal mirch powder, lal mirch", {
                "Energy": 282, "Total Fat": 12.4, "Protein": 15.0, "Total Carbohydrate": 31.6,
                "Saturated Fat": 2.1, "Trans Fat": 0, "Total Sugars": 7.2, "Added Sugars": 0,
                "Dietary Fibre": 34.8, "Sodium": 1640, "Calcium": 278, "Iron": 7.8,
                "Potassium": 1870, "Cholesterol": 0, "Vitamin A": 21600,
            }),
            ("Cumin Seeds", "Spices & Condiments", "jeera, zeera", {
                "Energy": 375, "Total Fat": 22.3, "Protein": 17.8, "Total Carbohydrate": 44.2,
                "Saturated Fat": 1.5, "Trans Fat": 0, "Total Sugars": 2.3, "Added Sugars": 0,
                "Dietary Fibre": 10.5, "Sodium": 168, "Calcium": 931, "Iron": 66.4,
                "Potassium": 1788, "Cholesterol": 0,
            }),
            ("Coriander Powder", "Spices & Condiments", "dhaniya powder", {
                "Energy": 298, "Total Fat": 17.8, "Protein": 12.4, "Total Carbohydrate": 54.9,
                "Saturated Fat": 0.9, "Trans Fat": 0, "Total Sugars": 0, "Added Sugars": 0,
                "Dietary Fibre": 41.9, "Sodium": 35, "Calcium": 709, "Iron": 16.3,
                "Potassium": 1267, "Cholesterol": 0,
            }),
            ("Ginger", "Spices & Condiments", "adrak", {
                "Energy": 80, "Total Fat": 0.8, "Protein": 1.8, "Total Carbohydrate": 17.8,
                "Saturated Fat": 0.2, "Trans Fat": 0, "Total Sugars": 1.7, "Added Sugars": 0,
                "Dietary Fibre": 2.0, "Sodium": 13, "Calcium": 16, "Iron": 0.6,
                "Potassium": 415, "Cholesterol": 0, "Vitamin C": 5.0,
            }),
            ("Garlic", "Spices & Condiments", "lahsun, lehsun", {
                "Energy": 149, "Total Fat": 0.5, "Protein": 6.4, "Total Carbohydrate": 33.1,
                "Saturated Fat": 0.1, "Trans Fat": 0, "Total Sugars": 1.0, "Added Sugars": 0,
                "Dietary Fibre": 2.1, "Sodium": 17, "Calcium": 181, "Iron": 1.7,
                "Potassium": 401, "Cholesterol": 0, "Vitamin C": 31.2,
            }),
            # --- Fruits ---
            ("Banana", "Fruits", "kela", {
                "Energy": 89, "Total Fat": 0.3, "Protein": 1.1, "Total Carbohydrate": 22.8,
                "Saturated Fat": 0.1, "Trans Fat": 0, "Total Sugars": 12.2, "Added Sugars": 0,
                "Dietary Fibre": 2.6, "Sodium": 1, "Calcium": 5, "Iron": 0.3,
                "Potassium": 358, "Cholesterol": 0, "Vitamin C": 8.7,
            }),
            ("Mango", "Fruits", "aam", {
                "Energy": 60, "Total Fat": 0.4, "Protein": 0.8, "Total Carbohydrate": 15.0,
                "Saturated Fat": 0.1, "Trans Fat": 0, "Total Sugars": 13.7, "Added Sugars": 0,
                "Dietary Fibre": 1.6, "Sodium": 1, "Calcium": 11, "Iron": 0.2,
                "Potassium": 168, "Cholesterol": 0, "Vitamin A": 54, "Vitamin C": 36.4,
            }),
            # --- Bakery Ingredients ---
            ("Baking Powder", "Bakery Ingredients", "baking soda alternative", {
                "Energy": 53, "Total Fat": 0, "Protein": 0, "Total Carbohydrate": 27.7,
                "Saturated Fat": 0, "Trans Fat": 0, "Total Sugars": 0, "Added Sugars": 0,
                "Dietary Fibre": 0, "Sodium": 10600, "Calcium": 5876, "Iron": 11.0,
                "Potassium": 20, "Cholesterol": 0,
            }),
            ("Cocoa Powder", "Bakery Ingredients", "cacao powder, dark cocoa", {
                "Energy": 228, "Total Fat": 13.7, "Protein": 19.6, "Total Carbohydrate": 57.9,
                "Saturated Fat": 8.1, "Trans Fat": 0, "Total Sugars": 1.8, "Added Sugars": 0,
                "Dietary Fibre": 33.2, "Sodium": 21, "Calcium": 128, "Iron": 13.9,
                "Potassium": 1524, "Cholesterol": 0,
            }),
            # --- Meat & Poultry ---
            ("Chicken Breast", "Meat & Poultry", "chicken breast, boneless chicken", {
                "Energy": 165, "Total Fat": 3.6, "Protein": 31.0, "Total Carbohydrate": 0,
                "Saturated Fat": 1.0, "Trans Fat": 0, "Total Sugars": 0, "Added Sugars": 0,
                "Dietary Fibre": 0, "Sodium": 74, "Calcium": 15, "Iron": 1.0,
                "Potassium": 256, "Cholesterol": 85,
            }),
            ("Mutton (Goat Meat)", "Meat & Poultry", "bakra ka gosht, goat meat", {
                "Energy": 169, "Total Fat": 7.9, "Protein": 26.3, "Total Carbohydrate": 0,
                "Saturated Fat": 3.1, "Trans Fat": 0, "Total Sugars": 0, "Added Sugars": 0,
                "Dietary Fibre": 0, "Sodium": 80, "Calcium": 16, "Iron": 2.6,
                "Potassium": 300, "Cholesterol": 75,
            }),
            ("Egg (Whole, Raw)", "Meat & Poultry", "anda, hen egg", {
                "Energy": 155, "Total Fat": 11.0, "Protein": 12.6, "Total Carbohydrate": 1.1,
                "Saturated Fat": 3.3, "Trans Fat": 0, "Total Sugars": 1.1, "Added Sugars": 0,
                "Dietary Fibre": 0, "Sodium": 124, "Calcium": 56, "Iron": 1.8,
                "Potassium": 138, "Cholesterol": 373, "Vitamin A": 160, "Vitamin D": 2.0,
            }),
            # --- Fish & Seafood ---
            ("Fish (Rohu)", "Fish & Seafood", "rohu, carp fish", {
                "Energy": 96, "Total Fat": 3.4, "Protein": 17.8, "Total Carbohydrate": 0,
                "Saturated Fat": 0.7, "Trans Fat": 0, "Total Sugars": 0, "Added Sugars": 0,
                "Dietary Fibre": 0, "Sodium": 65, "Calcium": 29, "Iron": 0.5,
                "Potassium": 333, "Cholesterol": 65,
            }),
            ("Shrimp (Prawns)", "Fish & Seafood", "jingha, jhinga, prawn", {
                "Energy": 99, "Total Fat": 0.3, "Protein": 24.0, "Total Carbohydrate": 0.2,
                "Saturated Fat": 0.1, "Trans Fat": 0, "Total Sugars": 0, "Added Sugars": 0,
                "Dietary Fibre": 0, "Sodium": 164, "Calcium": 52, "Iron": 0.2,
                "Potassium": 185, "Cholesterol": 152,
            }),
            # --- Beverages ---
            ("Tea (Black)", "Beverages", "chai, black tea, loose leaf tea", {
                "Energy": 0, "Total Fat": 0, "Protein": 0.2, "Total Carbohydrate": 0.3,
                "Saturated Fat": 0, "Trans Fat": 0, "Total Sugars": 0, "Added Sugars": 0,
                "Dietary Fibre": 0, "Sodium": 2, "Calcium": 2, "Iron": 0.1,
                "Potassium": 11, "Cholesterol": 0,
            }),
            ("Coconut Water (Fresh)", "Beverages", "nariyal pani, coconut water", {
                "Energy": 20, "Total Fat": 0.2, "Protein": 0.7, "Total Carbohydrate": 2.6,
                "Saturated Fat": 0.1, "Trans Fat": 0, "Total Sugars": 2.6, "Added Sugars": 0,
                "Dietary Fibre": 1.1, "Sodium": 105, "Calcium": 24, "Iron": 0.3,
                "Potassium": 600, "Cholesterol": 0,
            }),
            # --- Additional Vegetables ---
            ("Carrot", "Vegetables", "gajjar, gajar", {
                "Energy": 41, "Total Fat": 0.2, "Protein": 0.9, "Total Carbohydrate": 10.0,
                "Saturated Fat": 0, "Trans Fat": 0, "Total Sugars": 4.7, "Added Sugars": 0,
                "Dietary Fibre": 2.8, "Sodium": 69, "Calcium": 33, "Iron": 0.3,
                "Potassium": 320, "Cholesterol": 0, "Vitamin A": 835, "Vitamin C": 5.9,
            }),
            ("Cabbage", "Vegetables", "bandh gobi, patta gobi", {
                "Energy": 25, "Total Fat": 0.1, "Protein": 1.3, "Total Carbohydrate": 5.8,
                "Saturated Fat": 0, "Trans Fat": 0, "Total Sugars": 1.1, "Added Sugars": 0,
                "Dietary Fibre": 2.4, "Sodium": 16, "Calcium": 47, "Iron": 0.4,
                "Potassium": 246, "Cholesterol": 0, "Vitamin C": 36.6,
            }),
            ("Bell Pepper (Red)", "Vegetables", "shimla mirch, red bell pepper", {
                "Energy": 31, "Total Fat": 0.3, "Protein": 1.0, "Total Carbohydrate": 6.0,
                "Saturated Fat": 0.1, "Trans Fat": 0, "Total Sugars": 3.9, "Added Sugars": 0,
                "Dietary Fibre": 2.0, "Sodium": 4, "Calcium": 7, "Iron": 0.4,
                "Potassium": 211, "Cholesterol": 0, "Vitamin A": 117, "Vitamin C": 127.7,
            }),
            ("Broccoli", "Vegetables", "broccoli, green broccoli", {
                "Energy": 34, "Total Fat": 0.4, "Protein": 2.8, "Total Carbohydrate": 6.6,
                "Saturated Fat": 0.1, "Trans Fat": 0, "Total Sugars": 1.4, "Added Sugars": 0,
                "Dietary Fibre": 2.4, "Sodium": 64, "Calcium": 47, "Iron": 0.7,
                "Potassium": 316, "Cholesterol": 0, "Vitamin A": 49, "Vitamin C": 89.2,
            }),
            # --- Additional Fruits ---
            ("Apple", "Fruits", "seb, apple fruit", {
                "Energy": 52, "Total Fat": 0.2, "Protein": 0.3, "Total Carbohydrate": 13.8,
                "Saturated Fat": 0, "Trans Fat": 0, "Total Sugars": 10.4, "Added Sugars": 0,
                "Dietary Fibre": 2.4, "Sodium": 1, "Calcium": 6, "Iron": 0.1,
                "Potassium": 195, "Cholesterol": 0, "Vitamin A": 3, "Vitamin C": 4.6,
            }),
            ("Orange", "Fruits", "santra, orange", {
                "Energy": 47, "Total Fat": 0.3, "Protein": 0.9, "Total Carbohydrate": 11.8,
                "Saturated Fat": 0.1, "Trans Fat": 0, "Total Sugars": 9.3, "Added Sugars": 0,
                "Dietary Fibre": 2.4, "Sodium": 1, "Calcium": 40, "Iron": 0.1,
                "Potassium": 181, "Cholesterol": 0, "Vitamin A": 11, "Vitamin C": 53.2,
            }),
            ("Guava", "Fruits", "amrud, guava", {
                "Energy": 68, "Total Fat": 0.9, "Protein": 2.6, "Total Carbohydrate": 14.3,
                "Saturated Fat": 0.2, "Trans Fat": 0, "Total Sugars": 9.0, "Added Sugars": 0,
                "Dietary Fibre": 5.4, "Sodium": 2, "Calcium": 18, "Iron": 0.3,
                "Potassium": 417, "Cholesterol": 0, "Vitamin A": 31, "Vitamin C": 228.3,
            }),
            # --- Additional Nuts & Seeds ---
            ("Walnuts", "Nuts & Seeds", "akhrot, walnut", {
                "Energy": 654, "Total Fat": 65.2, "Protein": 9.1, "Total Carbohydrate": 13.7,
                "Saturated Fat": 6.1, "Trans Fat": 0, "Total Sugars": 2.6, "Added Sugars": 0,
                "Dietary Fibre": 6.7, "Sodium": 2, "Calcium": 98, "Iron": 2.9,
                "Potassium": 441, "Cholesterol": 0,
            }),
            ("Sesame Seeds", "Nuts & Seeds", "til, til ke beej, sesame", {
                "Energy": 573, "Total Fat": 50.0, "Protein": 17.7, "Total Carbohydrate": 23.5,
                "Saturated Fat": 6.9, "Trans Fat": 0, "Total Sugars": 0.3, "Added Sugars": 0,
                "Dietary Fibre": 11.8, "Sodium": 11, "Calcium": 975, "Iron": 8.8,
                "Potassium": 468, "Cholesterol": 0,
            }),
            # --- Additional Cereals ---
            ("Barley", "Cereals & Grains", "jau, barley grains", {
                "Energy": 354, "Total Fat": 2.3, "Protein": 12.5, "Total Carbohydrate": 73.5,
                "Saturated Fat": 0.4, "Trans Fat": 0, "Total Sugars": 0.8, "Added Sugars": 0,
                "Dietary Fibre": 17.3, "Sodium": 12, "Calcium": 33, "Iron": 3.6,
                "Potassium": 452, "Cholesterol": 0,
            }),
            ("Corn (Maize)", "Cereals & Grains", "makka, corn grains", {
                "Energy": 86, "Total Fat": 1.4, "Protein": 3.3, "Total Carbohydrate": 19.0,
                "Saturated Fat": 0.2, "Trans Fat": 0, "Total Sugars": 6.2, "Added Sugars": 0,
                "Dietary Fibre": 2.0, "Sodium": 35, "Calcium": 2, "Iron": 0.4,
                "Potassium": 287, "Cholesterol": 0, "Vitamin A": 9, "Vitamin C": 6.8,
            }),
            # --- Additional Pulses ---
            ("Black Gram Dal (Urad Dal)", "Pulses & Legumes", "urad dal, black gram, kali dal", {
                "Energy": 330, "Total Fat": 0.6, "Protein": 25.2, "Total Carbohydrate": 59.0,
                "Saturated Fat": 0.2, "Trans Fat": 0, "Total Sugars": 2.0, "Added Sugars": 0,
                "Dietary Fibre": 8.0, "Sodium": 24, "Calcium": 135, "Iron": 6.4,
                "Potassium": 1087, "Cholesterol": 0,
            }),
            ("Chickpea (Kabuli Chana)", "Pulses & Legumes", "kabuli chana, white chickpea", {
                "Energy": 364, "Total Fat": 6.0, "Protein": 19.0, "Total Carbohydrate": 61.3,
                "Saturated Fat": 0.6, "Trans Fat": 0, "Total Sugars": 10.0, "Added Sugars": 0,
                "Dietary Fibre": 15.5, "Sodium": 64, "Calcium": 49, "Iron": 4.3,
                "Potassium": 875, "Cholesterol": 0,
            }),
        ]

        for name, cat_name, aliases, nutrient_values in ingredients_data:
            cat = cats.get(cat_name)
            ing, created = Ingredient.objects.get_or_create(
                name=name,
                defaults={
                    'category': cat,
                    'aliases': aliases,
                }
            )
            if created:
                for nutrient_name, val in nutrient_values.items():
                    n_obj = nutrients.get(nutrient_name)
                    if n_obj:
                        IngredientNutrient.objects.get_or_create(
                            ingredient=ing, nutrient=n_obj,
                            defaults={'value_per_100g': val}
                        )

    def _seed_sample_recipes(self):
        """Create sample recipes for demo."""
        recipes = [
            {
                "name": "Masala Oats",
                "description": "A healthy Indian-style masala oats preparation",
                "serving_size": 200,
                "serving_unit": "g",
                "servings_per_pack": 2,
                "brand_name": "HealthyBites",
                "manufacturer": "HealthyBites Foods Pvt. Ltd.",
                "fssai_license": "10012345000123",
                "allergen_info": "Contains: Oats (Gluten). May contain traces of nuts.",
                "ingredients": [
                    ("Oats", 60),
                    ("Onion", 30),
                    ("Tomato", 40),
                    ("Green Peas", 25),
                    ("Mustard Oil", 10),
                    ("Salt", 3),
                    ("Turmeric Powder", 2),
                    ("Red Chilli Powder", 1),
                    ("Cumin Seeds", 1),
                ],
            },
            {
                "name": "Chocolate Banana Smoothie",
                "description": "Rich chocolate banana smoothie made with whole milk",
                "serving_size": 250,
                "serving_unit": "ml",
                "servings_per_pack": 1,
                "brand_name": "SmoothieCo",
                "manufacturer": "SmoothieCo Beverages Pvt. Ltd.",
                "fssai_license": "10012345000456",
                "allergen_info": "Contains: Milk, Cocoa. May contain traces of nuts.",
                "ingredients": [
                    ("Milk (Whole, Cow)", 200),
                    ("Banana", 100),
                    ("Cocoa Powder", 15),
                    ("Honey", 20),
                ],
            },
            {
                "name": "Paneer Butter Masala (Ready-to-Eat)",
                "description": "Creamy paneer curry in rich tomato-butter gravy",
                "serving_size": 150,
                "serving_unit": "g",
                "servings_per_pack": 2,
                "brand_name": "DesiKitchen",
                "manufacturer": "DesiKitchen Foods Pvt. Ltd.",
                "fssai_license": "10012345000789",
                "allergen_info": "Contains: Milk (Paneer, Butter, Cream). May contain traces of nuts.",
                "ingredients": [
                    ("Paneer", 100),
                    ("Tomato", 80),
                    ("Butter", 30),
                    ("Onion", 40),
                    ("Cashew Nuts", 15),
                    ("Milk (Whole, Cow)", 30),
                    ("Sunflower Oil", 15),
                    ("Ginger", 5),
                    ("Garlic", 5),
                    ("Salt", 4),
                    ("Red Chilli Powder", 3),
                    ("Turmeric Powder", 2),
                    ("Coriander Powder", 2),
                    ("Cumin Seeds", 1),
                    ("Sugar (White)", 3),
                ],
            },
        ]

        for rdata in recipes:
            ingredient_items = rdata.pop("ingredients")
            recipe, created = Recipe.objects.get_or_create(
                name=rdata['name'],
                defaults=rdata,
            )
            if created:
                for ing_name, weight in ingredient_items:
                    try:
                        ing = Ingredient.objects.get(name=ing_name)
                        RecipeIngredient.objects.get_or_create(
                            recipe=recipe, ingredient=ing,
                            defaults={'weight_grams': weight}
                        )
                    except Ingredient.DoesNotExist:
                        self.stderr.write(
                            f"  Warning: Ingredient '{ing_name}' not found, skipping."
                        )
