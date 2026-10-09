import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import ProductionPerformance, { PerformanceResult } from '../src/modules/metrics/components/ProductionPerformance'
import { createMetricsApi } from '../src/modules/metrics/api/metricsApi'

export function run() {
  const period = { from: '2026-10-01', to: '2026-10-31' }
  const api = createMetricsApi({ get: (path) => path })
  assert.equal(api.getProductionPerformance(period), '/metrics/production-performance?from=2026-10-01&to=2026-10-31')
  const initial = renderToStaticMarkup(<ProductionPerformance api={api} period={period} />)
  assert.match(initial, /aria-expanded="false"/)
  assert.match(initial, /Generar reporte/)
  const empty = renderToStaticMarkup(<PerformanceResult report={{ totalOrders: 0 }} />)
  assert.match(empty, /No existen datos disponibles/)
  const result = renderToStaticMarkup(<PerformanceResult report={{ period, totalOrders: 9, deliveredOnTime: 5, deliveredLate: 3, missingDeadline: 1 }} />)
  assert.match(result, /<dd>5<\/dd>/)
  assert.match(result, /<dd>3<\/dd>/)
  assert.match(result, /Sin plazo solicitado: 1/)
  console.log('RF70: presentación de resultados y contrato API OK')
}
