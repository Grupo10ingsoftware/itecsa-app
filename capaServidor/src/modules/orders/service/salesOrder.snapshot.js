import { createHash } from "node:crypto";

// El ordinal identifica una linea SOLO dentro de esta version inmutable.
export function createLineSnapshots(items) {
  const lines = items.map((item) => ({
    codigo_origen: item.codigo ?? null,
    producto_origen: item.producto ?? null,
    familia_origen: item.familia ?? null,
    subfamilia_origen: item.subfamilia ?? null,
    cantidad: item.cantidad,
    tipoProducto: item.tipoProducto,
  }));
  const hash = createHash("sha256").update(JSON.stringify(lines)).digest("hex");
  return lines.map((item, index) => ({
    linea_origen: `${hash}:${index}`,
    codigo_origen: item.codigo_origen,
    producto_origen: item.producto_origen,
    familia_origen: item.familia_origen,
    subfamilia_origen: item.subfamilia_origen,
  }));
}
