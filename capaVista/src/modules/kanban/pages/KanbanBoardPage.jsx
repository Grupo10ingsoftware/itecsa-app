import { useEffect, useMemo, useState } from 'react'
import KanbanColumn from '../components/KanbanColumn'
import KanbanFilters from '../components/KanbanFilters'
import styles from './KanbanBoardPage.module.css'
import { useAuth } from '../../../hooks/useAuth'
import { PERMISSIONS } from '../../../config/permissions'
import { useKanbanApi } from '../hooks/useKanbanApi'

function toInteger(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : fallback
}

function formatDate(value) {
  if (!value) return 'Hoy'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)

  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function normalizeLoad(result = {}) {
  return {
    date: result.date ?? null,
    capacity: toInteger(result.capacity, 1200),
    lanyardsInProduction: toInteger(result.lanyardsInProduction, 0),
    percentage: toInteger(result.percentage, 0),
    details: Array.isArray(result.details) ? result.details : [],
  }
}

function getEditableMax(detail) {
  return toInteger(detail.remainingQuantity) + toInteger(detail.dailyQuantity)
}

function getProgressPercentage(detail) {
  const percentage = Number(detail.progressPercentage ?? 0)

  return Number.isFinite(percentage) ? Math.round(percentage) : 0
}

function hasDailyLoadChange(detail) {
  return toInteger(detail.draftQuantity) !== toInteger(detail.dailyQuantity)
}

