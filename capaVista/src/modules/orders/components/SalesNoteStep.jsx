import styles from './SalesNoteStep.module.css'
import { ORDER_PRIORITY_OPTIONS } from '../mocks/orderCreate.mock'

function ImportedField({ icon, label, value }) {
  return (
    <label className={styles.importedField}>
      <span className={styles.importedLabel}>
        <i className={'bi ' + icon} aria-hidden="true" />
        {label}
      </span>
      <input readOnly type="text" value={value || '—'} />
    </label>
  )
}

export default function SalesNoteStep({ draft, errors, isSearching, onChange, onSearch }) {
  const hasCode = Boolean(draft.salesNoteCode?.trim())
  const record = draft.managerRecord
  const items = record?.items || []

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!isSearching) onSearch()
  }

  return (
    <div className={styles.mainPanelClean}>
      <section className={styles.sectionCardClean} aria-labelledby="sales-note-data-title">
        <header className={styles.cardHeader}>
          <span className={styles.cardIcon}>
            <i className="bi bi-cloud-arrow-down" aria-hidden="true" />
          </span>
          <span>
            <span className={styles.eyebrow}>Paso único</span>
            <h2 className={styles.sectionHeader} id="sales-note-data-title">Consultar Nota de Venta</h2>
            <p>Ingresa el código para traer desde Manager todos los datos necesarios para registrar el pedido.</p>
          </span>
          <span className={styles.sourceBadge}>Fuente · Manager</span>
        </header>

        <form className={styles.formBlock} onSubmit={handleSubmit}>
          <label className={styles.label} htmlFor="sales-note-code">Código de Nota de Venta</label>
          <div className={styles.codeFieldRow}>
            <span className={styles.inputWrapper}>
              <i className={'bi bi-upc-scan ' + styles.inputLeadingIcon} aria-hidden="true" />
              <input
                aria-invalid={Boolean(errors.salesNoteCode)}
                className={styles.input + (record ? ' ' + styles.inputValid : '')}
                disabled={isSearching}
                id="sales-note-code"
                onChange={(event) => onChange('salesNoteCode', event.target.value)}
                placeholder="Ej: NV-2026-3001"
                type="text"
                value={draft.salesNoteCode}
              />
              {record && (
                <span className={styles.inlineCheck} aria-label="Información importada">
                  <i className="bi bi-check-lg" aria-hidden="true" />
                </span>
              )}
            </span>

            <button className={styles.searchButton} disabled={!hasCode || isSearching} type="submit">
              {isSearching ? (
                <><span className={styles.buttonSpinner} aria-hidden="true" /> Consultando...</>
              ) : (
                <><i className="bi bi-search" aria-hidden="true" /> Consultar en Manager</>
              )}
            </button>
          </div>
          {errors.salesNoteCode && <p className={styles.errorText}>{errors.salesNoteCode}</p>}
          <p className={styles.helperText}>Códigos disponibles para la demostración: NV-2026-3001, NV-2026-3002 y NV-2026-3003.</p>

          <fieldset className={styles.priorityFieldset}>
            <legend>Prioridad del pedido</legend>
            <p>Selecciona cómo debe tratarse esta Nota de Venta.</p>
            <div className={styles.priorityOptions}>
              {ORDER_PRIORITY_OPTIONS.map((option) => {
                const isSelected = draft.priority === option.value

                return (
                  <label
                    className={styles.priorityOption + ' ' + styles['priorityOption_' + option.tone] + (isSelected ? ' ' + styles.priorityOptionSelected : '')}
                    key={option.value}
                  >
                    <input
                      checked={isSelected}
                      name="order-priority"
                      onChange={() => onChange('priority', option.value)}
                      type="radio"
                      value={option.value}
                    />
                    <span className={styles.priorityIcon}><i className={'bi ' + option.icon} aria-hidden="true" /></span>
                    <span className={styles.priorityCopy}>
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                    <span className={styles.priorityCheck} aria-hidden="true"><i className="bi bi-check-lg" /></span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        </form>
      </section>

      {isSearching && (
        <section className={styles.sectionCardClean + ' ' + styles.loadingCard} aria-live="polite">
          <span className={styles.loadingVisual}><i className="bi bi-arrow-repeat" aria-hidden="true" /></span>
          <div>
            <span className={styles.eyebrow}>Conectando con Manager</span>
            <h2>Estamos preparando la información</h2>
            <p>La consulta puede tardar entre 3 y 5 segundos. No cierres esta pantalla.</p>
            <div className={styles.loadingLines} aria-hidden="true"><span /><span /><span /></div>
          </div>
        </section>
      )}

      {!isSearching && !record && (
        <section className={styles.sectionCardClean + ' ' + styles.emptyState}>
          <span className={styles.emptyIcon}><i className="bi bi-receipt" aria-hidden="true" /></span>
          <h2>La información del pedido aparecerá aquí</h2>
          <p>No necesitas adjuntar archivos ni completar pasos adicionales.</p>
        </section>
      )}

      {!isSearching && record && (
        <section className={styles.sectionCardClean} aria-labelledby="imported-data-title">
          <div className={styles.importSuccess}>
            <span><i className="bi bi-check-circle-fill" aria-hidden="true" /></span>
            <div><strong>Información encontrada</strong><small>Revisa los datos importados antes de registrar el pedido.</small></div>
            <span className={styles.importedCode}>{draft.salesNoteCode}</span>
          </div>

          <div className={styles.dataSectionHeader}>
            <div><span className={styles.eyebrow}>Datos importados</span><h2 id="imported-data-title">Detalle de la Nota de Venta</h2></div>
            <span className={styles.readOnlyBadge}><i className="bi bi-lock" aria-hidden="true" /> Solo lectura</span>
          </div>

          <div className={styles.importedGrid}>
            <ImportedField icon="bi-building" label="Cliente" value={record.client} />
            <ImportedField icon="bi-person-vcard" label="RUT" value={record.rut} />
            <ImportedField icon="bi-person-badge" label="Vendedor responsable" value={record.responsibleSeller} />
            <ImportedField icon="bi-calendar-event" label="Fecha de emisión" value={record.issueDate} />
            <ImportedField icon="bi-calendar-check" label="Entrega estimada" value={record.dueDate} />
          </div>

          <div className={styles.itemsBlock}>
            <div className={styles.itemsHeader}><h3>Partidas del pedido</h3><span>{items.length} producto(s)</span></div>
            <div className={styles.itemsTable}>
              <div className={styles.itemsTableHeader}><span>Producto</span><span>Cantidad</span></div>
              {items.map((item, index) => (
                <div className={styles.itemRow} key={item.product + '-' + index}>
                  <span><i className="bi bi-box-seam" aria-hidden="true" />{item.product}</span>
                  <strong>{Number(item.quantity).toLocaleString('es-CL')}</strong>
                </div>
              ))}
            </div>
          </div>

          <label className={styles.commentsBlock} htmlFor="order-comments">
            <span><strong>Observaciones internas</strong><small>Opcional · máximo 300 caracteres</small></span>
            <textarea
              id="order-comments"
              maxLength={300}
              onChange={(event) => onChange('comments', event.target.value)}
              placeholder="Agrega una indicación para Cobranzas o Producción..."
              value={draft.comments}
            />
            <small className={styles.characterCounter}>{draft.comments.length}/300</small>
          </label>
        </section>
      )}
    </div>
  )
}
