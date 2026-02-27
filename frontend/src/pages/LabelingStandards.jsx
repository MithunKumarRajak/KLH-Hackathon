import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  Tag, FileText, CheckCircle, ArrowRight, AlertCircle,
  Package, Scale, Leaf, Eye, Globe
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { SectionHeading } from '../components/UIComponents'
import './Compliance.css'

gsap.registerPlugin(ScrollTrigger)

export default function LabelingStandards() {
  const heroRef = useRef(null)
  const stepsRef = useRef(null)

  useEffect(() => {
    gsap.fromTo(heroRef.current?.querySelectorAll('.compliance-hero-animate') || [],
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out', delay: 0.3 }
    )

    const steps = stepsRef.current?.querySelectorAll('.standard-step')
    if (steps) {
      gsap.fromTo(steps,
        { opacity: 0, x: -30 },
        {
          opacity: 1, x: 0, duration: 0.6, stagger: 0.12, ease: 'power3.out',
          scrollTrigger: { trigger: stepsRef.current, start: 'top 80%' }
        }
      )
    }
  }, [])

  const labelSections = [
    {
      num: '01',
      title: 'Product Identity',
      icon: Tag,
      items: [
        'Common name of the food (e.g., "Mixed Fruit Jam")',
        'Brand name or trade name',
        'Nature of the food if not apparent from name',
        'Category designation per FSSAI product standards',
      ],
    },
    {
      num: '02',
      title: 'Ingredient Declaration',
      icon: FileText,
      items: [
        'Listed in descending order of weight at time of manufacture',
        'Specific names required (no generic terms like "flavoring")',
        'Allergen declarations in bold or separate "Contains:" statement',
        'Class names permitted for additives (e.g., "Emulsifier (E322)")',
      ],
    },
    {
      num: '03',
      title: 'Nutrition Information Panel',
      icon: Scale,
      items: [
        'Values per serve and per 100g/100ml',
        'Energy in kcal, macronutrients in grams',
        '% Daily Value based on 2000 kcal diet',
        '10 mandatory nutrients + optional micronutrients',
      ],
    },
    {
      num: '04',
      title: 'Net Quantity & Dates',
      icon: Package,
      items: [
        'Net weight/volume in metric units (g, kg, ml, L)',
        'Manufacturing date (Mfg. Date) and best-before date',
        'Batch/lot number for traceability',
        'Country of origin for imported foods',
      ],
    },
    {
      num: '05',
      title: 'Manufacturer Information',
      icon: Globe,
      items: [
        'Name and complete address of manufacturer/packer/importer',
        'FSSAI license number (14-digit)',
        'Customer care details',
        'FSSAI logo with license number on front-of-pack',
      ],
    },
    {
      num: '06',
      title: 'Veg/Non-Veg Symbol',
      icon: Eye,
      items: [
        'Green circle in green square for vegetarian products',
        'Brown triangle in brown square for non-vegetarian',
        'Must be displayed prominently on front of pack',
        'Mandatory for all packaged food sold in India',
      ],
    },
  ]

  const commonErrors = [
    { icon: AlertCircle, title: 'Missing Trans Fat', desc: 'Trans fat must be declared even when the value is zero.' },
    { icon: AlertCircle, title: 'Wrong Serving Size', desc: 'Serving size must reflect typical consumption, not an arbitrary number.' },
    { icon: AlertCircle, title: 'Missing Added Sugars', desc: 'Added sugars is now mandatory under 2020 labeling regulations.' },
    { icon: AlertCircle, title: 'Generic Allergen Terms', desc: 'Specific allergen sources must be named (e.g., "wheat" not just "gluten").' },
    { icon: AlertCircle, title: 'Missing %DV', desc: 'Percent Daily Value must accompany nutrient declarations per serving.' },
    { icon: AlertCircle, title: 'Incorrect Font Size', desc: 'Label text must meet minimum font height requirements based on pack size.' },
  ]

  return (
    <>
      <Navbar variant="dark" />

      <section className="compliance-hero" ref={heroRef}>
        <div className="container">
          <div className="compliance-hero-content">
            <span className="compliance-hero-animate compliance-badge">
              <Tag size={14} /> Standards & Format
            </span>
            <h1 className="compliance-hero-animate">Labeling Standards</h1>
            <p className="compliance-hero-animate">
              FSSAI mandates specific formats, content, and presentation rules for nutrition labels 
              on all packaged food products. Satvika automates compliance with every standard.
            </p>
            <div className="compliance-hero-animate" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/register" className="btn btn-primary">
                Create Labels <ArrowRight size={16} />
              </Link>
              <Link to="/compliance/fssai" className="btn btn-secondary">FSSAI Guidelines</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--white)' }}>
        <div className="container">
          <SectionHeading
            label="Label Anatomy"
            title="Six Mandatory Label Sections"
            subtitle="Every FSSAI-compliant food label must include these six clearly defined sections."
          />
          <div className="standards-steps" ref={stepsRef}>
            {labelSections.map((section, i) => (
              <div key={i} className="standard-step">
                <div className="step-header">
                  <span className="step-num">{section.num}</span>
                  <section.icon size={20} strokeWidth={1.5} />
                  <h4>{section.title}</h4>
                </div>
                <ul className="step-items">
                  {section.items.map((item, j) => (
                    <li key={j}>
                      <CheckCircle size={14} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container">
          <SectionHeading
            label="Common Mistakes"
            title="Avoid These Labeling Errors"
            subtitle="Satvika detects and flags these common compliance failures automatically."
            light
          />
          <div className="compliance-grid">
            {commonErrors.map((err, i) => (
              <div key={i} className="compliance-card compliance-card-warning">
                <div className="compliance-card-icon warning">
                  <err.icon size={20} strokeWidth={1.5} />
                </div>
                <h4>{err.title}</h4>
                <p>{err.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--gray-50)' }}>
        <div className="container text-center">
          <SectionHeading
            label="Automated"
            title="Let Satvika Handle Compliance"
            subtitle="Our system checks all labeling standards automatically and generates print-ready labels."
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
