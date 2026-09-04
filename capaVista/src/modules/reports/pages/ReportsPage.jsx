import { useEffect, useMemo, useState } from 'react'
import {
  HIGH_LOAD_THRESHOLD,
  REPORT_DEFAULT_RANGE,
  REPORT_MONTH_OPTIONS,
  REPORT_ORDERS,
} from '../mocks/reports.mock'
import {
  calculateProductionByMonth,
  calculateReportMetrics,
  formatDuration,
  getDateRangeLabel,
} from '../utils/reportMetrics'
import styles from './ReportsPage.module.css'

const PRODUCT_COLORS = Object.freeze({
  Lanyard: '#f97316',
  Tarjeta: '#111827',
  'YoYo con Dome': '#fbbf24',
})

const EXPORT_REPORTS = Object.freeze([
  { value: 'summary', label: 'Resumen general' },
  { value: 'performance', label: 'Rendimiento de producción' },
  { value: 'stays', label: 'Estadía por etapa' },
  { value: 'production', label: 'Producción generada' },
  { value: 'sellers', label: 'Cumplimiento por vendedor' },
])

function MetricCard({ icon, label, value, detail, tone = 'neutral' }) {
  return (
    <article className={`${styles.metricCard} ${styles[`metricCard_${tone}`]}`}>
      <div className={styles.metricIcon}>
        <i className={`bi ${icon}`} aria-hidden="true" />
      </div>
      <div>
        <span className={styles.metricLabel}>{label}</span>
        <strong className={styles.metricValue}>{value}</strong>
        <span className={styles.metricDetail}>{detail}</span>
      </div>
    </article>
  )
}

function SourceNote({ children }) {
  return (
    <div className={styles.sourceNote}>
      <i className="bi bi-database-check" aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}

function HorizontalBars({ rows }) {
  const maxValue = Math.max(...rows.map((row) => row.hours), 1)

  return (
    <div className={styles.barChart}>
      {rows.map((row) => (
        <div className={styles.barRow} key={row.name}>
          <div className={styles.barLabelLine}>
            <span>{row.name}</span>
            <strong>{formatDuration(row.hours)}</strong>
          </div>
          <div
            aria-label={`${row.name}: ${formatDuration(row.hours)}`}
            className={styles.barTrack}
            role="img"
          >
            <span className={styles.barFill} style={{ width: `${(row.hours / maxValue) * 100}%` }} />
          </div>
          <small>{row.samples} registros utilizados</small>
        </div>
      ))}
    </div>
  )
}

function ProductionDonut({ rows }) {
  const firstEnd = rows[0].percentage * 3.6
  const secondEnd = firstEnd + rows[1].percentage * 3.6
  const total = rows.reduce((sum, row) => sum + row.quantity, 0)
  const chartBackground = `conic-gradient(
    ${PRODUCT_COLORS.Lanyard} 0deg ${firstEnd}deg,
    ${PRODUCT_COLORS.Tarjeta} ${firstEnd}deg ${secondEnd}deg,
    ${PRODUCT_COLORS['YoYo con Dome']} ${secondEnd}deg 360deg
  )`

  return (
    <div className={styles.productionVisual}>
      <div
        aria-label={`Producción total: ${total.toLocaleString('es-CL')} unidades`}
        className={styles.donut}
        role="img"
        style={{ background: chartBackground }}
      >
        <div className={styles.donutCenter}>
          <strong>{total.toLocaleString('es-CL')}</strong>
          <span>unidades</span>
        </div>
      </div>

      <div className={styles.productLegend}>
        {rows.map((row) => (
          <div className={styles.productLegendRow} key={row.name}>
            <span
              className={styles.legendDot}
              style={{ backgroundColor: PRODUCT_COLORS[row.name] }}
            />
            <div>
              <span>{row.name}</span>
              <strong>{row.quantity.toLocaleString('es-CL')} unidades</strong>
            </div>
            <b>{row.percentage}%</b>
          </div>
        ))}
      </div>
    </div>
  )
}

function DateRangeModal({ draftRange, error, onCancel, onChange, onConfirm }) {
  return (
    <div className={styles.modalBackdrop} role="presentation">
      <section
        aria-labelledby="report-period-title"
        aria-modal="true"
        className={styles.modalCard}
        role="dialog"
      >
        <header className={styles.modalHeader}>
          <div>
            <span className={styles.eyebrow}>RF71</span>
            <h2 id="report-period-title">Seleccionar periodo</h2>
          </div>
          <button aria-label="Cerrar" className={styles.iconButton} onClick={onCancel} type="button">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <p className={styles.modalIntro}>
          Los reportes consideran pedidos que llegaron a “Listo para entrega” dentro de este rango.
        </p>

        <div className={styles.dateFields}>
          <label>
            <span>Fecha inicial</span>
            <input
              max={draftRange.to}
              onInput={(event) => onChange({ ...draftRange, from: event.currentTarget.value })}
              type="date"
              value={draftRange.from}
            />
          </label>
          <span className={styles.dateArrow}>
            <i className="bi bi-arrow-right" aria-hidden="true" />
          </span>
          <label>
            <span>Fecha final</span>
            <input
              min={draftRange.from}
              onInput={(event) => onChange({ ...draftRange, to: event.currentTarget.value })}
              type="date"
              value={draftRange.to}
            />
          </label>
        </div>

        {error && <div className={styles.modalError}>{error}</div>}

        <footer className={styles.modalFooter}>
          <button className={styles.secondaryButton} onClick={onCancel} type="button">
            Cancelar
          </button>
          <button className={styles.primaryButton} onClick={onConfirm} type="button">
            <i className="bi bi-check2" aria-hidden="true" />
            Aplicar y generar
          </button>
        </footer>
      </section>
    </div>
  )
}

function escapePdfText(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/([\\()])/g, '\\$1')
}

