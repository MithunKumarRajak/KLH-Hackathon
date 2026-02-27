from django.urls import path
from . import views
from . import api_views

urlpatterns = [
    path('', views.home, name='home'),

    # Recipes (template views)
    path('recipes/', views.recipe_list, name='recipe_list'),
    path('recipes/create/', views.recipe_create, name='recipe_create'),
    path('recipes/parse/', views.recipe_parse, name='recipe_parse'),
    path('recipes/parse/confirm/', views.recipe_parse_confirm, name='recipe_parse_confirm'),
    path('recipes/<int:pk>/', views.recipe_detail, name='recipe_detail'),
    path('recipes/<int:pk>/edit/', views.recipe_edit, name='recipe_edit'),
    path('recipes/<int:pk>/delete/', views.recipe_delete, name='recipe_delete'),
    path('recipes/<int:pk>/label/pdf/', views.generate_label_pdf, name='generate_label_pdf'),

    # Ingredients (template views)
    path('ingredients/', views.ingredient_list, name='ingredient_list'),
    path('ingredients/<int:pk>/', views.ingredient_detail, name='ingredient_detail'),

    # Legacy API
    path('api/ingredients/search/', views.api_ingredient_search, name='api_ingredient_search'),

    # ── JSON API for React frontend ──────────────────────────────
    # Auth
    path('api/auth/login/', api_views.api_login, name='api_login'),
    path('api/auth/register/', api_views.api_register, name='api_register'),
    path('api/auth/logout/', api_views.api_logout, name='api_logout'),
    path('api/auth/refresh/', api_views.api_token_refresh, name='api_token_refresh'),
    path('api/auth/profile/', api_views.api_profile, name='api_profile'),
    path('api/auth/google/', api_views.api_google_login, name='api_google_login'),

    # Dashboard
    path('api/dashboard/', api_views.api_dashboard, name='api_dashboard'),

    # Recipes
    path('api/recipes/', api_views.api_recipe_list, name='api_recipe_list'),
    path('api/recipes/create/', api_views.api_recipe_create, name='api_recipe_create'),
    path('api/recipes/parse/', api_views.api_recipe_parse, name='api_recipe_parse'),
    path('api/recipes/<int:pk>/', api_views.api_recipe_detail, name='api_recipe_detail'),
    path('api/recipes/<int:pk>/update/', api_views.api_recipe_update, name='api_recipe_update'),
    path('api/recipes/<int:pk>/delete/', api_views.api_recipe_delete, name='api_recipe_delete'),
    path('api/recipes/<int:pk>/analyze/', api_views.api_recipe_analyze, name='api_recipe_analyze'),
    path('api/recipes/<int:pk>/compliance/', api_views.api_recipe_compliance, name='api_recipe_compliance'),
    path('api/recipes/<int:pk>/label/', api_views.api_recipe_label, name='api_recipe_label'),
    path('api/recipes/<int:pk>/export/', api_views.api_recipe_export, name='api_recipe_export'),
    path('api/recipes/<int:pk>/export/download/', api_views.api_recipe_export_download, name='api_recipe_export_download'),
    path('api/recipes/<int:pk>/versions/', api_views.api_recipe_versions, name='api_recipe_versions'),

    # Unified Auto-Analyze (Level 1+2)
    path('api/auto-analyze/', api_views.api_auto_analyze, name='api_auto_analyze'),

    # Live Recalculation (Level 3)
    path('api/live-calculate/', api_views.api_live_calculate, name='api_live_calculate'),

    # AI
    path('api/ai/analyze/', api_views.api_ai_analyze, name='api_ai_analyze'),

    # Allergen Detection
    path('api/allergens/detect/', api_views.api_detect_allergens, name='api_detect_allergens'),

    # Batch Upload
    path('api/recipes/batch-upload/', api_views.api_batch_upload, name='api_batch_upload'),

    # Regulatory Alerts
    path('api/regulatory-alerts/', api_views.api_regulatory_alerts, name='api_regulatory_alerts'),

    # User Settings & Defaults
    path('api/settings/', api_views.api_user_settings, name='api_user_settings'),
    path('api/defaults/', api_views.api_user_defaults, name='api_user_defaults'),

    # Ingredients
    path('api/ingredients/', api_views.api_ingredient_list, name='api_ingredient_list'),
    path('api/ingredients/<int:pk>/', api_views.api_ingredient_detail, name='api_ingredient_detail'),
    path('api/ingredients/search/v2/', api_views.api_ingredient_search, name='api_ingredient_search_v2'),

    # Translation
    path('api/translate/', api_views.api_translate_label, name='api_translate_label'),

    # Smart Reformulation
    path('api/reformulate/', api_views.api_reformulate, name='api_reformulate'),

    # Share (WhatsApp/Email)
    path('api/share/', api_views.api_share_label, name='api_share_label'),

    # Batch Process All
    path('api/batch-process/', api_views.api_batch_process, name='api_batch_process'),

    # Smart Suggestions
    path('api/suggest-recipe-name/', api_views.api_suggest_recipe_name, name='api_suggest_recipe_name'),
    path('api/suggest-ingredients/', api_views.api_suggest_ingredients, name='api_suggest_ingredients'),
]
