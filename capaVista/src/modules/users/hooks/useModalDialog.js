import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusableElements(container) {
  if (!container) return []

  return [...container.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
    (element) => element.getAttribute('aria-hidden') !== 'true' && !element.hidden,
  )
}

export function nextModalFocusTarget({ activeElement, focusableElements, shiftKey }) {
  if (focusableElements.length === 0) return null

  const first = focusableElements[0]
  const last = focusableElements.at(-1)
  const activeIndex = focusableElements.indexOf(activeElement)

  if (shiftKey && activeIndex <= 0) return last
  if (!shiftKey && (activeIndex === -1 || activeIndex === focusableElements.length - 1)) return first
  return null
}

function isolateBackground(container) {
  const layer = container?.closest('[data-modal-layer="true"]')
  const siblings = layer?.parentElement
    ? [...layer.parentElement.children].filter((element) => element !== layer)
    : []
  const previousStates = siblings.map((element) => ({
    ariaHidden: element.getAttribute('aria-hidden'),
    element,
    inert: element.inert,
  }))

  previousStates.forEach(({ element }) => {
    element.inert = true
    element.setAttribute('aria-hidden', 'true')
  })

  return () => {
    previousStates.forEach(({ ariaHidden, element, inert }) => {
      element.inert = inert
      if (ariaHidden === null) element.removeAttribute('aria-hidden')
      else element.setAttribute('aria-hidden', ariaHidden)
    })
  }
}

export function useModalDialog({
  canClose = true,
  containerRef,
  initialFocusRef,
  isOpen,
  onClose,
}) {
  const canCloseRef = useRef(canClose)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    canCloseRef.current = canClose
    onCloseRef.current = onClose
  }, [canClose, onClose])

  useEffect(() => {
    if (!isOpen) return undefined

    const container = containerRef.current
    const previousFocus = document.activeElement
    const previousBodyOverflow = document.body.style.overflow
    const restoreBackground = isolateBackground(container)
    document.body.style.overflow = 'hidden'

    const focusTimer = window.setTimeout(() => {
      const target = initialFocusRef?.current ?? getFocusableElements(container)[0] ?? container
      target?.focus()
    }, 0)

    function handleKeyDown(event) {
      if (event.key === 'Escape' && canCloseRef.current) {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements(container)
      const target = nextModalFocusTarget({
        activeElement: document.activeElement,
        focusableElements,
        shiftKey: event.shiftKey,
      })

      if (target) {
        event.preventDefault()
        target.focus()
      } else if (focusableElements.length === 0) {
        event.preventDefault()
        container?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousBodyOverflow
      restoreBackground()
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [containerRef, initialFocusRef, isOpen])
}
