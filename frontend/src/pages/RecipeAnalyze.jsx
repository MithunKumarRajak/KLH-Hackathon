import React, { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { gsap } from 'gsap'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, LabelList
} from 'recharts'
import {
  ArrowRight, BarChart3, Flame, Droplets, Wheat,
  Dumbbell, Heart, Leaf, ChevronRight, RefreshCw,
  Languages, Share2, MessageCircle, Mail, Zap, CheckCircle
} from 'lucide-react'
import { SectionHeading } from '../components/UIComponents'
import { recipeAPI, aiAPI, shareAPI } from '../services/api'
import './RecipeAnalyze.css'

// Calorie-weighted macro colors: Fat=orange, Net Carbs=blue, Protein=green, Fibre=teal
const MACRO_COLOR_MAP = { Fat: '#f97316', 'Net Carbs': '#3b82f6', Protein: '#22c55e', Fibre: '#14b8a6' }
const FOP_COLORS = { HIGH: '#dc2626', MEDIUM: '#d97706', LOW: '#16a34a' }

const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const { name, value, payload: p } = payload[0]
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <p style={{ fontWeight: 700, marginBottom: 2 }}>{name}</p>
      <p>{p.grams}g / serving &nbsp;·&nbsp; {value} kcal</p>
      <p style={{ color: '#6b7280' }}>{p.pct}% of calories per serving</p>
      {p.dv != null && <p style={{ color: '#3b82f6' }}>{p.dv}% of Daily Value</p>}
    </div>
  )
}

