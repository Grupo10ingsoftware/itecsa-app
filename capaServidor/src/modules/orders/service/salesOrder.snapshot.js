import { createHash } from "node:crypto";

function normalized(value) {
  return String(value ?? "").trim().toLocaleLowerCase("es");
}

export function salesNoteLineIdentity(item) {
  const code = normalized(item?.codigo ?? item?.codigo_origen);
  if (code) return `code:${code}`;
  return `derived:${createHash("sha256").update(JSON.stringify({
    product: normalized(item?.producto ?? item?.producto_origen),
    family: normalized(item?.familia ?? item?.familia_origen),
    subfamily: normalized(item?.subfamilia ?? item?.subfamilia_origen),
    type: normalized(item?.tipoProducto),
  })).digest("hex")}`;
}

export function createLineSnapshots(items) {
  const lines = items.map((item) => ({
    codigo_origen: item.codigo ?? null,
    producto_origen: item.producto ?? null,
    familia_origen: item.familia ?? null,
    subfamilia_origen: item.subfamilia ?? null,
    cantidad: item.cantidad,
    tipoProducto: item.tipoProducto,
  }));
  return lines.map((item) => ({
    linea_origen: `v2:${createHash("sha256").update(salesNoteLineIdentity(item)).digest("hex")}`,
    codigo_origen: item.codigo_origen,
    producto_origen: item.producto_origen,
    familia_origen: item.familia_origen,
    subfamilia_origen: item.subfamilia_origen,
  }));
}
