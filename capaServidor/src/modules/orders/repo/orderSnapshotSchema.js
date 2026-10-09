// El despliegue de codigo puede preceder al DDL aditivo de snapshots. La
// capacidad se comprueba una vez por cliente y nunca se infiere de P2022.
const snapshotColumns = [
  "linea_origen",
  "codigo_origen",
  "producto_origen",
  "familia_origen",
  "subfamilia_origen",
];

export const missingSnapshotOmit = Object.fromEntries(
  snapshotColumns.map((column) => [column, true]),
);

const capabilities = new WeakMap();

export async function supportsOrderSnapshots(client) {
  // Los dobles de prueba sin acceso SQL representan el esquema completo.
  if (typeof client?.$queryRaw !== "function" || typeof client?.$queryRawUnsafe !== "function") return true;
  if (!capabilities.has(client)) {
    const probe = client.$queryRaw`
      SELECT COLUMN_NAME AS name
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Detalle_pedido'
        AND COLUMN_NAME IN ('linea_origen', 'codigo_origen', 'producto_origen', 'familia_origen', 'subfamilia_origen')
    `.then((rows) => rows.length === snapshotColumns.length);
    capabilities.set(client, probe);
  }
  return capabilities.get(client);
}

export function snapshotOmit(supported) {
  return supported ? {} : { omit: missingSnapshotOmit };
}

export function snapshotData(data, supported) {
  if (supported) return data;
  return Object.fromEntries(Object.entries(data).filter(([key]) => !snapshotColumns.includes(key)));
}
