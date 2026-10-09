import getPrismaClient from "../../../database/prisma.js";
import { Prisma } from "@prisma/client";
import { supportsOrderSnapshots } from "../../orders/repo/orderSnapshotSchema.js";

const paymentRecordSelect = {
  id_registro: true,
  fecha_registro: true,
  observacion: true,
  id_estado_pago_anterior: true,
  id_estado_pago_nuevo: true,
  Estado_Pago_Registro_Pago_id_estado_pago_anteriorToEstado_Pago: {
    select: {
      id_estado_pago: true,
      nombre_estado_pago: true,
    },
  },
  Estado_Pago_Registro_Pago_id_estado_pago_nuevoToEstado_Pago: {
    select: {
      id_estado_pago: true,
      nombre_estado_pago: true,
    },
  },
  Registros: {
    select: {
      ID_REGISTRO: true,
      FECHA_HORA: true,
      id_pedido: true,
      id_usuario: true,
      observacion: true,
      Usuario: {
        select: {
          id_usuario: true,
          nombre_usuario: true,
          apellido_usuario: true,
        },
      },
    },
  },
};

class PaymentRecordRepo {
  constructor({ prisma } = {}) {
    this.prisma = prisma;
  }

  get client() {
    if (!this.prisma) {
      this.prisma = getPrismaClient();
    }

    return this.prisma;
  }

  async create(orderId, data) {
    const {
      fecha_registro,
      observacion,
      id_usuario,
      id_estado_pago_anterior,
      id_estado_pago,
    } = data;
    const createdAt = fecha_registro ?? new Date();

    const registry = await this.client.registros.create({
      data: {
        FECHA_HORA: createdAt,
        id_pedido: Number(orderId),
        id_usuario: Number(id_usuario),
        observacion: observacion ?? null,
      },
    });

    return this.client.registro_Pago.create({
      data: {
        id_registro: registry.ID_REGISTRO,
        fecha_registro: createdAt,
        observacion: observacion ?? null,
        id_estado_pago_anterior: Number(id_estado_pago_anterior),
        id_estado_pago_nuevo: Number(id_estado_pago),
      },
      include: {
        Registros: true,
      },
    });
  }

  async getById(paymentRecordId) {
    return this.client.registro_Pago.findUnique({
      where: { id_registro: Number(paymentRecordId) },
      select: paymentRecordSelect,
    });
  }

  async getByOrderId(orderId) {
    return this.client.registro_Pago.findMany({
      where: {
        Registros: {
          id_pedido: Number(orderId),
        },
      },
      select: paymentRecordSelect,
      orderBy: [
        { fecha_registro: "desc" },
        { id_registro: "desc" },
      ],
    });
  }

  async getByOrderIdAndRecordId(orderId, paymentRecordId) {
    return this.client.registro_Pago.findFirst({
      where: {
        id_registro: Number(paymentRecordId),
        Registros: {
          id_pedido: Number(orderId),
        },
      },
      select: paymentRecordSelect,
    });
  }

  async getConfirmationSource(orderId) {
    const snapshotColumns = (await supportsOrderSnapshots(this.client))
      ? Prisma.raw("dp.linea_origen, dp.codigo_origen, dp.producto_origen")
      : Prisma.raw("NULL AS linea_origen, NULL AS codigo_origen, NULL AS producto_origen");
    const rows = await this.client.$queryRaw`
      SELECT
        p.id_pedido,
        p.numero_nota_venta,
        c.nombre_cliente,
        c.razon_social,
        c.rut_cliente,
        u.id_usuario,
        u.nombre_usuario,
        u.apellido_usuario,
        dp.id_detalle_pedido,
        dp.cantidad,
        ${snapshotColumns},
        tp.nombre_producto,
        tp.descripcion_producto
      FROM Pedidos p
      LEFT JOIN Cliente c ON c.id_cliente = p.id_cliente
      LEFT JOIN Usuario u ON u.id_usuario = p.id_usuario
      LEFT JOIN Detalle_pedido dp ON dp.id_pedido = p.id_pedido
      LEFT JOIN Tipo_Producto tp ON tp.id_tipo_producto = dp.id_tipo_producto
      WHERE p.id_pedido = ${Number(orderId)}
      ORDER BY dp.id_detalle_pedido ASC
    `;

    if (rows.length === 0) return null;

    const order = rows[0];

    return {
      id_pedido: order.id_pedido,
      numero_nota_venta: order.numero_nota_venta,
      Cliente: {
        nombre_cliente: order.nombre_cliente ?? null,
        razon_social: order.razon_social ?? null,
        rut_cliente: order.rut_cliente ?? null,
      },
      Usuario: order.id_usuario
        ? {
            id_usuario: order.id_usuario,
            nombre_usuario: order.nombre_usuario,
            apellido_usuario: order.apellido_usuario,
          }
        : null,
      Detalle_pedido: rows
        .filter((row) => row.id_detalle_pedido !== null)
        .map((row) => ({
          id_detalle_pedido: row.id_detalle_pedido,
          cantidad: row.cantidad,
          ...(row.linea_origen ? {
            linea_origen: row.linea_origen,
            codigo_origen: row.codigo_origen ?? null,
            producto_origen: row.producto_origen ?? null,
          } : {}),
          Tipo_Producto: {
            nombre_producto: row.nombre_producto ?? null,
            descripcion_producto: row.descripcion_producto ?? null,
          },
        })),
    };
  }
}

export default PaymentRecordRepo;
