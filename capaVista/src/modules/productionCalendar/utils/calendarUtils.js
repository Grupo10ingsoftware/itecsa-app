export const WEEK_DAYS = Object.freeze(['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'])

export function formatMonthTitle(date) {
  return new Intl.DateTimeFormat('es-CL', {
    month: 'long',
    year: 'numeric',
  })
    .format(date)
    .replace(/^\w/, (letter) => letter.toUpperCase())
}

export function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function isBusinessDay(date) {
  const day = date.getDay()

  return day !== 0 && day !== 6
}

export function isBusinessDateKey(dateKey) {
  if (!dateKey) return false

  const date = new Date(`${dateKey}T00:00:00`)

  return !Number.isNaN(date.getTime()) && isBusinessDay(date)
}

function getMondayBasedDayIndex(date) {
  return (date.getDay() + 6) % 7
}

export function buildMonthGrid(monthDate) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const startDate = new Date(firstDay)
  startDate.setDate(firstDay.getDate() - getMondayBasedDayIndex(firstDay))

  const weeks = Array.from({ length: 6 }, (_, weekIndex) =>
    Array.from({ length: 5 }, (_, dayIndex) => {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + (weekIndex * 7) + dayIndex)

      return {
        date,
        dateKey: toDateKey(date),
        dayNumber: date.getDate(),
        isBusinessDay: true,
        isCurrentMonth: date.getMonth() === month,
      }
    }),
  )

  return weeks.flat()
}

export function groupItemsByDate(items) {
  return items.reduce((groups, item) => {
    const currentItems = groups.get(item.dueDate) ?? []
    currentItems.push(item)
    groups.set(item.dueDate, currentItems)

    return groups
  }, new Map())
}

export function isSameMonth(dateKey, monthDate) {
  if (!dateKey) return false

  const date = new Date(`${dateKey}T00:00:00`)

  if (Number.isNaN(date.getTime())) return false

  return date.getFullYear() === monthDate.getFullYear() && date.getMonth() === monthDate.getMonth()
}

export function isLanyardItem(item) {
  return String(item.productType ?? '').toLowerCase().includes('lanyard')
}
