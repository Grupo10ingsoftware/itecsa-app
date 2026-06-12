import { useEffect, useMemo, useState } from 'react'
import DocumentPreviewModalLayout from './DocumentPreviewModalLayout'
import PdfPreviewFrame from './PdfPreviewFrame'
import styles from './SalesNotePreviewModal.module.css'

function isPdfFile(file) {
  if (!file) return false
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

export default function SalesNotePreviewModal({
  description = 'Revisa que el archivo corresponda a la Nota de Venta antes de continuar con el registro del pedido.',
  documentLabel = 'Nota de Venta',
  emptyMessage,
  file,
  salesNoteCode = '',
  title = 'Vista previa',
  onClose,
}) {
  const [previewZoom, setPreviewZoom] = useState(100)
  const [isExpanded, setIsExpanded] = useState(false)
  const [fileData, setFileData] = useState(null)
  const [fileDataError, setFileDataError] = useState('')

  const canRenderPdf = isPdfFile(file)
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  useEffect(() => {
    if (!previewUrl) return undefined

    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  useEffect(() => {
    let isCancelled = false

    queueMicrotask(() => {
      if (isCancelled) return
      setFileData(null)
      setFileDataError('')
    })

    if (!file || !canRenderPdf) {
      return () => {
        isCancelled = true
      }
    }

    file.arrayBuffer()
      .then((buffer) => {
        if (!isCancelled) setFileData(buffer)
      })
      .catch(() => {
        if (!isCancelled) setFileDataError('No fue posible leer el archivo cargado.')
      })

    return () => {
      isCancelled = true
    }
  }, [canRenderPdf, file])

  if (!file || !previewUrl) return null

  const normalizedCode = salesNoteCode?.trim()

  const handleZoomOut = () => {
    setPreviewZoom((currentZoom) => Math.max(75, currentZoom - 25))
  }

  const handleZoomIn = () => {
    setPreviewZoom((currentZoom) => Math.min(150, currentZoom + 25))
  }

  const footer = (
    <button className={`btn btn-dark ${styles.closeWideButton}`} onClick={onClose} type="button">
      Cerrar vista previa
    </button>
  )

  const fallbackMessage = emptyMessage || (
    canRenderPdf
      ? fileDataError || 'Este archivo todavía no tiene vista previa disponible.'
      : 'La vista previa embebida está disponible para archivos PDF. El archivo quedó adjunto al registro.'
  )

  return (
    <DocumentPreviewModalLayout
      bodyClassName={styles.modalPreviewCentered}
      closeAriaLabel="Cerrar vista previa"
      description={description}
      footer={footer}
      kicker={documentLabel}
      onClose={onClose}
      title={title}
      titleId="sales-note-preview-title"
    >
      <section
        className={`${styles.documentPanel} ${
          isExpanded ? styles.documentPanelExpanded : ''
        }`}
      >
        <div className={styles.documentHeader}>
          <div className={styles.documentTitle}>
            <i className="bi bi-file-earmark-pdf" aria-hidden="true" />
            <span>Vista previa del documento</span>
          </div>

          <div
            aria-label="Controles de vista previa"
            className={styles.toolbar}
            role="toolbar"
          >
            <button
              aria-label="Reducir zoom"
              disabled={!canRenderPdf || previewZoom <= 75}
              onClick={handleZoomOut}
              type="button"
            >
              <i className="bi bi-dash-lg" />
            </button>
            <span>{previewZoom}%</span>
            <button
              aria-label="Aumentar zoom"
              disabled={!canRenderPdf || previewZoom >= 150}
              onClick={handleZoomIn}
              type="button"
            >
              <i className="bi bi-plus-lg" />
            </button>
            <button
              aria-label={isExpanded ? 'Restaurar tamaño' : 'Agrandar vista previa'}
              aria-pressed={isExpanded}
              onClick={() => setIsExpanded((currentValue) => !currentValue)}
              type="button"
            >
              <i className={`bi ${isExpanded ? 'bi-fullscreen-exit' : 'bi-fullscreen'}`} />
            </button>
          </div>
        </div>

        <PdfPreviewFrame
          className={styles.pdfPreviewFrame}
          emptyMessage={fallbackMessage}
          fileData={canRenderPdf ? fileData : null}
          isPreparing={canRenderPdf && !fileData && !fileDataError}
          title={`Vista previa PDF de ${normalizedCode || file.name}`}
          zoom={previewZoom}
        />
      </section>
    </DocumentPreviewModalLayout>
  )
}
