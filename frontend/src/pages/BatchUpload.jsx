import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText, CheckCircle, AlertCircle, Download, ArrowRight, Cpu, BarChart3, ShieldCheck, XCircle } from 'lucide-react'
import gsap from 'gsap'
import { recipeAPI, batchAPI } from '../services/api'
import './BatchUpload.css'

export default function BatchUpload() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)
  const pageRef = useRef(null)
  const navigate = useNavigate()

  // Batch Processing state
  const [batchProcessing, setBatchProcessing] = useState(false)
  const [batchResult, setBatchResult] = useState(null)
  const [batchError, setBatchError] = useState('')

  const handleBatchProcess = async () => {
    setBatchProcessing(true)
    setBatchError('')
    setBatchResult(null)
    try {
      const res = await batchAPI.process({})
      setBatchResult(res.data)
      gsap.from('.batch-process-result', { y: 20, opacity: 0, duration: 0.5, ease: 'power3.out' })
    } catch (err) {
      setBatchError(err.response?.data?.error || 'Batch processing failed.')
    } finally {
      setBatchProcessing(false)
    }
  }

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setError(''); setResult(null) }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f && f.name.endsWith('.csv')) {
      setFile(f); setError(''); setResult(null)
    } else {
      setError('Please drop a .csv file')
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError('')
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('csv_file', file)
      const res = await recipeAPI.batchUpload(formData)
      setResult(res.data)
      gsap.from('.batch-result', { y: 20, opacity: 0, duration: 0.5, ease: 'power3.out' })
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Check your CSV format.')
    } finally {
      setUploading(false)
    }
  }

  const downloadTemplate = () => {
    const headers = 'name,description,brand_name,manufacturer,fssai_license,allergen_info,serving_size,serving_unit,servings_per_pack,ingredients'
    const example1 = 'Masala Oats,Spiced oats breakfast,Satvika Foods,"Satvika Food Products Pvt. Ltd., Bhopal",12345678901234,Contains: Wheat Gluten,50,g,4,Oats:30;Salt:1;Turmeric:0.5;Cumin:0.5'
    const example2 = 'Protein Bar,High-protein snack bar,NutriBlend India,"NutriBlend Manufacturing, Hyderabad",98765432109876,Contains: Nuts Milk,60,g,1,Peanut:20;Whey Protein:15;Oats:10;Honey:8;Almond:7'
    const csv = `${headers}\n${example1}\n${example2}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'recipe_upload_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="batch-upload-page" ref={pageRef}>
      <div className="batch-header">
        <div className="container">
          <p className="batch-label">Batch Processing</p>
          <h1 className="batch-title">CSV Recipe Upload</h1>
          <p className="batch-subtitle">
            Upload a CSV file with multiple recipes to create them all at once. Allergens are auto-detected from ingredients.
          </p>
        </div>
      </div>

      <section className="section">
        <div className="container batch-content">
          <div className="batch-template-card">
            <div className="template-info">
              <FileText size={20} />
              <div>
                <h3>Download CSV Template</h3>
                <p>Get the template with required columns and example rows</p>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={downloadTemplate}>
              <Download size={14} /> Template
            </button>
          </div>

          <div
            className={`batch-dropzone ${dragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            {file ? (
              <div className="dropzone-file-info">
                <FileText size={32} />
                <p className="dropzone-filename">{file.name}</p>
                <p className="dropzone-size">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div className="dropzone-empty">
                <Upload size={40} />
                <p>Drag & drop a CSV file here, or click to browse</p>
                <span>Supports .csv files</span>
              </div>
            )}
          </div>

          {error && <div className="batch-error"><AlertCircle size={16} /> {error}</div>}

          <div className="batch-actions">
            <button
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? 'Uploading...' : 'Upload & Process'}
              {!uploading && <ArrowRight size={16} />}
            </button>
          </div>

          {result && (
            <div className="batch-result">
              <div className="result-summary">
                <div className="result-stat success">
                  <CheckCircle size={20} />
                  <div>
                    <span className="result-num">{result.created}</span>
                    <span className="result-label">Recipes Created</span>
                  </div>
                </div>
                {result.errors > 0 && (
                  <div className="result-stat error">
                    <AlertCircle size={20} />
                    <div>
                      <span className="result-num">{result.errors}</span>
                      <span className="result-label">Errors</span>
                    </div>
                  </div>
                )}
              </div>

              {result.recipes?.length > 0 && (
                <div className="result-table-wrap">
                  <table className="result-table">
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Recipe Name</th>
                        <th>Ingredients</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.recipes.map(r => (
                        <tr key={r.id}>
                          <td>{r.row}</td>
                          <td className="result-recipe-name">{r.name}</td>
                          <td>{r.ingredients_added}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => navigate(`/recipes/${r.id}/analyze`)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {result.error_details?.length > 0 && (
                <div className="result-errors">
                  <h4>Errors</h4>
                  {result.error_details.map((e, i) => (
                    <p key={i} className="error-line">Row {e.row}: {e.error}</p>
                  ))}
                </div>
              )}

              <div className="batch-actions" style={{ marginTop: 24 }}>
                <button className="btn btn-primary" onClick={() => navigate('/recipes')}>
                  Go to Recipes <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          <div className="batch-instructions">
            <h3>CSV Format Guide</h3>
            <table className="format-table">
              <thead>
                <tr><th>Column</th><th>Required</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr><td><code>name</code></td><td>Yes</td><td>Recipe / product name</td></tr>
                <tr><td><code>description</code></td><td>No</td><td>Short description</td></tr>
                <tr><td><code>brand_name</code></td><td>No</td><td>Brand name</td></tr>
                <tr><td><code>manufacturer</code></td><td>No</td><td>Manufacturer name with location</td></tr>
                <tr><td><code>fssai_license</code></td><td>No</td><td>FSSAI license number (14 digits)</td></tr>
                <tr><td><code>allergen_info</code></td><td>No</td><td>Allergen declaration (auto-detected if empty)</td></tr>
                <tr><td><code>serving_size</code></td><td>No</td><td>Serving size in grams/ml (default: 100)</td></tr>
                <tr><td><code>serving_unit</code></td><td>No</td><td>g or ml (default: g)</td></tr>
                <tr><td><code>servings_per_pack</code></td><td>No</td><td>Servings per package (default: 1)</td></tr>
                <tr><td><code>ingredients</code></td><td>No</td><td>Semicolon-separated: <code>Name:Weight;Name:Weight</code></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Batch Process All Recipes ── */}
      <section className="section batch-process-section">
        <div className="container batch-content">
          <div className="batch-process-header">
            <Cpu size={24} />
            <div>
              <h2>Batch Process All Recipes</h2>
              <p>Run nutrition calculation, compliance checks, and label generation for all your recipes at once.</p>
            </div>
          </div>

          <button
            className="btn btn-primary btn-lg"
            onClick={handleBatchProcess}
            disabled={batchProcessing}
          >
            {batchProcessing ? 'Processing all recipes...' : <><Cpu size={18} /> Process All Recipes</>}
          </button>

          {batchError && <div className="batch-error"><AlertCircle size={16} /> {batchError}</div>}

          {batchResult && (
            <div className="batch-process-result">
              <div className="result-summary">
                <div className="result-stat success">
                  <CheckCircle size={20} />
                  <div>
                    <span className="result-num">{batchResult.compliant ?? 0}</span>
                    <span className="result-label">Compliant</span>
                  </div>
                </div>
                <div className="result-stat error">
                  <XCircle size={20} />
                  <div>
                    <span className="result-num">{batchResult.non_compliant ?? 0}</span>
                    <span className="result-label">Non-Compliant</span>
                  </div>
                </div>
                <div className="result-stat info">
                  <BarChart3 size={20} />
                  <div>
                    <span className="result-num">{batchResult.total ?? 0}</span>
                    <span className="result-label">Total Recipes</span>
                  </div>
                </div>
              </div>

              {batchResult.results?.length > 0 && (
                <div className="result-table-wrap">
                  <table className="result-table">
                    <thead>
                      <tr>
                        <th>Recipe</th>
                        <th>Status</th>
                        <th>Issues</th>
                        <th>Warnings</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchResult.results.map(r => (
                        <tr key={r.recipe_id}>
                          <td className="result-recipe-name">{r.name}</td>
                          <td>
                            {r.status === 'error' ? (
                              <span className="compliance-badge fail">Error</span>
                            ) : r.is_compliant ? (
                              <span className="compliance-badge pass">Compliant</span>
                            ) : (
                              <span className="compliance-badge fail">Non-Compliant</span>
                            )}
                          </td>
                          <td>
                            {r.issues_count > 0 ? (
                              <span className="issue-count"><XCircle size={14} /> {r.issues_count}</span>
                            ) : (
                              <span className="issue-none"><ShieldCheck size={14} /> OK</span>
                            )}
                          </td>
                          <td>{r.warnings_count ?? '--'}</td>
                          <td>
                            <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/recipes/${r.recipe_id}/analyze`)}>
                              Analyze
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
