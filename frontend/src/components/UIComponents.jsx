import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

/**
 * Animated section heading with decorative line
 */
export function SectionHeading({ label, title, subtitle, align = 'center', light = false }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    gsap.fromTo(el.children,
      { opacity: 0, y: 25 },
      {
        opacity: 1, y: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
        }
      }
    )
  }, [])

  return (
    <div
      ref={ref}
      className="section-heading"
      style={{
        textAlign: align,
        marginBottom: 60,
      }}
    >
      {label && (
        <span style={{
          display: 'block',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 3,
          textTransform: 'uppercase',
          color: light ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)',
          marginBottom: 12,
        }}>
          {label}
        </span>
      )}
      <h2 style={{ color: light ? '#fff' : 'var(--text-primary)', marginBottom: 16 }}>
        {title}
      </h2>
      <div style={{
        width: 60,
        height: 2,
        background: light ? '#fff' : '#000',
        margin: align === 'center' ? '0 auto 20px' : '0 0 20px',
      }} />
      {subtitle && (
        <p style={{
          fontSize: 17,
          lineHeight: 1.7,
          color: light ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)',
          maxWidth: 600,
          margin: align === 'center' ? '0 auto' : 0,
        }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

/**
 * Statistics counter card
 */
export function StatCard({ icon: Icon, value, label }) {
  const numRef = useRef(null)

  useEffect(() => {
    const el = numRef.current
    if (!el) return
    const num = parseInt(value) || 0

    const obj = { val: 0 }
    gsap.to(obj, {
      val: num,
      duration: 2,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
      },
      onUpdate: () => {
        el.textContent = Math.round(obj.val).toLocaleString()
      }
    })
  }, [value])

  return (
    <div className="stat-card stagger-item" style={{
      padding: 32,
      textAlign: 'center',
    }}>
      {Icon && <Icon size={28} strokeWidth={1.5} style={{ marginBottom: 16, color: 'var(--gray-400)' }} />}
      <div ref={numRef} style={{
        fontFamily: 'var(--font-display)',
        fontSize: '2.5rem',
        fontWeight: 700,
        lineHeight: 1,
        marginBottom: 8,
      }}>
        0
      </div>
      <div style={{
        fontSize: 12,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 2,
        color: 'var(--text-muted)',
      }}>
        {label}
      </div>
    </div>
  )
}

/**
 * Feature card with icon
 */
export function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="card stagger-item" style={{ padding: 40 }}>
      <div style={{
        width: 56,
        height: 56,
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
      }}>
        <Icon size={24} strokeWidth={1.5} />
      </div>
      <h4 style={{
        fontFamily: 'var(--font-body)',
        fontSize: 16,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
      }}>
        {title}
      </h4>
      <p style={{
        color: 'var(--text-secondary)',
        fontSize: 14,
        lineHeight: 1.7,
      }}>
        {description}
      </p>
    </div>
  )
}
