import React, { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { gsap } from 'gsap'
import anime from 'animejs/lib/anime.es.js'
import {
  ArrowRight, Shield, CheckCircle, AlertTriangle,
  XCircle, Info, ChevronRight, FileText
} from 'lucide-react'
import { SectionHeading } from '../components/UIComponents'
import { recipeAPI } from '../services/api'
import './ComplianceReview.css'

export default function ComplianceReview() {
  const { id } = useParams()
  const checklistRef = useRef(null)
  const resultsRef = useRef(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    recipeAPI.compliance(id).then(res => { setData(res.data); setError(null) }).catch(err => {
      setError(err.response?.data?.error || 'Failed to load compliance data')
    }).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (loading || !data) return
    const items = checklistRef.current?.querySelectorAll('.checklist-item')
    if (items) {
      anime({ targets: items, opacity: [0, 1], translateX: [-20, 0], delay: anime.stagger(80), duration: 600, easing: 'easeOutExpo' })
    }
    gsap.fromTo(resultsRef.current?.querySelectorAll('.result-item') || [],
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out', delay: 0.5 }
    )
  }, [loading, data])

  if (loading) return <div className="compliance-review"><div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>Loading compliance...</div></div>
  if (!data) return <div className="compliance-review"><div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>{error || 'Compliance data not available'}</div></div>

  const issues = data.issues || []
  const warnings = data.warnings || []
  const info = data.info || []
  const isCompliant = data.is_compliant

  // Build checklist from compliance_notes
  const notes = data.compliance_notes || ''
  const noteLines = notes.split('\n').filter(l => l.trim())
  const checklist = noteLines.map(line => {
    const isPassed = line.includes('PASS') || line.startsWith('[OK]') || line.startsWith('OK')
    const isFail = line.includes('FAIL') || line.includes('MISSING') || line.includes('NOT ')
    return {
      label: line.replace(/^\[.*?\]\s*/, '').replace(/^(OK|PASS|FAIL|WARNING|INFO)[:\s]*/i, ''),
      status: isFail ? 'fail' : isPassed ? 'pass' : 'warn',
    }
  })

  return (
    <div className="compliance-review">
      <div className="container" style={{ maxWidth: 1000, paddingTop: 40, paddingBottom: 80 }}>
        <div className="breadcrumb">
          <Link to="/recipes">Recipes</Link>
          <ChevronRight size={14} />
          <Link to={`/recipes/${id}/analyze`}>Analysis</Link>
          <ChevronRight size={14} />
          <span className="current">Compliance</span>
        </div>

        <SectionHeading
          label="FSSAI Compliance"
          title="Compliance Review"
          subtitle="Automated validation against FSSAI Labelling & Display Regulations, 2020"
          align="left"
        />

        <div className={`compliance-banner ${isCompliant ? 'compliant' : 'non-compliant'}`}>
          <div className="banner-icon">
            {isCompliant ? <CheckCircle size={32} /> : <AlertTriangle size={32} />}
          </div>
          <div>
            <h3>{isCompliant ? 'FSSAI Compliant' : 'Compliance Issues Found'}</h3>
            <p>{isCompliant
              ? 'All mandatory checks passed. Your label is ready for review.'
              : `${issues.length} issue(s) must be resolved before the label can be considered compliant.`
            }</p>
          </div>
        </div>

        <div className="compliance-grid">
          <div className="comp-card" ref={checklistRef}>
            <h3 className="comp-card-title">
              <Shield size={18} /> FSSAI Checklist
            </h3>
            <div className="checklist">
              {checklist.length > 0 ? checklist.map((item, i) => (
                <div key={i} className="checklist-item" style={{ opacity: 0 }}>
                  <div className={`check-dot ${item.status}`}>
                    {item.status === 'pass' && <CheckCircle size={16} />}
                    {item.status === 'fail' && <XCircle size={16} />}
                    {item.status === 'warn' && <AlertTriangle size={16} />}
                  </div>
                  <span>{item.label}</span>
                  <span className={`check-status ${item.status}`}>
                    {item.status === 'pass' ? 'PASSED' : item.status === 'fail' ? 'FAILED' : 'REVIEW'}
                  </span>
                </div>
              )) : (
                <p style={{ opacity: 0.5 }}>No checklist items</p>
              )}
            </div>
          </div>

          <div className="comp-card" ref={resultsRef}>
            <h3 className="comp-card-title">
              <FileText size={18} /> Detailed Results
            </h3>

            {issues.length > 0 && (
              <div className="result-group">
                <h4 className="result-group-title error">
                  <XCircle size={14} /> Issues (Must Fix)
                </h4>
                {issues.map((item, i) => (
                  <div key={i} className="result-item error">{item}</div>
                ))}
              </div>
            )}

            {warnings.length > 0 && (
              <div className="result-group">
                <h4 className="result-group-title warning">
                  <AlertTriangle size={14} /> Warnings (Recommended)
                </h4>
                {warnings.map((item, i) => (
                  <div key={i} className="result-item warning">{item}</div>
                ))}
              </div>
            )}

            {info.length > 0 && (
              <div className="result-group">
                <h4 className="result-group-title success">
                  <CheckCircle size={14} /> Info / Passed
                </h4>
                {info.map((item, i) => (
                  <div key={i} className="result-item success">{item}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="analyze-actions">
          <Link to={`/recipes/${id}/label`} className="btn btn-primary btn-lg">
            Preview Label <ArrowRight size={18} />
          </Link>
          <Link to={`/recipes/${id}/analyze`} className="btn btn-secondary btn-lg">
            Back to Analysis
          </Link>
        </div>
      </div>
    </div>
  )
}