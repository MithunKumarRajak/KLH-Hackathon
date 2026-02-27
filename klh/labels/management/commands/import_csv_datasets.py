"""
Management command to import CSV datasets into the database.
Handles:
  - Indian_Food_Nutrition_Processed.csv  (1,015 Indian dishes)
    **Source**: [DATA SOURCE TO BE VERIFIED]
    **Status**: Demo/Sample data - requires verification for production use
  
  - Food_Nutrition_Dataset.csv           (206 general food items)
    **Source**: [DATA SOURCE TO BE VERIFIED]
    **Status**: Demo/Sample data - requires verification for production use

Uses bulk_create inside atomic transactions for speed on SQLite.

⚠️  DISCLAIMER FOR PRODUCTION USE:
CSV data is not verified against official nutritional databases.
For production labels, validate all data against:
  - USDA FoodData Central
  - Indian Food Composition Tables (IFCT) 2017
  - FSSAI-approved sources
"""
import csv
import os

from django.core.management.base import BaseCommand
from django.db import transaction
from labels.models import (
    NutrientCategory, Nutrient, IngredientCategory,
    Ingredient, IngredientNutrient,
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)))
DATASET_DIR = os.path.join(BASE_DIR, 'dataset')


class Command(BaseCommand):
    help = 'Import CSV nutrition datasets into the Ingredient database'

    def handle(self, *args, **options):
        self._ensure_nutrients()
        self._import_indian_dataset()
        self._import_food_dataset()
        total = Ingredient.objects.count()
        self.stdout.write(self.style.SUCCESS(
            f'CSV import complete! Total ingredients in DB: {total}'
        ))

    def _ensure_nutrients(self):
        """Create Folate nutrient if missing (needed by Indian dataset)."""
        vitamins, _ = NutrientCategory.objects.get_or_create(
            name='Vitamins', defaults={'display_order': 6}
        )
        Nutrient.objects.get_or_create(
            name='Folate',
            defaults={
                'unit': 'µg',
                'category': vitamins,
                'daily_value': 400,
                'display_order': 4,
                'is_mandatory': False,
            },
        )
        self.stdout.write('  Nutrients verified.')

    def _nutrient_map(self):
        all_nutrients = {n.name: n for n in Nutrient.objects.all()}
        return {
            'energy':       all_nutrients.get('Energy'),
            'protein':      all_nutrients.get('Protein'),
            'fat':          all_nutrients.get('Total Fat'),
            'carbohydrate': all_nutrients.get('Total Carbohydrate'),
            'sugar':        all_nutrients.get('Total Sugars'),
            'fibre':        all_nutrients.get('Dietary Fibre'),
            'sodium':       all_nutrients.get('Sodium'),
            'calcium':      all_nutrients.get('Calcium'),
            'iron':         all_nutrients.get('Iron'),
            'vitamin_c':    all_nutrients.get('Vitamin C'),
            'folate':       all_nutrients.get('Folate'),
        }

    # ------------------------------------------------------------------
    # Indian Food Nutrition Processed  (1015 rows)
    # ------------------------------------------------------------------
    @transaction.atomic
    def _import_indian_dataset(self):
        path = os.path.join(DATASET_DIR, 'Indian_Food_Nutrition_Processed.csv')
        if not os.path.exists(path):
            self.stderr.write(f'  Skipping: {path} not found')
            return

        nmap = self._nutrient_map()
        category, _ = IngredientCategory.objects.get_or_create(name='Indian Dishes')
        existing = set(Ingredient.objects.values_list('name', flat=True))

        col_map = {
            'Calories (kcal)':    'energy',
            'Carbohydrates (g)':  'carbohydrate',
            'Protein (g)':        'protein',
            'Fats (g)':           'fat',
            'Free Sugar (g)':     'sugar',
            'Fibre (g)':          'fibre',
            'Sodium (mg)':        'sodium',
            'Calcium (mg)':       'calcium',
            'Iron (mg)':          'iron',
            'Vitamin C (mg)':     'vitamin_c',
            'Folate (µg)':        'folate',
        }

        rows = []
        with open(path, newline='', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                name = row.get('Dish Name', '').strip()
                if name and name not in existing:
                    rows.append(row)
                    existing.add(name)

        # Bulk-create ingredients
        new_ingredients = [
            Ingredient(name=r['Dish Name'].strip(), category=category)
            for r in rows
        ]
        Ingredient.objects.bulk_create(new_ingredients, ignore_conflicts=True)

        # Re-fetch to get PKs
        name_to_ing = {
            i.name: i
            for i in Ingredient.objects.filter(
                name__in=[r['Dish Name'].strip() for r in rows]
            )
        }

        # Collect all nutrient values
        nutrient_objs = []
        for row in rows:
            ing = name_to_ing.get(row['Dish Name'].strip())
            if not ing:
                continue
            for col, key in col_map.items():
                nutrient = nmap.get(key)
                if not nutrient:
                    continue
                raw = row.get(col, '').strip()
                try:
                    val = float(raw)
                except (ValueError, TypeError):
                    continue
                if val < 0:
                    continue
                nutrient_objs.append(
                    IngredientNutrient(
                        ingredient=ing,
                        nutrient=nutrient,
                        value_per_100g=val,
                    )
                )

        IngredientNutrient.objects.bulk_create(nutrient_objs, ignore_conflicts=True)
        self.stdout.write(
            f'  Indian dataset: {len(new_ingredients)} ingredients, '
            f'{len(nutrient_objs)} nutrient values'
        )

    # ------------------------------------------------------------------
    # Food Nutrition Dataset  (206 rows)
    # ------------------------------------------------------------------
    @transaction.atomic
    def _import_food_dataset(self):
        path = os.path.join(DATASET_DIR, 'Food_Nutrition_Dataset.csv')
        if not os.path.exists(path):
            self.stderr.write(f'  Skipping: {path} not found')
            return

        nmap = self._nutrient_map()
        existing = set(Ingredient.objects.values_list('name', flat=True))

        col_map = {
            'calories':  'energy',
            'protein':   'protein',
            'carbs':     'carbohydrate',
            'fat':       'fat',
            'iron':      'iron',
            'vitamin_c': 'vitamin_c',
        }

        # Pre-create all categories
        rows = []
        cat_names = set()
        with open(path, newline='', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                name = row.get('food_name', '').strip()
                cat = row.get('category', '').strip() or 'General'
                cat_names.add(cat)
                if name and name not in existing:
                    rows.append(row)
                    existing.add(name)

        for cn in cat_names:
            IngredientCategory.objects.get_or_create(name=cn)
        cat_map = {c.name: c for c in IngredientCategory.objects.all()}

        new_ingredients = [
            Ingredient(
                name=r['food_name'].strip(),
                category=cat_map.get(r.get('category', '').strip() or 'General'),
            )
            for r in rows
        ]
        Ingredient.objects.bulk_create(new_ingredients, ignore_conflicts=True)

        name_to_ing = {
            i.name: i
            for i in Ingredient.objects.filter(
                name__in=[r['food_name'].strip() for r in rows]
            )
        }

        nutrient_objs = []
        for row in rows:
            ing = name_to_ing.get(row['food_name'].strip())
            if not ing:
                continue
            for col, key in col_map.items():
                nutrient = nmap.get(key)
                if not nutrient:
                    continue
                raw = row.get(col, '').strip()
                try:
                    val = float(raw)
                except (ValueError, TypeError):
                    continue
                if val < 0:
                    continue
                nutrient_objs.append(
                    IngredientNutrient(
                        ingredient=ing,
                        nutrient=nutrient,
                        value_per_100g=val,
                    )
                )

        IngredientNutrient.objects.bulk_create(nutrient_objs, ignore_conflicts=True)
        self.stdout.write(
            f'  Food dataset: {len(new_ingredients)} ingredients, '
            f'{len(nutrient_objs)} nutrient values'
        )
