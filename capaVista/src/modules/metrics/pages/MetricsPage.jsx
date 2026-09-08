import { useEffect, useMemo, useState } from 'react'
import { useMetricsApi } from '../hooks/useMetricsApi'
import styles from './MetricsPage.module.css'

const PRODUCT_COLORS = ['#f97316', '#2563eb', '#248f55']
const INITIAL_PERIOD = { mode: 'month', month: getCurrentMonth(), from: '', to: '' }

function getCurrentMonth() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
}

function getMonthOptions() {
  const today = new Date()
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - index, 1)
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    return { value, label: new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(date) }
  })
}

function getPeriodDates(period) {
  if (period.mode === 'month') {
    const [year, month] = period.month.split('-').map(Number)
    const lastDay = new Date(year, month, 0).getDate()
    return { from: `${period.month}-01`, to: `${period.month}-${String(lastDay).padStart(2, '0')}` }
  }
  return { from: period.from, to: period.to }
}

function formatDuration(seconds) {
  const totalMinutes = Math.round(Number(seconds ?? 0) / 60)
  if (totalMinutes < 60) return `${totalMinutes} min`
  const hours = totalMinutes / 60
  if (hours < 24) return `${hours.toFixed(1)} h`
  return `${(hours / 24).toFixed(1)} días`
}

function SummaryCard({ icon, label, value, subtitle }) {
  return <article className={styles.summaryCard}><div className={styles.summaryIcon}><i className={`bi ${icon}`} aria-hidden="true" /></div><div><span className={styles.summaryLabel}>{label}</span><strong className={styles.summaryValue}>{value}</strong><span className={styles.summarySubtitle}>{subtitle}</span></div></article>
}

