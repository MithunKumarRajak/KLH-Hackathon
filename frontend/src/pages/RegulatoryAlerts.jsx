import { useEffect, useRef, useState, useCallback } from 'react'
import { AlertTriangle, Bell, Shield, Info, ChevronDown, ChevronUp, ExternalLink, RefreshCw, Activity, Zap, Clock, Filter, BookOpen } from 'lucide-react'
import gsap from 'gsap'
import { regulatoryAPI } from '../services/api'
import './RegulatoryAlerts.css'

const SEVERITY_CONFIG = {
  critical: { icon: AlertTriangle, color: '#dc2626', bg: '#fef2f2', gradient: 'linear-gradient(135deg, #dc2626, #b91c1c)', label: 'Critical', pulse: true },
  high:     { icon: Zap, color: '#ea580c', bg: '#fff7ed', gradient: 'linear-gradient(135deg, #ea580c, #c2410c)', label: 'High', pulse: false },
  medium:   { icon: Bell, color: '#ca8a04', bg: '#fefce8', gradient: 'linear-gradient(135deg, #ca8a04, #a16207)', label: 'Medium', pulse: false },
  low:      { icon: Shield, color: '#16a34a', bg: '#f0fdf4', gradient: 'linear-gradient(135deg, #16a34a, #15803d)', label: 'Low', pulse: false },
  info:     { icon: Info, color: '#2563eb', bg: '#eff6ff', gradient: 'linear-gradient(135deg, #2563eb, #1d4ed8)', label: 'Info', pulse: false },
}

