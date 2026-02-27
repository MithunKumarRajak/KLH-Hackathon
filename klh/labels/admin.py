from django.contrib import admin
from .models import (
    NutrientCategory, Nutrient, IngredientCategory, Ingredient,
    IngredientNutrient, Recipe, RecipeIngredient, GeneratedLabel
)


@admin.register(NutrientCategory)
class NutrientCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'display_order']
    ordering = ['display_order']


@admin.register(Nutrient)
class NutrientAdmin(admin.ModelAdmin):
    list_display = ['name', 'unit', 'category', 'daily_value', 'is_mandatory']
    list_filter = ['category', 'is_mandatory']
    search_fields = ['name']


@admin.register(IngredientCategory)
class IngredientCategoryAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']


class IngredientNutrientInline(admin.TabularInline):
    model = IngredientNutrient
    extra = 1
    autocomplete_fields = ['nutrient']


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = ['name', 'category']
    list_filter = ['category']
    search_fields = ['name', 'aliases']
    inlines = [IngredientNutrientInline]


class RecipeIngredientInline(admin.TabularInline):
    model = RecipeIngredient
    extra = 1
    autocomplete_fields = ['ingredient']


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ['name', 'brand_name', 'serving_size', 'serving_unit', 'created_at']
    search_fields = ['name', 'brand_name']
    inlines = [RecipeIngredientInline]


@admin.register(GeneratedLabel)
class GeneratedLabelAdmin(admin.ModelAdmin):
    list_display = ['recipe', 'format', 'is_fssai_compliant', 'created_at']
    list_filter = ['format', 'is_fssai_compliant']
