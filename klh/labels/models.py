from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator


class NutrientCategory(models.Model):
    """Categories like Macronutrients, Vitamins, Minerals, etc."""
    name = models.CharField(max_length=100, unique=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name_plural = "Nutrient Categories"
        ordering = ['display_order']

    def __str__(self):
        return self.name


class Nutrient(models.Model):
    """Individual nutrients (Energy, Protein, Fat, Vitamin A, etc.)"""
    name = models.CharField(max_length=100, unique=True)
    unit = models.CharField(max_length=20, help_text="e.g., g, mg, µg, kcal")
    category = models.ForeignKey(
        NutrientCategory, on_delete=models.CASCADE, related_name='nutrients'
    )
    daily_value = models.FloatField(
        null=True, blank=True,
        help_text="FSSAI recommended daily value for %DV calculation"
    )
    display_order = models.PositiveIntegerField(default=0)
    is_mandatory = models.BooleanField(
        default=False,
        help_text="Whether this nutrient is mandatory on FSSAI labels"
    )

    class Meta:
        ordering = ['category__display_order', 'display_order']

    def __str__(self):
        return f"{self.name} ({self.unit})"


class IngredientCategory(models.Model):
    """Categories like Grains, Dairy, Meat, Vegetables, Oils, Spices, etc."""
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name_plural = "Ingredient Categories"

    def __str__(self):
        return self.name


class Ingredient(models.Model):
    """
    Master ingredient database with nutritional values per 100g.
    Data sources: IFCT (Indian Food Composition Tables) / USDA FoodData Central
    
    ⚠️  NOTE: Seed data is for demonstration. For production labels, verify
    all values against official IFCT 2017 or USDA sources before use.
    """
    name = models.CharField(max_length=200, unique=True)
    category = models.ForeignKey(
        IngredientCategory, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='ingredients'
    )
    aliases = models.TextField(
        blank=True,
        help_text="Comma-separated alternative names for fuzzy matching"
    )
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    def get_aliases_list(self):
        if not self.aliases:
            return []
        return [a.strip().lower() for a in self.aliases.split(',')]


class IngredientNutrient(models.Model):
    """Nutritional value of a nutrient per 100g of an ingredient."""
    ingredient = models.ForeignKey(
        Ingredient, on_delete=models.CASCADE, related_name='nutrients'
    )
    nutrient = models.ForeignKey(
        Nutrient, on_delete=models.CASCADE, related_name='ingredient_values'
    )
    value_per_100g = models.FloatField(
        validators=[MinValueValidator(0)],
        help_text="Amount per 100g of ingredient"
    )

    class Meta:
        unique_together = ('ingredient', 'nutrient')

    def __str__(self):
        return (
            f"{self.ingredient.name} - {self.nutrient.name}: "
            f"{self.value_per_100g} {self.nutrient.unit}/100g"
        )


class Recipe(models.Model):
    """A recipe with ingredients and their weights."""
    SERVING_UNIT_CHOICES = [
        ('g', 'grams'),
        ('ml', 'milliliters'),
        ('piece', 'piece(s)'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='recipes', null=True, blank=True,
    )
    name = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    serving_size = models.FloatField(
        default=100, validators=[MinValueValidator(0.1)],
        help_text="Serving size amount"
    )
    serving_unit = models.CharField(
        max_length=10, choices=SERVING_UNIT_CHOICES, default='g'
    )
    servings_per_pack = models.FloatField(
        default=1, validators=[MinValueValidator(0.1)],
        help_text="Number of servings per package"
    )
    brand_name = models.CharField(max_length=200, blank=True)
    manufacturer = models.CharField(max_length=300, blank=True)
    fssai_license = models.CharField(
        max_length=20, blank=True,
        help_text="FSSAI license number"
    )
    allergen_info = models.TextField(
        blank=True,
        help_text="Allergen declarations"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    @property
    def total_weight(self):
        """Total weight of all ingredients in grams."""
        return sum(ri.weight_grams for ri in self.ingredients.all())

    def calculate_nutrition(self):
        """
        Calculate total nutrition for the recipe.
        Returns dict: {nutrient_id: {nutrient, total_value, per_serving, percent_dv}}
        """
        nutrition = {}
        for ri in self.ingredients.select_related('ingredient').all():
            for inv in ri.ingredient.nutrients.select_related('nutrient').all():
                nid = inv.nutrient_id
                # value = (weight / 100) * value_per_100g
                value = (ri.weight_grams / 100.0) * inv.value_per_100g
                if nid not in nutrition:
                    nutrition[nid] = {
                        'nutrient': inv.nutrient,
                        'total_value': 0,
                    }
                nutrition[nid]['total_value'] += value

        total_wt = self.total_weight or 1
        for nid, data in nutrition.items():
            nutrient = data['nutrient']
            total = data['total_value']
            # Per serving
            per_serving = (total / total_wt) * self.serving_size
            data['per_serving'] = round(per_serving, 2)
            # Per 100g
            data['per_100g'] = round((total / total_wt) * 100, 2)
            # %DV
            if nutrient.daily_value:
                data['percent_dv'] = round(
                    (per_serving / nutrient.daily_value) * 100, 1
                )
            else:
                data['percent_dv'] = None
            data['total_value'] = round(total, 2)

        return nutrition

    def get_ingredient_list_string(self):
        """FSSAI-format ingredient list in descending order of weight."""
        items = self.ingredients.select_related('ingredient').order_by('-weight_grams')
        return ', '.join(
            f"{ri.ingredient.name} ({ri.weight_grams}g)" for ri in items
        )


class RecipeIngredient(models.Model):
    """An ingredient in a recipe with its weight."""
    recipe = models.ForeignKey(
        Recipe, on_delete=models.CASCADE, related_name='ingredients'
    )
    ingredient = models.ForeignKey(
        Ingredient, on_delete=models.CASCADE, related_name='recipe_uses'
    )
    weight_grams = models.FloatField(
        validators=[MinValueValidator(0.01)],
        help_text="Weight in grams"
    )

    class Meta:
        unique_together = ('recipe', 'ingredient')

    def __str__(self):
        return f"{self.ingredient.name} - {self.weight_grams}g"


class GeneratedLabel(models.Model):
    """Stores generated label metadata."""
    FORMAT_CHOICES = [
        ('pdf', 'PDF'),
        ('html', 'HTML'),
        ('json', 'JSON'),
        ('csv', 'CSV'),
    ]
    recipe = models.ForeignKey(
        Recipe, on_delete=models.CASCADE, related_name='labels'
    )
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES, default='pdf')
    file_path = models.CharField(max_length=500, blank=True)
    nutrition_data = models.JSONField(
        default=dict, blank=True,
        help_text="Snapshot of nutrition data at generation time"
    )
    is_fssai_compliant = models.BooleanField(default=False)
    compliance_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Label for {self.recipe.name} ({self.format}) - {self.created_at:%Y-%m-%d}"


class RecipeVersion(models.Model):
    """Auto-versioned snapshot every time a recipe is analyzed or modified."""
    recipe = models.ForeignKey(
        Recipe, on_delete=models.CASCADE, related_name='versions'
    )
    version_number = models.PositiveIntegerField(default=1)
    snapshot = models.JSONField(
        default=dict,
        help_text="Full recipe + nutrition + compliance snapshot"
    )
    is_compliant = models.BooleanField(default=False)
    change_summary = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-version_number']
        unique_together = ('recipe', 'version_number')

    def __str__(self):
        return f"{self.recipe.name} v{self.version_number}"


class UserDefaults(models.Model):
    """Persisted user defaults for recipe auto-fill."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='defaults'
    )
    default_brand_name = models.CharField(max_length=200, blank=True)
    default_manufacturer = models.CharField(max_length=300, blank=True)
    default_fssai_license = models.CharField(max_length=20, blank=True)
    default_serving_size = models.FloatField(default=100)
    default_serving_unit = models.CharField(max_length=10, default='g')
    default_servings_per_pack = models.FloatField(default=1)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "User Defaults"

    def __str__(self):
        return f"Defaults for {self.user.username}"