function createSimplePdf(lines) {
  const textCommands = lines
    .slice(0, 34)
    .map((line, index) => `BT /F1 ${index === 0 ? 17 : 10} Tf 52 ${790 - index * 21} Td (${escapePdfText(line)}) Tj ET`)
    .join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${textCommands.length} >>\nstream\n${textCommands}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]

  objects.forEach((object, index) => {
    offsets.push(new TextEncoder().encode(pdf).length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefOffset = new TextEncoder().encode(pdf).length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return new Blob([pdf], { type: 'application/pdf' })
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function buildExportRows(metrics, productionRows, reportType) {
  if (reportType === 'performance') {
    return [
      ['Indicador', 'Cantidad'],
      ['Pedidos entregados a tiempo', metrics.onTime],
      ['Pedidos entregados fuera de plazo', metrics.late],
      ['Cumplimiento', `${metrics.compliance}%`],
    ]
  }

  if (reportType === 'stays') {
    return [
      ['Etapa', 'Promedio de horas', 'Registros'],
      ...metrics.stageAverages.map((row) => [row.name, row.hours, row.samples]),
    ]
  }

  if (reportType === 'production') {
    return [
      ['Tipo de producto', 'Unidades', 'Participacion'],
      ...productionRows.map((row) => [row.name, row.quantity, `${row.percentage}%`]),
    ]
  }

  if (reportType === 'sellers') {
    return [
      ['Vendedor', 'Notas de Venta', 'A tiempo', 'Fuera de plazo', 'Carga alta', 'Cumplimiento'],
      ...metrics.sellers.map((row) => [
        row.seller,
        row.total,
        row.onTime,
        row.late,
        row.highLoad,
        `${row.compliance}%`,
      ]),
    ]
  }

  return [
    ['Metrica', 'Resultado'],
    ['Pedidos finalizados', metrics.total],
    ['Entregados a tiempo', metrics.onTime],
    ['Entregados fuera de plazo', metrics.late],
    ['Cumplimiento general', `${metrics.compliance}%`],
    ['Tiempo total promedio', formatDuration(metrics.averageTotalHours)],
  ]
}

function ReportsPage() {
  const [activeRange, setActiveRange] = useState(REPORT_DEFAULT_RANGE)
  const [draftRange, setDraftRange] = useState(REPORT_DEFAULT_RANGE)
  const [selectedMonth, setSelectedMonth] = useState('2026-08')
  const [stayView, setStayView] = useState('stages')
  const [isDateModalOpen, setIsDateModalOpen] = useState(false)
  const [dateError, setDateError] = useState('')
  const [exportReport, setExportReport] = useState('summary')
  const [exportFormat, setExportFormat] = useState('csv')
  const [feedback, setFeedback] = useState('')
  const [generatedAt, setGeneratedAt] = useState(() => new Date())

  const metrics = useMemo(
    () => calculateReportMetrics(REPORT_ORDERS, activeRange, HIGH_LOAD_THRESHOLD),
    [activeRange],
  )
  const productionRows = useMemo(
    () => calculateProductionByMonth(REPORT_ORDERS, selectedMonth),
    [selectedMonth],
  )
  const stayRows = stayView === 'stages' ? metrics.stageAverages : metrics.subprocessAverages

  useEffect(() => {
    if (!feedback) return undefined
    const timeoutId = window.setTimeout(() => setFeedback(''), 3200)
    return () => window.clearTimeout(timeoutId)
  }, [feedback])

  function openDateModal() {
    setDraftRange(activeRange)
    setDateError('')
    setIsDateModalOpen(true)
  }

  function applyDateRange() {
    if (!draftRange.from || !draftRange.to) {
      setDateError('Debes ingresar una fecha inicial y una fecha final.')
      return
    }

    if (draftRange.from > draftRange.to) {
      setDateError('La fecha inicial no puede ser posterior a la fecha final.')
      return
    }

    setActiveRange(draftRange)
    setGeneratedAt(new Date())
    setFeedback('Periodo aplicado. Las métricas fueron recalculadas.')
    setIsDateModalOpen(false)
  }

  function regenerateReport() {
    setGeneratedAt(new Date())
    setFeedback(
      `Reporte generado con ${metrics.total} ${metrics.total === 1 ? 'pedido' : 'pedidos'} del periodo seleccionado.`,
    )
  }

  function exportCurrentReport() {
    const rows = buildExportRows(metrics, productionRows, exportReport)
    const reportLabel = EXPORT_REPORTS.find((report) => report.value === exportReport)?.label
    const safeName = `reporte-${exportReport}-${activeRange.from}-${activeRange.to}`

    if (exportFormat === 'csv') {
      const csv = rows
        .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';'))
        .join('\n')
      downloadBlob(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }), `${safeName}.csv`)
    } else if (exportFormat === 'excel') {
      const tableRows = rows
        .map((row) => `<tr>${row.map((cell) => `<td>${String(cell)}</td>`).join('')}</tr>`)
        .join('')
      const workbook = `<html><meta charset="utf-8"><body><table>${tableRows}</table></body></html>`
      downloadBlob(
        new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8' }),
        `${safeName}.xls`,
      )
    } else {
      const pdfLines = [
        `ITECSA - ${reportLabel}`,
        `Periodo: ${getDateRangeLabel(activeRange)}`,
        '',
        ...rows.map((row) => row.join(' | ')),
      ]
      downloadBlob(createSimplePdf(pdfLines), `${safeName}.pdf`)
    }

    setFeedback(`${reportLabel} exportado correctamente.`)
  }

  return (
    <main className={`container-fluid ${styles.page}`}>
      <section className={styles.dashboardShell}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.heroMeta}>
              <span className={styles.sectionLabel}>Módulo 8</span>
              <span className={styles.mockBadge}>
                <i className="bi bi-stars" aria-hidden="true" />
                Datos demostrativos
              </span>
            </div>
            <h1>Reportes y estadísticas</h1>
            <p>
              Indicadores consolidados del rendimiento, tiempos y volumen del proceso productivo.
            </p>
          </div>
          <div className={styles.heroActions}>
            <button className={styles.periodButton} onClick={openDateModal} type="button">
              <i className="bi bi-calendar3" aria-hidden="true" />
              <span>
                <small>Periodo del reporte</small>
                <strong>{getDateRangeLabel(activeRange)}</strong>
              </span>
              <i className="bi bi-chevron-down" aria-hidden="true" />
            </button>
            <button className={styles.generateButton} onClick={regenerateReport} type="button">
              <i className="bi bi-arrow-repeat" aria-hidden="true" />
              Generar reporte
            </button>
          </div>
        </header>

        <div className={styles.content}>
          <div className={styles.statusLine}>
            <span>
              <i className="bi bi-check-circle-fill" aria-hidden="true" />
              Última generación: {generatedAt.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span>
              {metrics.total} {metrics.total === 1 ? 'pedido' : 'pedidos'} con cierre productivo en el periodo
            </span>
          </div>

          <section aria-label="Resumen de métricas" className={styles.metricsGrid}>
            <MetricCard
              detail="Ingresaron a Listo para entrega"
              icon="bi-box-seam"
              label="Pedidos finalizados"
              value={metrics.total}
            />
            <MetricCard
              detail={`${metrics.compliance}% de cumplimiento`}
              icon="bi-check2-circle"
              label="Entregados a tiempo"
              tone="success"
              value={metrics.onTime}
            />
            <MetricCard
              detail="Superaron la fecha estimada"
              icon="bi-exclamation-triangle"
              label="Fuera de plazo"
              tone="danger"
              value={metrics.late}
            />
            <MetricCard
              detail="Desde creación hasta Listo para entrega"
              icon="bi-stopwatch"
              label="Tiempo total promedio"
              tone="orange"
              value={formatDuration(metrics.averageTotalHours)}
            />
          </section>

          <div className={styles.primaryGrid}>
            <article className={styles.panel}>
              <header className={styles.panelHeader}>
                <div>
                  <span className={styles.eyebrow}>RF70 · Rendimiento</span>
                  <h2>Cumplimiento de producción</h2>
                  <p>Pedidos finalizados dentro y fuera del plazo solicitado.</p>
                </div>
                <span className={styles.panelIcon}>
                  <i className="bi bi-speedometer2" aria-hidden="true" />
                </span>
              </header>

              <div className={styles.performanceBody}>
                <div className={styles.complianceGauge}>
                  <div className={styles.gaugeValue}>{metrics.compliance}%</div>
                  <div className={styles.gaugeTrack}>
                    <span style={{ width: `${metrics.compliance}%` }} />
                  </div>
                  <small>Cumplimiento general del periodo</small>
                </div>
                <div className={styles.performanceSplit}>
                  <div>
                    <span className={`${styles.statusDot} ${styles.statusDotSuccess}`} />
                    <strong>{metrics.onTime}</strong>
                    <small>A tiempo</small>
                  </div>
                  <div>
                    <span className={`${styles.statusDot} ${styles.statusDotDanger}`} />
                    <strong>{metrics.late}</strong>
                    <small>Fuera de plazo</small>
                  </div>
                </div>
              </div>

              <SourceNote>
                Compara la fecha de entrada a “Listo para entrega” con la fecha estimada del pedido.
              </SourceNote>
            </article>

            <article className={styles.panel}>
              <header className={styles.panelHeader}>
                <div>
                  <span className={styles.eyebrow}>RF73 · Producción generada</span>
                  <h2>Unidades por tipo de producto</h2>
                  <p>Suma mensual de cantidades producidas por cada categoría.</p>
                </div>
                <select
                  aria-label="Mes de producción"
                  className={styles.compactSelect}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  value={selectedMonth}
                >
                  {REPORT_MONTH_OPTIONS.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </header>

              <ProductionDonut rows={productionRows} />

              <SourceNote>
                Suma el campo cantidad de cada detalle de pedido agrupado por Lanyard, Tarjeta y YoYo con Dome.
              </SourceNote>
            </article>
          </div>

          <article className={styles.panel}>
            <header className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>RF72 · Estadía promedio</span>
                <h2>Tiempo por etapa y subproceso</h2>
                <p>Promedio entre las horas de entrada y salida registradas en producción.</p>
              </div>
              <div className={styles.segmentedControl}>
                <button
                  className={stayView === 'stages' ? styles.segmentActive : ''}
                  onClick={() => setStayView('stages')}
                  type="button"
                >
                  Etapas generales
                </button>
                <button
                  className={stayView === 'subprocesses' ? styles.segmentActive : ''}
                  onClick={() => setStayView('subprocesses')}
                  type="button"
                >
                  Subprocesos
                </button>
              </div>
            </header>

            <HorizontalBars rows={stayRows} />

            <SourceNote>
              Se obtiene desde Registro_Etapas y registro_subprocesos calculando salida menos entrada.
            </SourceNote>
          </article>

          <article className={styles.panel}>
            <header className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>RF74 · Cumplimiento por vendedor</span>
                <h2>Desempeño de ingresos de Ventas</h2>
                <p>Notas de Venta, entregas y pedidos registrados con carga productiva alta.</p>
              </div>
              <span className={styles.thresholdBadge}>
                Carga alta ≥ {HIGH_LOAD_THRESHOLD}%
              </span>
            </header>

            <div className={styles.tableWrap}>
              <table className={styles.sellerTable}>
                <thead>
                  <tr>
                    <th>Vendedor</th>
                    <th>Notas de Venta</th>
                    <th>A tiempo</th>
                    <th>Fuera de plazo</th>
                    <th>Con carga alta</th>
                    <th>Cumplimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.sellers.map((seller) => (
                    <tr key={seller.seller}>
                      <td>
                        <div className={styles.sellerIdentity}>
                          <span>{seller.seller.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
                          <div>
                            <strong>{seller.seller}</strong>
                            <small>Ventas</small>
                          </div>
                        </div>
                      </td>
                      <td>{seller.total}</td>
                      <td><span className={styles.successPill}>{seller.onTime}</span></td>
                      <td><span className={styles.dangerPill}>{seller.late}</span></td>
                      <td>{seller.highLoad}</td>
                      <td>
                        <div className={styles.tableProgress}>
                          <span><i style={{ width: `${seller.compliance}%` }} /></span>
                          <strong>{seller.compliance}%</strong>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SourceNote>
              Agrupa pedidos por usuario de Ventas y cruza cumplimiento de fecha con la carga operativa registrada al ingresar.
            </SourceNote>
          </article>

          <article className={`${styles.panel} ${styles.exportPanel}`}>
            <div className={styles.exportIntro}>
              <span className={styles.exportIcon}>
                <i className="bi bi-file-earmark-arrow-down" aria-hidden="true" />
              </span>
              <div>
                <span className={styles.eyebrow}>RF75 · Exportación</span>
                <h2>Exportar reportes generados</h2>
                <p>Descarga los resultados visibles conservando el periodo aplicado.</p>
              </div>
            </div>
            <div className={styles.exportControls}>
              <label>
                <span>Reporte</span>
                <select onChange={(event) => setExportReport(event.target.value)} value={exportReport}>
                  {EXPORT_REPORTS.map((report) => (
                    <option key={report.value} value={report.value}>{report.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Formato</span>
                <select onChange={(event) => setExportFormat(event.target.value)} value={exportFormat}>
                  <option value="excel">Excel</option>
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF</option>
                </select>
              </label>
              <button className={styles.primaryButton} onClick={exportCurrentReport} type="button">
                <i className="bi bi-download" aria-hidden="true" />
                Exportar
              </button>
            </div>
          </article>
        </div>
      </section>

      {feedback && (
        <div className={styles.toast} role="status">
          <i className="bi bi-check-circle-fill" aria-hidden="true" />
          {feedback}
        </div>
      )}

      {isDateModalOpen && (
        <DateRangeModal
          draftRange={draftRange}
          error={dateError}
          onCancel={() => setIsDateModalOpen(false)}
          onChange={(range) => {
            setDraftRange(range)
            setDateError('')
          }}
          onConfirm={applyDateRange}
        />
      )}
    </main>
  )
}

export default ReportsPage
