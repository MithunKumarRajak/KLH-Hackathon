import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import anime from 'animejs/lib/anime.es.js'
import {
  ArrowRight, Leaf, Heart, Shield, Brain, Calculator,
  Target, BookOpen, Microscope, Scale
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { SectionHeading } from '../components/UIComponents'
import './About.css'

gsap.registerPlugin(ScrollTrigger)

export default function About() {
  const heroRef = useRef(null)
  const valuesRef = useRef(null)
  const timelineRef = useRef(null)

  useEffect(() => {
    // Hero parallax
    const img = heroRef.current?.querySelector('.about-hero-img')
    if (img) {
      gsap.fromTo(img,
        { scale: 1.1 },
        {
          scale: 1,
          duration: 1.5,
          ease: 'power3.out'
        }
      )
    }

    // Hero text
    gsap.fromTo(heroRef.current?.querySelectorAll('.about-hero-text > *') || [],
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out', delay: 0.5 }
    )

    // Values cards
    const valueCards = valuesRef.current?.querySelectorAll('.value-card')
    if (valueCards) {
      anime({
        targets: valueCards,
        opacity: [0, 1],
        translateY: [40, 0],
        rotate: [2, 0],
        delay: anime.stagger(100),
        duration: 800,
        easing: 'easeOutExpo',
        autoplay: false,
      })

      ScrollTrigger.create({
        trigger: valuesRef.current,
        start: 'top 80%',
        onEnter: () => {
          anime({
            targets: valueCards,
            opacity: [0, 1],
            translateY: [40, 0],
            delay: anime.stagger(100),
            duration: 800,
            easing: 'easeOutExpo',
          })
        }
      })
    }

    // Timeline items
    gsap.fromTo(timelineRef.current?.querySelectorAll('.timeline-item') || [],
      { opacity: 0, x: -30 },
      {
        opacity: 1, x: 0,
        duration: 0.6, stagger: 0.15, ease: 'power3.out',
        scrollTrigger: { trigger: timelineRef.current, start: 'top 80%' }
      }
    )
  }, [])

  const sattvicValues = [
    { title: 'Pure', desc: 'Clean, transparent nutritional data with no hidden calculations or assumptions.', icon: Heart },
    { title: 'Balanced', desc: 'Holistic view of macro and micro nutrients for complete product understanding.', icon: Scale },
    { title: 'Nourishing', desc: 'Insights that help create healthier, better-formulated food products.', icon: Leaf },
    { title: 'Clear', desc: 'FSSAI-compliant labels that bring clarity and trust to consumers.', icon: Shield },
  ]

  const whatWeDeliver = [
    { icon: BookOpen, title: 'Traditional Nutritional Wisdom', desc: 'Rooted in IFCT food composition data and ancient Indian dietary science.' },
    { icon: Calculator, title: 'Scientific Macro Calculation', desc: 'Precise per-serving, per-100g, and %DV calculations backed by data.' },
    { icon: Shield, title: 'FSSAI-Style Compliance', desc: 'Automated checks against current labeling regulations with detailed reports.' },
    { icon: Brain, title: 'AI-Driven Health Insights', desc: 'Intelligent recipe parsing, FOP indicators, and reformulation intelligence.' },
  ]

  return (
    <>
      <Navbar variant="dark" />

      {/* Hero */}
      <section className="about-hero" ref={heroRef}>
        <div className="about-hero-bg">
          <img
            className="about-hero-img"
            src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1600&h=900&fit=crop"
            alt="Beautifully arranged fresh vegetables and herbs on marble surface"
          />
          <div className="about-hero-overlay" />
        </div>
        <div className="container about-hero-text">
          <span className="about-label">About Satvika</span>
          <h1>Ancient Purity, Modern Intelligence</h1>
          <p>
            Satvika brings together the wisdom of traditional Indian nutrition and the precision
            of modern food technology to create a compliance platform like no other.
          </p>
        </div>
      </section>

      {/* Origin */}
      <section className="section" style={{ background: 'var(--white)' }}>
        <div className="container">
          <div className="about-origin">
            <div className="origin-text">
              <SectionHeading label="The Name" title='The Meaning of "Satvik"' align="left" />
              <p className="body-text" style={{ fontSize: 18, lineHeight: 1.9 }}>
                <strong>Satvika</strong> comes from the Sanskrit word <em>"Satvik"</em>, which represents
                <strong> purity, balance, and wholesome nourishment</strong> in ancient Indian philosophy.
              </p>
              <p className="body-text">
                In traditional Indian dietary wisdom, Satvik food is pure, balanced, light and
                nourishing -- supportive of clarity and well-being. It represents the highest
                quality of sustenance that promotes health, vitality, and inner harmony.
              </p>
              <p className="body-text">
                Inspired by this concept, Satvika brings purity and intelligence to modern food
                technology -- combining traditional nutritional wisdom with scientific compliance
                formatting and AI-driven health insights.
              </p>
            </div>
            <div className="origin-image">
              <img
                src="https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&h=1000&fit=crop&q=80"
                alt="Traditional Indian spices and ingredients"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section section-dark">
        <div className="container">
          <SectionHeading
            label="Satvik Principles"
            title="What Guides Us"
            subtitle="Every aspect of Satvika is built on these foundational principles from ancient dietary wisdom."
            light
          />
          <div className="values-grid" ref={valuesRef}>
            {sattvicValues.map((v, i) => (
              <div key={i} className="value-card" style={{ opacity: 0 }}>
                <v.icon size={28} strokeWidth={1} style={{ color: 'var(--white)' }} />
                <h4>{v.title}</h4>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Deliver */}
      <section className="section" style={{ background: 'var(--gray-50)' }}>
        <div className="container">
          <SectionHeading
            label="What Satvika Represents"
            title="Intelligence Meets Compliance"
            subtitle="Satvika combines four pillars of food product intelligence."
          />
          <div className="deliver-grid">
            {whatWeDeliver.map((item, i) => (
              <div key={i} className="deliver-card">
                <div className="deliver-num">{String(i + 1).padStart(2, '0')}</div>
                <div className="deliver-icon">
                  <item.icon size={24} strokeWidth={1.5} />
                </div>
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ensures */}
      <section className="section" style={{ background: 'var(--white)' }}>
        <div className="container">
          <SectionHeading
            label="Quality Promise"
            title="Every Recipe Is"
          />
          <div className="ensures-grid" ref={timelineRef}>
            {[
              { label: 'Nutritionally Transparent', desc: 'Complete macro & micronutrient visibility' },
              { label: 'Health-Aware', desc: 'FOP traffic-light system for critical nutrients' },
              { label: 'Compliance-Ready', desc: 'Validated against FSSAI Regulations 2020' },
              { label: 'Scientifically Calculated', desc: 'Based on IFCT/USDA composition databases' },
            ].map((item, i) => (
              <div key={i} className="timeline-item">
                <div className="timeline-marker" />
                <div>
                  <h4>{item.label}</h4>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="section section-dark">
        <div className="container text-center">
          <SectionHeading label="Our Mission" title="Empowering Food Innovation" light />
          <div className="mission-statement">
            <p>
              To help food startups, nutrition professionals, and health-conscious brands
              generate accurate nutrition labels, maintain regulatory compliance, improve
              product health profiles, and make informed reformulation decisions.
            </p>
          </div>
          <div className="brand-identity">
            <blockquote>
              "Satvika brings ancient purity and modern intelligence together to build
              healthier, compliant food products."
            </blockquote>
          </div>
          <Link to="/register" className="btn btn-white btn-lg" style={{ marginTop: 40 }}>
            Get Started <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <Footer />
    </>
  )
}
