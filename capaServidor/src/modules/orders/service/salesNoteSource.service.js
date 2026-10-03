import { AppError } from "../../../errors/AppError.js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDemoFeatureEnabled } from "../../../config/environment.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_FIXTURE_PATH = path.resolve(
  __dirname,
  "../../../../data/demo/sales-notes-fixture.json",
);
const fixtureRepositories = new Set();

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSalesNoteNumber(value) {
  return normalizeText(value).replace(/^NV-\d{4}-/i, "");
}

function normalizeClient(client = {}) {
  return {
    rut: client.rut ?? client.RUT ?? null,
    nombre: client.nombre ?? client.CLIENTE ?? null,
  };
}

function resolveProductType(item = {}) {
  const family = normalizeText(item.familia).toUpperCase();
  const subfamily = normalizeText(item.subfamilia).toUpperCase();

  if (subfamily === "YOYO") return "Yoyo";
  if (family === "LANYARD" && subfamily === "LANYARD") return "Lanyard";
  if (family === "TARJETAS" && subfamily === "TARJETAS") return "Tarjeta";

  return null;
}

function normalizeProductionItem(item = {}) {
  return {
    codigo: item.codigo ?? null,
    producto: item.producto ?? null,
    cantidad: item.cantidad ?? null,
    familia: item.familia ?? null,
    subfamilia: item.subfamilia ?? null,
    tipoProducto: resolveProductType(item),
  };
}

function normalizeUntrackedItem(item = {}) {
  return {
    codigo: item.codigo ?? null,
    producto: item.producto ?? null,
    cantidad: item.cantidad ?? null,
    subfamilia: item.subfamilia ?? null,
    motivo: item.motivoNoImportable ?? item.motivo ?? "Producto fuera del alcance actual del sistema",
  };
}

function normalizeSalesNote(record) {
  const items = Array.isArray(record.items) ? record.items : [];
  const productionItems = items
    .filter((item) => item.importable === true && resolveProductType(item))
    .map(normalizeProductionItem);
  const untrackedItems = items
    .filter((item) => item.importable !== true || !resolveProductType(item))
    .map(normalizeUntrackedItem);

  return {
    numeroNota: String(record.numeroNota),
    fechaEntregaTentativaOrigen: record.fechaEntregaTentativaOrigen ?? null,
    cliente: normalizeClient(record.cliente),
    origen: {
      usuarioManager: record.origen?.usuarioManager ?? record.usuarioOrigenManager ?? null,
      tipoNotaVenta: record.origen?.tipoNotaVenta ?? record.tipoNotaVentaOrigen ?? null,
    },
    observaciones: record.observaciones ?? null,
    items: productionItems,
    itemsSinSeguimientoProductivo: untrackedItems,
  };
}

function validatedRepositoryDTO(record) {
  const validItem = (item) => item && typeof item === "object" &&
    Number.isInteger(item.cantidad) && item.cantidad > 0 &&
    typeof item.producto === "string" && item.producto.trim().length > 0;
  if (!record || typeof record !== "object" || typeof record.numeroNota !== "string" ||
    !record.cliente || typeof record.cliente.nombre !== "string" ||
    typeof record.cliente.rut !== "string" || !Array.isArray(record.items) ||
    record.items.length === 0 || !record.items.every(validItem) ||
    !Array.isArray(record.itemsSinSeguimientoProductivo) ||
    !record.itemsSinSeguimientoProductivo.every(validItem)) {
    const error = new Error("La fuente de Notas de Venta no cumple el contrato autorizado.");
    error.statusCode = 502;
    error.code = "SALES_NOTE_SOURCE_CONTRACT_INVALID";
    throw error;
  }
  return record;
}

export class SalesNoteRepository {
  async getByNumber() {
    throw new Error("SalesNoteRepository.getByNumber debe ser implementado.");
  }
}

export class FixtureSalesNoteRepository extends SalesNoteRepository {
  constructor({ fixturePath = DEFAULT_FIXTURE_PATH, cacheTtlMs = 5 * 60 * 1000, now = Date.now, demoFeatureEnabled = isDemoFeatureEnabled } = {}) {
    super();
    this.fixturePath = fixturePath;
    this.cacheTtlMs = cacheTtlMs;
    this.now = now;
    this.demoFeatureEnabled = demoFeatureEnabled;
    this.cache = null;
    fixtureRepositories.add(this);
  }

  async getSalesNotes() {
    if (!this.demoFeatureEnabled()) {
      const error = new Error("La fuente demo de Notas de Venta no esta habilitada.");
      error.statusCode = 503;
      error.code = "DEMO_FEATURES_DISABLED";
      throw error;
    }

    const stats = await fs.stat(this.fixturePath);
    const version = `${stats.mtimeMs}:${stats.size}`;

    if (this.cache?.version === version && this.cache.expiresAt > this.now()) {
      return this.cache.salesNotes;
    }

    const raw = await fs.readFile(this.fixturePath, "utf8");
    const parsed = JSON.parse(raw);
    const salesNotes = Array.isArray(parsed) ? parsed : [];

    this.cache = {
      version,
      expiresAt: this.now() + this.cacheTtlMs,
      salesNotes,
      byNumber: new Map(
        salesNotes.map((item) => [
          normalizeSalesNoteNumber(item.numeroNota),
          item,
        ]),
      ),
    };

    return salesNotes;
  }

  clearExpired() {
    if (this.cache && this.cache.expiresAt <= this.now()) this.cache = null;
  }

  async getByNumber(numeroNota) {
    const normalizedNumber = normalizeSalesNoteNumber(numeroNota);

    if (!normalizedNumber) {
      const error = new AppError(400, "El numero de Nota de Venta es obligatorio.");
      throw error;
    }

    await this.getSalesNotes();
    const record = this.cache.byNumber.get(normalizedNumber);

    if (!record) {
      const error = new AppError(404, "Nota de Venta no encontrada.");
      throw error;
    }

    return validatedRepositoryDTO(normalizeSalesNote(record));
  }
}

export function purgeExpiredSalesNoteCaches() {
  for (const repository of fixtureRepositories) repository.clearExpired();
}

export class UnavailableExternalSalesNoteRepository extends SalesNoteRepository {
  async getByNumber() {
    const error = new Error("La fuente externa de Notas de Venta no esta configurada.");
    error.statusCode = 503;
    error.code = "EXTERNAL_SALES_NOTE_SOURCE_UNAVAILABLE";
    throw error;
  }
}

export {
  normalizeSalesNote,
  normalizeSalesNoteNumber,
  resolveProductType,
  validatedRepositoryDTO,
};

export { FixtureSalesNoteRepository as SalesNoteSourceService };
export default FixtureSalesNoteRepository;
