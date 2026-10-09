import styles from './PaymentActionConfirmModal.module.css'
import DocumentPreviewModalLayout from './DocumentPreviewModalLayout'
import { getPaymentActionMeta } from '../utils/paymentDocuments'

const EMPTY_VALUE = '—'

function displayValue(value) {
  if (value === null || value === undefined || value === '') return EMPTY_VALUE
  return value
}

function DataItem({ label, value }) {
  return (
    <div className={styles.dataItem}>
      <dt>{label}</dt>
      <dd>{displayValue(value)}</dd>
    </div>
  )
}

function ProductCard({ item, index }) {
  return (
    <article className={styles.productCard}>
      <header className={styles.productCardHeader}>
        <span>Producto {index + 1}</span>
      </header>

      <dl className={styles.productDetails}>
        <DataItem label="Tipo de producto" value={item.productType} />
        <DataItem label="Producto" value={item.product} />
        <DataItem label="Código" value={item.code} />
        <DataItem label="Cantidad" value={item.quantity} />
      </dl>
    </article>
  )
}

function SectionTitle({ icon, title, titleId }) {
  return (
    <header className={styles.sectionTitle}>
      <div>
        <i className={`bi ${icon}`} aria-hidden="true" />
        <h3 id={titleId}>{title}</h3>
      </div>
    </header>
  )
}

export default function PaymentActionConfirmModal({
  detailsError = null,
  isLoadingDetails = false,
  isUpdating = false,
  mode = 'action',
  onCancel,
  onValidate,
  order,
  targetStatus,
}) {
  const isDetailMode = mode === 'detail'

  if (!order || (!isDetailMode && !targetStatus)) return null

  const actionMeta = isDetailMode ? null : getPaymentActionMeta(targetStatus)
  const trackedProducts = order.trackedProducts ?? []
  const normalizedPaymentStatus = String(order.paymentStatus ?? 'registrado')
    .trim()
    .toLocaleLowerCase('es')

  const actionFooter = (
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
        className={styles.holdConfirmButton}
        disabled={isUpdating || isLoadingDetails || Boolean(detailsError)}
        onClick={onValidate}
        type="button"
      >
        <span>
          {isUpdating ? actionMeta?.completedLabel : actionMeta?.holdLabel}
        </span>
      </button>
    </>
  )
  const detailFooter = (
    <button
      className="btn btn-outline-secondary"
      onClick={onCancel}
      type="button"
    >
      Cerrar
    </button>
  )

  return (
    <DocumentPreviewModalLayout
      bodyClassName={styles.confirmModalBody}
      closeAriaLabel={isDetailMode ? 'Cerrar detalle de pago' : 'Cancelar cambio de estado'}
      description={
        isDetailMode
          ? `Detalle de la Nota de Venta asociada al pago ${normalizedPaymentStatus}.`
          : 'Revisa los datos del pedido y de la Nota de Venta antes de validar el cambio.'
      }
      footer={isDetailMode ? detailFooter : actionFooter}
      kicker={isDetailMode ? `Pago ${normalizedPaymentStatus}` : 'Cambio de estado'}
      onClose={onCancel}
      title={isDetailMode ? 'Detalle de pago' : actionMeta?.modalTitle}
      titleId={isDetailMode ? 'payment-detail-title' : 'payment-action-confirm-title'}
      variant={isDetailMode ? 'salesNote' : 'actionConfirm'}
    >
      {isLoadingDetails ? (
        <div className={styles.detailsState} role="status">
          <span className="spinner-border spinner-border-sm" aria-hidden="true" />
          Cargando información del pedido...
        </div>
      ) : detailsError ? (
        <div className={`${styles.detailsState} ${styles.detailsError}`} role="alert">
          {detailsError}
        </div>
      ) : (
        <>
          <section className={styles.contentCard} aria-labelledby="sales-note-detail-title">
            <SectionTitle
              icon="bi-receipt"
              title="Detalle de la Nota de Venta"
              titleId="sales-note-detail-title"
            />
            <dl className={styles.dataGrid}>
              <DataItem label="Nota de Venta" value={order.nvNumber} />
              <DataItem label="Cliente" value={order.companyName} />
              <DataItem label="RUT" value={order.rut} />
              <DataItem label="Vendedor" value={order.sellerEmail} />
            </dl>
          </section>

          {trackedProducts.length > 0 && (
            <section className={styles.productsSection} aria-label="Productos del pedido">
              {trackedProducts.map((item, index) => (
                <ProductCard item={item} index={index} key={item.id} />
              ))}
            </section>
          )}
        </>
      )}
    </DocumentPreviewModalLayout>
  )
}
