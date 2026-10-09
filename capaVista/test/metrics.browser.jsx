import { act } from 'react'
import { createRoot } from 'react-dom/client'
import ProductionPerformance from '../src/modules/metrics/components/ProductionPerformance'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const root = createRoot(document.getElementById('root'))
const period = { from: '2026-10-01', to: '2026-10-31' }
let calls = 0
let resolveRequest
let rejectRequest
const api = { getProductionPerformance() {
  calls++
  return new Promise((resolve, reject) => { resolveRequest = resolve; rejectRequest = reject })
} }
function assert(value, message) { if (!value) throw new Error(message) }
const button = () => [...document.querySelectorAll('button')].find((item) => /Generar|Generando/.test(item.textContent))
const report = { period, totalOrders: 3, deliveredOnTime: 2, deliveredLate: 1, missingDeadline: 0 }

try {
  await act(async () => root.render(<ProductionPerformance key="oct" api={api} period={period} />))
  assert(calls === 0, 'No debe consultar al montar')
  assert(document.querySelector('#performance-content').hidden, 'Debe iniciar cerrado')
  await act(async () => document.querySelector('[aria-expanded]').click())
  assert(!document.querySelector('#performance-content').hidden, 'Debe desplegar')
  assert(calls === 0, 'Abrir no genera reporte')
  await act(async () => { button().click(); button().click() })
  assert(calls === 1 && button().disabled, 'Evitar doble solicitud')
  await act(async () => resolveRequest(report))
  assert(document.querySelector('dd').textContent === '2', 'Mostrar resultado')
  await act(async () => button().click())
  await act(async () => rejectRequest(new Error('network')))
  assert(document.querySelector('[role="alert"]'), 'Mostrar error recuperable')
  assert(!document.querySelector('dd'), 'No mantener resultado tras error')
  await act(async () => button().click())
  await act(async () => resolveRequest({ ...report, totalOrders: 0 }))
  assert(document.querySelector('[role="status"]').textContent.includes('No existen datos'), 'Mostrar vacío')
  await act(async () => button().click())
  const oldRequest = resolveRequest
  const nextPeriod = { from: '2026-11-01', to: '2026-11-30' }
  await act(async () => root.render(<ProductionPerformance key="nov" api={api} period={nextPeriod} />))
  await act(async () => oldRequest(report))
  assert(!document.querySelector('dd'), 'Ignorar respuesta del período anterior')
  assert(!document.querySelector('[role="status"]'), 'Limpiar estado al cambiar período')
  await act(async () => root.render(<ProductionPerformance key="invalid" api={api} period={{ from: '', to: '' }} />))
  assert(button().disabled, 'No generar sin fechas')
  document.getElementById('result').textContent = 'METRICS_TEST_RESULT:PASS'
} catch (error) {
  document.getElementById('result').textContent = `METRICS_TEST_RESULT:FAIL:${error.message}`
}
