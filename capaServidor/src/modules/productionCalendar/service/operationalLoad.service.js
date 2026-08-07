const LANYARD_DAILY_CAPACITY = 1200;

function parseDateKey(value) {
  if (!value) return null;

  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date, amount) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + amount);

  return nextDate;
}

function isBusinessDay(date) {
  const day = date.getDay();

  return day !== 0 && day !== 6;
}

function getLanyardEstimatedBusinessDays(quantity) {
  if (quantity > 0 && quantity <= 100) return 5;
  if (quantity <= 1000) return 10;
  if (quantity <= 2000) return 12;

  return null;
}

function isLanyardItem(item) {
  return String(item.productType ?? item.product ?? item.nombre_producto ?? "")
    .toLowerCase()
    .includes("lanyard");
}

function getLoadLevel(percentage) {
  if (percentage > 75) return "overloaded";
  if (percentage > 50) return "warning";

  return "normal";
}

function createEmptyDays(fromDate, toDate) {
  const days = new Map();

  for (let cursor = new Date(fromDate); cursor <= toDate; cursor = addDays(cursor, 1)) {
    const dateKey = toDateKey(cursor);
    days.set(dateKey, {
      date: dateKey,
      lanyardsLoad: 0,
      percentage: 0,
      level: "normal",
      sources: [],
    });
  }

  return days;
}

function getPreviousBusinessDays(dueDate, amount) {
  const days = [];
  let cursor = addDays(dueDate, -1);

  while (days.length < amount) {
    if (isBusinessDay(cursor)) {
      days.push(toDateKey(cursor));
    }

    cursor = addDays(cursor, -1);
  }

  return days;
}

export function calculateOperationalLoadByDate({
  capacityPerDay = LANYARD_DAILY_CAPACITY,
  from,
  items,
  to,
}) {
  const fromDate = parseDateKey(from);
  const toDate = parseDateKey(to);

  if (!fromDate || !toDate || fromDate > toDate) {
    const error = new Error("El rango de fechas no es valido.");
    error.statusCode = 400;
    throw error;
  }

  const days = createEmptyDays(fromDate, toDate);

  for (const item of Array.isArray(items) ? items : []) {
    if (!isLanyardItem(item)) continue;

    const quantity = Number(item.quantity ?? item.cantidad ?? 0);
    const dueDate = parseDateKey(item.dueDate ?? item.fecha_estimada_termino);
    const estimatedDays = getLanyardEstimatedBusinessDays(quantity);

    if (!dueDate || !estimatedDays) continue;

    const dailyLoad = quantity / estimatedDays;
    const businessDays = getPreviousBusinessDays(dueDate, estimatedDays);

    for (const dateKey of businessDays) {
      const day = days.get(dateKey);
      if (!day) continue;

      day.lanyardsLoad += dailyLoad;
      day.sources.push({
        dailyLoad,
        orderId: item.id ?? item.id_pedido ?? item.id_detalle_pedido ?? null,
        orderNumber: item.orderNumber ?? item.codigo_nota_venta ?? null,
        quantity,
      });
    }
  }

  return {
    capacityPerDay,
    days: Array.from(days.values()).map((day) => {
      const percentage = Math.round((day.lanyardsLoad / capacityPerDay) * 100);

      return {
        ...day,
        lanyardsLoad: Math.round(day.lanyardsLoad * 100) / 100,
        percentage,
        level: getLoadLevel(percentage),
      };
    }),
  };
}

export { LANYARD_DAILY_CAPACITY, getLanyardEstimatedBusinessDays };
