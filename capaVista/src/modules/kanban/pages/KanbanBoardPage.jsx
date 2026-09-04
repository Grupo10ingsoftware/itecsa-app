import { useCallback, useState } from 'react'
import KanbanColumn from '../components/KanbanColumn'
import KanbanFilters from '../components/KanbanFilters'
import styles from './KanbanBoardPage.module.css'
import { useAuth } from '../../../hooks/useAuth'
import { ROLES } from '../../../config/roles'
import { useKanbanApi } from '../hooks/useKanbanApi'
import { useEffect } from 'react'

export default function KanbanBoardPage() {
  const api = useKanbanApi()
  const { hasRole } = useAuth()
  const [capacities, setCapacities] = useState([])
  const [isCapacityOpen, setIsCapacityOpen] = useState(false)
  const [capacityError, setCapacityError] = useState('')
  const [isSavingCapacity, setIsSavingCapacity] = useState(false)
  const [appliedFilters, setAppliedFilters] = useState({})
  const [operationalLoad, setOperationalLoad] = useState({
    capacity: 1200,
    lanyardsInProduction: 0,
    percentage: 0,
  })
  const loadLevel =
    operationalLoad.percentage > 100
      ? 'overloaded'
      : operationalLoad.percentage >= 71
        ? 'warning'
        : 'normal'
  const progressWidth = `${Math.min(operationalLoad.percentage, 100)}%`
  const handleOperationalLoadChange = useCallback((nextLoad) => {
    setOperationalLoad(nextLoad)
  }, [])
  const lanyardCapacity = capacities.find((item) => item.productType?.toLowerCase() === 'lanyard')?.capacity ?? 0

  useEffect(() => {
    api.getCapacities().then((result) => {
      setCapacities(result)
      setCapacityError('')
    }).catch((error) => setCapacityError(error?.payload?.message ?? 'No fue posible cargar las capacidades.'))
  }, [api])

  async function saveCapacities(event) {
    event.preventDefault()
    if (capacities.length !== 1 || capacities.some((item) => !Number.isInteger(Number(item.capacity)) || Number(item.capacity) <= 0 || Number(item.capacity) > 10000)) {
      setCapacityError('La capacidad de Lanyard debe estar entre 1 y 10.000.')
      return
    }
    setIsSavingCapacity(true)
    try {
      setCapacities(await api.updateCapacities(capacities.map((item) => ({ id: item.id, capacity: Number(item.capacity) }))))
      setIsCapacityOpen(false)
      setCapacityError('')
    } catch (error) {
      setCapacityError(error?.payload?.message ?? 'No fue posible guardar las capacidades.')
    } finally { setIsSavingCapacity(false) }
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
                  {hasRole(ROLES.ADMINISTRADOR) && (
                    <button aria-label="Configurar capacidad productiva" onClick={() => setIsCapacityOpen(true)} title="Configurar capacidad productiva" type="button">
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
          <KanbanColumn capacity={lanyardCapacity} filters={appliedFilters} onOperationalLoadChange={handleOperationalLoadChange} />
        </div>
      </section>
      {isCapacityOpen && (
        <div className={styles.modalLayer} role="presentation">
          <form className={styles.capacityModal} onSubmit={saveCapacities} role="dialog" aria-modal="true" aria-labelledby="capacity-title">
            <header><div><span>Producción</span><h2 id="capacity-title">Capacidad máxima diaria</h2></div><button disabled={isSavingCapacity} onClick={() => setIsCapacityOpen(false)} type="button"><i className="bi bi-x-lg" /></button></header>
            <div className={styles.capacityFields}>
              {capacities.map((item, index) => (
                <label className={styles.volumeControl} key={item.id}>
                  <span className={styles.volumeHeading}>
                    <i className="bi bi-box-seam" aria-hidden="true" />
                    <span>Producción diaria de Lanyard</span>
                    <input
                      aria-label="Valor exacto de capacidad diaria"
                      max="10000"
                      min="1"
                      onChange={(event) => setCapacities((current) => current.map((entry, position) => position === index ? { ...entry, capacity: event.target.value } : entry))}
                      step="1"
                      type="number"
                      value={item.capacity}
                    />
                  </span>
                  <span className={styles.sliderRow}>
                    <input aria-label="Capacidad diaria de Lanyard" max="10000" min="1" onChange={(event) => setCapacities((current) => current.map((entry, position) => position === index ? { ...entry, capacity: Number(event.target.value) } : entry))} step="1" type="range" value={item.capacity} />
                  </span>
                  <span className={styles.sliderLimits}><small>1</small><small>10.000</small></span>
                </label>
              ))}
              {capacityError && <p className={styles.capacityError}>{capacityError}</p>}
            </div>
            <footer><button disabled={isSavingCapacity} onClick={() => setIsCapacityOpen(false)} type="button">Cancelar</button><button disabled={isSavingCapacity} type="submit">{isSavingCapacity ? 'Guardando...' : 'Guardar capacidades'}</button></footer>
          </form>
        </div>
      )}
    </main>
  )
}
