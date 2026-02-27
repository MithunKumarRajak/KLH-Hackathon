import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { gsap } from 'gsap'
import anime from 'animejs/lib/anime.es.js'
import {
  Plus, Minus, ArrowRight, Upload, Search, X, Leaf,
  Scale, Info, FileText, Zap, Sparkles, ChevronDown,
  CheckCircle, AlertTriangle, RotateCcw
} from 'lucide-react'
import { SectionHeading } from '../components/UIComponents'
import { recipeAPI, ingredientAPI, allergenAPI, settingsAPI, aiAPI } from '../services/api'
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts'
import './RecipeCreate.css'

export default function RecipeCreate() {
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState(searchParams.get('mode') || 'manual')
  const [recipe, setRecipe] = useState({
    name: '', description: '', serving_size: 100, serving_unit: 'g',
    servings_per_pack: 1, brand_name: '', manufacturer: '',
    fssai_license: '', allergen_info: '',
  })
  const [ingredients, setIngredients] = useState([{ ingredient_id: null, ingredient_name: '', weight_grams: '', unit: 'g', category: '' }])
  const [parseText, setParseText] = useState('')

  // Liquid categories/keywords → auto-switch to ml
  const LIQUID_KEYWORDS = ['water', 'milk', 'oil', 'juice', 'buttermilk', 'curd', 'yogurt', 'ghee', 'honey', 'vinegar', 'coconut milk', 'cream', 'broth', 'stock', 'soda', 'syrup', 'lemon juice', 'lime juice', 'rose water', 'kewra water', 'tamarind water']
  const LIQUID_CATEGORIES = ['Oils', 'Dairy', 'Beverages', 'Fats']
  const isLiquid = (name, category) => {
    const n = (name || '').toLowerCase()
    const c = (category || '').toLowerCase()
    return LIQUID_KEYWORDS.some(kw => n.includes(kw)) || LIQUID_CATEGORIES.some(lc => c.toLowerCase() === lc.toLowerCase())
  }
  const [searchResults, setSearchResults] = useState([])
  const [activeSearchIdx, setActiveSearchIdx] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const formRef = useRef(null)
  const searchTimeout = useRef(null)
  const navigate = useNavigate()

  // ── AI Suggestion state ──
  const [nameSuggestions, setNameSuggestions] = useState([])
  const [nameSugLoading, setNameSugLoading] = useState(false)
  const [showNameSuggestions, setShowNameSuggestions] = useState(false)
  const [ingFillLoading, setIngFillLoading] = useState(false)

  // ── Parse review state ──
  const [parseResult, setParseResult] = useState(null)  // { matched, unmatched }
  const [parseStep, setParseStep] = useState('input')   // 'input' | 'review'

  // Keyboard shortcuts: Ctrl+S → save, Ctrl+P → parse
  useKeyboardShortcuts({
    save: () => { formRef.current?.requestSubmit() },
    parse: () => { if (mode === 'parse' && parseStep === 'input') formRef.current?.requestSubmit() },
  })

  useEffect(() => {
    gsap.fromTo(formRef.current?.querySelectorAll('.form-section') || [],
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out', delay: 0.2 }
    )
    // Auto-fill saved defaults (brand, manufacturer, FSSAI)
    settingsAPI.get()
      .then(res => {
        const d = res.data.defaults || {}
        setRecipe(prev => ({
          ...prev,
          brand_name: prev.brand_name || d.default_brand_name || '',
          manufacturer: prev.manufacturer || d.default_manufacturer || '',
          fssai_license: prev.fssai_license || d.default_fssai_license || '',
          serving_size: d.default_serving_size ? Number(d.default_serving_size) : prev.serving_size,
          serving_unit: d.default_serving_unit || prev.serving_unit,
          servings_per_pack: d.default_servings_per_pack ? Number(d.default_servings_per_pack) : prev.servings_per_pack,
        }))
      })
      .catch(() => {})
  }, [])

  // ── Ingredient helpers ──
  const addIngredient = () => {
    const newList = [...ingredients, { ingredient_id: null, ingredient_name: '', weight_grams: '', unit: 'g', category: '' }]
    setIngredients(newList)
    setTimeout(() => {
      const rows = formRef.current?.querySelectorAll('.ingredient-row')
      const last = rows?.[rows.length - 1]
      if (last) {
        anime({ targets: last, opacity: [0, 1], translateX: [-20, 0], duration: 400, easing: 'easeOutExpo' })
      }
    }, 0)
  }

  const removeIngredient = (index) => {
    const rows = formRef.current?.querySelectorAll('.ingredient-row')
    const row = rows?.[index]
    if (row) {
      anime({
        targets: row, opacity: 0, translateX: 20, duration: 300, easing: 'easeInExpo',
        complete: () => setIngredients(prev => prev.filter((_, i) => i !== index))
      })
    } else {
      setIngredients(prev => prev.filter((_, i) => i !== index))
    }
  }

  const handleIngredientSearch = useCallback((query, idx) => {
    setActiveSearchIdx(idx)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await ingredientAPI.search(query || '')
        setSearchResults(res.data.results || [])
      } catch { setSearchResults([]) }
    }, query.length >= 1 ? 250 : 100)
  }, [])

  const selectIngredient = (idx, ing) => {
    const updated = [...ingredients]
    const liquid = isLiquid(ing.name, ing.category)
    updated[idx] = { ...updated[idx], ingredient_id: ing.id, ingredient_name: ing.name, category: ing.category || '', unit: liquid ? 'ml' : 'g' }
    setIngredients(updated)
    setSearchResults([])
    setActiveSearchIdx(-1)
  }

  const autoDetectAllergens = async () => {
    const names = ingredients
      .filter(i => i.ingredient_name)
      .map(i => i.ingredient_name)
    if (names.length === 0) return
    try {
      const res = await allergenAPI.detect({ ingredient_names: names })
      if (res.data.allergen_string) {
        setRecipe(prev => ({ ...prev, allergen_info: res.data.allergen_string }))
      }
    } catch { /* ignore */ }
  }

  // ── AI: Suggest Recipe Name from Ingredients ──
  const handleSuggestName = async () => {
    const names = ingredients
      .filter(i => i.ingredient_name && i.ingredient_name.length > 1)
      .map(i => i.ingredient_name)
    if (names.length < 2) {
      setError('Add at least 2 ingredients to get recipe name suggestions')
      setTimeout(() => setError(''), 3000)
      return
    }
    setNameSugLoading(true)
    setShowNameSuggestions(false)
    try {
      const res = await aiAPI.suggestRecipeName({ ingredients: names })
      const suggestions = res.data.suggestions || []
      setNameSuggestions(suggestions)
      setShowNameSuggestions(suggestions.length > 0)
    } catch {
      setError('Failed to generate suggestions. Try again.')
      setTimeout(() => setError(''), 3000)
    } finally {
      setNameSugLoading(false)
    }
  }

  const pickSuggestedName = (name) => {
    setRecipe(prev => ({ ...prev, name }))
    setShowNameSuggestions(false)
  }

  // ── AI: Auto-fill Ingredients from Recipe Name ──
  const handleAutoFillIngredients = async () => {
    if (!recipe.name || recipe.name.length < 3) {
      setError('Enter a recipe name first (at least 3 characters)')
      setTimeout(() => setError(''), 3000)
      return
    }
    setIngFillLoading(true)
    try {
      const res = await aiAPI.suggestIngredients({ recipe_name: recipe.name })
      const suggested = res.data.ingredients || []
      if (suggested.length === 0) {
        setError('No ingredients found for this recipe name')
        setTimeout(() => setError(''), 3000)
        return
      }
      const newIngList = suggested.map(s => ({
        ingredient_id: s.ingredient_id,
        ingredient_name: s.name,
        weight_grams: s.weight_grams || '',
        unit: isLiquid(s.name, s.category) ? 'ml' : 'g',
        category: s.category || '',
      }))
      setIngredients(newIngList)
      // Animate the new rows
      setTimeout(() => {
        const rows = formRef.current?.querySelectorAll('.ingredient-row')
        if (rows) {
          anime({
            targets: rows,
            opacity: [0, 1],
            translateY: [15, 0],
            delay: anime.stagger(60),
            duration: 500,
            easing: 'easeOutExpo',
          })
        }
      }, 50)
    } catch {
      setError('Failed to suggest ingredients. Try again.')
      setTimeout(() => setError(''), 3000)
    } finally {
      setIngFillLoading(false)
    }
  }

  // ── Submit: Manual Mode ──
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        ...recipe,
        ingredients: ingredients
          .filter(i => (i.ingredient_id || i.ingredient_name) && i.weight_grams)
          .map(i => ({
            ingredient_id: i.ingredient_id,
            ingredient_name: i.ingredient_name,
            weight_grams: parseFloat(i.weight_grams),
          }))
      }
      const res = await recipeAPI.create(payload)
      navigate(`/recipes/${res.data.id}/analyze`)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create recipe')
    } finally {
      setLoading(false)
    }
  }

  // ── Submit: Parse Mode (Step 1 → Parse & Review) ──
  const handleParseParse = async (e) => {
    e.preventDefault()
    if (!parseText.trim()) {
      setError('Please paste your recipe text')
      return
    }
    setError('')
    setLoading(true)
    try {
      const parseRes = await recipeAPI.parse(parseText)
      setParseResult({
        matched: parseRes.data.matched || [],
        unmatched: parseRes.data.unmatched || [],
      })
      setParseStep('review')
      // Animate review section
      setTimeout(() => {
        gsap.fromTo('.parse-review',
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
        )
      }, 50)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to parse recipe text. Check your input format.')
    } finally {
      setLoading(false)
    }
  }

  // ── Submit: Parse Mode (Step 2 → Confirm & Create) ──
  const handleParseConfirm = async () => {
    if (!parseResult) return
    setError('')
    setLoading(true)
    try {
      const payload = {
        ...recipe,
        ingredients: parseResult.matched.map(m => ({
          ingredient_id: m.ingredient_id,
          ingredient_name: m.ingredient_name,
          weight_grams: m.weight_grams,
        }))
      }
      if (!payload.name) {
        payload.name = 'Parsed Recipe'
      }
      const res = await recipeAPI.create(payload)
      navigate(`/recipes/${res.data.id}/analyze`)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create recipe from parsed data')
    } finally {
      setLoading(false)
    }
  }

  // Remove a matched item from parse review
  const removeParseItem = (idx) => {
    setParseResult(prev => ({
      ...prev,
      matched: prev.matched.filter((_, i) => i !== idx)
    }))
  }

  // Update weight in parse review
  const updateParseWeight = (idx, newWeight) => {
    setParseResult(prev => ({
      ...prev,
      matched: prev.matched.map((m, i) => i === idx ? { ...m, weight_grams: parseFloat(newWeight) || 0 } : m)
    }))
  }

  // Go back to parse input
  const resetParse = () => {
    setParseStep('input')
    setParseResult(null)
  }

  const validIngredientCount = ingredients.filter(i => i.ingredient_name && i.ingredient_name.length > 1).length

  return (
    <div className="recipe-create">
      <div className="container" style={{ maxWidth: 900, paddingTop: 40, paddingBottom: 80 }}>
        <SectionHeading
          label="New Recipe"
          title="Create Your Recipe"
          subtitle="Add ingredients manually or paste your recipe text for AI-powered parsing."
          align="left"
        />

        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button
            className={`mode-btn ${mode === 'manual' ? 'active' : ''}`}
            onClick={() => { setMode('manual'); setParseStep('input'); setParseResult(null) }}
          >
            <Scale size={16} /> Manual Entry
          </button>
          <button
            className={`mode-btn ${mode === 'parse' ? 'active' : ''}`}
            onClick={() => setMode('parse')}
          >
            <Upload size={16} /> AI Parse Text
          </button>
        </div>

        <form onSubmit={mode === 'manual' ? handleSubmit : handleParseParse} ref={formRef}>
          {error && <div className="form-error-banner">{error}</div>}

          {/* Recipe Info */}
          <div className="form-section">
            <h3 className="form-section-title">
              <FileText size={18} /> Recipe Information
            </h3>
            <div className="form-grid-2">
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">Recipe Name</label>
                <div className="input-with-action">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Masala Oats Protein Bar"
                    value={recipe.name}
                    onChange={(e) => { setRecipe({ ...recipe, name: e.target.value }); setShowNameSuggestions(false) }}
                    required
                  />
                  {mode === 'manual' && (
                    <button
                      type="button"
                      className="btn-inline-action"
                      onClick={handleAutoFillIngredients}
                      disabled={ingFillLoading || !recipe.name || recipe.name.length < 3}
                      title="Auto-fill ingredients from recipe name"
                    >
                      {ingFillLoading ? <span className="spinner-sm" /> : <><Sparkles size={13} /> Fill</>}
                    </button>
                  )}
                </div>
                {/* AI name suggestions dropdown */}
                {showNameSuggestions && nameSuggestions.length > 0 && (
                  <div className="name-suggestions-dropdown">
                    <p className="nsd-title"><Sparkles size={12} /> AI Suggestions</p>
                    {nameSuggestions.map((s, i) => (
                      <div key={i} className="nsd-item" onClick={() => pickSuggestedName(s)}>
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Brand Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Your brand name"
                  value={recipe.brand_name}
                  onChange={(e) => setRecipe({ ...recipe, brand_name: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                placeholder="Brief product description"
                rows={3}
                value={recipe.description}
                onChange={(e) => setRecipe({ ...recipe, description: e.target.value })}
              />
            </div>
            <div className="form-grid-4">
              <div className="form-group">
                <label className="form-label">Serving Size</label>
                <input
                  type="number"
                  className="form-input"
                  step="0.1"
                  min="0.1"
                  value={recipe.serving_size}
                  onChange={(e) => setRecipe({ ...recipe, serving_size: parseFloat(e.target.value) || '' })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select
                  className="form-input"
                  value={recipe.serving_unit}
                  onChange={(e) => setRecipe({ ...recipe, serving_unit: e.target.value })}
                >
                  <option value="g">Grams (g)</option>
                  <option value="ml">Milliliters (ml)</option>
                  <option value="piece">Piece(s)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Servings/Pack</label>
                <input
                  type="number"
                  className="form-input"
                  step="0.1"
                  min="0.1"
                  value={recipe.servings_per_pack}
                  onChange={(e) => setRecipe({ ...recipe, servings_per_pack: parseFloat(e.target.value) || '' })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">FSSAI License</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="14-digit number"
                  value={recipe.fssai_license}
                  onChange={(e) => setRecipe({ ...recipe, fssai_license: e.target.value })}
                />
              </div>
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Manufacturer</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Manufacturer name"
                  value={recipe.manufacturer}
                  onChange={(e) => setRecipe({ ...recipe, manufacturer: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Allergen Info</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Contains: Milk, Nuts, Gluten"
                    value={recipe.allergen_info}
                    onChange={(e) => setRecipe({ ...recipe, allergen_info: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={autoDetectAllergens}
                    title="Auto-detect allergens from ingredients"
                    style={{ whiteSpace: 'nowrap', fontSize: 12, padding: '8px 12px' }}
                  >
                    Auto-Detect
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Ingredients - Manual Mode ── */}
          {mode === 'manual' && (
            <div className="form-section">
              <div className="form-section-header">
                <h3 className="form-section-title" style={{ marginBottom: 0 }}>
                  <Leaf size={18} /> Ingredients
                </h3>
                {validIngredientCount >= 2 && (
                  <button
                    type="button"
                    className="btn-suggest-name"
                    onClick={handleSuggestName}
                    disabled={nameSugLoading}
                  >
                    {nameSugLoading ? <><span className="spinner-sm" /> Thinking...</> : <><Sparkles size={14} /> Suggest Recipe Name</>}
                  </button>
                )}
              </div>
              <div className="ingredients-list">
                {ingredients.map((ing, i) => (
                  <div key={i} className="ingredient-row">
                    <span className="ing-num">{String(i + 1).padStart(2, '0')}</span>
                    <div className="ing-search-wrap" style={{ position: 'relative' }}>
                      <Search size={14} className="ing-search-icon" />
                      <input
                        type="text"
                        className="form-input ing-name"
                        placeholder="Search ingredient..."
                        value={ing.ingredient_name}
                        onChange={(e) => {
                          const updated = [...ingredients]
                          updated[i].ingredient_name = e.target.value
                          updated[i].ingredient_id = null
                          setIngredients(updated)
                          handleIngredientSearch(e.target.value, i)
                        }}
                        onFocus={() => handleIngredientSearch(ing.ingredient_name, i)}
                        onBlur={() => setTimeout(() => { if (activeSearchIdx === i) setSearchResults([]) }, 200)}
                      />
                      {activeSearchIdx === i && searchResults.length > 0 && (
                        <div className="ing-dropdown">
                          {searchResults.map(sr => (
                            <div key={sr.id}
                              className="ing-dropdown-item"
                              onMouseDown={() => selectIngredient(i, sr)}
                            >
                              <span className="ing-dropdown-name">{sr.name}</span>
                              {sr.category && <span className="ing-dropdown-cat">{sr.category}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="ing-weight-wrap">
                      <input
                        type="number"
                        className="form-input ing-weight"
                        placeholder={ing.unit === 'ml' ? 'Volume (ml)' : 'Weight (g)'}
                        step="0.01"
                        min="0.01"
                        value={ing.weight_grams}
                        onChange={(e) => {
                          const updated = [...ingredients]
                          updated[i].weight_grams = e.target.value
                          setIngredients(updated)
                        }}
                      />
                      <span className="ing-unit-badge">{ing.unit || 'g'}</span>
                    </div>
                    <button
                      type="button"
                      className="ing-remove"
                      onClick={() => removeIngredient(i)}
                      disabled={ingredients.length === 1}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="add-ingredient-btn" onClick={addIngredient}>
                <Plus size={16} /> Add Ingredient
              </button>
            </div>
          )}

          {/* ── Parse Mode: Input Step ── */}
          {mode === 'parse' && parseStep === 'input' && (
            <div className="form-section">
              <h3 className="form-section-title">
                <Upload size={18} /> Paste Recipe Text
              </h3>
              <div className="parse-info">
                <Info size={16} />
                <span>AI will parse ingredient names and weights. Supports formats like "100g wheat flour", "2 cups milk", "salt - 5g"</span>
              </div>
              <div className="form-group">
                <textarea
                  className="form-input parse-textarea"
                  rows={10}
                  placeholder={"Paste your recipe here, one ingredient per line:\n\n100g wheat flour\n2 cups milk\n1 tbsp oil\nsalt - 5g\n50g sugar"}
                  value={parseText}
                  onChange={(e) => setParseText(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* ── Parse Mode: Review Step ── */}
          {mode === 'parse' && parseStep === 'review' && parseResult && (
            <div className="form-section parse-review">
              <h3 className="form-section-title">
                <CheckCircle size={18} /> Review Parsed Ingredients
              </h3>

              {/* Matched ingredients */}
              {parseResult.matched.length > 0 && (
                <div className="parse-matched">
                  <p className="parse-section-label">
                    <CheckCircle size={14} /> {parseResult.matched.length} Matched Ingredients
                  </p>
                  <div className="parse-table-wrap">
                    <table className="parse-table">
                      <thead>
                        <tr>
                          <th>Parsed Text</th>
                          <th>Matched To</th>
                          <th>Weight (g)</th>
                          <th>Confidence</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {parseResult.matched.map((m, i) => (
                          <tr key={i}>
                            <td className="parsed-name">{m.parsed_name}</td>
                            <td className="matched-name">{m.ingredient_name}</td>
                            <td>
                              <input
                                type="number"
                                className="parse-weight-input"
                                value={m.weight_grams}
                                onChange={(e) => updateParseWeight(i, e.target.value)}
                                step="0.1"
                                min="0.1"
                              />
                            </td>
                            <td>
                              <span className={`confidence-badge ${m.confidence >= 0.8 ? 'high' : m.confidence >= 0.5 ? 'med' : 'low'}`}>
                                {Math.round(m.confidence * 100)}%
                              </span>
                            </td>
                            <td>
                              <button type="button" className="parse-remove-btn" onClick={() => removeParseItem(i)}>
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Unmatched ingredients */}
              {parseResult.unmatched.length > 0 && (
                <div className="parse-unmatched">
                  <p className="parse-section-label warn">
                    <AlertTriangle size={14} /> {parseResult.unmatched.length} Unmatched (will be skipped)
                  </p>
                  <div className="unmatched-list">
                    {parseResult.unmatched.map((u, i) => (
                      <span key={i} className="unmatched-chip">{u.name} ({u.weight_grams}g)</span>
                    ))}
                  </div>
                </div>
              )}

              {parseResult.matched.length === 0 && (
                <div className="parse-empty">
                  <AlertTriangle size={24} />
                  <p>No ingredients could be matched to the database. Try different text.</p>
                </div>
              )}

              <div className="parse-review-actions">
                <button type="button" className="btn btn-secondary" onClick={resetParse}>
                  <RotateCcw size={16} /> Back to Edit
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleParseConfirm}
                  disabled={loading || parseResult.matched.length === 0}
                >
                  {loading ? 'Creating...' : <><CheckCircle size={16} /> Confirm & Create Recipe</>}
                </button>
              </div>
            </div>
          )}

          {/* Submit - Manual or Parse Input step */}
          {!(mode === 'parse' && parseStep === 'review') && (
            <div className="form-actions">
              <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                {loading ? 'Processing...' : (mode === 'manual' ? 'Create & Analyze Recipe' : <><Zap size={18} /> Parse & Review</>)} {!loading && mode === 'manual' && <ArrowRight size={18} />}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