export default function RecipeAnalyze() {
  const { id } = useParams()
  const tableRef = useRef(null)
  const [recipe, setRecipe] = useState(null)
  const [nutrition, setNutrition] = useState([])
  const [fop, setFop] = useState([])
  const [loading, setLoading] = useState(true)

  // Reformulation
  const [reformLoading, setReformLoading] = useState(false)
  const [reformResult, setReformResult] = useState(null)

  // Translation
  const [transLang, setTransLang] = useState('hindi')
  const [transLoading, setTransLoading] = useState(false)
  const [transResult, setTransResult] = useState(null)

  // Share
  const [shareMsg, setShareMsg] = useState('')

  useEffect(() => {
    recipeAPI.analyze(id).then(res => {
      setRecipe(res.data.recipe)
      setNutrition(res.data.nutrition || [])
      setFop(res.data.fop_indicators || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (loading) return
    gsap.fromTo('.analyze-card, .chart-panel',
      { opacity: 0, y: 25 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out', delay: 0.2 }
    )
    gsap.fromTo(tableRef.current?.querySelectorAll('tr') || [],
      { opacity: 0, x: -10 },
      { opacity: 1, x: 0, duration: 0.4, stagger: 0.04, ease: 'power3.out', delay: 0.5 }
    )
  }, [loading])

  const handleReformulate = async () => {
    setReformLoading(true)
    try {
      const res = await aiAPI.reformulate({ recipe_id: parseInt(id) })
      setReformResult(res.data)
    } catch { setReformResult({ error: true }) }
    finally { setReformLoading(false) }
  }

  const handleTranslate = async () => {
    setTransLoading(true)
    try {
      const res = await aiAPI.translate({ recipe_id: parseInt(id), language: transLang })
      setTransResult(res.data)
    } catch { setTransResult({ error: true }) }
    finally { setTransLoading(false) }
  }

  const handleShare = (channel) => {
    shareAPI.share({ recipe_id: parseInt(id), channel }).then(res => {
      window.open(res.data.share_url, '_blank')
      setShareMsg(`Shared via ${channel}!`)
      setTimeout(() => setShareMsg(''), 3000)
    }).catch(() => setShareMsg('Share failed'))
  }

  if (loading) return <div className="recipe-analyze"><div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>Loading analysis...</div></div>
  if (!recipe) return <div className="recipe-analyze"><div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>Recipe not found</div></div>

  const energy = nutrition.find(n => n.name.toLowerCase() === 'energy')
  const fat = nutrition.find(n => n.name.toLowerCase() === 'total fat')
  const carbs = nutrition.find(n => n.name.toLowerCase() === 'total carbohydrate')
  const protein = nutrition.find(n => n.name.toLowerCase() === 'protein')
  const fibre = nutrition.find(n => n.name.toLowerCase() === 'dietary fibre')

  // Use per_serving values so pie chart grams match the per-serving context
  // NOTE: "Total Carbohydrate" already includes Dietary Fibre.
  // To avoid double-counting fibre calories, subtract fibre from carbs:
  //   Net Carbs (non-fibre) × 4 kcal/g + Fibre × 2 kcal/g
  const fatGrams   = fat?.per_serving     || 0
  const carbsGrams = carbs?.per_serving   || 0
  const protGrams  = protein?.per_serving || 0
  const fibreGrams = fibre?.per_serving   || 0
  const netCarbGrams = Math.max(0, carbsGrams - fibreGrams)  // carbs minus fibre

  const macroGrams = {
    Fat:          fatGrams,
    'Net Carbs':  netCarbGrams,
    Protein:      protGrams,
    Fibre:        fibreGrams,
  }
  // Map macros to their %DV for cross-reference in tooltips
  const macroDV = {
    Fat:          fat?.percent_dv     ?? null,
    'Net Carbs':  carbs?.percent_dv   ?? null,   // closest %DV reference
    Protein:      protein?.percent_dv ?? null,
    Fibre:        fibre?.percent_dv   ?? null,
  }
  // Atwater calorie factors
  const KCAL_FACTOR = { Fat: 9, 'Net Carbs': 4, Protein: 4, Fibre: 2 }
  const macroKcal = {}
  for (const key of Object.keys(macroGrams)) {
    macroKcal[key] = macroGrams[key] * KCAL_FACTOR[key]
  }
  const macroKcalSum = Object.values(macroKcal).reduce((a, b) => a + b, 0) || 1
  // Use the actual energy value from the DB for the kcal card (more accurate
  // than the Atwater-factor sum).  Pie % uses macroKcalSum so slices sum to 100%.
  const energyPerServing = energy?.per_serving || macroKcalSum

  const MACRO_ORDER = ['Fat', 'Net Carbs', 'Protein', 'Fibre']
  const pieData = MACRO_ORDER
    .filter(name => macroKcal[name] > 0)
    .map(name => ({
      name,
      value: Math.round(macroKcal[name] * 10) / 10,
      grams: macroGrams[name].toFixed(1),
      pct:  Math.round((macroKcal[name] / macroKcalSum) * 100),
      dv:   macroDV[name] != null ? Math.round(macroDV[name] * 10) / 10 : null,
    }))

  // Bar chart — show all nutrients with a %DV, sorted descending, capped at 20 bars
  const dvData = nutrition
    .filter(n => n.percent_dv != null && n.percent_dv > 0)
    .sort((a, b) => b.percent_dv - a.percent_dv)
    .slice(0, 12)
    .map(n => ({
      name: n.name.replace('Total ', '').replace('Dietary ', ''),
      dv:   Math.round(n.percent_dv * 10) / 10,   // one decimal
      unit: n.unit,
      per:  n.per_serving,
    }))

  const hasHighFOP = fop.some(f => f.level === 'HIGH')

  const LANGUAGES = [
    { value: 'hindi', label: 'Hindi (हिन्दी)' },
    { value: 'tamil', label: 'Tamil (தமிழ்)' },
    { value: 'telugu', label: 'Telugu (తెలుగు)' },
    { value: 'kannada', label: 'Kannada (ಕನ್ನಡ)' },
    { value: 'bengali', label: 'Bengali (বাংলা)' },
    { value: 'marathi', label: 'Marathi (मराठी)' },
  ]

  return (
    <div className="recipe-analyze">
      <div className="container" style={{ maxWidth: 1100, paddingTop: 40, paddingBottom: 80 }}>
        <div className="breadcrumb">
          <Link to="/recipes">Recipes</Link>
          <ChevronRight size={14} />
          <span>{recipe.name}</span>
          <ChevronRight size={14} />
          <span className="current">Analysis</span>
        </div>

        <SectionHeading
          label={recipe.brand_name}
          title={recipe.name}
          subtitle={`Serving Size: ${recipe.serving_size}${recipe.serving_unit} — Detailed nutritional breakdown`}
          align="left"
        />

        {/* ── Row 1: Pie Chart + Bar Chart ── */}
        <div className="charts-row">
          <div className="chart-panel">
            <h3 className="card-title"><BarChart3 size={18} /> Macro Breakdown (% of Calories)</h3>
            <p style={{ fontSize: 11, color: '#6b7280', margin: '-6px 0 8px 0' }}>How your per-serving calories are split among macronutrients</p>
            {pieData.length === 0 ? (
              <p style={{ opacity: 0.5, padding: '40px 0', textAlign: 'center' }}>No macro data available</p>
            ) : (
              <div className="chart-center">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      outerRadius={100} innerRadius={50}
                      dataKey="value"
                      paddingAngle={3}
                      stroke="none"
                      label={({ name, pct }) => `${pct}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={MACRO_COLOR_MAP[entry.name] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      formatter={(value, entry) => (
                        <span style={{ fontSize: 12 }}>{value} ({entry.payload.grams}g/serving)</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {energy && (
              <div className="energy-highlight">
                <Flame size={24} strokeWidth={1.5} />
                <div>
                  <span className="energy-val">{energy.per_serving}</span>
                  <span className="energy-unit">kcal / serving</span>
                </div>
              </div>
            )}
          </div>

          <div className="chart-panel">
            <h3 className="card-title"><BarChart3 size={18} /> % Daily Value (per serving)</h3>
            <p style={{ fontSize: 11, color: '#6b7280', margin: '-6px 0 8px 0' }}>How much of daily recommended intake one serving provides</p>
            {dvData.length === 0 ? (
              <p style={{ opacity: 0.5, padding: '40px 0', textAlign: 'center' }}>No %DV data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(280, dvData.length * 28)}>
                <BarChart data={dvData} layout="vertical" margin={{ left: 10, right: 50, top: 4, bottom: 4 }}>
                  <XAxis
                    type="number"
                    domain={[0, Math.max(120, Math.ceil(Math.max(...dvData.map(d => d.dv)) / 10) * 10 + 10)]}
                    tickFormatter={v => `${v}%`}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v, _, props) => [`${v}% DV  (${props.payload.per}${props.payload.unit}/serving)`, '% Daily Value']}
                  />
                  <Bar dataKey="dv" radius={[0, 4, 4, 0]}>
                    <LabelList
                      dataKey="dv"
                      position="right"
                      formatter={v => `${v}%`}
                      style={{ fontSize: 11, fill: '#374151' }}
                    />
                    {dvData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.dv > 100 ? '#dc2626' : entry.dv > 50 ? '#d97706' : entry.dv > 20 ? '#3b82f6' : '#22c55e'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Row 2: Traffic Light FOP + Smart Reformulation ── */}
        <div className="charts-row">
          <div className="chart-panel">
            <h3 className="card-title"><Heart size={18} /> Front-of-Pack Traffic Light</h3>
            <div className="fop-traffic-grid">
              {fop.map(ind => (
                <div key={ind.nutrient} className="fop-traffic-item">
                  <div className="traffic-light">
                    <div className={`tl-dot ${ind.level === 'LOW' ? 'active' : ''}`} style={{ background: ind.level === 'LOW' ? '#16a34a' : '#e5e5e5' }} />
                    <div className={`tl-dot ${ind.level === 'MEDIUM' ? 'active' : ''}`} style={{ background: ind.level === 'MEDIUM' ? '#d97706' : '#e5e5e5' }} />
                    <div className={`tl-dot ${ind.level === 'HIGH' ? 'active' : ''}`} style={{ background: ind.level === 'HIGH' ? '#dc2626' : '#e5e5e5' }} />
                  </div>
                  <div className="tl-info">
                    <span className="tl-nutrient">{ind.nutrient}</span>
                    <span className="tl-value">{ind.value}{ind.unit}/100g</span>
                    <span className="tl-level" style={{ color: FOP_COLORS[ind.level] }}>{ind.level}</span>
                  </div>
                </div>
              ))}
              {fop.length === 0 && <p style={{ opacity: 0.5 }}>No FOP data</p>}
            </div>
          </div>

          <div className="chart-panel reform-panel">
            <h3 className="card-title"><Zap size={18} /> Smart Reformulation</h3>
            {hasHighFOP ? (
              <>
                <p className="reform-desc">
                  Analyzes which ingredients drive each HIGH nutrient and suggests
                  substitutes from the database with computed before/after estimates.
                </p>
                <button className="btn btn-primary btn-sm" onClick={handleReformulate} disabled={reformLoading}>
                  {reformLoading ? <><RefreshCw size={14} className="spin-icon" /> Analyzing ingredients…</> : <><RefreshCw size={14} /> Analyze &amp; Fix</>}
                </button>

                {/* Attribution breakdown */}
                {reformResult && !reformResult.error && reformResult.attribution && (
                  <div className="reform-attribution">
                    {Object.entries(reformResult.attribution).map(([nutrient, attr]) => (
                      <div key={nutrient} className="attr-block">
                        <div className="attr-header">
                          <span className="attr-nutrient">{nutrient}</span>
                          <span className="attr-vals">
                            <span className="attr-current">{attr.current_per_100g}{attr.unit}/100g</span>
                            <span className="attr-sep"> → threshold: </span>
                            <span className="attr-threshold">{attr.threshold}{attr.unit}</span>
                          </span>
                        </div>
                        <div className="attr-bars">
                          {attr.top_contributors.map((c, ci) => (
                            <div key={ci} className="attr-bar-row">
                              <span className="attr-ing-name">{c.ingredient}</span>
                              <div className="attr-bar-track">
                                <div
                                  className="attr-bar-fill"
                                  style={{ width: `${Math.min(c.pct_of_total, 100)}%` }}
                                />
                              </div>
                              <span className="attr-ing-pct">{c.pct_of_total}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggestions */}
                {reformResult && !reformResult.error && reformResult.suggestions?.length > 0 && (
                  <div className="reform-suggestions">
                    <p className="reform-section-label">Suggested Fixes</p>
                    {reformResult.suggestions.map((s, i) => {
                      const improved = s.after_per_100g !== null && s.before_per_100g !== null
                      const threshold = s.threshold
                      const wouldPass = improved && s.after_per_100g <= threshold
                      return (
                        <div key={i} className="reform-item">
                          <div className="reform-item-header">
                            <span className={`reform-action-badge action-${s.action}`}>{s.action?.toUpperCase()}</span>
                            <span className="reform-target-badge">{s.target_nutrient}</span>
                          </div>
                          <div className="reform-detail">
                            <div className="reform-ing-line">
                              <strong>{s.original_ingredient}</strong>
                              <span className="reform-weight-change">
                                {s.current_weight && <>{s.current_weight}g</>}
                                {s.new_weight && <> → {s.new_weight}g</>}
                              </span>
                              {s.replacement && (
                                <span className="reform-replacement"> → swap with <strong>{s.replacement}</strong></span>
                              )}
                            </div>
                            {improved && (
                              <div className="reform-before-after">
                                <span className="ba-label">Effect on {s.target_nutrient}:</span>
                                <span className="ba-before">{s.before_per_100g}{s.unit}/100g</span>
                                <span className="ba-arrow">→</span>
                                <span className={`ba-after ${wouldPass ? 'pass' : 'still-high'}`}>
                                  {s.after_per_100g}{s.unit}/100g
                                </span>
                                {wouldPass
                                  ? <span className="ba-badge pass">✓ Below threshold</span>
                                  : <span className="ba-badge warn">Still above {threshold}{s.unit}</span>
                                }
                              </div>
                            )}
                            {s.estimated_reduction_pct && (
                              <div className="reform-est-pct">
                                ~{s.estimated_reduction_pct}% reduction in {s.target_nutrient}
                              </div>
                            )}
                            <p className="reform-reason">{s.reason}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {reformResult && !reformResult.error && reformResult.suggestions?.length === 0 && (
                  <p className="reform-none">No substitutes found in the database for current ingredients.</p>
                )}
                {reformResult?.error && <p className="text-error">Analysis failed. Try again.</p>}
              </>
            ) : (
              <div className="reform-ok">
                <CheckCircle size={32} strokeWidth={1.2} />
                <p>All nutrients within FOP limits. No reformulation needed!</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Row 3: Translation + Sharing ── */}
        <div className="charts-row">
          <div className="chart-panel">
            <h3 className="card-title"><Languages size={18} /> Multi-Language Translation</h3>
            <p className="reform-desc">FSSAI requires regional language support. Translate via Mistral AI.</p>
            <div className="trans-controls">
              <select className="trans-select" value={transLang} onChange={e => { setTransLang(e.target.value); setTransResult(null) }}>
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
              <button className="btn btn-primary btn-sm" onClick={handleTranslate} disabled={transLoading}>
                {transLoading ? 'Translating...' : 'Translate'}
              </button>
            </div>
            {transResult && !transResult.error && (
              <div className="trans-result">
                <div className="trans-lang-badge">{transResult.language_display}</div>
                <pre className="trans-text">{transResult.translated}</pre>
              </div>
            )}
            {transResult?.error && <p className="text-error">Translation failed.</p>}
          </div>

          <div className="chart-panel">
            <h3 className="card-title"><Share2 size={18} /> Quick Share</h3>
            <p className="reform-desc">Share nutrition summary with stakeholders</p>
            <div className="share-buttons">
              <button className="share-btn whatsapp" onClick={() => handleShare('whatsapp')}>
                <MessageCircle size={20} /> Share on WhatsApp
              </button>
              <button className="share-btn email" onClick={() => handleShare('email')}>
                <Mail size={20} /> Share via Email
              </button>
            </div>
            {shareMsg && <p className="share-msg">{shareMsg}</p>}
          </div>
        </div>

        {/* ── Full Nutrition Table ── */}
        <div className="analyze-card" style={{ marginTop: 24 }}>
          <h3 className="card-title"><Leaf size={18} /> Complete Nutrition Information</h3>
          <div className="nutrition-table-wrap" ref={tableRef}>
            <table className="nutrition-table-full">
              <thead>
                <tr>
                  <th>Nutrient</th>
                  <th>Per Serving ({recipe.serving_size}{recipe.serving_unit})</th>
                  <th>Per 100g</th>
                  <th>%DV*</th>
                </tr>
              </thead>
              <tbody>
                {nutrition.map((n, i) => (
                  <tr key={i} className={n.is_mandatory ? 'main-row' : 'sub-row'}>
                    <td>{n.name}</td>
                    <td>{n.per_serving}{n.unit}</td>
                    <td>{n.per_100g}{n.unit}</td>
                    <td>{n.percent_dv != null ? `${n.percent_dv}%` : '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="dv-note">*%DV = % Daily Value based on 2000 kcal diet</p>
          </div>
        </div>

        <div className="analyze-actions">
          <Link to={`/recipes/${id}/compliance`} className="btn btn-primary btn-lg">
            Check Compliance <ArrowRight size={18} />
          </Link>
          <Link to={`/recipes/${id}/label`} className="btn btn-secondary btn-lg">
            Preview Label
          </Link>
        </div>
      </div>
    </div>
  )
}
