import { memo, useMemo } from 'react'
import styles from './SalesNoteStep.module.css'

const PRIORITY_OPTIONS = Object.freeze([
  {
    id: 'urgent',
    title: 'Urgente',
    description: 'Pedido con atencion prioritaria.',
    icon: 'urgent',
  },
  {
    id: 'contract',
    title: 'Cliente con contrato',
    description: 'Prioridad definida por contrato.',
    icon: 'contract',
  },
])

function getProductRows(record) {
  if (Array.isArray(record.items) && record.items.length > 0) {
    return record.items.map((item, index) => ({
      codigo: item.codigo ?? `ITEM-${index + 1}`,
      producto: item.producto ?? record.productType,
      cantidad: item.cantidad,
      familia: item.familia ?? item.producto ?? record.productType,
      subfamilia: item.subfamilia ?? item.producto ?? record.productType,
    }))
  }

  return []
}

function getAccessoryRows(record) {
  const accessories = record.itemsSinSeguimientoProductivo ?? record.itemsNoSoportados

  if (!Array.isArray(accessories)) return []

  return accessories.map((item) => ({
    codigo: item.codigo ?? 'Pendiente',
    producto: item.producto ?? item.product,
    cantidad: item.cantidad ?? item.quantity,
    subfamilia: item.subfamilia ?? 'Sin subfamilia',
  }))
}

function DataItem({ label, value }) {
  return (
    <div className={styles.dataItem}>
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  )
}

function PriorityIcon({ type }) {
  if (type === 'urgent') {
    return <span className={styles.urgentIcon} aria-hidden="true">!</span>
  }

  return <span className={styles.contractIcon} aria-hidden="true" />
}

function PriorityOption({ option, selected, onSelect }) {
  return (
    <button
      aria-pressed={selected}
      className={`${styles.priorityOption} ${selected ? styles.priorityOptionSelected : ''}`}
      onClick={() => onSelect(option.id)}
      type="button"
    >
      <PriorityIcon type={option.icon} />
      <span>
        <strong>{option.title}</strong>
        <small>{option.description}</small>
      </span>
      {selected && <i className="bi bi-check-circle-fill" aria-hidden="true" />}
    </button>
  )
}

const ProductCard = memo(function ProductCard({ item, index }) {
  return (
    <article className={styles.productCard}>
      <header>
        <span>Producto {index + 1}</span>
        <strong>{item.producto}</strong>
      </header>
      <dl className={styles.productGrid}>
        <div>
          <dt>Codigo</dt>
          <dd>{item.codigo}</dd>
        </div>
        <div>
          <dt>Cantidad</dt>
          <dd>{item.cantidad}</dd>
        </div>
        <div>
          <dt>Familia</dt>
          <dd>{item.familia}</dd>
        </div>
        <div>
          <dt>Subfamilia</dt>
          <dd>{item.subfamilia}</dd>
        </div>
      </dl>
    </article>
  )
})

const AccessoryRow = memo(function AccessoryRow({ item }) {
  return (
    <div className={styles.accessoryRow}>
      <span data-label="Codigo">{item.codigo}</span>
      <strong data-label="Producto">{item.producto}</strong>
      <span data-label="Cantidad">{item.cantidad}</span>
      <span data-label="Subfamilia">{item.subfamilia}</span>
    </div>
  )
})

