import React, { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { gsap } from 'gsap'
import anime from 'animejs/lib/anime.es.js'
import html2canvas from 'html2canvas'
import {
  Download, FileText, Image, Code, ChevronRight,
  CheckCircle, ArrowRight, Leaf, Database, FileJson
} from 'lucide-react'
import { SectionHeading } from '../components/UIComponents'
import { recipeAPI } from '../services/api'
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts'
import './ExportLabel.css'

const MIME_TYPES = {
  pdf: 'application/pdf',
  json: 'application/json',
  csv: 'text/csv',
  html: 'text/html',
  png: 'image/png',
}

export default function ExportLabel() {
  const { id } = useParams()
  const [selectedFormat, setSelectedFormat] = useState('pdf')
  const [exporting, setExporting] = useState(false)
  const [exported, setExported] = useState(false)
  const [error, setError] = useState('')
  const cardsRef = useRef(null)
  const successRef = useRef(null)

  const formats = [
    { id: 'pdf', name: 'PDF Document', desc: 'Print-ready, FSSAI-compliant layout', icon: FileText, size: '~85KB' },
    { id: 'png', name: 'PNG Image', desc: 'High-quality label image for packaging', icon: Image, size: '~120KB' },
    { id: 'html', name: 'HTML Embed', desc: 'Embeddable web label code', icon: Code, size: '~12KB' },
    { id: 'json', name: 'JSON Data', desc: 'Structured nutrition data for APIs', icon: FileJson, size: '~5KB' },
    { id: 'csv', name: 'CSV Spreadsheet', desc: 'Nutrition table for Excel / Sheets', icon: Database, size: '~3KB' },
  ]

  useEffect(() => {
    const cards = cardsRef.current?.querySelectorAll('.export-format-card')
    if (cards) {
      anime({
        targets: cards,
        opacity: [0, 1],
        translateY: [30, 0],
        delay: anime.stagger(120),
        duration: 700,
        easing: 'easeOutExpo',
      })
    }
  }, [])

  // Keyboard shortcuts: Ctrl+E → export
  useKeyboardShortcuts({
    exportLabel: () => { if (!exporting) handleExport() },
  })

  const handleExport = async () => {
    setExporting(true)
    setError('')
    try {
      if (selectedFormat === 'png') {
        // PNG: Fetch HTML label, render in hidden div, capture with html2canvas
        const genRes = await recipeAPI.exportLabel(id, 'html')
        const labelId = genRes.data.label_id
        const dlRes = await recipeAPI.downloadLabel(id, 'html', labelId)

        // Create hidden container to render the HTML label
        const container = document.createElement('div')
        container.style.position = 'fixed'
        container.style.left = '-9999px'
        container.style.top = '0'
        container.style.background = '#fff'
        container.style.padding = '0'
        container.innerHTML = typeof dlRes.data === 'string'
          ? dlRes.data
          : await dlRes.data.text()
        document.body.appendChild(container)

        // Capture as PNG
        const canvas = await html2canvas(container, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
        })
        document.body.removeChild(container)

        canvas.toBlob((blob) => {
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `nutrition_label_${id}.png`
          document.body.appendChild(a)
          a.click()
          a.remove()
          window.URL.revokeObjectURL(url)
        }, 'image/png')
      } else {
        // PDF, JSON, CSV, HTML: Server-side generation + download
        const genRes = await recipeAPI.exportLabel(id, selectedFormat)
        const labelId = genRes.data.label_id
        const dlRes = await recipeAPI.downloadLabel(id, selectedFormat, labelId)

        const mimeType = MIME_TYPES[selectedFormat] || 'application/octet-stream'
        const blob = new Blob([dlRes.data], { type: mimeType })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `nutrition_label_${id}.${selectedFormat}`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
      }

      setExported(true)
      if (successRef.current) {
        gsap.fromTo(successRef.current,
          { opacity: 0, scale: 0.8 },
          { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' }
        )
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="export-page">
      <div className="container" style={{ maxWidth: 800, paddingTop: 40, paddingBottom: 80 }}>
        <div className="breadcrumb">
          <Link to="/recipes">Recipes</Link>
          <ChevronRight size={14} />
          <Link to={`/recipes/${id}/label`}>Label Preview</Link>
          <ChevronRight size={14} />
          <span className="current">Export</span>
        </div>

        <SectionHeading
          label="Export"
          title="Export Nutrition Label"
          subtitle="Download your FSSAI-compliant nutrition label in your preferred format."
          align="left"
        />

        {!exported ? (
          <>
            <div className="export-formats" ref={cardsRef}>
              {formats.map((f) => (
                <div
                  key={f.id}
                  className={`export-format-card ${selectedFormat === f.id ? 'selected' : ''}`}
                  onClick={() => setSelectedFormat(f.id)}
                  style={{ opacity: 0 }}
                >
                  <div className="export-radio">
                    <div className="radio-dot" />
                  </div>
                  <div className="export-icon">
                    <f.icon size={24} strokeWidth={1.5} />
                  </div>
                  <div className="export-info">
                    <h4>{f.name}</h4>
                    <p>{f.desc}</p>
                  </div>
                  <span className="export-size">{f.size}</span>
                </div>
              ))}
            </div>

            <div className="export-details">
              <div className="export-detail-row">
                <span>Recipe ID</span>
                <span>#{id}</span>
              </div>
              <div className="export-detail-row">
                <span>Format</span>
                <span>{formats.find(f => f.id === selectedFormat)?.name}</span>
              </div>
            </div>

            {error && <p style={{ color: '#e53e3e', marginBottom: 16 }}>{error}</p>}

            <div className="export-action">
              <button
                className="btn btn-primary btn-lg"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? (
                  <>
                    <span className="export-spinner" /> Generating...
                  </>
                ) : (
                  <>
                    <Download size={18} /> Export {formats.find(f => f.id === selectedFormat)?.name}
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="export-success" ref={successRef}>
            <div className="success-icon">
              <CheckCircle size={64} strokeWidth={1} />
            </div>
            <h3>Export Successful</h3>
            <p>Your nutrition label has been downloaded.</p>

            <div className="success-actions">
              <button className="btn btn-primary btn-lg" onClick={() => { setExported(false); setError(''); }}>
                <Download size={18} /> Export Another Format
              </button>
              <Link to="/dashboard" className="btn btn-secondary btn-lg">
                Back to Dashboard <ArrowRight size={16} />
              </Link>
            </div>

            <div className="success-workflow">
              <Leaf size={18} />
              <p>Your label has been saved. Access it anytime from the recipe detail page.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
