from django import forms
from .models import Recipe, RecipeIngredient, Ingredient


class RecipeForm(forms.ModelForm):
    class Meta:
        model = Recipe
        fields = [
            'name', 'description', 'serving_size', 'serving_unit',
            'servings_per_pack', 'brand_name', 'manufacturer',
            'fssai_license', 'allergen_info',
        ]
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-control', 'placeholder': 'e.g., Masala Oats'
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-control', 'rows': 2,
                'placeholder': 'Brief product description'
            }),
            'serving_size': forms.NumberInput(attrs={
                'class': 'form-control', 'step': '0.1', 'min': '0.1'
            }),
            'serving_unit': forms.Select(attrs={'class': 'form-select'}),
            'servings_per_pack': forms.NumberInput(attrs={
                'class': 'form-control', 'step': '0.1', 'min': '0.1'
            }),
            'brand_name': forms.TextInput(attrs={
                'class': 'form-control', 'placeholder': 'Brand name'
            }),
            'manufacturer': forms.TextInput(attrs={
                'class': 'form-control', 'placeholder': 'Manufacturer name'
            }),
            'fssai_license': forms.TextInput(attrs={
                'class': 'form-control', 'placeholder': '14-digit FSSAI license'
            }),
            'allergen_info': forms.Textarea(attrs={
                'class': 'form-control', 'rows': 2,
                'placeholder': 'e.g., Contains: Milk, Nuts, Gluten'
            }),
        }


class RecipeIngredientForm(forms.ModelForm):
    class Meta:
        model = RecipeIngredient
        fields = ['ingredient', 'weight_grams']
        widgets = {
            'ingredient': forms.Select(attrs={'class': 'form-select ingredient-select'}),
            'weight_grams': forms.NumberInput(attrs={
                'class': 'form-control', 'step': '0.01', 'min': '0.01',
                'placeholder': 'Weight (g)'
            }),
        }


RecipeIngredientFormSet = forms.inlineformset_factory(
    Recipe, RecipeIngredient,
    form=RecipeIngredientForm,
    extra=5,
    can_delete=True,
    min_num=1,
    validate_min=True,
)


class RecipeParseForm(forms.Form):
    """Form for pasting a recipe in free text for AI/regex parsing."""
    recipe_text = forms.CharField(
        widget=forms.Textarea(attrs={
            'class': 'form-control',
            'rows': 10,
            'placeholder': (
                'Paste your recipe here, one ingredient per line:\n\n'
                '100g wheat flour\n'
                '2 cups milk\n'
                '1 tbsp oil\n'
                'salt - 5g\n'
                '50g sugar'
            ),
        }),
        label="Recipe Text",
        help_text="Enter ingredients with amounts. Supports formats like '100g flour', 'flour - 100g', '2 cups rice'",
    )
    recipe_name = forms.CharField(
        max_length=300,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Recipe name',
        }),
    )
    serving_size = forms.FloatField(
        initial=100,
        widget=forms.NumberInput(attrs={
            'class': 'form-control', 'step': '0.1', 'min': '0.1'
        }),
    )
    serving_unit = forms.ChoiceField(
        choices=Recipe.SERVING_UNIT_CHOICES,
        initial='g',
        widget=forms.Select(attrs={'class': 'form-select'}),
    )
    brand_name = forms.CharField(
        max_length=200, required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control', 'placeholder': 'Brand name (optional)'
        }),
    )