export default function RegulatoryAlerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [filterSeverity, setFilterSeverity] = useState('all')
  const [totalRecipes, setTotalRecipes] = useState(0)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const headerRef = useRef(null)
  const cardsRef = useRef(null)

  const fetchAlerts = useCallback((showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    regulatoryAPI.getAlerts()
      .then(res => {
        setAlerts(res.data.alerts || [])
        setTotalRecipes(res.data.total_recipes || 0)
        setLastUpdated(new Date())
      })
      .catch(err => { if (!showRefresh) setAlerts(prev => prev.length ? prev : []) })
      .finally(() => {
        setLoading(false)
        setRefreshing(false)
      })
  }, [])

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(() => fetchAlerts(), 60000)
    return () => clearInterval(interval)
  }, [fetchAlerts])

  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(headerRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
      )
    }
  }, [])

  useEffect(() => {
    if (cardsRef.current && !loading) {
      gsap.fromTo(cardsRef.current.querySelectorAll('.alert-card'),
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: 'power3.out' }
      )
    }
  }, [loading, filterSeverity])

  const filtered = filterSeverity === 'all'
    ? alerts
    : alerts.filter(a => a.severity === filterSeverity)

  const severityCounts = alerts.reduce((acc, a) => {
    acc[a.severity] = (acc[a.severity] || 0) + 1
    return acc
  }, {})

  const totalImpacted = alerts.reduce((sum, a) => sum + (a.impacted_recipes || 0), 0)
  const criticalCount = severityCounts.critical || 0
  const timeAgo = lastUpdated
    ? `${Math.floor((Date.now() - lastUpdated.getTime()) / 1000)}s ago`
    : '...'

  return (
    <div className="regulatory-page">
      <div className="regulatory-header" ref={headerRef}>
        <div className="container">
          <div className="reg-header-top">
            <div>
              <p className="reg-label"><Activity size={14} /> Live Compliance Monitor</p>
              <h1 className="reg-title">Regulatory Alerts</h1>
              <p className="reg-subtitle">
                Real-time FSSAI regulation monitoring across your <strong>{totalRecipes}</strong> recipe{totalRecipes !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="reg-header-actions">
              <button
                className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
                onClick={() => fetchAlerts(true)}
                disabled={refreshing}
              >
                <RefreshCw size={16} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <span className="last-updated">
                <Clock size={12} /> Updated {timeAgo}
              </span>
            </div>
          </div>

          {/* Dashboard stats strip */}
          <div className="reg-stats-strip">
            <div className="reg-stat">
              <span className="reg-stat-value">{alerts.length}</span>
              <span className="reg-stat-label">Total Alerts</span>
            </div>
            <div className="reg-stat-divider" />
            <div className={`reg-stat ${criticalCount > 0 ? 'critical' : ''}`}>
              <span className="reg-stat-value">{criticalCount}</span>
              <span className="reg-stat-label">Critical</span>
            </div>
            <div className="reg-stat-divider" />
            <div className="reg-stat">
              <span className="reg-stat-value">{totalImpacted}</span>
              <span className="reg-stat-label">Recipes Impacted</span>
            </div>
            <div className="reg-stat-divider" />
            <div className="reg-stat">
              <span className="reg-stat-value">{totalRecipes}</span>
              <span className="reg-stat-label">Total Recipes</span>
            </div>
          </div>
        </div>
      </div>

      <section className="section">
        <div className="container">
          {/* Severity filter pills */}
          <div className="alert-filter-bar">
            <span className="filter-label"><Filter size={14} /> Filter by Severity</span>
            <div className="alert-filter-pills">
              <button
                className={`filter-pill ${filterSeverity === 'all' ? 'active' : ''}`}
                onClick={() => setFilterSeverity('all')}
              >
                All <span className="pill-count">{alerts.length}</span>
              </button>
              {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  className={`filter-pill ${filterSeverity === key ? 'active' : ''}`}
                  style={{ '--pill-color': cfg.color, '--pill-bg': cfg.bg }}
                  onClick={() => setFilterSeverity(filterSeverity === key ? 'all' : key)}
                >
                  <cfg.icon size={13} />
                  {cfg.label}
                  <span className="pill-count">{severityCounts[key] || 0}</span>
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="alert-loading">
              <div className="alert-loading-spinner" />
              <p>Scanning regulatory updates...</p>
            </div>
          ) : (
            <div className="alert-list" ref={cardsRef}>
              {filtered.map(alert => {
                const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info
                const Icon = cfg.icon
                const isExpanded = expandedId === alert.id
                return (
                  <div
                    key={alert.id}
                    className={`alert-card ${isExpanded ? 'expanded' : ''} severity-${alert.severity}`}
                  >
                    {/* Severity accent bar */}
                    <div className="alert-accent" style={{ background: cfg.gradient }} />

                    <div className="alert-card-header" onClick={() => setExpandedId(isExpanded ? null : alert.id)}>
                      <div className="alert-icon-wrap" style={{ background: cfg.bg, color: cfg.color }}>
                        <Icon size={20} />
                        {cfg.pulse && <span className="pulse-ring" style={{ borderColor: cfg.color }} />}
                      </div>

                      <div className="alert-card-center">
                        <div className="alert-meta-row">
                          <span className="alert-severity-badge" style={{ background: cfg.gradient }}>
                            {cfg.label}
                          </span>
                          <span className="alert-category">{alert.category}</span>
                          <span className="alert-date">{alert.date}</span>
                        </div>
                        <h3 className="alert-card-title">{alert.title}</h3>
                        {alert.title_hindi && (
                          <p className="alert-card-hindi">{alert.title_hindi}</p>
                        )}
                        {alert.impacted_recipes > 0 && (
                          <span className="alert-impact-badge">
                            <Zap size={12} /> {alert.impacted_recipes} recipe{alert.impacted_recipes !== 1 ? 's' : ''} affected
                          </span>
                        )}
                      </div>

                      <div className="alert-card-right">
                        <span className={`expand-icon ${isExpanded ? 'rotated' : ''}`}>
                          <ChevronDown size={20} />
                        </span>
                      </div>
                    </div>

                    <div className={`alert-card-body ${isExpanded ? 'open' : ''}`}>
                      <div className="alert-body-inner">
                        <p className="alert-description">{alert.description}</p>

                        {/* Impact analysis section */}
                        {alert.impacted_recipes > 0 && (
                          <div className="alert-impact-section">
                            <div className="impact-header">
                              <Activity size={16} />
                              <strong>Impact Analysis</strong>
                            </div>
                            <div className="impact-bar-wrap">
                              <div className="impact-bar-bg">
                                <div
                                  className="impact-bar-fill"
                                  style={{
                                    width: `${Math.min((alert.impacted_recipes / Math.max(totalRecipes, 1)) * 100, 100)}%`,
                                    background: cfg.gradient
                                  }}
                                />
                              </div>
                              <span className="impact-bar-label">
                                {alert.impacted_recipes} of {totalRecipes} recipes ({Math.round((alert.impacted_recipes / Math.max(totalRecipes, 1)) * 100)}%)
                              </span>
                            </div>
                            {alert.impact_details?.length > 0 && (
                              <div className="impact-recipes">
                                {alert.impact_details.map((item, i) => (
                                  <span key={i} className="impact-recipe-chip">{typeof item === 'string' ? item : item.name}</span>
                                ))}
                                {alert.impacted_recipes > 3 && (
                                  <span className="impact-recipe-more">+{alert.impacted_recipes - 3} more</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {alert.affected_nutrients?.length > 0 && (
                          <div className="alert-affected">
                            <strong>Affected Nutrients</strong>
                            <div className="affected-tags">
                              {alert.affected_nutrients.map(n => (
                                <span key={n} className="affected-tag" style={{ borderColor: cfg.color, color: cfg.color, background: cfg.bg }}>
                                  {n}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {alert.regulation_ref && (
                          <div className="alert-ref">
                            <BookOpen size={14} />
                            <span>Reference: {alert.regulation_ref}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {filtered.length === 0 && (
                <div className="no-alerts">
                  <Shield size={48} strokeWidth={1} />
                  <h3>All Clear</h3>
                  <p>No alerts for the selected severity level.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