export default function KanbanBoardPage() {
  const api = useKanbanApi()
  const { hasPermission } = useAuth()
  const [isCapacityOpen, setIsCapacityOpen] = useState(false)
  const [capacityError, setCapacityError] = useState('')
  const [isSavingCapacity, setIsSavingCapacity] = useState(false)
  const [appliedFilters, setAppliedFilters] = useState({})
  const [kanbanRefreshKey, setKanbanRefreshKey] = useState(0)
  const [operationalLoad, setOperationalLoad] = useState({
    date: null,
    capacity: 1200,
    lanyardsInProduction: 0,
    percentage: 0,
    details: [],
  })
  const [draftQuantities, setDraftQuantities] = useState({})
  const canManageProductionLoad =
    hasPermission(PERMISSIONS.MANAGE_PRODUCTION_LOAD) ||
    hasPermission(PERMISSIONS.MANAGE_CAPACITY)
  const loadLevel =
    operationalLoad.percentage > 100
      ? 'overloaded'
      : operationalLoad.percentage >= 71
        ? 'warning'
        : 'normal'
  const progressWidth = `${Math.min(operationalLoad.percentage, 100)}%`
  const draftDetails = useMemo(() => operationalLoad.details.map((detail) => ({
    ...detail,
    draftQuantity: draftQuantities[detail.detailId] ?? toInteger(detail.dailyQuantity),
  })), [draftQuantities, operationalLoad.details])

  useEffect(() => {
    let isMounted = true

    api.getProductionLoad()
      .then((result) => {
        if (!isMounted) return
        const nextLoad = normalizeLoad(result)
        setOperationalLoad(nextLoad)
        setDraftQuantities(Object.fromEntries(
          nextLoad.details.map((detail) => [detail.detailId, toInteger(detail.dailyQuantity)]),
        ))
        setCapacityError('')
      })
      .catch((error) => {
        if (isMounted) {
          setCapacityError(error?.payload?.message ?? 'No fue posible cargar la carga operativa.')
        }
      })

    return () => {
      isMounted = false
    }
  }, [api])

  function updateDraftQuantity(detail, rawValue) {
    const max = getEditableMax(detail)
    const value = Math.min(max, toInteger(rawValue))
    setDraftQuantities((current) => ({ ...current, [detail.detailId]: value }))
    setCapacityError('')
  }

  async function saveProductionLoad(event) {
    event.preventDefault()
    setIsSavingCapacity(true)
    try {
      const entries = draftDetails.filter(hasDailyLoadChange).map((detail) => {
        const quantity = toInteger(detail.draftQuantity)
        const max = getEditableMax(detail)

        if (quantity > max) {
          throw new Error(`La carga de ${detail.salesNoteNumber ?? detail.detailId} supera lo pendiente.`)
        }

        return {
          detailId: detail.detailId,
          quantity,
        }
      })
      const result = normalizeLoad(await api.updateProductionLoad(entries))
      setOperationalLoad(result)
      setDraftQuantities(Object.fromEntries(
        result.details.map((detail) => [detail.detailId, toInteger(detail.dailyQuantity)]),
      ))
      setKanbanRefreshKey((current) => current + 1)
      setIsCapacityOpen(false)
      setCapacityError('')
    } catch (error) {
      setCapacityError(error?.payload?.message ?? error?.message ?? 'No fue posible guardar la carga operativa.')
    } finally {
      setIsSavingCapacity(false)
    }
  }

  return (
    <main className={`container-fluid ${styles.page}`}>
      <section className={styles.dashboardShell}>
        <header className={styles.hero}>
          <div>
            <span className={styles.sectionLabel}>Produccion</span>
            <h1 className={styles.pageTitle}>Kanban</h1>
            <p className={styles.pageSubtitle}>
              Vista principal de seguimiento de produccion con arrastre de ordenes entre estados.
            </p>
          </div>
          <div className={styles.heroActions}>
            <aside className={`${styles.capacityMeter} ${styles[loadLevel]}`} aria-label="Carga Operativa">
              <div className={styles.capacityHeader}>
                <span>Carga Operativa</span>
                <div className={styles.capacityHeaderActions}>
                  <strong>{operationalLoad.percentage}%</strong>
                  {canManageProductionLoad && (
                    <button aria-label="Configurar carga operativa" onClick={() => setIsCapacityOpen(true)} title="Configurar carga operativa" type="button">
                      <i className="bi bi-sliders" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
              <div className={styles.capacityNumbers}>
                <strong>{operationalLoad.lanyardsInProduction}</strong>
                <span>/ {operationalLoad.capacity} lanyards por dia</span>
              </div>
              <div className={styles.capacityTrack} aria-hidden="true">
                <span className={styles.capacityFill} style={{ width: progressWidth }} />
              </div>
              <p>Solo pedidos lanyard en En produccion.</p>
            </aside>
          </div>
        </header>

        <div className={styles.content}>
          <KanbanFilters
            onApplyFilters={(nextFilters) => setAppliedFilters(nextFilters)}
            onClearFilters={() => setAppliedFilters({})}
          />
          <KanbanColumn filters={appliedFilters} refreshKey={kanbanRefreshKey} />
        </div>
      </section>
      {isCapacityOpen && (
        <div className={styles.modalLayer} role="presentation">
          <form className={styles.capacityModal} onSubmit={saveProductionLoad} role="dialog" aria-modal="true" aria-labelledby="capacity-title">
            <header>
              <div>
                <span>Produccion</span>
                <h2 id="capacity-title">Carga diaria de Lanyard</h2>
              </div>
              <button disabled={isSavingCapacity} onClick={() => setIsCapacityOpen(false)} type="button">
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            </header>
            <div className={styles.capacityFields}>
              <div className={styles.capacityModalSummary}>
                <span>{formatDate(operationalLoad.date)}</span>
                <strong>{operationalLoad.lanyardsInProduction} / {operationalLoad.capacity} lanyards asignados para la jornada</strong>
              </div>
              {draftDetails.length === 0 && (
                <p className={styles.capacityEmpty}>No hay detalles Lanyard en En produccion.</p>
              )}
              {draftDetails.map((detail) => {
                const max = getEditableMax(detail)
                const value = toInteger(detail.draftQuantity)
                const progressPercentage = getProgressPercentage(detail)

                return (
                  <label className={styles.volumeControl} key={detail.detailId}>
                    <span className={styles.volumeHeading}>
                      <i className="bi bi-box-seam" aria-hidden="true" />
                      <span className={styles.orderLoadInfo}>
                        <strong>Pedido numero: {detail.salesNoteNumber ?? `Detalle ${detail.detailId}`} / Cliente: {detail.clientName ?? 'Cliente sin nombre'}</strong>
                        <span>
                          <small>{detail.accumulatedQuantity} / {detail.quantity} producidos</small>
                          <small>{progressPercentage}%</small>
                        </span>
                      </span>
                      <input
                        aria-label={`Carga diaria para ${detail.salesNoteNumber ?? detail.detailId}`}
                        max={max}
                        min="0"
                        onChange={(event) => updateDraftQuantity(detail, event.target.value)}
                        step="1"
                        type="number"
                        value={value}
                      />
                    </span>
                    <span className={styles.sliderRow}>
                      <input
                        aria-label={`Selector de carga diaria para ${detail.salesNoteNumber ?? detail.detailId}`}
                        max={max}
                        min="0"
                        onChange={(event) => updateDraftQuantity(detail, event.target.value)}
                        step="1"
                        type="range"
                        value={value}
                      />
                    </span>
                    <span className={styles.sliderLimits}>
                      <small>0</small>
                      <small>{max}</small>
                    </span>
                  </label>
                )
              })}
              {capacityError && <p className={styles.capacityError}>{capacityError}</p>}
            </div>
            <footer>
              <button disabled={isSavingCapacity} onClick={() => setIsCapacityOpen(false)} type="button">Cancelar</button>
              <button disabled={isSavingCapacity || draftDetails.length === 0} type="submit">
                {isSavingCapacity ? 'Guardando...' : 'Confirmar carga'}
              </button>
            </footer>
          </form>
        </div>
      )}
    </main>
  )
}
