import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import anime from 'animejs/lib/anime.es.js'
import {
  Plus, FileText, Search, ArrowRight, BarChart3,
  BookOpen, Shield, Upload, Clock, ChevronRight,
  Leaf, Activity, TrendingUp
} from 'lucide-react'
import { dashboardAPI } from '../services/api'
import './Dashboard.css'

gsap.registerPlugin(ScrollTrigger)

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_recipes: 0, total_ingredients: 0, total_labels: 0, compliance_pct: 0
  })
  const [compBreakdown, setCompBreakdown] = useState(null)
  const [recentRecipes, setRecentRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const headerRef = useRef(null)
  const cardsRef = useRef(null)
  const activityRef = useRef(null)

  const user = JSON.parse(localStorage.getItem('satvika_user') || '{}')

  useEffect(() => {
    dashboardAPI.stats().then(res => {
      setStats(res.data.stats)
      setRecentRecipes(res.data.recent_recipes || [])
      setCompBreakdown(res.data.compliance_breakdown || null)
      setError(null)
    }).catch(err => {
      setError(err.response?.data?.error || 'Failed to load dashboard data')
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (loading) return

    // Header animation
    gsap.fromTo(headerRef.current?.children || [],
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out', delay: 0.2 }
    )

    // Stats cards with anime.js
    const statCards = cardsRef.current?.querySelectorAll('.stat-card-dash')
    if (statCards) {
      anime({
        targets: statCards,
        opacity: [0, 1],
        translateY: [40, 0],
        delay: anime.stagger(100),
        duration: 800,
        easing: 'easeOutExpo',
      })
    }

    // Counter animations
    const counters = cardsRef.current?.querySelectorAll('.stat-number')
    counters?.forEach((el) => {
      const end = parseInt(el.dataset.value) || 0
      const obj = { val: 0 }
      gsap.to(obj, {
        val: end,
        duration: 2,
        delay: 0.5,
        ease: 'power2.out',
        onUpdate: () => {
          el.textContent = Math.round(obj.val).toLocaleString()
        }
      })
    })

    // Activity items stagger
    gsap.fromTo(activityRef.current?.querySelectorAll('.activity-item') || [],
      { opacity: 0, x: -20 },
      {
        opacity: 1, x: 0,
        duration: 0.5, stagger: 0.08, ease: 'power3.out',
        scrollTrigger: { trigger: activityRef.current, start: 'top 85%' }
      }
    )
  }, [loading])

  const quickActions = [
    { icon: Plus, label: 'New Recipe', desc: 'Create from scratch', link: '/recipes/create', accent: true },
    { icon: Upload, label: 'Parse Recipe', desc: 'AI text parsing', link: '/recipes/create?mode=parse' },
    { icon: Search, label: 'Ingredients', desc: 'Browse database', link: '/ingredients' },
    { icon: FileText, label: 'My Recipes', desc: 'View all recipes', link: '/recipes' },
  ]

  if (loading) return <div className="dashboard"><div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>Loading...</div></div>

  return (
    <div className="dashboard">
      {/* Header */}
      <section className="dash-header" ref={headerRef}>
        <div className="container">
          <div className="dash-header-content">
            <div>
              <p className="dash-greeting">Welcome back,</p>
              <h1 className="dash-title">{user.first_name || user.username || 'User'}</h1>
            </div>
            <Link to="/recipes/create" className="btn btn-primary">
              <Plus size={18} /> New Recipe
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="container dash-stats" ref={cardsRef}>
        <div className="stat-card-dash">
          <div className="stat-icon-wrap">
            <BookOpen size={22} strokeWidth={1.5} />
          </div>
          <div className="stat-number" data-value={stats.total_recipes}>0</div>
          <div className="stat-label">Recipes</div>
        </div>
        <div className="stat-card-dash">
          <div className="stat-icon-wrap">
            <Leaf size={22} strokeWidth={1.5} />
          </div>
          <div className="stat-number" data-value={stats.total_ingredients}>0</div>
          <div className="stat-label">Ingredients</div>
        </div>
        <div className="stat-card-dash">
          <div className="stat-icon-wrap">
            <FileText size={22} strokeWidth={1.5} />
          </div>
          <div className="stat-number" data-value={stats.total_labels}>0</div>
          <div className="stat-label">Labels Generated</div>
        </div>
        <div className="stat-card-dash">
          <div className="stat-icon-wrap">
            <Shield size={22} strokeWidth={1.5} />
          </div>
          <div className="stat-number" data-value={stats.compliance_pct}>0</div>
          <div className="stat-label">Compliance %</div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="container dash-section">
        <h3 className="dash-section-title">Quick Actions</h3>
        <div className="quick-actions-grid">
          {quickActions.map((action, i) => (
            <Link key={i} to={action.link} className={`quick-action-card ${action.accent ? 'accent' : ''}`}>
              <div className="qa-icon">
                <action.icon size={24} strokeWidth={1.5} />
              </div>
              <div>
                <h4>{action.label}</h4>
                <p>{action.desc}</p>
              </div>
              <ArrowRight size={18} className="qa-arrow" />
            </Link>
          ))}
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="container dash-main-grid">
        {/* Recent Activity */}
        <div className="dash-card" ref={activityRef}>
          <div className="dash-card-header">
            <h3>Recent Activity</h3>
            <Link to="/recipes" className="dash-card-link">View All <ChevronRight size={14} /></Link>
          </div>
          <div className="activity-list">
            {recentRecipes.length === 0 && (
              <div className="activity-item" style={{ opacity: 0.5 }}>No recipes yet. Create your first recipe to get started.</div>
            )}
            {recentRecipes.map((r) => (
              <Link key={r.id} to={`/recipes/${r.id}/analyze`} className="activity-item" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="activity-icon">
                  <BookOpen size={16} strokeWidth={1.5} />
                </div>
                <div className="activity-content">
                  <span className="activity-action">{r.name}</span>
                  <span className="activity-name">{r.brand_name || `${r.ingredient_count} ingredients`}</span>
                </div>
                <span className="activity-time">
                  <Clock size={12} /> {new Date(r.created_at).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Compliance Overview */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>Compliance Overview</h3>
          </div>
          <div className="compliance-overview">
            <div className="compliance-ring">
              <svg viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="var(--gray-200)" strokeWidth="6" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke="var(--black)" strokeWidth="6"
                  strokeDasharray={`${(stats.compliance_pct / 100) * 327} 327`}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                  style={{ transition: 'stroke-dasharray 2s ease' }}
                />
              </svg>
              <div className="compliance-ring-text">
                <span className="compliance-pct">{stats.compliance_pct}%</span>
                <span className="compliance-label">Compliant</span>
              </div>
            </div>
            <div className="compliance-items">
              <div className="compliance-row">
                <span className={`comp-dot ${compBreakdown?.mandatory_status || 'success'}`} />
                <span>Mandatory Nutrients</span>
                <span className="comp-val">{compBreakdown?.mandatory_nutrients || 'Passed'}</span>
              </div>
              <div className="compliance-row">
                <span className={`comp-dot ${compBreakdown?.serving_status || 'success'}`} />
                <span>Serving Declaration</span>
                <span className="comp-val">{compBreakdown?.serving_declaration || 'Passed'}</span>
              </div>
              <div className="compliance-row">
                <span className={`comp-dot ${compBreakdown?.fop_status || 'warning'}`} />
                <span>FOP Indicators</span>
                <span className="comp-val">{compBreakdown?.fop_indicators || 'Review'}</span>
              </div>
              <div className="compliance-row">
                <span className={`comp-dot ${compBreakdown?.allergen_status || 'success'}`} />
                <span>Allergen Info</span>
                <span className="comp-val">{compBreakdown?.allergen_info || 'Passed'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Banner */}
      <section className="container" style={{ paddingBottom: 60 }}>
        <div className="workflow-banner">
          <div className="workflow-banner-content">
            <Activity size={28} strokeWidth={1.5} />
            <div>
              <h3>Complete Workflow</h3>
              <p>Create a recipe, analyze nutrition, check compliance, and export labels -- all in one place.</p>
            </div>
          </div>
          <Link to="/recipes/create" className="btn btn-white btn-sm">
            Start Now <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  )
}
