function toTimestamp(value) {
  return new Date(value).getTime()
}

function average(values) {
  if (values.length === 0) return 0
  return values.reduce((total, value) => total + value, 0) / values.length
}

function round(value, decimals = 0) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function filterCompletedOrdersByRange(orders, range) {
  const start = toTimestamp(`${range.from}T00:00:00`)
  const end = toTimestamp(`${range.to}T23:59:59`)

  return orders.filter((order) => {
    const completedAt = toTimestamp(order.readyAt)
    return completedAt >= start && completedAt <= end
  })
}

function aggregateDurations(orders, field) {
  const durationMap = new Map()

  orders.forEach((order) => {
    const durations = order[field]

    if (Array.isArray(durations)) {
      durations.forEach(({ name, hours }) => {
        const current = durationMap.get(name) ?? []
        current.push(hours)
        durationMap.set(name, current)
      })
      return
    }

    Object.entries(durations ?? {}).forEach(([name, hours]) => {
      const current = durationMap.get(name) ?? []
      current.push(hours)
      durationMap.set(name, current)
    })
  })

  return Array.from(durationMap, ([name, values]) => ({
    name,
    hours: round(average(values), 1),
    samples: values.length,
  })).sort((left, right) => right.hours - left.hours)
}

function buildSellerMetrics(orders, highLoadThreshold) {
  const sellers = new Map()

  orders.forEach((order) => {
    const current = sellers.get(order.seller) ?? {
      seller: order.seller,
      total: 0,
      onTime: 0,
      late: 0,
      highLoad: 0,
    }

    current.total += 1

    if (toTimestamp(order.readyAt) <= toTimestamp(order.estimatedAt)) {
      current.onTime += 1
    } else {
      current.late += 1
    }

    if (order.loadAtEntry >= highLoadThreshold) {
      current.highLoad += 1
    }

    sellers.set(order.seller, current)
  })

  return Array.from(sellers.values())
    .map((seller) => ({
      ...seller,
      compliance: seller.total > 0 ? Math.round((seller.onTime / seller.total) * 100) : 0,
    }))
    .sort((left, right) => right.compliance - left.compliance || right.total - left.total)
}

export function calculateReportMetrics(orders, range, highLoadThreshold) {
  const completedOrders = filterCompletedOrdersByRange(orders, range)
  const onTimeOrders = completedOrders.filter(
    (order) => toTimestamp(order.readyAt) <= toTimestamp(order.estimatedAt),
  )
  const lateOrders = completedOrders.filter(
    (order) => toTimestamp(order.readyAt) > toTimestamp(order.estimatedAt),
  )
  const totalProductionHours = completedOrders.map(
    (order) => (toTimestamp(order.readyAt) - toTimestamp(order.createdAt)) / 3_600_000,
  )

  return {
    completedOrders,
    total: completedOrders.length,
    onTime: onTimeOrders.length,
    late: lateOrders.length,
    compliance:
      completedOrders.length > 0
        ? Math.round((onTimeOrders.length / completedOrders.length) * 100)
        : 0,
    averageTotalHours: round(average(totalProductionHours), 1),
    stageAverages: aggregateDurations(completedOrders, 'stageHours'),
    subprocessAverages: aggregateDurations(completedOrders, 'subprocessHours'),
    sellers: buildSellerMetrics(completedOrders, highLoadThreshold),
  }
}

export function calculateProductionByMonth(orders, monthKey) {
  const productionMap = new Map([
    ['Lanyard', 0],
    ['Tarjeta', 0],
    ['YoYo con Dome', 0],
  ])

  orders
    .filter((order) => order.readyAt.startsWith(monthKey))
    .flatMap((order) => order.items)
    .forEach((item) => {
      productionMap.set(
        item.productType,
        (productionMap.get(item.productType) ?? 0) + item.quantity,
      )
    })

  const rows = Array.from(productionMap, ([name, quantity]) => ({ name, quantity }))
  const total = rows.reduce((sum, item) => sum + item.quantity, 0)

  let assignedPercentage = 0

  return rows.map((item, index) => {
    const percentage =
      total === 0
        ? 0
        : index === rows.length - 1
          ? 100 - assignedPercentage
          : Math.round((item.quantity / total) * 100)

    assignedPercentage += percentage

    return { ...item, percentage }
  })
}

export function formatDuration(hours) {
  if (!hours) return '0 h'

  const wholeHours = Math.round(hours)
  const days = Math.floor(wholeHours / 24)
  const remainingHours = wholeHours % 24

  if (days === 0) return `${remainingHours} h`
  return `${days} d ${remainingHours} h`
}

export function formatReportDate(value) {
  if (!value) return 'Sin fecha'

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

export function getDateRangeLabel(range) {
  return `${formatReportDate(range.from)} — ${formatReportDate(range.to)}`
}
