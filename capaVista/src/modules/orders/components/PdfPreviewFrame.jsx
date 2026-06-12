import { useCallback, useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import styles from './PdfPreviewFrame.module.css'

function ensurePdfJsRuntimeCompatibility() {
  if (typeof Map !== 'undefined') {
    if (typeof Map.prototype.getOrInsert !== 'function') {
      Object.defineProperty(Map.prototype, 'getOrInsert', {
        configurable: true,
        value(key, defaultValue) {
          if (this.has(key)) return this.get(key)
          this.set(key, defaultValue)
          return defaultValue
        },
        writable: true,
      })
    }

    if (typeof Map.prototype.getOrInsertComputed !== 'function') {
      Object.defineProperty(Map.prototype, 'getOrInsertComputed', {
        configurable: true,
        value(key, callback) {
          if (this.has(key)) return this.get(key)
          const computedValue = callback(key)
          this.set(key, computedValue)
          return computedValue
        },
        writable: true,
      })
    }
  }
}

ensurePdfJsRuntimeCompatibility()

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const MIN_VIEWER_WIDTH = 240
const DESKTOP_STACK_PADDING = 32
const MOBILE_STACK_PADDING = 24
const MIN_RENDER_SCALE = 0.2
const MAX_RENDER_SCALE = 3
const MAX_OUTPUT_SCALE = 2
const FALLBACK_VIEWER_WIDTH = 900

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function getCanvasOutputScale() {
  if (typeof window === 'undefined') return 1

  return clamp(window.devicePixelRatio || 1, 1, MAX_OUTPUT_SCALE)
}

function getHorizontalPadding(width) {
  return width < 576 ? MOBILE_STACK_PADDING : DESKTOP_STACK_PADDING
}

function isCancelledRenderError(error) {
  return error?.name === 'RenderingCancelledException'
}

function clonePdfData(fileData) {
  if (!fileData) return null

  if (fileData instanceof ArrayBuffer) return fileData.slice(0)

  if (ArrayBuffer.isView(fileData)) {
    const { buffer, byteOffset, byteLength } = fileData
    return buffer.slice(byteOffset, byteOffset + byteLength)
  }

  return fileData
}

export default function PdfPreviewFrame({
  className = '',
  emptyMessage,
  emptyStateClassName = '',
  fileData,
  isPreparing = false,
  title,
  viewerClassName = '',
  zoom = 100,
}) {
  const [documentProxy, setDocumentProxy] = useState(null)
  const [pageNumbers, setPageNumbers] = useState([])
  const [loadState, setLoadState] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [viewerWidth, setViewerWidth] = useState(0)
  const [retryKey, setRetryKey] = useState(0)
  const canvasRefs = useRef(new Map())
  const renderTasksRef = useRef([])
  const viewerRef = useRef(null)

  const hasPdf = Boolean(fileData)

  const cancelActiveRenderTasks = useCallback(() => {
    renderTasksRef.current.forEach((task) => task.cancel())
    renderTasksRef.current = []
  }, [])

  const handleRetryPreview = () => {
    cancelActiveRenderTasks()
    setRetryKey((currentKey) => currentKey + 1)
  }

  useEffect(() => {
    if (!hasPdf) {
      queueMicrotask(() => setViewerWidth(0))
      return undefined
    }

    const viewerElement = viewerRef.current
    if (!viewerElement) return undefined

    const updateViewerWidth = () => {
      const nextWidth = Math.floor(viewerElement.getBoundingClientRect().width)

      if (nextWidth > 0) {
        setViewerWidth((currentWidth) => (
          Math.abs(currentWidth - nextWidth) > 1 ? nextWidth : currentWidth
        ))
      }
    }

    updateViewerWidth()

    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(() => {
        window.requestAnimationFrame(updateViewerWidth)
      })
      resizeObserver.observe(viewerElement)

      return () => resizeObserver.disconnect()
    }

    window.addEventListener('resize', updateViewerWidth)
    window.addEventListener('orientationchange', updateViewerWidth)

    return () => {
      window.removeEventListener('resize', updateViewerWidth)
      window.removeEventListener('orientationchange', updateViewerWidth)
    }
  }, [hasPdf])

  useEffect(() => {
    let isCancelled = false
    let loadingTask = null

    cancelActiveRenderTasks()
    canvasRefs.current.clear()

    queueMicrotask(() => {
      if (isCancelled) return

      setDocumentProxy(null)
      setPageNumbers([])
      setErrorMessage('')
      setLoadState(hasPdf ? 'loading' : 'idle')
    })

    if (!hasPdf) return undefined

    const clonedData = clonePdfData(fileData)
    loadingTask = pdfjsLib.getDocument({ data: clonedData })

    loadingTask.promise
      .then((pdfDocument) => {
        if (isCancelled) {
          pdfDocument.destroy()
          return
        }

        setDocumentProxy(pdfDocument)
        setPageNumbers(
          Array.from({ length: pdfDocument.numPages }, (_, index) => index + 1),
        )
        setLoadState('ready')
      })
      .catch((error) => {
        if (isCancelled) return

        setLoadState('error')
        setErrorMessage(
          error?.message || 'No fue posible cargar el PDF para previsualización.',
        )
      })

    return () => {
      isCancelled = true
      cancelActiveRenderTasks()
      loadingTask?.destroy?.()
    }
  }, [cancelActiveRenderTasks, fileData, hasPdf, retryKey])

  useEffect(() => {
    if (!documentProxy || pageNumbers.length === 0) {
      return undefined
    }

    let isCancelled = false
    const activeRenderTasks = []
    cancelActiveRenderTasks()
    renderTasksRef.current = activeRenderTasks

    async function renderPages() {
      const measuredWidth = Math.floor(
        viewerRef.current?.getBoundingClientRect().width || viewerWidth || FALLBACK_VIEWER_WIDTH,
      )
      const availableWidth = Math.max(
        measuredWidth - getHorizontalPadding(measuredWidth),
        MIN_VIEWER_WIDTH,
      )

      for (const pageNumber of pageNumbers) {
        if (isCancelled) return

        const canvas = canvasRefs.current.get(pageNumber)
        if (!canvas) continue

        try {
          const page = await documentProxy.getPage(pageNumber)

          if (isCancelled) return

          const baseViewport = page.getViewport({ scale: 1 })
          const fitWidthScale = availableWidth / baseViewport.width
          const scale = clamp(
            fitWidthScale * (zoom / 100),
            MIN_RENDER_SCALE,
            MAX_RENDER_SCALE,
          )
          const viewport = page.getViewport({ scale })
          const outputScale = getCanvasOutputScale()
          const context = canvas.getContext('2d', { alpha: false })

          canvas.width = Math.floor(viewport.width * outputScale)
          canvas.height = Math.floor(viewport.height * outputScale)
          canvas.style.width = `${Math.floor(viewport.width)}px`
          canvas.style.height = `${Math.floor(viewport.height)}px`

          context.setTransform(outputScale, 0, 0, outputScale, 0, 0)
          context.clearRect(0, 0, viewport.width, viewport.height)

          const renderTask = page.render({
            canvasContext: context,
            viewport,
          })
          activeRenderTasks.push(renderTask)
          await renderTask.promise
        } catch (error) {
          if (!isCancelled && !isCancelledRenderError(error)) {
            setLoadState('error')
            setErrorMessage(
              error?.message || 'No fue posible renderizar el PDF en esta pantalla.',
            )
            return
          }
        }
      }
    }

    window.requestAnimationFrame(renderPages)

    return () => {
      isCancelled = true
      activeRenderTasks.forEach((task) => task.cancel())
    }
  }, [cancelActiveRenderTasks, documentProxy, pageNumbers, viewerWidth, zoom])

  const shouldShowLoading = loadState === 'loading' || (isPreparing && loadState !== 'ready')

  return (
    <div className={`${styles.frame} ${className}`}>
      {hasPdf ? (
        <div
          aria-label={title}
          className={`${styles.viewer} ${viewerClassName}`}
          ref={viewerRef}
          role="document"
        >
          {shouldShowLoading && (
            <div className={styles.loadingState}>
              <div className={styles.loadingSpinner} aria-hidden="true" />
              <strong>Cargando PDF</strong>
              <span>Preparando vista previa del documento.</span>
            </div>
          )}

          {loadState === 'error' && (
            <div className={`${styles.emptyState} ${emptyStateClassName}`}>
              <i className="bi bi-exclamation-triangle" aria-hidden="true" />
              <strong>No fue posible previsualizar el PDF</strong>
              <p>{errorMessage}</p>
              <div className={styles.fallbackActions}>
                <button
                  className="btn btn-dark btn-sm"
                  onClick={handleRetryPreview}
                  type="button"
                >
                  Reintentar vista previa
                </button>
              </div>
            </div>
          )}

          {loadState !== 'error' && pageNumbers.length > 0 && (
            <div className={styles.documentStack}>
              {pageNumbers.map((pageNumber) => (
                <div className={styles.pageShell} key={pageNumber}>
                  <canvas
                    aria-label={`Página ${pageNumber} del PDF`}
                    className={styles.pageCanvas}
                    ref={(element) => {
                      if (element) {
                        canvasRefs.current.set(pageNumber, element)
                      } else {
                        canvasRefs.current.delete(pageNumber)
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className={`${styles.emptyState} ${emptyStateClassName}`}>
          {isPreparing ? (
            <>
              <div className={styles.loadingSpinner} aria-hidden="true" />
              <strong>Cargando PDF</strong>
              <p>Preparando vista previa del documento.</p>
            </>
          ) : (
            <>
              <i className="bi bi-file-earmark-x" aria-hidden="true" />
              <strong>PDF no disponible para previsualización</strong>
              <p>{emptyMessage}</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
