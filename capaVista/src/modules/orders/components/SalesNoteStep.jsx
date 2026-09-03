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
  if (Array.isArray(record.productionData) && record.productionData.length > 0) {
    return record.productionData.map((item, index) => ({
      codigo: item.codigo ?? `ITEM-${index + 1}`,
      producto: item.product ?? item.producto ?? record.productType,
      cantidad: item.quantity ?? item.cantidad ?? record.quantity,
      familia: item.familia ?? item.product ?? record.productType,
      subfamilia: item.subfamilia ?? item.product ?? record.productType,
    }))
  }

  if (!record.productType && !record.quantity) return []

  return [
    {
      codigo: record.codigo ?? 'Pendiente',
      producto: record.productType,
      cantidad: record.quantity,
      familia: record.productType,
      subfamilia: record.productType,
    },
  ]
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

function ProductCard({ item, index }) {
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
}

function AccessoryRow({ item }) {
  return (
    <div className={styles.accessoryRow}>
      <span>{item.codigo}</span>
      <strong>{item.producto}</strong>
      <span>{item.cantidad}</span>
      <span>{item.subfamilia}</span>
    </div>
  )
}

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
  const productRows = getProductRows(record ?? {})
  const accessoryRows = getAccessoryRows(record ?? {})

  return (
    <div className={styles.mainPanelClean}>
      <section className={styles.sectionCardClean} aria-labelledby="sales-note-data-title">
        <div className={styles.sectionIntro}>
          <span className={styles.stepBadge}>Paso unico</span>
          <h2 className={styles.sectionHeader} id="sales-note-data-title">
            <i className="bi bi-cloud-arrow-down" aria-hidden="true" />
            Datos del pedido
          </h2>
          <p>Ingresa el codigo de Nota de Venta para importar la informacion del pedido.</p>
        </div>

        <div className={styles.formBlock}>
          <label className={styles.label} htmlFor="sales-note-code">
            Codigo de Nota de Venta <span className={styles.requiredMark}>*</span>
          </label>

          <div className={styles.codeFieldRow}>
            <span className={styles.inputWrapper}>
              <input
                className={`${styles.input} ${hasCode && !errors.salesNoteCode ? styles.inputValid : ''}`}
                id="sales-note-code"
                onChange={(event) => onChange('salesNoteCode', event.target.value)}
                placeholder="Ej: NV-2026-3001"
                type="text"
                value={draft.salesNoteCode}
              />
              {hasCode && !errors.salesNoteCode && (
                <span className={styles.inlineCheck} aria-label="Codigo ingresado">
                  <i className="bi bi-check-lg" aria-hidden="true" />
                </span>
              )}
            </span>

            <button className={styles.searchButton} disabled={isSearching} onClick={onSearch} type="button">
              <i className="bi bi-search" aria-hidden="true" />
              {isSearching ? 'Buscando...' : 'Buscar informacion'}
            </button>
          </div>

          {errors.salesNoteCode && <p className={styles.errorText}>{errors.salesNoteCode}</p>}
        </div>

        <div className={styles.priorityBlock} aria-labelledby="order-priority-title">
          <div>
            <h3 id="order-priority-title">Etiquetas del pedido</h3>
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
        </div>
      </section>

      <section className={styles.detailsPanel} aria-labelledby="order-details-title">
        {record ? (
          <>
            <div className={styles.detailsHeader}>
              <span className={styles.successBadge}>
                <i className="bi bi-check-circle" aria-hidden="true" />
                Informacion encontrada
              </span>
              <span className={styles.noteBadge}>{draft.salesNoteCode}</span>
            </div>

            <h2 className={styles.detailsTitle} id="order-details-title">Detalle de la Nota de Venta</h2>

            <div className={styles.dataGrid}>
              <DataItem label="Cliente" value={record.client} />
              <DataItem label="RUT" value={record.rut} />
              <DataItem label="Responsable del registro" value={responsibleUserName} />
              <DataItem label="Entrega tentativa" value={record.dueDate} />
              <DataItem label="Tipo de producto" value={record.productType} />
            </div>

            <section className={styles.observationsOrigin}>
              <h3>Observaciones de origen</h3>
              <p>{record.observaciones || 'Este pedido no tiene observaciones asociadas.'}</p>
            </section>

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
