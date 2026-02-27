import React, { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { gsap } from 'gsap'
import {
  ArrowRight, Download, ChevronRight, Printer, Eye
} from 'lucide-react'
import { SectionHeading } from '../components/UIComponents'
import { recipeAPI } from '../services/api'
import './LabelPreview.css'

export default function LabelPreview() {
  const { id } = useParams()
  const labelRef = useRef(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    recipeAPI.labelPreview(id).then(res => { setData(res.data); setError(null) }).catch(err => {
      setError(err.response?.data?.error || 'Failed to load label preview')
    }).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!loading && data && labelRef.current) {
      gsap.fromTo(labelRef.current,
        { opacity: 0, scale: 0.95, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 0.3 }
      )
    }
  }, [loading, data])

  if (loading) return <div className="label-preview-page"><div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>Loading label...</div></div>
  if (!data) return <div className="label-preview-page"><div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>{error || 'Label data not available'}</div></div>

  const recipe = data.recipe || {}
  const nutrition = data.nutrition || []
  const ingredientList = data.ingredient_list || ''
  const fopIndicators = data.fop_indicators || []
  const isCompliant = data.is_compliant
  const nutrientCount = nutrition.length

  return (
    <div className="label-preview-page">
      <div className="container" style={{ maxWidth: 1000, paddingTop: 40, paddingBottom: 80 }}>
        <div className="breadcrumb">
          <Link to="/recipes">Recipes</Link>
          <ChevronRight size={14} />
          <Link to={`/recipes/${id}/compliance`}>Compliance</Link>
          <ChevronRight size={14} />
          <span className="current">Label Preview</span>
        </div>

        <div className="label-preview-header">
          <SectionHeading
            label="Generated Label"
            title="Nutrition Label Preview"
            subtitle="FSSAI-compliant nutrition information label ready for print"
            align="left"
          />
          <div className="label-actions-top">
            <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
              <Printer size={14} /> Print
            </button>
          </div>
        </div>

        <div className="label-preview-container">
          <div className="nutrition-label-render" ref={labelRef}>
            <div className="nl-header">
              <h2>NUTRITION INFORMATION</h2>
              {recipe.brand_name && <p className="nl-brand">{recipe.brand_name}</p>}
              <p className="nl-product">{recipe.name}</p>
            </div>

            <div className="nl-serving">
              Serving Size: {recipe.serving_size}{recipe.serving_unit} | Servings per pack: {recipe.servings_per_pack}
            </div>

            <table className="nl-table">
              <thead>
                <tr>
                  <th>Nutrient</th>
                  <th>Per Serve</th>
                  <th>Per 100g</th>
                  <th>%DV*</th>
                </tr>
              </thead>
              <tbody>
                {nutrition.map((n, i) => {
                  const isSub = n.is_sub || false
                  const isBold = n.is_mandatory || false
                  return (
                    <tr key={i} className={isSub ? 'nl-sub' : isBold ? 'nl-bold' : ''}>
                      <td>{isSub ? '\u00A0\u00A0' : ''}{n.name}</td>
                      <td>{n.per_serving} {n.unit}</td>
                      <td>{n.per_100g} {n.unit}</td>
                      <td>{n.percent_dv != null ? `${n.percent_dv}%` : '--'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <p className="nl-dv-note">*%DV = % Daily Value based on 2000 kcal diet</p>

            <div className="nl-section">
              <strong>INGREDIENTS:</strong> {ingredientList}
            </div>

            {recipe.allergen_info && (
              <div className="nl-section">
                <strong>ALLERGEN INFO:</strong> {recipe.allergen_info}
              </div>
            )}

            {fopIndicators.length > 0 && (
              <div className="nl-fop">
                {fopIndicators.map((fop, i) => (
                  <span key={i} className={`nl-fop-badge ${fop.level?.toLowerCase() || 'low'}`}>
                    {fop.nutrient}: {fop.level}
                  </span>
                ))}
              </div>
            )}

            <div className="nl-footer">
              {recipe.manufacturer && <span>Mfg: {recipe.manufacturer}</span>}
              {recipe.fssai_license && <span>FSSAI Lic: {recipe.fssai_license}</span>}
            </div>
          </div>

          <div className="label-info">
            <div className="label-info-card">
              <h4>Label Details</h4>
              <div className="info-row"><span>Format</span><span>FSSAI Standard</span></div>
              <div className="info-row"><span>Dimensions</span><span>85mm x 160mm</span></div>
              <div className="info-row"><span>Nutrients</span><span>{nutrientCount} declared</span></div>
              <div className="info-row"><span>Compliance</span><span>{isCompliant ? 'Compliant' : 'Review needed'}</span></div>
            </div>

            <div className="label-info-card">
              <h4>Export Options</h4>
              <Link to={`/recipes/${id}/export`} className="btn btn-primary" style={{ width: '100%', marginBottom: 12 }}>
                <Download size={16} /> Export Label
              </Link>
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => window.print()}>
                <Eye size={16} /> Full Screen Print
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
