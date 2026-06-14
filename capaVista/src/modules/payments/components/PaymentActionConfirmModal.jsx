import { useEffect, useState } from 'react'
import { PAYMENT_STATUS } from '@/config/status'
import styles from './PaymentActionConfirmModal.module.css'
import DocumentPreviewModalLayout from './DocumentPreviewModalLayout'
import PdfPreviewFrame from './PdfPreviewFrame'
import {
  formatPaymentDateTime,
  getPaymentActionMeta,
  getPdfAsset,
} from '../utils/paymentDocuments'

export default function PaymentActionConfirmModal({
  isHolding,
  isUpdating = false,
  onCancel,
  onHoldEnd,
  onHoldStart,
  paymentsApi,
  order,
  targetStatus,
}) {
  const [confirmPreviewZoom, setConfirmPreviewZoom] = useState(100)
  const [isConfirmPreviewExpanded, setIsConfirmPreviewExpanded] = useState(false)
  const [signedPreviewState, setSignedPreviewState] = useState({
    error: null,
    orderId: null,
    url: null,
  })

  const isConfirmingPayment = targetStatus === PAYMENT_STATUS.CONFIRMADO
  const currentSignedPreview =
    signedPreviewState.orderId === order?.id
      ? signedPreviewState
      : { error: null, url: null }
  const isWaitingForSignedPreview = Boolean(
    isConfirmingPayment &&
      order?.id &&
      !currentSignedPreview.url &&
      !currentSignedPreview.error,
  )

  useEffect(() => {
    let isCancelled = false
    let objectUrl = null

    if (!isConfirmingPayment || !order?.id || !paymentsApi) {
      return undefined
    }

    paymentsApi.getPaymentSignaturePreview(order.id)
      .then((pdfBlob) => {
        if (isCancelled) return

        objectUrl = URL.createObjectURL(pdfBlob)
        setSignedPreviewState({
          error: null,
          orderId: order.id,
          url: objectUrl,
        })
      })
      .catch((error) => {
        if (isCancelled) return

        setSignedPreviewState({
          error:
            error?.payload?.message ??
            'No fue posible generar la vista previa firmada.',
          orderId: order.id,
          url: null,
        })
      })

    return () => {
      isCancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [isConfirmingPayment, order?.id, paymentsApi])

  if (!order || !targetStatus) return null

  const actionMeta = getPaymentActionMeta(targetStatus)
  const pdfAsset = getPdfAsset(order, actionMeta.pdfVariant, {
    fallbackSignedFilePath: currentSignedPreview.url,
    fallbackSignedFileName: `${order.nvNumber}-firmado-preview.pdf`,
  })

  const statusClassByValue = {
    [PAYMENT_STATUS.PENDIENTE]: styles.detailStatusPending,
    [PAYMENT_STATUS.RECHAZADO]: styles.detailStatusRejected,
    [PAYMENT_STATUS.CONFIRMADO]: styles.detailStatusConfirmed,
  }

  const currentStatusClass =
    statusClassByValue[order.paymentStatus] || styles.detailStatusPending
  const targetStatusClass =
    statusClassByValue[targetStatus] || styles.detailStatusPending

  const handleZoomOut = () => {
    setConfirmPreviewZoom((currentZoom) => Math.max(75, currentZoom - 25))
  }

  const handleZoomIn = () => {
    setConfirmPreviewZoom((currentZoom) => Math.min(150, currentZoom + 25))
  }

  const shouldUseTouchFallback =
    typeof window !== 'undefined' && !('PointerEvent' in window)

  const preventHoldSelection = (event) => {
    event.preventDefault()
  }

  const shouldPreventNativeTouchAction = (event) =>
    !('pointerType' in event) || event.pointerType === 'touch'

  const handleHoldPointerStart = (event) => {
    if (shouldPreventNativeTouchAction(event)) event.preventDefault()
    if (isUpdating) return
    onHoldStart()
  }

  const handleHoldPointerEnd = (event) => {
    if (shouldPreventNativeTouchAction(event)) event.preventDefault()
    onHoldEnd()
  }

  const touchHoldHandlers = shouldUseTouchFallback
    ? {
        onTouchCancel: handleHoldPointerEnd,
        onTouchEnd: handleHoldPointerEnd,
        onTouchMove: preventHoldSelection,
        onTouchStart: handleHoldPointerStart,
      }
    : {}

  const renderActionDetailItem = ({ icon, label, value, content }) => (
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

  const managementRows = [
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
      label: 'Estado actual',
      content: (
        <strong className={`${styles.detailStatusPill} ${currentStatusClass}`}>
          {order.paymentStatus}
        </strong>
      ),
    },
    {
      icon: actionMeta.icon,
      label: 'Nuevo estado',
      content: (
        <strong className={`${styles.detailStatusPill} ${targetStatusClass}`}>
          {actionMeta.statusLabel}
        </strong>
      ),
    },
  ]

  const confirmationRows = [
    {
      icon: 'bi-people',
      label: 'Cliente',
      value: order.companyName,
    },
    {
      icon: 'bi-calendar3',
      label: 'Fecha de emisión',
      value: formatPaymentDateTime(order.createdAt),
    },
    {
      icon: 'bi-arrow-repeat',
      label: 'Resultado esperado',
      value: 'Actualizar estado del pago',
    },
  ]

  const footer = (
    <>
      <button
        className="btn btn-outline-secondary"
        disabled={isUpdating}
        onClick={onCancel}
        type="button"
      >
        Cancelar
      </button>

      <button
        className={`${styles.holdConfirmButton} ${
          isHolding || isUpdating ? styles.holdConfirmButtonHolding : ''
        }`}
        disabled={isUpdating || isWaitingForSignedPreview}
        onKeyDown={(event) => {
          if (isUpdating || isWaitingForSignedPreview) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onHoldStart()
          }
        }}
        onKeyUp={(event) => {
          if (isUpdating || isWaitingForSignedPreview) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onHoldEnd()
          }
        }}
        draggable="false"
        onBlur={onHoldEnd}
        onContextMenu={preventHoldSelection}
        onDragStart={preventHoldSelection}
        onPointerCancel={handleHoldPointerEnd}
        onPointerDown={handleHoldPointerStart}
        onPointerLeave={onHoldEnd}
        onPointerUp={handleHoldPointerEnd}
        onSelect={preventHoldSelection}
        type="button"
        {...touchHoldHandlers}
      >
        <span>
          {isHolding || isUpdating
            ? actionMeta.completedLabel
            : actionMeta.holdLabel}
        </span>
      </button>
    </>
  )

  return (
    <DocumentPreviewModalLayout
      bodyClassName={styles.confirmModalBody}
      closeAriaLabel="Cancelar cambio de estado"
      description="Revisa y confirma el cambio que se aplicará sobre la Nota de Venta."
      footer={footer}
      kicker="Cambio de estado"
      onClose={onCancel}
      title={actionMeta.modalTitle}
      titleId="payment-action-confirm-title"
      variant="actionConfirm"
    >
      <aside className={styles.actionConfirmSidebar}>
        <section className={styles.card}>
          <header className={styles.cardHeader}>
            <i className="bi bi-file-earmark-text" aria-hidden="true" />
            <span>Detalle de la gestión</span>
          </header>

          <div className={styles.cardBody}>
            {managementRows.map(renderActionDetailItem)}
          </div>
        </section>

        <section className={styles.card}>
          <header className={styles.cardHeader}>
            <i className="bi bi-shield-exclamation" aria-hidden="true" />
            <span>Confirmación de acción</span>
          </header>

          <div className={styles.cardBody}>
            {confirmationRows.map(renderActionDetailItem)}
          </div>
        </section>
      </aside>

      <section
        className={`${styles.documentPanel} ${
          isConfirmPreviewExpanded ? styles.documentPanelExpanded : ''
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
              disabled={confirmPreviewZoom <= 75}
              onClick={handleZoomOut}
              type="button"
            >
              <i className="bi bi-dash-lg" />
            </button>
            <span>{confirmPreviewZoom}%</span>
            <button
              aria-label="Aumentar zoom"
              disabled={confirmPreviewZoom >= 150}
              onClick={handleZoomIn}
              type="button"
            >
              <i className="bi bi-plus-lg" />
            </button>
            <button
              aria-label={
                isConfirmPreviewExpanded
                  ? 'Restaurar tamaño'
                  : 'Agrandar vista previa'
              }
              aria-pressed={isConfirmPreviewExpanded}
              onClick={() =>
                setIsConfirmPreviewExpanded((currentValue) => !currentValue)
              }
              type="button"
            >
              <i
                className={`bi ${
                  isConfirmPreviewExpanded ? 'bi-fullscreen-exit' : 'bi-fullscreen'
                }`}
              />
            </button>
          </div>
        </div>

        {isWaitingForSignedPreview ? (
          <div className={styles.pdfPreviewFrame}>
            <div className="d-flex h-100 flex-column align-items-center justify-content-center gap-2 text-center">
              <span
                className={`spinner-border ${styles.previewSpinner}`}
                aria-hidden="true"
              />
              <strong>Generando vista previa firmada</strong>
              <span>Preparando el PDF antes de confirmar el cambio.</span>
            </div>
          </div>
        ) : (
          <PdfPreviewFrame
            className={styles.pdfPreviewFrame}
            emptyMessage={
              currentSignedPreview.error ||
              'No existe un PDF asociado para mostrar la vista previa de esta acción.'
            }
            filePath={pdfAsset.filePath}
            title={`${actionMeta.previewTitle} ${order.nvNumber}`}
            zoom={confirmPreviewZoom}
          />
        )}
      </section>
    </DocumentPreviewModalLayout>
  )
}
