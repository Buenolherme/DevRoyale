import { useEffect, useEffectEvent, type RefObject } from 'react'

interface UseDialogFocusOptions {
  open: boolean
  containerRef: RefObject<HTMLElement | null>
  initialFocusRef?: RefObject<HTMLElement | null> | null
  onClose: () => void
}

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return []

  return Array.from(
    container.querySelectorAll<HTMLElement>(focusableSelector),
  ).filter((element) => !element.hasAttribute('disabled'))
}

export function useDialogFocus({
  open,
  containerRef,
  initialFocusRef = null,
  onClose,
}: UseDialogFocusOptions) {
  const closeDialog = useEffectEvent(onClose)

  useEffect(() => {
    if (!open || typeof document === 'undefined') return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body?.style.overflow ?? ''

    if (document.body) document.body.style.overflow = 'hidden'

    const focusInitialElement = () => {
      const currentContainer = containerRef.current
      const requestedElement = initialFocusRef?.current
      const fallbackElement = getFocusableElements(currentContainer)[0]
      const target = requestedElement ?? fallbackElement ?? currentContainer

      if (target?.isConnected !== false) target?.focus()
    }
    const focusTimer = window.setTimeout(focusInitialElement, 0)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeDialog()
        return
      }

      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements(containerRef.current)
      if (!focusableElements.length) return

      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)

      if (document.body) document.body.style.overflow = previousOverflow
      if (previouslyFocused?.isConnected !== false) previouslyFocused?.focus()
    }
  }, [open, containerRef, initialFocusRef])
}
