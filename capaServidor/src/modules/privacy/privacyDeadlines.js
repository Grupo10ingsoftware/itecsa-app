const ZONE = 'America/Santiago';
const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
function parts(date) {
  const p = Object.fromEntries(formatter.formatToParts(date).map(x => [x.type, x.value]));
  return { year: +p.year, month: +p.month, day: +p.day, hour: +p.hour, minute: +p.minute, second: +p.second };
}
function wallTime(p) {
  const target = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  let result = new Date(target);
  for (let i = 0; i < 4; i++) {
    const actual = parts(result);
    const delta = target - Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    if (!delta) return result;
    result = new Date(result.getTime() + delta);
  }
  // En una hora local inexistente por DST, el vencimiento más temprano es conservador.
  return result;
}
export function addCalendarDays(date, days) {
  const p = parts(date);
  const day = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
  return wallTime({ ...p, year: day.getUTCFullYear(), month: day.getUTCMonth() + 1, day: day.getUTCDate() });
}
export function addBusinessDays(date, count, calendar) {
  const p = parts(date);
  let day = new Date(Date.UTC(p.year, p.month - 1, p.day));
  while (count) {
    day.setUTCDate(day.getUTCDate() + 1);
    const iso = day.toISOString().slice(0, 10);
    if (iso < calendar.from || iso > calendar.through) throw new Error('Calendario hábil sin cobertura: actualizar configuración.');
    if (![0, 6].includes(day.getUTCDay()) && !calendar.holidays.includes(iso)) count--;
  }
  return wallTime({ ...p, year: day.getUTCFullYear(), month: day.getUTCMonth() + 1, day: day.getUTCDate() });
}
export function deadlineFlags(row, now = new Date()) {
  const closed = row.status === 'responded';
  return {
    overdue: !closed && new Date(row.due_at) < now,
    dueSoon: !closed && new Date(row.due_at) <= addCalendarDays(now, 3),
    blockingOverdue: !!row.block_due_at && !row.block_decided_at && new Date(row.block_due_at) < now,
  };
}
