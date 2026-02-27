import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  BarChart3, ArrowRight, AlertTriangle, CheckCircle,
  Circle, Droplets, Candy, Flame, Beef
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { SectionHeading } from '../components/UIComponents'
import './Compliance.css'

gsap.registerPlugin(ScrollTrigger)

export default function FOPRequirements() {
  const heroRef = useRef(null)
  const indicatorsRef = useRef(null)

  useEffect(() => {
    gsap.fromTo(heroRef.current?.querySelectorAll('.compliance-hero-animate') || [],
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out', delay: 0.3 }
    )

    const cards = indicatorsRef.current?.querySelectorAll('.fop-indicator-card')
    if (cards) {
      gsap.fromTo(cards,
        { opacity: 0, scale: 0.95 },
        {
          opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: 'power3.out',
          scrollTrigger: { trigger: indicatorsRef.current, start: 'top 80%' }
        }
      )
    }
  }, [])

  const fopNutrients = [
    {
      name: 'Total Fat',
      icon: Droplets,
      thresholds: { low: '≤ 3g', medium: '3.1 – 17.5g', high: '> 17.5g' },
      unit: 'per 100g (solids)',
      color: '#f59e0b',
    },
    {
      name: 'Saturated Fat',
      icon: Flame,
      thresholds: { low: '≤ 1.5g', medium: '1.6 – 5g', high: '> 5g' },
      unit: 'per 100g (solids)',
      color: '#ef4444',
    },
    {
      name: 'Total Sugars',
      icon: Candy,
      thresholds: { low: '≤ 5g', medium: '5.1 – 22.5g', high: '> 22.5g' },
      unit: 'per 100g (solids)',
      color: '#8b5cf6',
    },
    {
      name: 'Sodium',
      icon: Beef,
      thresholds: { low: '≤ 120mg', medium: '121 – 600mg', high: '> 600mg' },
      unit: 'per 100g (solids)',
      color: '#3b82f6',
    },
  ]

  return (
    <>
      <Navbar variant="dark" />

      <section className="compliance-hero" ref={heroRef}>
        <div className="container">
          <div className="compliance-hero-content">
            <span className="compliance-hero-animate compliance-badge">
              <BarChart3 size={14} /> Traffic Light System
            </span>
            <h1 className="compliance-hero-animate">FOP Requirements</h1>
            <p className="compliance-hero-animate">
              Front-of-Pack (FOP) nutrition labeling uses a traffic-light color system to help 
              consumers quickly assess the healthiness of packaged food products. Satvika 
              automatically calculates FOP indicators for every recipe.
            </p>
            <div className="compliance-hero-animate" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/register" className="btn btn-primary">
                Analyze Recipes <ArrowRight size={16} />
              </Link>
              <Link to="/compliance/labeling" className="btn btn-secondary">Labeling Standards</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--white)' }}>
        <div className="container">
          <SectionHeading
            label="Color System"
            title="Traffic Light Indicators"
            subtitle="The FOP system classifies four critical nutrients into Low (Green), Medium (Amber), and High (Red) categories."
          />

          <div className="fop-legend">
            <div className="fop-legend-item">
              <span className="fop-dot green" />
              <div>
                <strong>Low (Green)</strong>
                <p>Healthier choice — low content of this nutrient</p>
              </div>
            </div>
            <div className="fop-legend-item">
              <span className="fop-dot amber" />
              <div>
                <strong>Medium (Amber)</strong>
                <p>Moderate content — acceptable in balanced diet</p>
              </div>
            </div>
            <div className="fop-legend-item">
              <span className="fop-dot red" />
              <div>
                <strong>High (Red)</strong>
                <p>Caution — limit consumption of this nutrient</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--gray-50)' }}>
        <div className="container">
          <SectionHeading
            label="Thresholds"
            title="FOP Nutrient Thresholds"
            subtitle="Per 100g threshold values for solid food products (per FSSAI regulations)."
          />
          <div className="fop-indicators-grid" ref={indicatorsRef}>
            {fopNutrients.map((nutrient, i) => (
              <div key={i} className="fop-indicator-card">
                <div className="fop-indicator-header" style={{ borderColor: nutrient.color }}>
                  <nutrient.icon size={24} strokeWidth={1.5} style={{ color: nutrient.color }} />
                  <h4>{nutrient.name}</h4>
                  <span className="fop-unit">{nutrient.unit}</span>
                </div>
                <div className="fop-thresholds">
                  <div className="fop-threshold green">
                    <Circle size={10} fill="#22c55e" />
                    <span>Low</span>
                    <strong>{nutrient.thresholds.low}</strong>
                  </div>
                  <div className="fop-threshold amber">
                    <Circle size={10} fill="#f59e0b" />
                    <span>Medium</span>
                    <strong>{nutrient.thresholds.medium}</strong>
                  </div>
                  <div className="fop-threshold red">
                    <Circle size={10} fill="#ef4444" />
                    <span>High</span>
                    <strong>{nutrient.thresholds.high}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container">
          <SectionHeading
            label="How Satvika Helps"
            title="Automated FOP Analysis"
            subtitle="Satvika calculates FOP indicators for every recipe and highlights nutrients that need attention."
            light
          />
          <div className="compliance-grid">
            {[
              { icon: BarChart3, title: 'Auto-Calculate', desc: 'FOP indicators are computed automatically from recipe nutrition data per 100g.' },
              { icon: AlertTriangle, title: 'Red Flag Alerts', desc: 'High-level nutrients are flagged immediately, helping you reformulate before labeling.' },
              { icon: CheckCircle, title: 'Label Integration', desc: 'FOP indicators are included in generated PDF and HTML nutrition labels.' },
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
            label="Try It"
            title="See FOP Analysis in Action"
            subtitle="Create a recipe and get instant FOP traffic-light indicators with reformulation suggestions."
          />
          <Link to="/register" className="btn btn-primary btn-lg">
            Get Started Free <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <Footer />
    </>
  )
}
