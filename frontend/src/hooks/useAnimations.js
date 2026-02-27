import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Hook for GSAP scroll-triggered reveal animations
 */
export function useScrollReveal(options = {}) {
    const ref = useRef(null)

    useEffect(() => {
        const el = ref.current
        if (!el) return

        const {
            y = 40,
                x = 0,
                duration = 1,
                delay = 0,
                ease = 'power3.out',
                start = 'top 85%',
        } = options

        gsap.fromTo(el, { opacity: 0, y, x }, {
            opacity: 1,
            y: 0,
            x: 0,
            duration,
            delay,
            ease,
            scrollTrigger: {
                trigger: el,
                start,
                toggleActions: 'play none none none',
            },
        })

        return () => {
            ScrollTrigger.getAll().forEach(t => {
                if (t.trigger === el) t.kill()
            })
        }
    }, [])

    return ref
}

/**
 * Hook for staggered children animations
 */
export function useStaggerReveal(options = {}) {
    const ref = useRef(null)

    useEffect(() => {
        const el = ref.current
        if (!el) return

        const {
            childSelector = '.stagger-item',
                y = 30,
                duration = 0.8,
                stagger = 0.1,
                ease = 'power3.out',
                start = 'top 85%',
        } = options

        const children = el.querySelectorAll(childSelector)

        gsap.fromTo(children, { opacity: 0, y }, {
            opacity: 1,
            y: 0,
            duration,
            stagger,
            ease,
            scrollTrigger: {
                trigger: el,
                start,
                toggleActions: 'play none none none',
            },
        })

        return () => {
            ScrollTrigger.getAll().forEach(t => {
                if (t.trigger === el) t.kill()
            })
        }
    }, [])

    return ref
}

/**
 * Hook for parallax effect
 */
export function useParallax(speed = 0.3) {
    const ref = useRef(null)

    useEffect(() => {
        const el = ref.current
        if (!el) return

        gsap.to(el, {
            yPercent: speed * 100,
            ease: 'none',
            scrollTrigger: {
                trigger: el,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true,
            },
        })

        return () => {
            ScrollTrigger.getAll().forEach(t => {
                if (t.trigger === el) t.kill()
            })
        }
    }, [speed])

    return ref
}

/**
 * Hook for counter animation
 */
export function useCountUp(endValue, duration = 2) {
    const ref = useRef(null)

    useEffect(() => {
        const el = ref.current
        if (!el) return

        const obj = { val: 0 }
        gsap.to(obj, {
            val: endValue,
            duration,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: el,
                start: 'top 85%',
                toggleActions: 'play none none none',
            },
            onUpdate: () => {
                el.textContent = Math.round(obj.val).toLocaleString()
            },
        })
    }, [endValue, duration])

    return ref
}