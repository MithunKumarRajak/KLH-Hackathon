import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  Shield, FileText, CheckCircle, AlertTriangle, BookOpen,
  ArrowRight, Leaf, Scale, Info, ListChecks
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { SectionHeading } from '../components/UIComponents'
import './Compliance.css'

gsap.registerPlugin(ScrollTrigger)

export default function FSSAIGuidelines() {
  const heroRef = useRef(null)
  const cardsRef = useRef(null)

  useEffect(() => {
    gsap.fromTo(heroRef.current?.querySelectorAll('.compliance-hero-animate') || [],
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out', delay: 0.3 }
    )

    const cards = cardsRef.current?.querySelectorAll('.compliance-card')
    if (cards) {
      gsap.fromTo(cards,
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out',
          scrollTrigger: { trigger: cardsRef.current, start: 'top 80%' }
        }
      )
    }
  }, [])

  const mandatoryNutrients = [
    { name: 'Energy', unit: 'kcal', dv: '2000 kcal', desc: 'Total caloric value per serving' },
    { name: 'Total Fat', unit: 'g', dv: '67 g', desc: 'All fats including saturated and trans' },
    { name: 'Saturated Fat', unit: 'g', dv: '22 g', desc: 'Linked to cardiovascular risk' },
    { name: 'Trans Fat', unit: 'g', dv: 'As low as possible', desc: 'Must be declared even if zero' },
    { name: 'Cholesterol', unit: 'mg', dv: '300 mg', desc: 'Important for heart health claims' },
    { name: 'Sodium', unit: 'mg', dv: '2300 mg', desc: 'Critical for hypertension monitoring' },
    { name: 'Total Carbohydrate', unit: 'g', dv: '300 g', desc: 'Primary energy source declaration' },
    { name: 'Total Sugars', unit: 'g', dv: '50 g', desc: 'Includes natural and added sugars' },
    { name: 'Added Sugars', unit: 'g', dv: '50 g', desc: 'Mandatory under 2020 regulations' },
    { name: 'Protein', unit: 'g', dv: '55 g', desc: 'Essential macronutrient declaration' },
  ]

  const keyRegulations = [
    {
      icon: FileText,
      title: 'FSS (Labelling & Display) Regulations 2020',
      desc: 'The primary regulation governing how packaged food must be labeled in India, including mandatory nutrition information, ingredient lists, and allergen declarations.',
    },
    {
      icon: Shield,
      title: 'FSS (Packaging) Regulations 2018',
      desc: 'Defines requirements for food packaging materials, permitted materials, and restrictions on packaging that may contaminate food.',
    },
    {
      icon: Scale,
      title: 'FSS (Food Product Standards) Regulations 2011',
      desc: 'Sets composition standards for various food categories including minimum protein, maximum fat, and permitted additives.',
    },
    {
      icon: AlertTriangle,
      title: 'FSS (Advertising & Claims) Regulations 2018',
      desc: 'Governs health claims, nutrition claims, and advertising standards for food products sold in India.',
    },
  ]

  return (
    <>
      <Navbar variant="dark" />

      <section className="compliance-hero" ref={heroRef}>
        <div className="container">
          <div className="compliance-hero-content">
            <span className="compliance-hero-animate compliance-badge">
              <Shield size={14} /> Regulatory Framework
            </span>
            <h1 className="compliance-hero-animate">FSSAI Guidelines</h1>
            <p className="compliance-hero-animate">
              The Food Safety and Standards Authority of India (FSSAI) is the apex body responsible 
              for regulating and supervising food safety in India. Satvika ensures your nutrition 
              labels meet every FSSAI requirement.
            </p>
            <div className="compliance-hero-animate" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/register" className="btn btn-primary">
                Start Labeling <ArrowRight size={16} />
              </Link>
              <Link to="/about" className="btn btn-secondary">Learn About Satvika</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--white)' }}>
        <div className="container">
          <SectionHeading
            label="Key Regulations"
            title="Regulatory Framework"
            subtitle="FSSAI regulations that govern food labeling, packaging, and claims in India."
          />
          <div className="compliance-grid" ref={cardsRef}>
            {keyRegulations.map((reg, i) => (
              <div key={i} className="compliance-card">
                <div className="compliance-card-icon">
                  <reg.icon size={24} strokeWidth={1.5} />
                </div>
                <h4>{reg.title}</h4>
                <p>{reg.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container">
          <SectionHeading
            label="Mandatory Nutrients"
            title="10 Required Nutrient Declarations"
            subtitle="Every packaged food product in India must declare these nutrients on its label per FSSAI regulations."
            light
          />
          <div className="nutrient-table-wrap">
            <table className="nutrient-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nutrient</th>
                  <th>Unit</th>
                  <th>Daily Value</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {mandatoryNutrients.map((n, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td><strong>{n.name}</strong></td>
                    <td>{n.unit}</td>
                    <td>{n.dv}</td>
                    <td>{n.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--gray-50)' }}>
        <div className="container">
          <SectionHeading
            label="Label Requirements"
            title="What Must Appear on Every Label"
          />
          <div className="requirements-grid">
            {[
              { icon: ListChecks, title: 'Product Name & Brand', desc: 'Clear identification of the food product and the brand name.' },
              { icon: Info, title: 'Net Quantity', desc: 'Weight or volume declaration in metric units (g, kg, ml, L).' },
              { icon: BookOpen, title: 'Ingredient List', desc: 'All ingredients in descending order of weight with allergen declarations.' },
              { icon: CheckCircle, title: 'Nutrition Information', desc: 'Per serving and per 100g/ml values for all mandatory nutrients.' },
              { icon: Shield, title: 'FSSAI License Number', desc: 'Valid 14-digit FSSAI license number of the manufacturer.' },
              { icon: FileText, title: 'Date Marking', desc: 'Best before / Use by date and manufacturing date.' },
            ].map((item, i) => (
              <div key={i} className="requirement-card">
                <item.icon size={20} strokeWidth={1.5} />
                <h5>{item.title}</h5>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--white)' }}>
        <div className="container text-center">
          <SectionHeading
            label="Ready?"
            title="Generate Compliant Labels Now"
            subtitle="Satvika automatically checks all FSSAI requirements and generates print-ready nutrition labels."
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
