import styles from './OrderRequirementSummary.module.css'
import { getOrderPriorityMeta } from '../mocks/orderCreate.mock'

function SummaryStatus({ completed, children }) {
  return (
    <span className={styles.summaryStatus + ' ' + (completed ? styles.summaryStatusSuccess : styles.summaryStatusPending)}>
      <i className={'bi ' + (completed ? 'bi-check-circle' : 'bi-clock')} aria-hidden="true" />
      {children}
    </span>
  )
}

function RequirementItem({ index, title, value, completed, icon, valueTone }) {
  return (
    <div className={styles.summaryRequirementRow}>
      <span className={styles.summaryMarker + (completed ? ' ' + styles.summaryMarkerSuccess : '')}>
        {completed ? <i className="bi bi-check-lg" aria-hidden="true" /> : icon ? <i className={'bi ' + icon} aria-hidden="true" /> : index}
      </span>
      <div className={styles.summaryRequirementContent}>
        <div className={styles.summaryRequirementHeader}>
          <strong>{title}</strong>
          <SummaryStatus completed={completed}>{completed ? 'Listo' : 'Pendiente'}</SummaryStatus>
        </div>
        <small
          className={
            (!value ? styles.summaryRequirementEmptyValue : '')
            + (valueTone ? ' ' + styles['priorityValue_' + valueTone] : '')
          }
        >
          {value || 'Sin información'}
        </small>
      </div>
    </div>
  )
}

export default function OrderRequirementSummary({ draft, canRegister, isSearching, onRegister }) {
  const hasSalesNoteCode = Boolean(draft.salesNoteCode?.trim())
  const hasImportedData = Boolean(draft.managerRecord)
  const primaryDisabled = !canRegister || isSearching
  const priority = getOrderPriorityMeta(draft.priority)

  return (
    <aside className={styles.sidePanel}>
      <section className={styles.summaryPanelMinimal} aria-labelledby="order-register-summary-title">
        <h2 className={styles.summaryPanelTitle} id="order-register-summary-title">
          <i className="bi bi-clipboard2-check" aria-hidden="true" />
          Resumen del pedido
        </h2>

        <div className={styles.summaryRequirementGroup}>
          <RequirementItem
            completed={hasSalesNoteCode}
            index={1}
            title="Código de Nota de Venta"
            value={hasSalesNoteCode ? draft.salesNoteCode : ''}
          />
          <RequirementItem
            completed={hasImportedData}
            icon="bi-cloud-check"
            index={2}
            title="Datos desde Manager"
            value={hasImportedData ? draft.managerRecord.client : ''}
          />
          <RequirementItem
            completed={hasImportedData}
            icon="bi-hourglass-split"
            index={3}
            title="Estado inicial"
            value={hasImportedData ? 'Confirmación de pago' : ''}
          />
          <RequirementItem
            completed={Boolean(draft.priority)}
            icon="bi-flag-fill"
            index={4}
            title="Prioridad"
            value={priority.label}
            valueTone={priority.tone}
          />
        </div>

        <div className={styles.summaryActionStack}>
          <button
            className={styles.summaryPrimaryButton + (primaryDisabled ? ' ' + styles.disabledButton : '')}
            disabled={primaryDisabled}
            onClick={onRegister}
            type="button"
          >
            <i className="bi bi-plus-circle" aria-hidden="true" />
            <span>{isSearching ? 'Consultando...' : 'Registrar pedido'}</span>
          </button>
          <p className={styles.summaryHint}>
            <i className="bi bi-shield-check" aria-hidden="true" />
            El pedido quedará pendiente de confirmación de pago.
          </p>
        </div>
      </section>
    </aside>
  )
}
