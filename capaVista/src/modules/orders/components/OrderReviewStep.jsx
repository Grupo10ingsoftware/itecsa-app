import { useState } from 'react'
import SalesNotePreviewModal from './SalesNotePreviewModal'
import { formatFileSize } from '../utils/orderCreateFormatters'
import styles from './OrderReviewStep.module.css'

function ReviewRow({ label, value }) {
  return (
    <div className={styles.reviewRow}>
      <span className={styles.reviewLabel}>{label}</span>
      <span className={styles.reviewValue}>{value || '—'}</span>
    </div>
  )
}

export default function OrderReviewStep({ draft, onCommentsChange }) {
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const record = draft.managerRecord || {}

  return (
    <div className={styles.mainPanel}>
      <div className={styles.reviewLayout}>
        <div className={styles.leftColumn}>
          <section className={styles.reviewCard} aria-labelledby="review-sales-note-title">
            <h2 className={styles.cardTitle} id="review-sales-note-title">
              <i className="bi bi-file-earmark-text" aria-hidden="true" />
              Datos de Nota de Venta
            </h2>
            <div className={styles.reviewRows}>
              <ReviewRow label="Código de Nota de Venta" value={draft.salesNoteCode} />
              <ReviewRow label="Cliente" value={record.client} />
              <ReviewRow label="RUT" value={record.rut} />
            </div>
          </section>

          <section className={styles.documentCard} aria-labelledby="review-pdf-title">
            <h2 className={styles.cardTitle} id="review-pdf-title">
              <i className="bi bi-file-earmark-pdf" aria-hidden="true" />
              Documento de Nota de Venta
            </h2>
            <div className={styles.fileCard}>
              <span className={`${styles.fileIcon} ${styles.fileIconPdf}`}>
                <i className="bi bi-file-earmark-pdf" aria-hidden="true" />
              </span>
              <span>
                <p className={styles.fileTitle}>{draft.salesNotePdf?.name}</p>
                <p className={styles.fileMeta}>Archivo PDF · {draft.salesNotePdf ? formatFileSize(draft.salesNotePdf.size) : '0 KB'}</p>
              </span>
              <button className={styles.smallAction} onClick={() => setShowPdfPreview(true)} type="button">
                <i className="bi bi-eye" aria-hidden="true" />
                Vista previa
              </button>
            </div>
          </section>
        </div>

        <section className={styles.observationsCard} aria-labelledby="review-comments-title">
          <h2 className={styles.cardTitle} id="review-comments-title">
            <i className="bi bi-chat-left-text" aria-hidden="true" />
            Observaciones
          </h2>
          <textarea
            className={styles.textarea}
            maxLength={300}
            onChange={(event) => onCommentsChange(event.target.value)}
            placeholder="Ingrese observaciones para el registro del pedido"
            value={draft.comments || ''}
          />
          <p className={styles.characterCounter}>{draft.comments?.length || 0}/300 caracteres</p>
        </section>
      </div>

      {showPdfPreview && draft.salesNotePdf && (
        <SalesNotePreviewModal
          file={draft.salesNotePdf}
          salesNoteCode={draft.salesNoteCode}
          onClose={() => setShowPdfPreview(false)}
        />
      )}
    </div>
  )
}
