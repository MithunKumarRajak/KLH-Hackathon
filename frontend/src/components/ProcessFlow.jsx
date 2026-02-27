import React, { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import './ProcessFlow.css'

const steps = [
  { num: '01', title: 'Create Recipe', desc: 'Input your recipe ingredients with precise measurements' },
  { num: '02', title: 'AI Analysis', desc: 'Automated macro & micro nutrient calculation' },
  { num: '03', title: 'Compliance Check', desc: 'FSSAI regulation validation & FOP indicators' },
  { num: '04', title: 'Label Preview', desc: 'Professional nutrition label generation' },
  { num: '05', title: 'Export & Deploy', desc: 'Download print-ready PDF labels' },
]

export default function ProcessFlow() {
  const containerRef = useRef(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const items = el.querySelectorAll('.flow-step')
    const line = el.querySelector('.flow-line-fill')

    gsap.fromTo(items,
      { opacity: 0, y: 40 },
      {
        opacity: 1, y: 0,
        duration: 0.7,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 80%',
        },
      }
    )

    if (line) {
      gsap.fromTo(line,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1.5,
          ease: 'power2.inOut',
          scrollTrigger: {
            trigger: el,
            start: 'top 80%',
          },
        }
      )
    }
  }, [])

  return (
    <div className="process-flow" ref={containerRef}>
      <div className="flow-line">
        <div className="flow-line-fill" />
      </div>
      {steps.map((step, i) => (
        <div className="flow-step" key={step.num}>
          <div className="flow-dot">
            <span>{step.num}</span>
          </div>
          <h4>{step.title}</h4>
          <p>{step.desc}</p>
        </div>
      ))}
    </div>
  )
}