export default function SalesNoteStep({
  draft,
  errors,
  isSearching,
  onChange,
  onPriorityChange,
  onSearch,
  responsibleUserName,
}) {
  const hasCode = Boolean(draft.salesNoteCode?.trim())
  const record = draft.managerRecord
  const isVerified = Boolean(record)
  const productRows = useMemo(() => getProductRows(record ?? {}), [record])
  const accessoryRows = useMemo(() => getAccessoryRows(record ?? {}), [record])

  function handleSearchSubmit(event) {
    event.preventDefault()

    if (!isSearching) {
      onSearch()
    }
  }

  return (
    <div className={styles.mainPanelClean}>
      <div className={styles.topControlsGrid}>
        <section className={styles.sectionCardClean} aria-labelledby="sales-note-data-title">
          <div className={styles.sectionIntro}>
            <span className={styles.sectionIcon} aria-hidden="true">
              <i className="bi bi-file-earmark-text" />
            </span>
            <div>
              <h2 className={styles.sectionHeader} id="sales-note-data-title">
                Datos del pedido
              </h2>
              <p>Ingresa el codigo de Nota de Venta para importar la informacion del pedido.</p>
            </div>
          </div>

          <form className={styles.formBlock} onSubmit={handleSearchSubmit}>
            <label className={styles.label} htmlFor="sales-note-code">
              Codigo de Nota de Venta <span className={styles.requiredMark}>*</span>
            </label>

            <div className={styles.codeFieldRow}>
              <span className={styles.inputWrapper}>
                <input
                  aria-describedby={errors.salesNoteCode ? 'sales-note-code-error' : undefined}
                  aria-invalid={Boolean(errors.salesNoteCode)}
                  className={`${styles.input} ${isVerified ? styles.inputValid : ''}`}
                  id="sales-note-code"
                  onChange={(event) => onChange('salesNoteCode', event.target.value)}
                  placeholder="Ej: NV-2026-3001"
                  type="text"
                  value={draft.salesNoteCode}
                />
                {isVerified && (
                  <span className={styles.inlineCheck} aria-label="Nota de Venta verificada">
                    <i className="bi bi-check-lg" aria-hidden="true" />
                  </span>
                )}
              </span>

              <button className={styles.searchButton} disabled={isSearching || !hasCode} type="submit">
                <i className="bi bi-search" aria-hidden="true" />
                {isSearching ? 'Buscando...' : 'Buscar informacion'}
              </button>
            </div>

            {errors.salesNoteCode && (
              <p className={styles.errorText} id="sales-note-code-error" role="alert">
                {errors.salesNoteCode}
              </p>
            )}
          </form>
        </section>

        <section className={styles.priorityCard} aria-labelledby="order-priority-title">
          <div className={styles.priorityIntro}>
            <h2 className={styles.sectionHeader} id="order-priority-title">Etiquetas del pedido</h2>
            <p>Selecciona una etiqueta solo si el pedido requiere trato especial.</p>
          </div>
          <div className={styles.priorityGrid}>
            {PRIORITY_OPTIONS.map((option) => (
              <PriorityOption
                key={option.id}
                option={option}
                selected={draft.priority === option.id}
                onSelect={onPriorityChange}
              />
            ))}
          </div>
        </section>
      </div>

      {record && (
        <div className={styles.verificationBanner} role="status">
          <span className={styles.successBadge}>
            <i className="bi bi-check-circle" aria-hidden="true" />
            Informacion encontrada
          </span>
          <span className={styles.noteBadge}>{draft.salesNoteCode}</span>
        </div>
      )}

      <section className={styles.detailsPanel} aria-labelledby="order-details-title">
        {record ? (
          <>
            <div className={styles.detailsTitleRow}>
              <h2 className={styles.detailsTitle} id="order-details-title">Detalle de la Nota de Venta</h2>
              <span className={styles.deliveryBadge}>
                <small>Entrega tentativa</small>
                <strong>{record.dueDate || '-'}</strong>
              </span>
            </div>

            <div className={styles.dataGrid}>
              <DataItem label="Codigo de Nota de Venta" value={draft.salesNoteCode} />
              <DataItem label="Cliente" value={record.client} />
              <DataItem label="RUT" value={record.rut} />
              <DataItem label="Responsable del registro" value={responsibleUserName} />
            </div>

            <section className={styles.productsSection}>
              <div className={styles.subsectionHeader}>
                <h3>Productos con seguimiento productivo</h3>
                <span>{productRows.length} producto(s)</span>
              </div>
              <div className={styles.productsGrid}>
                {productRows.map((item, index) => (
                  <ProductCard item={item} index={index} key={`${item.codigo}-${index}`} />
                ))}
              </div>
            </section>

            <section className={styles.productsSection}>
              <div className={styles.subsectionHeader}>
                <h3>Accesorios sin seguimiento productivo definido</h3>
                <span>{accessoryRows.length} accesorio(s)</span>
              </div>
              {accessoryRows.length > 0 ? (
                <div className={styles.accessoryTable}>
                  <div className={styles.accessoryHead}>
                    <span>Codigo</span>
                    <span>Producto</span>
                    <span>Cantidad</span>
                    <span>Subfamilia</span>
                  </div>
                  {accessoryRows.map((item, index) => (
                    <AccessoryRow item={item} key={`${item.codigo}-${index}`} />
                  ))}
                </div>
              ) : (
                <p className={styles.emptyText}>Esta Nota de Venta no incluye accesorios fuera del flujo productivo actual.</p>
              )}
            </section>

            <section className={styles.observationsOrigin}>
              <h3>Observaciones de origen</h3>
              <p>{record.observaciones || 'Este pedido no tiene observaciones asociadas.'}</p>
            </section>

            <section className={styles.internalObservation}>
              <div className={styles.subsectionHeader}>
                <h3>Observaciones del pedido</h3>
                <span>{draft.comments?.length || 0}/300</span>
              </div>
              <textarea
                className={styles.textarea}
                maxLength={300}
                onChange={(event) => onChange('comments', event.target.value)}
                placeholder="Agrega una observacion interna para Cobranzas o Produccion..."
                value={draft.comments || ''}
              />
            </section>
          </>
        ) : (
          <div className={styles.emptyState}>
            <span>
              <i className="bi bi-card-list" aria-hidden="true" />
            </span>
            <h2 id="order-details-title">La informacion del pedido aparecera aqui</h2>
            <p>Busca una Nota de Venta para revisar sus datos antes de registrar el pedido.</p>
          </div>
        )}
      </section>
    </div>
  )
}
