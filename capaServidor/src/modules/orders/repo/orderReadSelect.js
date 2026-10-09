import { missingSnapshotOmit, supportsOrderSnapshots } from './orderSnapshotSchema.js';

export const orderReadSelect = {
  id_pedido: true,
  id_estado_pedido: true,
  id_estado_pago: true,
  numero_nota_venta: true,
  fecha_creacion: true,
  fecha_estimada_termino: true,
  Cliente: {
    select: {
      nombre_cliente: true,
      razon_social: true,
    },
  },
  Detalle_pedido: {
    select: {
      linea_origen: true,
      codigo_origen: true,
      producto_origen: true,
      familia_origen: true,
      subfamilia_origen: true,
      id_detalle_pedido: true,
      id_tipo_producto: true,
      cantidad: true,
      fecha_estimada_termino: true,
      fecha_real_termino: true,
      id_estado_subproceso: true,
      Tipo_Producto: {
        select: {
          nombre_producto: true,
          descripcion_producto: true,
          Producto_Subproceso: {
            orderBy: { orden_flujo: "asc" },
            select: {
              id_estado_subproceso: true,
              orden_flujo: true,
              Estado_Subprocesos: { select: { nombre_estado: true } },
            },
          },
        },
      },
      Estado_Subprocesos: { select: { nombre_estado: true } },
      Avance_Lanyard: {
        orderBy: [
          { fecha_produccion: "desc" },
          { id_avance_lanyard: "desc" },
        ],
        take: 1,
        select: {
          cantidad_acumulada: true,
          porcentaje_acumulado: true,
          fecha_actualizacion: true,
          fecha_produccion: true,
        },
      },
    },
  },
  Estado_Pedido: { select: { orden_kanban: true, nombre_etapa: true } },
  Estado_Pago: { select: { nombre_estado_pago: true } },
  Pedido_Etiqueta: {
    select: {
      etiqueta: {
        select: {
          id_etiqueta: true,
          nombre_etiqueta: true,
        },
      },
    },
  },
  Pedido_Item_Sin_Seguimiento: {
    select: {
      id_item_sin_seguimiento: true,
      codigo: true,
      producto: true,
      cantidad: true,
      subfamilia: true,
    },
  },
};

export const legacyDetailSelect = { ...orderReadSelect.Detalle_pedido.select };

for (const column of Object.keys(missingSnapshotOmit)) delete legacyDetailSelect[column];

export const legacyOrderReadSelect = {
  ...orderReadSelect,
  Detalle_pedido: { ...orderReadSelect.Detalle_pedido, select: legacyDetailSelect },
};

export async function readSelect(client) {
  return (await supportsOrderSnapshots(client)) ? orderReadSelect : legacyOrderReadSelect;
}
