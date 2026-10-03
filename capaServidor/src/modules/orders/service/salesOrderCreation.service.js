import { createLineSnapshots } from "./salesOrder.snapshot.js";
import { SalesOrderError } from "./salesOrder.errors.js";
import { validateCreateSalesOrder, validateSalesNoteSource } from "./salesOrder.validator.js";

export const DUPLICATE_SALES_NOTE_MESSAGE =
  "Esta Nota de Venta ya fue registrada en el sistema y no puede volver a ingresarse.";

function normalizePriorityLabels(priority) {
  return priority === "urgent" ? ["Urgencia"] : priority === "contract" ? ["Prioridad por contrato"] : [];
}

export default class SalesOrderCreationService {
  constructor({ source, userRepo, runInTransaction }) {
    this.source = source;
    this.userRepo = userRepo;
    this.runInTransaction = runInTransaction;
  }

  async create(input, options = {}) {
    const editable = validateCreateSalesOrder(input);
    let resolvedUserId = options.actorId;
    if (!Number.isSafeInteger(resolvedUserId) || resolvedUserId <= 0) {
      if (!options.auth0UserId) throw new SalesOrderError("El usuario autenticado es obligatorio.", 403);
      const user = await this.userRepo.findByAuth0Id(options.auth0UserId);
      resolvedUserId = user?.idUsuario;
      if (!Number.isSafeInteger(resolvedUserId) || resolvedUserId <= 0) {
        throw new SalesOrderError("No existe un usuario interno vinculado a la sesion.", 403);
      }
    }
    const source = await this.source.getByNumber(editable.numeroNota);
    const data = { ...validateSalesNoteSource(source, editable.numeroNota), ...editable };
    const { numeroNota, cliente, origen, items: productionItems, itemsSinSeguimientoProductivo: untrackedItems } = data;
    const lineSnapshots = createLineSnapshots(data.items);
    // La planificacion productiva sigue siendo responsabilidad del calendario.
    const estimatedCompletionDate = null;

    return this.runInTransaction(async ({
      repo,
      clientService,
      orderDetailService,
      productTypeService,
      securityAudit,
      repoClient,
    }) => {
      const duplicateOrder = await repo.existsBySalesNoteNumber(numeroNota);

      if (duplicateOrder) {
        throw new SalesOrderError(DUPLICATE_SALES_NOTE_MESSAGE, 409);
      }

      const client = await clientService.findOrCreateClient({
        rut_cliente: cliente.rut,
        nombre_cliente: cliente.nombre,
        razon_social: cliente.nombre,
        estado_cliente: "ACTIVO",
      });

      if (!client?.id_cliente) {
        const error = new Error("No se pudo resolver el cliente del pedido.");
        error.statusCode = 500;
        throw error;
      }

      const labelNames = normalizePriorityLabels(data.priority);
      const labels = labelNames.length > 0
        ? await repoClient.etiqueta.findMany({
            where: {
              nombre_etiqueta: { in: labelNames },
              esta_activa: 1,
            },
          })
        : [];
      if (labels.length !== labelNames.length) {
        throw new SalesOrderError("La etiqueta seleccionada no esta disponible.", 409);
      }
      const primaryLabelId = labels[0]?.id_etiqueta ?? null;

      const order = await repo.create({
        id_cliente: client.id_cliente,
        id_usuario: resolvedUserId,
        id_estado_pedido: 1,
        id_estado_pago: 1,
        id_etiqueta: primaryLabelId,
        fecha_estimada_termino: estimatedCompletionDate,
        numero_nota_venta: numeroNota,
        usuario_manager_origen: origen.usuarioManager ?? null,
        observacion_origen: data.observaciones ?? null,
        observacion_interna: data.observacionInterna ?? null,
      }, { hydrate: false });

      if (!order?.id_pedido) {
        const error = new Error("No se pudo crear el pedido.");
        error.statusCode = 500;
        throw error;
      }

      if (labels.length > 0) {
        await repo.addLabels(
          order.id_pedido,
          labels.map((label) => label.id_etiqueta),
          resolvedUserId,
        );
      }

      await repo.recordCreation({ orderId: order.id_pedido, userId: resolvedUserId, stateId: 1 });

      const details = [];
      const productContextByName = new Map();

      for (const [lineIndex, item] of productionItems.entries()) {
        let productContext = productContextByName.get(item.tipoProducto);

        if (!productContext) {
          const productType = await productTypeService.getProductTypeByName(
            item.tipoProducto,
          );
          const subprocesses = await repo.getProductSubprocesses(
            productType.id_tipo_producto,
          );

          productContext = {
            productType,
            firstSubprocess: subprocesses[0] ?? null,
          };
          productContextByName.set(item.tipoProducto, productContext);
        }

        const detail = await orderDetailService.createOrderDetail(order.id_pedido, {
          ...lineSnapshots[lineIndex],
          id_tipo_producto: productContext.productType.id_tipo_producto,
          cantidad: item.cantidad,
          fecha_estimada_termino: estimatedCompletionDate,
          fecha_real_termino: null,
          id_estado_subproceso:
            productContext.firstSubprocess?.id_estado_subproceso ?? null,
        });

        details.push({
          ...detail,
          nombre_producto: item.tipoProducto,
        });
      }

      const createdUntrackedItems = await repo.createUntrackedItems(
        order.id_pedido,
        untrackedItems,
      );

      await repo.notifyCollectionsAdministrators({
        orderId: order.id_pedido,
        subject: "Nuevo pedido pendiente de confirmación de pago",
        content: `Se registró el pedido ${numeroNota}. Está pendiente de confirmación de pago.`,
      });

      await repo.notifyProductionAdministrators({
        orderId: order.id_pedido,
        subject: "Pedido pendiente de programacion",
        content: `Se registro el pedido ${numeroNota}. Debe asignarse una fecha habil en el calendario de produccion.`,
      });

      await securityAudit?.record({
        eventType: "order.imported",
        actorUserId: resolvedUserId,
        action: "create",
        resourceType: "order",
        resourceId: String(order.id_pedido),
        requestId: options.requestId,
        outcome: "allowed",
      });

      const fullOrder = await repo.get(order.id_pedido);

      return {
        ...fullOrder,
        detalles: details,
        itemsSinSeguimientoProductivo: createdUntrackedItems,
      };
    }).catch((error) => {
      const target = error?.meta?.target;
      if (error?.code === "P2002" && (target === "Pedidos_numero_nota_venta_UNIQUE"
        || target === "numero_nota_venta"
        || (Array.isArray(target) && target.length === 1 && target[0] === "numero_nota_venta"))) {
        throw new SalesOrderError(DUPLICATE_SALES_NOTE_MESSAGE, 409);
      }
      throw error;
    });
  }

}
