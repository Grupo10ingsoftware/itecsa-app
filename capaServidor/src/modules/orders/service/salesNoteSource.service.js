import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_FIXTURE_PATH = path.resolve(
  __dirname,
  "../../../../data/demo/sales-notes-fixture.json",
);

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
    direccion: client.direccion ?? client.dir ?? null,
    comuna: client.comuna ?? null,
    ciudad: client.ciudad ?? null,
    tipoClienteOrigen: client.tipoClienteOrigen ?? client.TIPO_CLIENTE ?? null,
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

class SalesNoteSourceService {
  constructor({ fixturePath = DEFAULT_FIXTURE_PATH } = {}) {
    this.fixturePath = fixturePath;
  }

  async getSalesNotes() {
    const raw = await fs.readFile(this.fixturePath, "utf8");
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  }

  async getByNumber(numeroNota) {
    const normalizedNumber = normalizeSalesNoteNumber(numeroNota);

    if (!normalizedNumber) {
      const error = new Error("El numero de Nota de Venta es obligatorio.");
      error.statusCode = 400;
      throw error;
    }

    const salesNotes = await this.getSalesNotes();
    const record = salesNotes.find(
      (item) => normalizeSalesNoteNumber(item.numeroNota) === normalizedNumber,
    );

    if (!record) {
      const error = new Error("Nota de Venta no encontrada.");
      error.statusCode = 404;
      throw error;
    }

    return normalizeSalesNote(record);
  }
}

export {
  normalizeSalesNote,
  normalizeSalesNoteNumber,
  resolveProductType,
};

export default SalesNoteSourceService;
