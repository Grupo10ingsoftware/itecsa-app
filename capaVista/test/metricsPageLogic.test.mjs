import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  buildProductionChart,
  createInitialPeriod,
  getPeriodQuery,
  subscribeMetricsSummary,
} from '../src/modules/metrics/utils/metricsPage.js'

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, reject, resolve }
}

test('inicia en el mes local vigente y calcula correctamente un febrero bisiesto', () => {
  const period = createInitialPeriod(new Date(2028, 1, 15))

  assert.deepEqual(period, {
    mode: 'month',
    month: '2028-02',
    from: '',
    to: '',
  })
  assert.deepEqual(getPeriodQuery(period), {
    from: '2028-02-01',
    to: '2028-02-29',
    queryKey: '2028-02-01|2028-02-29',
    validationMessage: '',
  })
});

test('un rango incompleto o invertido no genera una consulta', () => {
  const incomplete = getPeriodQuery({ mode: 'range', from: '2026-10-01', to: '' })
  const inverted = getPeriodQuery({ mode: 'range', from: '2026-10-20', to: '2026-10-01' })

  assert.equal(incomplete.queryKey, '')
  assert.match(incomplete.validationMessage, /Desde y Hasta/)
  assert.equal(inverted.queryKey, '')
  assert.match(inverted.validationMessage, /no puede ser posterior/)
});

test('acepta un rango completo y rechaza fechas imposibles', () => {
  assert.deepEqual(
    getPeriodQuery({ mode: 'range', from: '2026-09-01', to: '2026-09-30' }),
    {
      from: '2026-09-01',
      to: '2026-09-30',
      queryKey: '2026-09-01|2026-09-30',
      validationMessage: '',
    },
  )
  assert.equal(
    getPeriodQuery({ mode: 'range', from: '2026-02-30', to: '2026-03-01' }).queryKey,
    '',
  )
});

test('construye segmentos contiguos sin modificar los datos de produccion', () => {
  const production = {
    total: 100,
    products: [
      { productType: 'Lanyard', quantity: 25 },
      { productType: 'Tarjeta', quantity: 35 },
      { productType: 'Yoyo', quantity: 40 },
    ],
  }
  const original = structuredClone(production)
  const chart = buildProductionChart(production, ['orange', 'blue'])

  assert.deepEqual(production, original)
  assert.deepEqual(
    chart.segments.map(({ start, end, color }) => ({ start, end, color })),
    [
      { start: 0, end: 25, color: 'orange' },
      { start: 25, end: 60, color: 'blue' },
      { start: 60, end: 100, color: 'orange' },
    ],
  )
});

test('ignora una respuesta tardia despues de cancelar la consulta anterior', async () => {
  const first = deferred()
  const results = []
  const cancel = subscribeMetricsSummary({
    api: { getSummary: () => first.promise },
    from: '2026-09-01',
    to: '2026-09-30',
    onSuccess: (result) => results.push(result),
    onError: (error) => results.push(error),
  })

  cancel()
  first.resolve({ production: { total: 99 } })
  await first.promise
  await Promise.resolve()

  assert.deepEqual(results, [])
});

test('entrega resultado o error solo para la consulta activa', async () => {
  const success = deferred()
  const failure = deferred()
  const results = []
  const errors = []

  subscribeMetricsSummary({
    api: { getSummary: () => success.promise },
    from: '2026-10-01',
    to: '2026-10-31',
    onSuccess: (result) => results.push(result),
    onError: (error) => errors.push(error),
  })
  subscribeMetricsSummary({
    api: { getSummary: () => failure.promise },
    from: '2026-11-01',
    to: '2026-11-30',
    onSuccess: (result) => results.push(result),
    onError: (error) => errors.push(error),
  })

  success.resolve({ production: { total: 10 } })
  failure.reject(new Error('network error'))
  await Promise.allSettled([success.promise, failure.promise])
  await Promise.resolve()

  assert.deepEqual(results, [{ production: { total: 10 } }])
  assert.equal(errors[0].message, 'network error')
});
