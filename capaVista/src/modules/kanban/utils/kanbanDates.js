

export function parseDate(value) {
  if (!value) {
    return null
  }

  const isoDateMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)

  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch.map(Number)
    const parsedDate = new Date(year, month - 1, day)

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
  }

  const localDateMatch = String(value).match(/^(\d{2})-(\d{2})-(\d{4})$/)

  if (localDateMatch) {
    const [, day, month, year] = localDateMatch.map(Number)
    const parsedDate = new Date(year, month - 1, day)

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
  }

  const date = new Date(value)

  if (!Number.isNaN(date.getTime())) {
    return date
  }

  return null
}

export function startOfToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return today
}

export function isBusinessDay(date) {
  const day = date.getDay()

  return day >= 1 && day <= 5
}

export function countBusinessDaysUntil(dueDate) {
  const parsedDueDate = parseDate(dueDate)

  if (!parsedDueDate) {
    return null
  }

  const today = startOfToday()
  parsedDueDate.setHours(0, 0, 0, 0)

  if (parsedDueDate < today) {
    return -1
  }

  let businessDays = 0
  const cursor = new Date(today)
  cursor.setDate(cursor.getDate() + 1)

  while (cursor <= parsedDueDate) {
    if (isBusinessDay(cursor)) {
      businessDays += 1
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  return businessDays
}

export function getDeliveryDelayStatus(dueDate) {
  const businessDaysRemaining = countBusinessDaysUntil(dueDate)

  if (businessDaysRemaining === null) {
    return { status: 'neutral', businessDaysRemaining: null }
  }

  if (businessDaysRemaining <= 2) {
    return { status: 'red', businessDaysRemaining }
  }

  if (businessDaysRemaining <= 5) {
    return { status: 'yellow', businessDaysRemaining }
  }

  return { status: 'green', businessDaysRemaining }
}

export function isOrderDelayed(dueDate) {
  const businessDaysRemaining = countBusinessDaysUntil(dueDate)

  return businessDaysRemaining !== null && businessDaysRemaining < 0
}

export function isOrderUrgent(dueDate) {
  const businessDaysRemaining = countBusinessDaysUntil(dueDate)

  if (businessDaysRemaining === null || businessDaysRemaining < 0) {
    return false
  }

  return businessDaysRemaining <= 3
}

export function toDateKey(value) {
  return value ? String(value).slice(0, 10) : ''
}
