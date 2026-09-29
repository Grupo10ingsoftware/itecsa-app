import { AppError } from "../../../errors/AppError.js";
import { normalizeSalesNoteNumber } from "./salesNoteSource.service.js";

export function parseCreateOrderInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new AppError(400, "El pedido debe ser un objeto.");
  }
  const numeroNota = normalizeSalesNoteNumber(data.numeroNota);
  if (!numeroNota || numeroNota.length > 50 || !/^[\p{L}\p{N}_-]+$/u.test(numeroNota)) {
    throw new AppError(400, "El numero de Nota de Venta no es valido.");
  }
  const observacion = data.observacionInterna ?? data.observacion_interna ?? null;
  if (observacion !== null && typeof observacion !== "string") {
    throw new AppError(400, "La observacion interna debe ser texto.");
  }
  const priorities = data.priority == null ? [] : Array.isArray(data.priority) ? data.priority : [data.priority];
  if (priorities.some((priority) => !["urgent", "contract"].includes(priority))) {
    throw new AppError(400, "La prioridad no es valida.");
  }
  // Compatibilidad: los campos adicionales del contrato anterior se ignoran.
  return {
    numeroNota,
    observacionInterna: observacion?.trim() || null,
    priority: [...new Set(priorities)],
  };
}