export default function MetricsPage() {
  const api = useMetricsApi()
  const [period, setPeriod] = useState(INITIAL_PERIOD)
  const [summary, setSummary] = useState({ production: { total: 0, products: [] }, dwellTime: { stages: [], subprocesses: [] } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const queryPeriod = getPeriodDates(period)
  const canQuery = Boolean(queryPeriod.from && queryPeriod.to)

  useEffect(() => {
    if (!canQuery) return undefined
    let active = true
    setLoading(true)
    setError('')
    api.getSummary(queryPeriod)
      .then((result) => active && setSummary(result))
      .catch((requestError) => active && setError(requestError?.payload?.message ?? 'No fue posible cargar las métricas.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [api, queryPeriod.from, queryPeriod.to, canQuery])

  const chart = useMemo(() => {
    const total = Number(summary.production?.total ?? 0)
    let currentPercentage = 0
    const segments = (summary.production?.products ?? []).map((product, index) => {
      const percentage = total ? (Number(product.quantity) / total) * 100 : 0
      const segment = { ...product, percentage, start: currentPercentage, end: currentPercentage + percentage, color: PRODUCT_COLORS[index % PRODUCT_COLORS.length] }
      currentPercentage += percentage
      return segment
    })
    return { total, segments }
  }, [summary.production])

  const dwellGroups = [
    { key: 'stages', title: 'Etapas generales', items: summary.dwellTime?.stages ?? [] },
    { key: 'subprocesses', title: 'Subprocesos', items: summary.dwellTime?.subprocesses ?? [] },
  ]
  const dwellItems = dwellGroups.flatMap((group) => group.items)
  const pieGradient = chart.segments.length ? `conic-gradient(${chart.segments.map((item) => `${item.color} ${item.start}% ${item.end}%`).join(', ')})` : '#e5e7eb'

  function updatePeriod(name, value) {
    setPeriod((current) => ({ ...current, [name]: value }))
  }

  return <main className={`container-fluid ${styles.page}`}>
    <section className={styles.dashboardShell}>
      <header className={styles.hero}><div><span className={styles.sectionLabel}>Producción</span><h1 className={styles.pageTitle}>Métricas</h1><p className={styles.pageSubtitle}>Indicadores calculados sobre el periodo seleccionado.</p></div></header>
      <div className={styles.content}>
        <section className={styles.periodFilters} aria-label="Periodo de métricas">
          <div className={styles.periodModes}>
            <button className={period.mode === 'month' ? styles.activeMode : ''} onClick={() => updatePeriod('mode', 'month')} type="button">Mes específico</button>
            <button className={period.mode === 'range' ? styles.activeMode : ''} onClick={() => updatePeriod('mode', 'range')} type="button">Rango de fechas</button>
          </div>
          {period.mode === 'month' ? <label><span>Mes</span><input onChange={(event) => updatePeriod('month', event.target.value)} type="month" value={period.month} /></label> : <><label><span>Desde</span><input onChange={(event) => updatePeriod('from', event.target.value)} type="date" value={period.from} /></label><label><span>Hasta</span><input min={period.from || undefined} onChange={(event) => updatePeriod('to', event.target.value)} type="date" value={period.to} /></label></>}
        </section>

        {loading ? <div className={styles.emptyState}>Cargando métricas...</div> : error ? <div className={styles.emptyState} role="alert">{error}</div> : <>
          <section className={styles.productionSection} aria-labelledby="production-title">
            <header className={styles.productionHeader}><div><span className={styles.panelEyebrow}>RF75 · Métrica 1</span><h2 id="production-title">Cantidad de producción generada</h2><p>Unidades producidas agrupadas por tipo de producto.</p></div></header>
            <div className={styles.productionChart}><div aria-label={`Producción total: ${chart.total} unidades`} className={styles.pieChart} role="img" style={{ '--pie-gradient': pieGradient }}><div className={styles.pieChartCenter}><strong>{chart.total.toLocaleString('es-CL')}</strong><span>unidades</span></div></div><div className={styles.chartLegend}>{chart.segments.length === 0 ? <p className={styles.emptyState}>No hay producción registrada.</p> : chart.segments.map((item) => <div className={styles.legendItem} key={item.productType}><span className={styles.legendColor} style={{ background: item.color }} /><div><strong>{item.productType}</strong><span>{Number(item.quantity).toLocaleString('es-CL')} unidades · {Math.round(item.percentage)}%</span></div></div>)}</div></div>
          </section>

          <section className={styles.dwellSection} aria-labelledby="dwell-title">
            <header className={styles.productionHeader}><div><span className={styles.panelEyebrow}>RF74 · Métrica 2</span><h2 id="dwell-title">Estadía por estado o subproceso</h2><p>Promedio de tiempo registrado dentro del periodo seleccionado.</p></div></header>
            <div className={styles.dwellPanels}>
              {dwellGroups.map((group) => {
                const maxDwell = Math.max(...group.items.map((item) => Number(item.averageSeconds)), 1)

                return <article className={styles.dwellPanel} key={group.key}>
                  <header className={styles.dwellPanelHeader}><h3>{group.title}</h3><span>{group.items.length} indicadores</span></header>
                  {group.items.length === 0 ? <p className={styles.emptyState}>Sin registros en este periodo.</p> : <div className={styles.dwellChart}>{group.items.map((item) => <div className={styles.dwellRow} key={`${group.key}-${item.name}`}><div className={styles.dwellLabel}><span>{item.name}</span><small>{item.sampleSize} registros</small></div><div className={styles.dwellTrack}><span className={styles.dwellBar} style={{ width: `${Math.max((item.averageSeconds / maxDwell) * 100, 3)}%` }} /></div><strong>{formatDuration(item.averageSeconds)}</strong></div>)}</div>}
                </article>
              })}
            </div>
          </section>

          <section className={styles.summaryGrid} aria-label="Resumen de métricas"><SummaryCard icon="bi-box-seam" label="Producción total" value={chart.total.toLocaleString('es-CL')} subtitle="Unidades terminadas" /><SummaryCard icon="bi-bar-chart" label="Tipos de producto" value={chart.segments.length} subtitle="En el periodo" /><SummaryCard icon="bi-clock-history" label="Registros de estadía" value={dwellItems.reduce((sum, item) => sum + item.sampleSize, 0)} subtitle="Etapas y subprocesos" /></section>
        </>}
      </div>
    </section>
  </main>
}
