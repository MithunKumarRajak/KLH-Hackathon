import { useEffect, useCallback } from 'react'

/**
 * Global keyboard shortcuts for Satvika
 *
 * Ctrl+S — Save / Submit current form
 * Ctrl+E — Export label
 * Ctrl+P — Parse ingredients
 * Ctrl+/ — Focus search / help
 * Escape — Close modals
 *
 * Supply handlers as an object: { save, exportLabel, parse, search, escape }
 * Only active keys are bound.
 */
export default function useKeyboardShortcuts(handlers = {}) {
    const onKeyDown = useCallback((e) => {
        const ctrl = e.ctrlKey || e.metaKey
        const tag = e.target.tagName

        // Don't hijack when typing in an input/textarea (unless Escape)
        const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

        if (e.key === 'Escape' && handlers.escape) {
            handlers.escape()
            return
        }

        if (!ctrl) return

        const key = e.key.toLowerCase()

        if (key === 's' && handlers.save) {
            e.preventDefault()
            handlers.save()
        }
        if (key === 'e' && handlers.exportLabel) {
            e.preventDefault()
            handlers.exportLabel()
        }
        if (key === 'p' && handlers.parse && !isEditing) {
            e.preventDefault()
            handlers.parse()
        }
        if (key === '/' && handlers.search) {
            e.preventDefault()
            handlers.search()
        }
    }, [handlers])

    useEffect(() => {
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [onKeyDown])
}