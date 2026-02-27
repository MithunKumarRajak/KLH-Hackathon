import React, { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import './PageLoader.css'

export default function PageLoader({ onComplete }) {
  const loaderRef = useRef(null)
  const textRef = useRef(null)

  useEffect(() => {
    const letters = textRef.current.querySelectorAll('.loader-letter')

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.to(loaderRef.current, {
          yPercent: -100,
          duration: 0.8,
          ease: 'power4.inOut',
          onComplete: onComplete,
        })
      }
    })

    tl.fromTo(letters,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out' }
    )
    .to(letters, {
      opacity: 0.3,
      duration: 0.3,
      stagger: 0.04,
      ease: 'power2.in',
      delay: 0.5,
    })
  }, [])

  const name = 'SATVIKA'

  return (
    <div className="page-loader" ref={loaderRef}>
      <div className="loader-content" ref={textRef}>
        {name.split('').map((ch, i) => (
          <span className="loader-letter" key={i}>{ch}</span>
        ))}
      </div>
      <div className="loader-bar">
        <div className="loader-bar-fill" />
      </div>
    </div>
  )
}
