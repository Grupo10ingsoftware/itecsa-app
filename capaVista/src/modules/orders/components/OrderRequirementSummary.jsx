import styles from './OrderRequirementSummary.module.css'

function SummaryStatus({ type, children }) {
  const statusClassName = [
    styles.summaryStatus,
    type === 'success' ? styles.summaryStatusSuccess : '',
    type === 'pending' ? styles.summaryStatusPending : '',
    type === 'optional' ? styles.summaryStatusOptional : '',
  ].filter(Boolean).join(' ')

  const iconClassName = {
    success: 'bi-check-circle',
    pending: 'bi-clock',
    optional: 'bi-folder',
  }[type]

  return (
    <span className={statusClassName}>
      <i className={`bi ${iconClassName}`} aria-hidden="true" />
      {children}
    </span>
  )
}

function SummaryMarker({ completed, index, icon, muted }) {
  if (completed) {
    return (
      <span className={`${styles.summaryMarker} ${styles.summaryMarkerSuccess}`}>
        <i className="bi bi-check-lg" aria-hidden="true" />
      </span>
    )
  }

  const markerClassName = [
    styles.summaryMarker,
    muted ? styles.summaryMarkerMuted : '',
  ].filter(Boolean).join(' ')

  if (icon) {
    return (
      <span className={markerClassName}>
        <i className={`bi ${icon}`} aria-hidden="true" />
      </span>
    )
  }

  return <span className={markerClassName}>{index}</span>
}

function RequirementItem({ index, title, value, statusType, statusLabel, completed, icon, muted }) {
  return (
    <div className={styles.summaryRequirementRow}>
      <SummaryMarker completed={completed} icon={icon} index={index} muted={muted} />

      <div className={styles.summaryRequirementContent}>
        <div className={styles.summaryRequirementHeader}>
          <strong>{title}</strong>
          <SummaryStatus type={statusType}>{statusLabel}</SummaryStatus>
        </div>

        {value ? (
          <small>{value}</small>
        ) : (
          <small className={styles.summaryRequirementEmptyValue} aria-hidden="true">&nbsp;</small>
        )}
      </div>
    </div>
  )
}

function getPrimaryLabel(currentStep) {
  if (currentStep === 3) return 'Registrar pedido'
  return 'Continuar'
}

export default function OrderRequirementSummary({ draft, currentStep, canContinue, onContinue, onBack }) {
  const hasSalesNoteCode = Boolean(draft.salesNoteCode?.trim())
  const hasPdf = Boolean(draft.salesNotePdf)
  const designFilesCount = draft.designFiles.length
  const primaryLabel = getPrimaryLabel(currentStep)
  const primaryDisabled = currentStep === 1 && !canContinue
  const hasDesignFiles = designFilesCount > 0

  return (
    <aside className={styles.sidePanel}>
      <section className={styles.summaryPanelMinimal} aria-labelledby="order-register-summary-title">
        <h2 className={styles.summaryPanelTitle} id="order-register-summary-title">
          <i className="bi bi-clipboard2-data" aria-hidden="true" />
          Resumen del registro
        </h2>

        <div className={styles.summaryRequirementGroup}>
          <RequirementItem
            completed={hasSalesNoteCode}
            index={1}
            statusLabel={hasSalesNoteCode ? 'Completado' : 'Pendiente'}
            statusType={hasSalesNoteCode ? 'success' : 'pending'}
            title="Código de Nota de Venta"
            value={hasSalesNoteCode ? draft.salesNoteCode : ''}
          />

          <RequirementItem
            completed={hasPdf}
            icon="bi-file-earmark-pdf"
            index={2}
            statusLabel={hasPdf ? 'Completado' : 'Pendiente'}
            statusType={hasPdf ? 'success' : 'pending'}
            title="Archivo de Nota de Venta"
            value={hasPdf ? draft.salesNotePdf.name : ''}
          />

          <RequirementItem
            completed={hasDesignFiles}
            icon="bi-folder"
            index={3}
            muted={!hasDesignFiles}
            statusLabel={hasDesignFiles ? 'Completado' : 'Opcional'}
            statusType={hasDesignFiles ? 'success' : 'optional'}
            title="Archivos de Diseño"
            value={hasDesignFiles ? `${designFilesCount} archivo(s)` : ''}
          />
        </div>

        <div className={styles.summaryActionStack}>
          <button
            className={primaryDisabled ? `${styles.summaryPrimaryButton} ${styles.disabledButton}` : styles.summaryPrimaryButton}
            disabled={primaryDisabled}
            onClick={onContinue}
            type="button"
          >
            <span>{primaryLabel}</span>
          </button>

          {currentStep > 1 && (
            <button className={styles.summaryBackButton} onClick={onBack} type="button">
              Volver
            </button>
          )}
        </div>
      </section>
    </aside>
  )
}
