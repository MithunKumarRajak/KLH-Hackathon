import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  BookOpen, ArrowRight, Database, FileText, Code,
  Shield, Brain, Calculator, Layers, Download
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { SectionHeading } from '../components/UIComponents'
import './Compliance.css'

gsap.registerPlugin(ScrollTrigger)

export default function Documentation() {
  const heroRef = useRef(null)
  const featRef = useRef(null)

  useEffect(() => {
    gsap.fromTo(heroRef.current?.querySelectorAll('.compliance-hero-animate') || [],
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out', delay: 0.3 }
    )

    const cards = featRef.current?.querySelectorAll('.doc-feature-card')
    if (cards) {
      gsap.fromTo(cards,
        { opacity: 0, y: 20 },
        {
          opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out',
          scrollTrigger: { trigger: featRef.current, start: 'top 80%' }
        }
      )
    }
  }, [])

  const deliverables = [
    {
      num: '01',
      title: 'Nutrition Label Generator',
      icon: Calculator,
      desc: 'An agent that takes custom recipes with ingredients and weights and generates FSSAI-compliant nutrition labels. Maps ingredients to nutritional databases and calculates totals automatically.',
      features: ['Per-serving & per-100g calculation', 'PDF/HTML/JSON/CSV export', 'Professional FSSAI layout'],
    },
    {
      num: '02',
      title: 'FSSAI-Compliant Label Output',
      icon: Shield,
      desc: 'Generated labels meet all FSSAI Labelling & Display Regulations 2020 requirements including mandatory nutrients, allergen declarations, and FOP indicators.',
      features: ['10 mandatory nutrient declarations', 'Allergen declarations', 'FOP traffic-light indicators'],
    },
    {
      num: '03',
      title: 'Demo with Sample Recipes',
      icon: Layers,
      desc: 'Pre-built sample recipes (Masala Oats, Chocolate Banana Smoothie, Paneer Butter Masala) demonstrating end-to-end label generation and compliance checking.',
      features: ['3 sample Indian recipes', 'Complete nutrition analysis', 'Compliance verification'],
    },
    {
      num: '04',
      title: 'Nutritional Database Documentation',
      icon: Database,
      desc: 'SQLite-backed database with 1000+ Indian food items sourced from IFCT and USDA data, covering macro and micronutrients per 100g.',
      features: ['1015 Indian food items (CSV)', '206 global food items (CSV)', '19 tracked nutrients'],
    },
  ]

  const techStack = [
    { icon: Code, name: 'Django 5.2', desc: 'Python backend with REST API' },
    { icon: Layers, name: 'React 18', desc: 'Modern frontend with Vite' },
    { icon: Database, name: 'SQLite', desc: 'Nutritional database engine' },
    { icon: Brain, name: 'Mistral AI', desc: 'AI recipe parsing & insights' },
    { icon: FileText, name: 'ReportLab', desc: 'PDF label generation' },
    { icon: Shield, name: 'JWT Auth', desc: 'Secure token authentication' },
  ]

  const apiEndpoints = [
    { method: 'POST', path: '/api/auth/login/', desc: 'Authenticate and get JWT token' },
    { method: 'POST', path: '/api/auth/register/', desc: 'Create new user account' },
    { method: 'POST', path: '/api/auth/refresh/', desc: 'Refresh JWT token' },
    { method: 'GET', path: '/api/dashboard/', desc: 'Get dashboard statistics' },
    { method: 'GET', path: '/api/recipes/', desc: 'List user recipes' },
    { method: 'POST', path: '/api/recipes/create/', desc: 'Create new recipe' },
    { method: 'PATCH', path: '/api/recipes/{id}/update/', desc: 'Update existing recipe' },
    { method: 'DELETE', path: '/api/recipes/{id}/delete/', desc: 'Delete a recipe' },
    { method: 'POST', path: '/api/recipes/parse/', desc: 'AI-parse recipe text' },
    { method: 'GET', path: '/api/recipes/{id}/analyze/', desc: 'Full nutrition analysis' },
    { method: 'GET', path: '/api/recipes/{id}/compliance/', desc: 'FSSAI compliance check' },
    { method: 'GET', path: '/api/recipes/{id}/label/', desc: 'Label preview (HTML)' },
    { method: 'POST', path: '/api/recipes/{id}/export/', desc: 'Generate export (PDF/HTML/JSON/CSV)' },
    { method: 'GET', path: '/api/ingredients/', desc: 'Browse ingredient database' },
    { method: 'POST', path: '/api/ai/analyze/', desc: 'Mistral AI analysis' },
  ]

  return (
    <>
      <Navbar variant="dark" />

      <section className="compliance-hero" ref={heroRef}>
        <div className="container">
          <div className="compliance-hero-content">
            <span className="compliance-hero-animate compliance-badge">
              <BookOpen size={14} /> Technical Documentation
            </span>
            <h1 className="compliance-hero-animate">Documentation</h1>
            <p className="compliance-hero-animate">
              Complete technical documentation for the Satvika AI Nutrition & Compliance 
              Assistant — covering architecture, API endpoints, database schema, and deliverables.
            </p>
            <div className="compliance-hero-animate" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/register" className="btn btn-primary">
                Try the Platform <ArrowRight size={16} />
              </Link>
              <Link to="/compliance/fssai" className="btn btn-secondary">FSSAI Guidelines</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="section" style={{ background: 'var(--white)' }}>
        <div className="container">
          <SectionHeading
            label="Problem Statement"
            title="What We Solve"
            subtitle="An AI agent that takes custom recipes with ingredients and weights and generates FSSAI-compliant nutrition labels."
          />
          <div className="problem-grid">
            <div className="problem-card">
              <h4>Key Objectives</h4>
              <ul>
                <li><CheckMark /> Automate nutrition label generation</li>
                <li><CheckMark /> Ensure FSSAI compliance</li>
                <li><CheckMark /> Support food startups and manufacturers</li>
                <li><CheckMark /> Reduce labeling errors</li>
              </ul>
            </div>
            <div className="problem-card">
              <h4>Requirements</h4>
              <ul>
                <li><CheckMark /> Nutritional database (SQLite)</li>
                <li><CheckMark /> FSSAI regulation compliance logic</li>
                <li><CheckMark /> Recipe ingredient parser</li>
                <li><CheckMark /> Label design and export</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Deliverables */}
      <section className="section" style={{ background: 'var(--gray-50)' }}>
        <div className="container">
          <SectionHeading
            label="Deliverables"
            title="Four Core Deliverables"
            subtitle="Everything required to demonstrate the complete FSSAI-compliant nutrition label generation system."
          />
          <div className="deliverables-grid" ref={featRef}>
            {deliverables.map((d, i) => (
              <div key={i} className="doc-feature-card">
                <div className="doc-feature-header">
                  <span className="doc-feature-num">{d.num}</span>
                  <d.icon size={24} strokeWidth={1.5} />
                </div>
                <h4>{d.title}</h4>
                <p>{d.desc}</p>
                <ul className="doc-feature-list">
                  {d.features.map((f, j) => (
                    <li key={j}><CheckMark /> {f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="section section-dark">
        <div className="container">
          <SectionHeading
            label="Architecture"
            title="Technology Stack"
            subtitle="Built with modern, production-ready technologies."
            light
          />
          <div className="compliance-grid">
            {techStack.map((tech, i) => (
              <div key={i} className="compliance-card">
                <div className="compliance-card-icon">
                  <tech.icon size={24} strokeWidth={1.5} />
                </div>
                <h4>{tech.name}</h4>
                <p>{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* API Reference */}
      <section className="section" style={{ background: 'var(--white)' }}>
        <div className="container">
          <SectionHeading
            label="API Reference"
            title="REST API Endpoints"
            subtitle="All API endpoints require JWT authentication (except login/register)."
          />
          <div className="nutrient-table-wrap">
            <table className="nutrient-table api-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Endpoint</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {apiEndpoints.map((ep, i) => (
                  <tr key={i}>
                    <td><span className={`api-method method-${ep.method.toLowerCase()}`}>{ep.method}</span></td>
                    <td><code>{ep.path}</code></td>
                    <td>{ep.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Database */}
      <section className="section" style={{ background: 'var(--gray-50)' }}>
        <div className="container">
          <SectionHeading
            label="Database"
            title="Nutritional Database"
            subtitle="SQLite database with comprehensive Indian food nutrition data."
          />
          <div className="compliance-grid">
            {[
              { icon: Database, title: 'Indian Food Dataset', desc: '1015 Indian food items with 11 nutrients: Calories, Carbs, Protein, Fats, Free Sugar, Fibre, Sodium, Calcium, Iron, Vitamin C, Folate.' },
              { icon: FileText, title: 'Global Food Dataset', desc: '206 food items across categories with 8 nutrients: Calories, Protein, Carbs, Fat, Iron, Vitamin C.' },
              { icon: Layers, title: 'FSSAI Nutrient Index', desc: '19 tracked nutrients across 6 categories: Energy, Macronutrients, Fat Breakdown, Carb Breakdown, Minerals, Vitamins.' },
            ].map((item, i) => (
              <div key={i} className="compliance-card">
                <div className="compliance-card-icon">
                  <item.icon size={24} strokeWidth={1.5} />
                </div>
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--white)' }}>
        <div className="container text-center">
          <SectionHeading
            label="Get Started"
            title="Try Satvika Today"
            subtitle="Create your account and generate your first FSSAI-compliant nutrition label in minutes."
          />
          <Link to="/register" className="btn btn-primary btn-lg">
            Create Free Account <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <Footer />
    </>
  )
}

function CheckMark() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--sage-green, #22c55e)' }}><polyline points="20 6 9 17 4 12" /></svg>
}
