import { SalesOrderError } from "./salesOrder.errors.js";
import { normalizeSalesNoteNumber } from "./salesNoteSource.service.js";

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value, name, max, { optional = false } = {}) {
  if (optional && (value === null || value === undefined)) return null;
  if (typeof value !== "string" || value.length > max || (!optional && !value.trim())) {
    throw new SalesOrderError(`${name} no es valido.`);
  }
  return value.trim() || null;
}

export function validateCreateSalesOrder(data) {
  if (!object(data)) throw new SalesOrderError("El pedido debe ser un objeto.");
  const numeroNota = text(data.numeroNota, "El numero de Nota de Venta", 50);
  const canonicalNumber = normalizeSalesNoteNumber(numeroNota);
  if (!canonicalNumber) throw new SalesOrderError("El numero de Nota de Venta no es valido.");
  const priority = data.priority ?? null;
  if (![null, "urgent", "contract"].includes(priority)) {
    throw new SalesOrderError("La prioridad no es valida.");
  }
  return {
    numeroNota: canonicalNumber,
    priority,
    observacionInterna: text(data.observacionInterna ?? data.observacion_interna,
      "La observacion interna (maximo 300 caracteres)", 300, { optional: true }),
  };
}

export function validateSalesNoteSource(note, requestedNumber) {
  if (!object(note) || !object(note.cliente) || !Array.isArray(note.items) || !note.items.length) {
    throw new SalesOrderError("La Nota de Venta no contiene datos productivos validos.", 422);
  }
  try {
    const numeroNota = normalizeSalesNoteNumber(text(note.numeroNota, "El numero de origen", 50));
    if (numeroNota !== requestedNumber) throw new SalesOrderError("La fuente devolvio otra Nota de Venta.");
    const cliente = {
      rut: text(note.cliente.rut, "El RUT de origen", 12),
      nombre: text(note.cliente.nombre, "El cliente de origen", 100),
    };
    const validateItems = (items, productive) => {
      if (!Array.isArray(items)) throw new SalesOrderError("Los items de origen no son validos.");
      return items.map((item) => {
        if (!object(item) || !Number.isInteger(item.cantidad) || item.cantidad <= 0 || item.cantidad > 2147483647) {
          throw new SalesOrderError("La cantidad de origen debe ser un entero positivo.");
        }
        const result = {
          codigo: text(item.codigo, "El codigo de origen", 50, { optional: true }),
          producto: text(item.producto, "El producto de origen", 255),
          cantidad: item.cantidad,
          familia: text(item.familia, "La familia de origen", 100, { optional: true }),
          subfamilia: text(item.subfamilia, "La subfamilia de origen", 100, { optional: true }),
        };
        if (productive) {
          if (!["Yoyo", "Lanyard", "Tarjeta"].includes(item.tipoProducto)) {
            throw new SalesOrderError("El tipo productivo de origen no es valido.");
          }
          result.tipoProducto = item.tipoProducto;
        }
        return result;
      });
    };
    const date = note.fechaEntregaTentativaOrigen;
    if (date != null && (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)
      || !Number.isFinite(Date.parse(`${date}T00:00:00Z`))
      || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date)) {
      throw new SalesOrderError("La fecha de origen no es valida.");
    }
    return {
      numeroNota, cliente,
      origen: { usuarioManager: text(note.origen?.usuarioManager, "El usuario de origen", 100, { optional: true }) },
      observaciones: text(note.observaciones, "La observacion de origen", 16000, { optional: true }),
      items: validateItems(note.items, true),
      itemsSinSeguimientoProductivo: validateItems(note.itemsSinSeguimientoProductivo ?? [], false),
    };
  } catch (error) {
    if (!(error instanceof SalesOrderError)) throw error;
    // No devolver valores de la fuente en el error publico.
    throw new SalesOrderError(error.message, 422);
  }
}

export function toSalesNotePreview(note) {
  return {
    numeroNota: note.numeroNota,
    fechaEntregaTentativaOrigen: note.fechaEntregaTentativaOrigen ?? null,
    cliente: { nombre: note.cliente?.nombre },
    items: note.items,
    itemsSinSeguimientoProductivo: note.itemsSinSeguimientoProductivo ?? [],
  };
}
