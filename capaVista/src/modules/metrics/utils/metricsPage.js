export const EMPTY_METRICS_SUMMARY = Object.freeze({
  production: Object.freeze({ total: 0, products: Object.freeze([]) }),
  dwellTime: Object.freeze({ stages: Object.freeze([]), subprocesses: Object.freeze([]) }),
})

export function getCurrentMonth(today = new Date()) {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
}

export function createInitialPeriod(today = new Date()) {
  return { mode: 'month', month: getCurrentMonth(today), from: '', to: '' }
}

function isValidDateInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false

  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))

  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day
}

export function getPeriodQuery(period) {
  if (period?.mode === 'month') {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period.month ?? '')) {
      return {
        from: '',
        to: '',
        queryKey: '',
        validationMessage: 'Selecciona un mes para consultar las métricas.',
      }
    }

    const [year, month] = period.month.split('-').map(Number)
    const lastDay = new Date(year, month, 0).getDate()
    const from = `${period.month}-01`
    const to = `${period.month}-${String(lastDay).padStart(2, '0')}`

    return { from, to, queryKey: `${from}|${to}`, validationMessage: '' }
  }

  const from = period?.from ?? ''
  const to = period?.to ?? ''

  if (!from || !to) {
    return {
      from: '',
      to: '',
      queryKey: '',
      validationMessage: 'Selecciona las fechas Desde y Hasta para consultar las métricas.',
    }
  }

  if (!isValidDateInput(from) || !isValidDateInput(to)) {
    return {
      from: '',
      to: '',
      queryKey: '',
      validationMessage: 'El rango de fechas no es válido.',
    }
  }

  if (from > to) {
    return {
      from: '',
      to: '',
      queryKey: '',
      validationMessage: 'La fecha Desde no puede ser posterior a la fecha Hasta.',
    }
  }

  return { from, to, queryKey: `${from}|${to}`, validationMessage: '' }
}

export function buildProductionChart(production, colors) {
  const parsedTotal = Number(production?.total ?? 0)
  const total = Number.isFinite(parsedTotal) && parsedTotal > 0 ? parsedTotal : 0
  const products = Array.isArray(production?.products) ? production.products : []
  const palette = Array.isArray(colors) && colors.length > 0 ? colors : ['#64748b']
  const result = products.reduce((accumulator, product, index) => {
    const parsedQuantity = Number(product.quantity)
    const quantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 0
    const percentage = total ? (quantity / total) * 100 : 0
    const segment = {
      ...product,
      percentage,
      start: accumulator.end,
      end: accumulator.end + percentage,
      color: palette[index % palette.length],
    }

    return {
      end: segment.end,
      segments: [...accumulator.segments, segment],
    }
  }, { end: 0, segments: [] })

  return { total, segments: result.segments }
}

export function subscribeMetricsSummary({ api, from, to, onSuccess, onError }) {
  let active = true

  api.getSummary({ from, to })
    .then((result) => {
      if (active) onSuccess(result)
    })
    .catch((error) => {
      if (active) onError(error)
    })

  return () => {
    active = false
  }
}
