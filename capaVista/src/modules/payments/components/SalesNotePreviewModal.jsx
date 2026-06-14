import { useState } from 'react'
import { PAYMENT_STATUS } from '@/config/status'
import styles from './SalesNotePreviewModal.module.css'
import DocumentPreviewModalLayout from './DocumentPreviewModalLayout'
import PdfPreviewFrame from './PdfPreviewFrame'
import {
  PDF_VARIANT,
  PREVIEW_CONTEXT,
  formatPaymentDateTime,
  getPdfAsset,
} from '../utils/paymentDocuments'

export default function SalesNotePreviewModal({
  context,
  onClose,
  onDownload,
  onPrint,
  order,
}) {
  const [previewZoom, setPreviewZoom] = useState(100)
  const [isExpanded, setIsExpanded] = useState(false)

  if (!order) return null

  const isSignedDetail = context === PREVIEW_CONTEXT.SIGNED_DETAIL
  const pdfVariant = isSignedDetail ? PDF_VARIANT.SIGNED : PDF_VARIANT.ORIGINAL
  const pdfAsset = getPdfAsset(order, pdfVariant)
  const modalTitle = isSignedDetail ? 'Documento firmado' : 'Vista previa'
  const documentPanelTitle = isSignedDetail
    ? 'Documento firmado'
    : 'Vista previa del documento'
  const closeAriaLabel = isSignedDetail
    ? 'Cerrar documento firmado'
    : 'Cerrar vista previa'
  const expandAriaLabel = isExpanded
    ? 'Restaurar tamaño'
    : isSignedDetail
      ? 'Agrandar documento'
      : 'Agrandar vista previa'
  const pdfTitle = isSignedDetail
    ? `Documento firmado PDF de ${order.nvNumber}`
    : `Vista previa PDF de ${order.nvNumber}`
  const previewDescription = isSignedDetail
    ? 'PDF firmado disponible para revisión, impresión y descarga.'
    : 'PDF original asociado a la Nota de Venta antes de la firma digital.'
  const modalHeaderDescription = isSignedDetail
    ? previewDescription
    : 'Revisa el documento asociado a la Nota de Venta antes de la firma digital.'
  const previewStatusClassByValue = {
    [PAYMENT_STATUS.PENDIENTE]: styles.detailStatusPending,
    [PAYMENT_STATUS.RECHAZADO]: styles.detailStatusRejected,
    [PAYMENT_STATUS.CONFIRMADO]: styles.detailStatusConfirmed,
  }
  const previewStatusClass =
    previewStatusClassByValue[order.paymentStatus] || styles.detailStatusPending

  const handleZoomOut = () => {
    setPreviewZoom((currentZoom) => Math.max(75, currentZoom - 25))
  }

  const handleZoomIn = () => {
    setPreviewZoom((currentZoom) => Math.min(150, currentZoom + 25))
  }

  const renderDetailItem = ({ icon, label, value, content }) => (
    <div className={styles.detailItem} key={label}>
      <span className={styles.detailIcon} aria-hidden="true">
        <i className={`bi ${icon}`} />
      </span>
      <div>
        <span>{label}</span>
        {content || <strong>{value}</strong>}
      </div>
    </div>
  )

  const detailRows = [
    {
      icon: 'bi-hash',
      label: 'N° Nota de Venta',
      value: order.nvNumber,
    },
    {
      icon: 'bi-paperclip',
      label: 'Archivo asociado',
      value: pdfAsset.fileName,
    },
    {
      icon: 'bi-clock',
      label: 'Estado de pago',
      content: (
        <strong
          className={`${styles.detailStatusPill} ${previewStatusClass}`}
        >
          {order.paymentStatus}
        </strong>
      ),
    },
    {
      icon: 'bi-eye',
      label: 'Tipo de vista',
      value: pdfAsset.label,
    },
  ]

  const generalRows = [
    {
      icon: 'bi-calendar3',
      label: 'Fecha de emisión',
      value: formatPaymentDateTime(order.createdAt),
    },
    {
      icon: 'bi-people',
      label: 'Cliente',
      value: order.companyName,
    },
    {
      icon: 'bi-person-vcard',
      label: 'RUT',
      value: order.rut,
    },
  ]

  const signatureRows = order.signature
    ? [
        {
          icon: 'bi-shield-check',
          label: 'Firma digital',
          value: order.signature.note,
        },
        {
          icon: 'bi-calendar3',
          label: 'Fecha de firma',
          value: order.signature.timestamp,
        },
        {
          icon: 'bi-person',
          label: 'Usuario firmante',
          value: order.signature.userId,
        },
      ]
    : []

  const secondaryRows = isSignedDetail ? signatureRows : generalRows
  const secondaryCardTitle = isSignedDetail ? 'Datos de firma' : 'Información general'
  const secondaryCardIcon = isSignedDetail ? 'bi-pen' : 'bi-info-circle'

  const footer = (
    <>
      <button
        className="btn btn-outline-secondary"
        onClick={onClose}
        type="button"
      >
        Cerrar
      </button>

      <button
        className="btn btn-outline-dark"
        disabled={!pdfAsset.filePath}
        onClick={() => onPrint(pdfAsset.filePath)}
        type="button"
      >
        <i className="bi bi-printer me-1" />
        Imprimir PDF
      </button>

      <button
        className="btn btn-dark"
        disabled={!pdfAsset.filePath}
        onClick={() => onDownload(order, pdfVariant)}
        type="button"
      >
        <i className="bi bi-file-earmark-arrow-down me-1" />
        Descargar PDF
      </button>
    </>
  )

  return (
    <DocumentPreviewModalLayout
      bodyClassName={styles.modalPreview}
      closeAriaLabel={closeAriaLabel}
      description={modalHeaderDescription}
      footer={footer}
      kicker={isSignedDetail ? 'Detalle de pago' : 'Nota de Venta'}
      onClose={onClose}
      title={modalTitle}
      titleId="sales-note-preview-title"
    >
      <aside className={styles.sidebar}>
        <section className={styles.card}>
          <header className={styles.cardHeader}>
            <i className="bi bi-file-earmark-text" aria-hidden="true" />
            <span>Detalle de la Nota de Venta</span>
          </header>

          <div className={styles.cardBody}>
            {detailRows.map(renderDetailItem)}
          </div>
        </section>

        {secondaryRows.length > 0 && (
          <section className={styles.card}>
            <header className={styles.cardHeader}>
              <i className={`bi ${secondaryCardIcon}`} aria-hidden="true" />
              <span>{secondaryCardTitle}</span>
            </header>

            <div className={styles.cardBody}>
              {secondaryRows.map(renderDetailItem)}
            </div>
          </section>
        )}
      </aside>

      <section
        className={`${styles.documentPanel} ${
          isExpanded ? styles.documentPanelExpanded : ''
        }`}
      >
        <div className={styles.documentHeader}>
          <div className={styles.documentTitle}>
            <i className="bi bi-file-earmark-pdf" aria-hidden="true" />
            <span>{documentPanelTitle}</span>
          </div>

          <div
            aria-label="Controles de vista previa"
            className={styles.toolbar}
            role="toolbar"
          >
            <button
              aria-label="Reducir zoom"
              disabled={previewZoom <= 75}
              onClick={handleZoomOut}
              type="button"
            >
              <i className="bi bi-dash-lg" />
            </button>
            <span>{previewZoom}%</span>
            <button
              aria-label="Aumentar zoom"
              disabled={previewZoom >= 150}
              onClick={handleZoomIn}
              type="button"
            >
              <i className="bi bi-plus-lg" />
            </button>
            <button
              aria-label={expandAriaLabel}
              aria-pressed={isExpanded}
              onClick={() => setIsExpanded((currentValue) => !currentValue)}
              type="button"
            >
              <i
                className={`bi ${
                  isExpanded ? 'bi-fullscreen-exit' : 'bi-fullscreen'
                }`}
              />
            </button>
          </div>
        </div>

        <PdfPreviewFrame
          className={styles.pdfPreviewFrame}
          emptyMessage="Esta Nota de Venta todavia no tiene una ruta de archivo asociada."
          filePath={pdfAsset.filePath}
          title={pdfTitle}
          zoom={previewZoom}
        />
      </section>
    </DocumentPreviewModalLayout>
  )
}
