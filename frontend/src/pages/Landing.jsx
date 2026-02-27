import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import anime from 'animejs/lib/anime.es.js'
import {
  ArrowRight, Shield, Brain, FileCheck, Calculator,
  Leaf, ChevronDown, Target, Award, Microscope,
  BarChart3, Scale, FlaskConical, BookOpen
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ProcessFlow from '../components/ProcessFlow'
import PageLoader from '../components/PageLoader'
import { SectionHeading, FeatureCard, StatCard } from '../components/UIComponents'
import { useScrollReveal, useStaggerReveal } from '../hooks/useAnimations'
import './Landing.css'

gsap.registerPlugin(ScrollTrigger)

export default function Landing() {
  const [loaded, setLoaded] = useState(false)
  const heroRef = useRef(null)
  const heroTitleRef = useRef(null)
  const heroSubRef = useRef(null)
  const heroCTARef = useRef(null)
  const gridRef = useRef(null)
  const marqueeRef = useRef(null)

  // Scroll reveal refs
  const featuresRef = useStaggerReveal({ childSelector: '.stagger-item', stagger: 0.1 })
  const statsRef = useStaggerReveal({ childSelector: '.stagger-item', stagger: 0.15 })
  const processRef = useScrollReveal({ y: 50 })

  useEffect(() => {
    if (!loaded) return

    // Hero entrance animation
    const tl = gsap.timeline({ delay: 0.3 })

    tl.fromTo(heroTitleRef.current?.querySelectorAll('.hero-word') || [],
      { opacity: 0, y: 80, rotateX: -40 },
      { opacity: 1, y: 0, rotateX: 0, duration: 1.2, stagger: 0.08, ease: 'power4.out' }
    )
    .fromTo(heroSubRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' },
      '-=0.5'
    )
    .fromTo(heroCTARef.current?.children || [],
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' },
      '-=0.3'
    )

    // Parallax grain
    const parallaxBg = heroRef.current?.querySelector('.hero-bg-pattern')
    if (parallaxBg) {
      gsap.to(parallaxBg, {
        yPercent: 30,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        }
      })
    }

    // Anime.js floating particles
    if (gridRef.current) {
      const dots = gridRef.current.querySelectorAll('.grid-dot')
      anime({
        targets: dots,
        opacity: [0, 0.3],
        scale: [0, 1],
        delay: anime.stagger(30, { grid: [20, 10], from: 'center' }),
        duration: 1500,
        easing: 'easeOutExpo',
      })

      anime({
        targets: dots,
        opacity: [
          { value: 0.15, duration: 1000 },
          { value: 0.4, duration: 1000 },
        ],
        delay: anime.stagger(100, { grid: [20, 10], from: 'center' }),
        loop: true,
        easing: 'easeInOutSine',
      })
    }
  }, [loaded])

  // Marquee animation
  useEffect(() => {
    if (!loaded || !marqueeRef.current) return
    const track = marqueeRef.current.querySelector('.marquee-track')
    if (track) {
      gsap.to(track, {
        xPercent: -50,
        duration: 30,
        ease: 'none',
        repeat: -1,
      })
    }
  }, [loaded])

  const heroTitle = 'Intelligent Nutrition Compliance for Modern Food Innovation'
  const heroWords = heroTitle.split(' ')

  return (
    <>
      {!loaded && <PageLoader onComplete={() => setLoaded(true)} />}

      <div className={`landing ${loaded ? 'visible' : ''}`}>
        <Navbar variant="dark" />

        {/* HERO */}
        <section className="hero" ref={heroRef}>
          <div className="hero-bg">
            <div className="hero-bg-pattern" />
            <div className="hero-grid" ref={gridRef}>
              {Array.from({ length: 200 }).map((_, i) => (
                <div className="grid-dot" key={i} />
              ))}
            </div>
          </div>

          <div className="container hero-content">
            <div className="hero-label">
              <Leaf size={14} strokeWidth={1.5} />
              <span>AI-Powered Nutrition Platform</span>
            </div>

            <h1 ref={heroTitleRef} className="hero-title">
              {heroWords.map((word, i) => (
                <span className="hero-word" key={i}>
                  {word}{' '}
                </span>
              ))}
            </h1>

            <p ref={heroSubRef} className="hero-subtitle">
              From ancient Satvik wisdom to scientific compliance -- Satvika transforms how food
              brands create, validate, and export nutrition labels with FSSAI-ready precision.
            </p>

            <div ref={heroCTARef} className="hero-actions">
              <Link to="/register" className="btn btn-white btn-lg">
                Get Started <ArrowRight size={18} />
              </Link>
              <Link to="/about" className="btn btn-secondary hero-btn-outline btn-lg">
                Learn More
              </Link>
            </div>

            <div className="hero-scroll-indicator">
              <ChevronDown size={20} />
            </div>
          </div>
        </section>

        {/* MARQUEE */}
        <section className="marquee-section" ref={marqueeRef}>
          <div className="marquee-track">
            {[...Array(2)].map((_, setIdx) => (
              <React.Fragment key={setIdx}>
                <span>FSSAI Compliant</span>
                <span className="marquee-dot" />
                <span>AI-Powered Analysis</span>
                <span className="marquee-dot" />
                <span>Macro Calculation</span>
                <span className="marquee-dot" />
                <span>Label Generation</span>
                <span className="marquee-dot" />
                <span>Health Insights</span>
                <span className="marquee-dot" />
                <span>Reformulation</span>
                <span className="marquee-dot" />
              </React.Fragment>
            ))}
          </div>
        </section>

        {/* ABOUT INTRO */}
        <section className="section" style={{ background: 'var(--white)' }}>
          <div className="container">
            <div className="split-section">
              <div className="split-image">
                <div className="image-placeholder">
                  <img
                    src="https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=800&h=1000&fit=crop"
                    alt="Fresh wholesome ingredients representing Satvik food philosophy"
                    loading="lazy"
                  />
                  <div className="image-overlay">
                    <span className="image-tag">SATVIK</span>
                    <span className="image-tag-sub">Pure. Balanced. Nourishing.</span>
                  </div>
                </div>
              </div>
              <div className="split-content">
                <SectionHeading
                  label="Our Philosophy"
                  title="About Satvika"
                  align="left"
                  subtitle=""
                />
                <p className="body-text">
                  Satvika comes from the Sanskrit word <strong>"Satvik"</strong>, which represents
                  purity, balance, and wholesome nourishment in ancient Indian philosophy.
                </p>
                <p className="body-text">
                  In traditional Indian dietary wisdom, Satvik food is pure, balanced,
                  light and nourishing -- supportive of clarity and well-being.
                </p>
                <p className="body-text" style={{ marginBottom: 32 }}>
                  Inspired by this concept, <strong>Satvika</strong> brings purity and intelligence
                  to modern food technology -- combining traditional nutritional wisdom with
                  scientific compliance formatting and AI-driven health insights.
                </p>
                <Link to="/about" className="btn btn-primary">
                  Discover Our Story <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* PROCESS FLOW */}
        <section className="section section-dark" ref={processRef}>
          <div className="container">
            <SectionHeading
              label="How It Works"
              title="From Recipe to Regulation"
              subtitle="A streamlined five-step process that takes your recipe from raw ingredients
              to a fully compliant, print-ready nutrition label."
              light
            />
            <ProcessFlow />
          </div>
        </section>

        {/* FEATURES */}
        <section className="section" style={{ background: 'var(--gray-50)' }}>
          <div className="container">
            <SectionHeading
              label="Capabilities"
              title="What Satvika Delivers"
              subtitle="Every tool you need to ensure your food products are nutritionally transparent,
              health-aware, and compliance-ready."
            />
            <div className="grid grid-3" ref={featuresRef}>
              <FeatureCard
                icon={Calculator}
                title="Macro Calculation"
                description="Precise per-serving and per-100g nutritional computation based on IFCT/USDA databases with automatic %DV calculation."
              />
              <FeatureCard
                icon={Shield}
                title="FSSAI Compliance"
                description="Automated validation against FSSAI Labelling & Display Regulations 2020, including mandatory nutrient checks and FOP indicators."
              />
              <FeatureCard
                icon={Brain}
                title="AI-Driven Parsing"
                description="Intelligent recipe text parsing using GPT models with regex fallback. Supports multiple formats and fuzzy ingredient matching."
              />
              <FeatureCard
                icon={FileCheck}
                title="Label Generation"
                description="Professional PDF nutrition labels with complete FSSAI formatting -- ingredient lists, allergen declarations, and manufacturer details."
              />
              <FeatureCard
                icon={FlaskConical}
                title="Reformulation Intel"
                description="Data-driven insights to improve product health profiles. Identify high-risk nutrients and optimize formulations."
              />
              <FeatureCard
                icon={BarChart3}
                title="Traffic Light System"
                description="Front-of-Pack visual indicators for fat, sugar, saturated fat, and sodium -- helping consumers make informed choices."
              />
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="section" style={{ background: 'var(--white)' }}>
          <div className="container">
            <SectionHeading
              label="By The Numbers"
              title="Built for Scale"
            />
            <div className="grid grid-4" ref={statsRef}>
              <StatCard icon={BookOpen} value="500" label="Ingredients" />
              <StatCard icon={Scale} value="30" label="Nutrients Tracked" />
              <StatCard icon={Award} value="100" label="Compliance Checks" />
              <StatCard icon={Microscope} value="10" label="FSSAI Categories" />
            </div>
          </div>
        </section>

        {/* MISSION */}
        <section className="section section-dark">
          <div className="container">
            <div className="mission-block">
              <SectionHeading
                label="Our Mission"
                title="Empowering Food Innovation"
                light
              />
              <div className="mission-grid">
                <div className="mission-item stagger-item">
                  <Target size={32} strokeWidth={1} style={{ color: 'var(--white)', marginBottom: 20 }} />
                  <h4>For Food Startups</h4>
                  <p>Generate accurate nutrition labels without expensive lab testing during early product development.</p>
                </div>
                <div className="mission-item stagger-item">
                  <Award size={32} strokeWidth={1} style={{ color: 'var(--white)', marginBottom: 20 }} />
                  <h4>For Nutrition Professionals</h4>
                  <p>Maintain regulatory compliance with automated FSSAI checks and evidence-based reformulation suggestions.</p>
                </div>
                <div className="mission-item stagger-item">
                  <Leaf size={32} strokeWidth={1} style={{ color: 'var(--white)', marginBottom: 20 }} />
                  <h4>For Health-Conscious Brands</h4>
                  <p>Improve product health profiles and make informed decisions backed by scientific macro calculation.</p>
                </div>
              </div>
              <div className="mission-quote">
                <blockquote>
                  "Satvika is not just a calorie calculator. It is an intelligent compliance
                  assistant for modern food innovation."
                </blockquote>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section cta-section">
          <div className="container text-center">
            <SectionHeading
              label="Ready?"
              title="Start Building Healthier Products"
              subtitle="Ancient purity and modern intelligence together -- create your first compliant nutrition label in minutes."
            />
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/register" className="btn btn-primary btn-lg">
                Create Free Account <ArrowRight size={18} />
              </Link>
              <Link to="/dashboard" className="btn btn-secondary btn-lg">
                Explore Dashboard
              </Link>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  )
}
