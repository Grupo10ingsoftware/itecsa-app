import { useEffect, useMemo, useState } from 'react'
import { useMetricsApi } from '../hooks/useMetricsApi'
import styles from './MetricsPage.module.css'

const PRODUCT_COLORS = ['#f97316', '#2563eb', '#248f55']
const INITIAL_PERIOD = { mode: 'month', month: getCurrentMonth(), from: '', to: '' }

function getCurrentMonth() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
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

export default function MetricsPage() {
  const api = useMetricsApi()
  const [period, setPeriod] = useState(INITIAL_PERIOD)
  const [summary, setSummary] = useState({ production: { total: 0, products: [] }, dwellTime: { stages: [], subprocesses: [] } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isDwellOpen, setIsDwellOpen] = useState(false)
  const [selectedSubprocessProduct, setSelectedSubprocessProduct] = useState('all')
  const [isSellerOpen, setIsSellerOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const queryPeriod = useMemo(() => getPeriodDates(period), [period])
  const canQuery = Boolean(queryPeriod.from && queryPeriod.to)

  useEffect(() => {
    if (!canQuery) return undefined
    let active = true
    async function loadSummary() {
      setLoading(true)
      setError('')
      try {
        const result = await api.getSummary(queryPeriod)
        if (active) setSummary(result)
      } catch (requestError) {
        if (active) setError(requestError?.payload?.message ?? 'No fue posible cargar las métricas.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadSummary()
    return () => { active = false }
  }, [api, queryPeriod, canQuery])

  const chart = useMemo(() => {
    const total = Number(summary.production?.total ?? 0)
    const segments = (summary.production?.products ?? []).reduce((items, product, index) => {
      const percentage = total ? (Number(product.quantity) / total) * 100 : 0
      const start = items.at(-1)?.end ?? 0
      items.push({ ...product, percentage, start, end: start + percentage, color: PRODUCT_COLORS[index % PRODUCT_COLORS.length] })
      return items
    }, [])
    return { total, segments }
  }, [summary.production])

  const dwellGroups = [
    { key: 'stages', title: 'Etapas generales', items: summary.dwellTime?.stages ?? [] },
    { key: 'subprocesses', title: 'Subprocesos', items: summary.dwellTime?.subprocesses ?? [] },
  ]
  const subprocessProducts = [...new Set((summary.dwellTime?.subprocesses ?? []).map((item) => item.productType).filter(Boolean))].sort()
  const visibleSubprocesses = selectedSubprocessProduct === 'all'
    ? summary.dwellTime?.subprocesses ?? []
    : (summary.dwellTime?.subprocesses ?? []).filter((item) => item.productType === selectedSubprocessProduct)
  const pieGradient = chart.segments.length ? `conic-gradient(${chart.segments.map((item) => `${item.color} ${item.start}% ${item.end}%`).join(', ')})` : '#e5e7eb'

  function updatePeriod(name, value) {
    setPeriod((current) => ({ ...current, [name]: value }))
  }

  function exportReport(format) {
    const rows = summary.sellerCompliance ?? []
    const headers = ['Vendedor', 'Notas de venta', 'Entregados a tiempo', 'Entregados fuera de plazo', 'Ingresados con carga alta']
    const values = rows.map((row) => [row.seller, row.salesNotes, row.deliveredOnTime, row.deliveredLate, row.enteredDuringHighLoad])

    if (format === 'pdf') {
      const reportWindow = window.open('', '_blank')
      if (!reportWindow) return
      reportWindow.document.write(`<html><head><title>Reporte de cumplimiento</title></head><body><h1>Reporte de cumplimiento por vendedor</h1><p>Periodo: ${queryPeriod.from} a ${queryPeriod.to}</p><table border="1"><thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead><tbody>${values.map((row) => `<tr>${row.map((value) => `<td>${value}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`)
      reportWindow.document.close()
      reportWindow.print()
      return
    }

    const separator = format === 'excel' ? '\t' : ','
    const content = [headers, ...values].map((row) => row.map((value) => format === 'csv' ? `"${String(value).replaceAll('"', '""')}"` : value).join(separator)).join('\n')
    const blob = new Blob([`\ufeff${content}`], { type: format === 'excel' ? 'application/vnd.ms-excel' : 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `reporte-cumplimiento-${queryPeriod.from}-${queryPeriod.to}.${format === 'excel' ? 'xls' : 'csv'}`
    link.click()
    URL.revokeObjectURL(link.href)
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
            <header className={styles.productionHeader}><div><span className={styles.panelEyebrow}></span><h2 id="production-title">Cantidad de producción generada</h2><p>Unidades producidas agrupadas por tipo de producto.</p></div></header>
            <div className={styles.productionChart}><div aria-label={`Producción total: ${chart.total} unidades`} className={styles.pieChart} role="img" style={{ '--pie-gradient': pieGradient }}><div className={styles.pieChartCenter}><strong>{chart.total.toLocaleString('es-CL')}</strong><span>unidades</span></div></div><div className={styles.chartLegend}>{chart.segments.length === 0 ? <p className={styles.emptyState}>No hay producción registrada.</p> : chart.segments.map((item) => <div className={styles.legendItem} key={item.productType}><span className={styles.legendColor} style={{ background: item.color }} /><div><strong>{item.productType}</strong><span>{Number(item.quantity).toLocaleString('es-CL')} unidades · {Math.round(item.percentage)}%</span></div></div>)}</div></div>
          </section>

          <section className={styles.dwellSection} aria-labelledby="dwell-title">
            <button
              aria-controls="dwell-content"
              aria-expanded={isDwellOpen}
              className={styles.dwellToggle}
              onClick={() => setIsDwellOpen((current) => !current)}
              type="button"
            >
              <span>
                <strong id="dwell-title">Estadía por estado o subproceso</strong>
                <small>Promedio de tiempo registrado dentro del periodo seleccionado.</small>
              </span>
              <i className={`bi ${isDwellOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} aria-hidden="true" />
            </button>
            {isDwellOpen && (
              <div className={styles.dwellPanels} id="dwell-content">
                {dwellGroups.map((group) => {
                  const items = group.key === 'subprocesses' ? visibleSubprocesses : group.items
                  const maxDwell = Math.max(...items.map((item) => Number(item.averageSeconds)), 1)

                  return <article className={styles.dwellPanel} key={group.key}>
                    <header className={styles.dwellPanelHeader}>
                      <h3>{group.title}</h3>
                      {group.key === 'subprocesses' ? <label className={styles.productSelector}><span className={styles.visuallyHidden}>Producto</span><select onChange={(event) => setSelectedSubprocessProduct(event.target.value)} value={selectedSubprocessProduct}><option value="all">Todos los productos</option>{subprocessProducts.map((product) => <option key={product} value={product}>{product}</option>)}</select></label> : <span>{items.length} indicadores</span>}
                    </header>
                    {items.length === 0 ? <p className={styles.emptyState}>Sin registros para este producto.</p> : <div className={styles.dwellChart}>{items.map((item) => <div className={styles.dwellRow} key={`${group.key}-${item.productType ?? 'all'}-${item.name}`}><div className={styles.dwellLabel}><span>{item.name}</span><small>{item.productType ? `${item.productType} · ` : ''}{item.sampleSize} registros</small></div><div className={styles.dwellTrack}><span className={styles.dwellBar} style={{ width: `${Math.max((item.averageSeconds / maxDwell) * 100, 3)}%` }} /></div><strong>{formatDuration(item.averageSeconds)}</strong></div>)}</div>}
                  </article>
                })}
              </div>
            )}
          </section>


          <section className={styles.sellerSection} aria-labelledby="seller-title">
            <header className={styles.sellerHeader}>
              <div><span className={styles.panelEyebrow}></span><h2 id="seller-title">Cumplimiento por vendedor</h2><p>Genera y exporta la lista del periodo seleccionado.</p></div>
              <button aria-controls="seller-content" aria-expanded={isSellerOpen} className={styles.generateButton} onClick={() => setIsSellerOpen((current) => !current)} type="button">{isSellerOpen ? 'Ocultar lista' : 'Generar lista'}</button>
            </header>
            {isSellerOpen && <div className={styles.sellerContent} id="seller-content">
              <div className={styles.sellerActions}>
                <div className={styles.exportMenu}>
                  <button className={styles.generateButton} onClick={() => setIsExportOpen((current) => !current)} type="button"><i className="bi bi-download" aria-hidden="true" />Exportar</button>
                  {isExportOpen && <div className={styles.exportOptions}><button onClick={() => exportReport('csv')} type="button">CSV</button><button onClick={() => exportReport('excel')} type="button">Excel</button><button onClick={() => exportReport('pdf')} type="button">PDF</button></div>}
                </div>
              </div>
              <div className={styles.sellerTableWrapper}><table className={styles.sellerTable}><thead><tr><th>Vendedor</th><th>Notas de venta</th><th>Entregados a tiempo</th><th>Fuera de plazo</th><th>Con carga alta</th></tr></thead><tbody>{(summary.sellerCompliance ?? []).map((row) => <tr key={row.seller}><td><strong>{row.seller}</strong></td><td>{row.salesNotes}</td><td>{row.deliveredOnTime}</td><td>{row.deliveredLate}</td><td>{row.enteredDuringHighLoad}</td></tr>)}</tbody></table>{(summary.sellerCompliance ?? []).length === 0 && <p className={styles.emptyState}>No hay vendedores o pedidos en el periodo seleccionado.</p>}</div>
            </div>}
          </section>

        </>}
      </div>
    </section>
  </main>
}
