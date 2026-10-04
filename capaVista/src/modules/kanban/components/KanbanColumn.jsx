import {
  baseColumns,
  STAGE_BACKWARD_MESSAGE,
  STAGE_SKIP_MESSAGE,
  KANBAN_EN_PRODUCCION_STEP,
  MOVE_TO_PRODUCTION_PERMISSION_MESSAGE,
  KANBAN_REVISION_STEP,
} from '../utils/kanbanColumns.js';
import { normalizeOrder, normalizeStatus } from '../utils/kanbanOrderMapping.js';
import { normalizeText, isItemReadyForDelivery, isPaymentConfirmed, hasOrderLabel, sortOrdersForColumn } from '../utils/kanbanOrderRules.js';
import { DroppableColumn } from './DroppableColumn.jsx';
import { MoveToProductionModal } from './MoveToProductionModal.jsx';
import { useState, useEffect } from 'react';
import { useKanbanApi } from '../hooks/useKanbanApi';
import { useAuth } from '../../../hooks/useAuth';
import { applyOrderStagePatch } from '../utils/orderStagePatch';
import { PERMISSIONS } from '../../../config/permissions';
import styles from '../styles/Kanban.module.css';
import ToastContainer from 'react-bootstrap/ToastContainer';
import Toast from 'react-bootstrap/Toast';
import { DragDropProvider } from '@dnd-kit/react';
import KanbanCard from './KanbanCard';
import KanbanOffCanvas from './KanbanOffCanvas';

function KanbanColumn({ filters, refreshKey = 0 }) {
  const [orders, setOrders] = useState([])
  const [columns, setColumns] = useState(baseColumns)
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [moveError, setMoveError] = useState(null)
  const [pageInfo, setPageInfo] = useState({ nextCursor: null, hasMore: false })
  const [loadingMore, setLoadingMore] = useState(false)
  const [pendingProductionMove, setPendingProductionMove] = useState(null)
  const kanbanApi = useKanbanApi()
  const { hasPermission } = useAuth()

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoadError(null)

        const [ordersResult, statusesResult] = await Promise.allSettled([
          kanbanApi.getOrders({
            limit: 50,
            search: filters?.salesNoteNumber || filters?.clientName || '',
            productType: filters?.productType || '',
          }),
          kanbanApi.getOrderStatuses(),
        ])

        if (ordersResult.status === 'fulfilled') {
          const orderItems = ordersResult.value?.items ?? []
          const normalizedOrders = Array.isArray(orderItems)
            ? orderItems
                .filter((order) => order?.salesNoteNumber)
                .map(normalizeOrder)
                .filter((order) => !['terminado', 'cancelado'].includes(normalizeText(order.orderStatus)))
            : []
          setOrders(normalizedOrders)
          setPageInfo(ordersResult.value?.pageInfo ?? { nextCursor: null, hasMore: false })
        } else {
          setLoadError('No fue posible cargar las ordenes.')
        }

        if (statusesResult.status === 'fulfilled' && Array.isArray(statusesResult.value)) {
          const normalizedStatuses = statusesResult.value
            .map(normalizeStatus)
            .filter((status) => !['terminado', 'cancelado'].includes(normalizeText(status.title)))
            .sort((a, b) => a.order - b.order)

          setColumns(normalizedStatuses.length > 0 ? normalizedStatuses : baseColumns)
        } else {
          if (statusesResult.status === 'rejected') {
            setLoadError((current) => current || 'No fue posible cargar los estados del kanban.')
          }
          setColumns(baseColumns)
        }
      } catch {
        setLoadError('No fue posible cargar las ordenes.')
        setColumns(baseColumns)
      } finally {
        setLoading(false)
      }
    }

    loadOrders()
  }, [filters?.clientName, filters?.salesNoteNumber, filters?.productType, kanbanApi, refreshKey])

  async function loadMoreOrders() {
    if (!pageInfo.hasMore || !pageInfo.nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const result = await kanbanApi.getOrders({
        limit: 50,
        cursor: pageInfo.nextCursor,
        search: filters?.salesNoteNumber || filters?.clientName || '',
        productType: filters?.productType || '',
      })
      const nextOrders = (result.items ?? [])
        .filter((order) => order?.salesNoteNumber)
        .map(normalizeOrder)
        .filter((order) => !['terminado', 'cancelado'].includes(normalizeText(order.orderStatus)))
      setOrders((current) => [...current, ...nextOrders.filter((next) => !current.some((item) => item.id === next.id))])
      setPageInfo(result.pageInfo ?? { nextCursor: null, hasMore: false })
    } catch {
      setLoadError('No fue posible cargar más ordenes.')
    } finally {
      setLoadingMore(false)
    }
  }

  async function applyOrderMove(order, targetColumn, audit = {}) {
    const patch = await kanbanApi.moveOrder(order.id, targetColumn.generalStepId, audit)
    setOrders((prevOrders) =>
      prevOrders.map((currentOrder) => applyOrderStagePatch(currentOrder, patch)),
    )
    setSelectedOrder((currentOrder) => applyOrderStagePatch(currentOrder, patch))
  }

  async function handleDragEnd(event) {
    if (event.canceled || !hasPermission(PERMISSIONS.MOVE_ORDERS)) return

    const { source, target } = event.operation
    if (!source || !target) return

    const order = orders.find((currentOrder) => currentOrder.salesNoteNumber === source.id)
    const targetColumn = columns.find((column) => column.title === target.id)

    if (!order || !targetColumn || Number(order.generalStepId) === Number(targetColumn.generalStepId)) return

    const currentStep = Number(order.generalStepId)
    const targetStep = Number(targetColumn.generalStepId)
    if (!((currentStep === 1 && targetStep === 2) || (currentStep === 2 && targetStep === 3) || (currentStep === 3 && targetStep === 4))) {
      setMoveError('Esta transicion es automatica o no esta permitida.'); return
    }
    let transitionOrder = order
    if (targetStep === 3) {
      try { transitionOrder = normalizeOrder(await kanbanApi.getOrderDetail(order.id)) }
      catch { setMoveError('No fue posible validar el detalle del pedido.'); return }
    }
    if (targetStep === 3 && (!transitionOrder.items?.length || transitionOrder.items.some((item) => !isItemReadyForDelivery(item)))) {
      setMoveError('Todos los detalles deben completar sus subprocesos y los lanyards deben llegar al 100% antes de pasar a Listo para Entrega.')
      return
    }
    const isForwardMove = targetStep > currentStep

    // Prechecks de UX; el backend vuelve a validar etapa, pago y permisos.
    if (targetStep < currentStep) {
      setMoveError(STAGE_BACKWARD_MESSAGE)
      return
    }

    if (targetStep !== currentStep + 1) {
      setMoveError(STAGE_SKIP_MESSAGE)
      return
    }

    if (isForwardMove && !isPaymentConfirmed(order)) {
      setMoveError('Debes confirmar el pago antes de mover esta orden.')
      return
    }

    if (isForwardMove && order.paymentDeconfirmationRequested) {
      setMoveError('Este pedido tiene una solicitud de desconfirmacion pendiente.')
      return
    }

    const isMoveToProduction = isForwardMove && targetStep === KANBAN_EN_PRODUCCION_STEP

    if (isMoveToProduction && !hasPermission(PERMISSIONS.MOVE_KANBAN_TO_PRODUCTION)) {
      setMoveError(MOVE_TO_PRODUCTION_PERMISSION_MESSAGE)
      return
    }

    setMoveError(null)

    setPendingProductionMove({ order: transitionOrder, targetColumn })
  }

  function handleUpdateOrder(updatedOrder) {
    setOrders((prevOrders) =>
      prevOrders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)),
    )
    setSelectedOrder(updatedOrder)
  }

  async function openOrderDetail(order) {
    setDetailLoading(true)
    try {
      const detail = await kanbanApi.getOrderDetail(order.id)
      setSelectedOrder(normalizeOrder(detail))
    } catch (error) {
      setMoveError(error?.payload?.message ?? 'No fue posible cargar el detalle del pedido.')
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleToggleIndicator(orderId, indicator) {
    const order = orders.find((item) => item.id === orderId)
    if (!order) return
    const config = {
      urgent: ['Urgencia', !order.isUrgent],
      contractPriority: ['Prioridad por contrato', !order.hasContractPriority],
      producing: ['PRODUCIÉNDOSE', !order.isProducing],
    }[indicator]
    if (!config) return
    const optimisticPatch = {
      urgent: { isUrgent: config[1] },
      contractPriority: { hasContractPriority: config[1] },
      producing: { isProducing: config[1] },
    }[indicator]
    setOrders((current) => current.map((item) => item.id === orderId ? { ...item, ...optimisticPatch } : item))
    setSelectedOrder((current) => current?.id === orderId ? { ...current, ...optimisticPatch } : current)
    try {
      const result = await kanbanApi.setLabel(orderId, config[0], config[1])
      const updatedLabels = result.labels ?? []
      const patchOrder = (current) => ({
        ...current,
        labels: updatedLabels,
        isUrgent: hasOrderLabel({ labels: updatedLabels }, ['Urgencia']),
        hasContractPriority: hasOrderLabel({ labels: updatedLabels }, ['Prioridad por contrato']),
        isProducing: hasOrderLabel({ labels: updatedLabels }, ['PRODUCIÉNDOSE', 'PRODUCIENDOSE']),
      })
      setOrders((current) => current.map((item) => item.id === orderId ? patchOrder(item) : item))
      setSelectedOrder((current) => current?.id === orderId ? patchOrder(current) : current)
    } catch (error) {
      setOrders((current) => current.map((item) => item.id === orderId ? order : item))
      setSelectedOrder((current) => current?.id === orderId ? order : current)
      setMoveError(error?.payload?.message ?? 'No fue posible actualizar la etiqueta.')
    }
  }

  async function confirmProductionMove(audit) {
    if (!pendingProductionMove) return

    const { order, targetColumn } = pendingProductionMove
    await applyOrderMove(order, targetColumn, audit)
    setPendingProductionMove(null)
  }

  async function handleCompleteSubprocess(order, item, process, payload) {
    try {
      const updatedOrder = await kanbanApi.completeSubprocess(order.id, item.id, process.id, payload)
      const normalizedOrder = normalizeOrder(updatedOrder)

      setOrders((prevOrders) =>
        prevOrders.map((currentOrder) => (currentOrder.id === normalizedOrder.id ? normalizedOrder : currentOrder)),
      )
      setSelectedOrder(normalizedOrder)
      return true
    } catch (error) {
      console.error('Error completando subproceso:', error)
      setMoveError(error?.payload?.message ?? 'No fue posible completar el subproceso.')
      return false
    }
  }

  async function handleSendToReview(order, comment) {
    try {
      const updatedOrder = await kanbanApi.sendToReview(order.id, comment)
      handleUpdateOrder(normalizeOrder(updatedOrder))
      return true
    } catch (error) {
      console.error('Error enviando pedido a revisión:', error)
      setMoveError(error?.payload?.message ?? 'No fue posible enviar el pedido a revisión.')
      return false
    }
  }

  async function handleCancelProduction(order, payload) {
    try {
      await kanbanApi.cancelProduction(order.id, payload)
      setOrders((currentOrders) => currentOrders.filter((item) => item.id !== order.id))
      setSelectedOrder(null)
      return true
    } catch (error) {
      console.error('Error cancelando la produccion:', error)
      setMoveError(error?.payload?.message ?? 'No fue posible cancelar la produccion.')
      return false
    }
  }

  async function handleRollbackSubprocess(order, item, process, payload) {
    try {
      const updated = await kanbanApi.rollbackSubprocess(order.id, item.id, process.id, payload)
      handleUpdateOrder(normalizeOrder(updated))
      return true
    } catch (error) {
      setMoveError(error?.payload?.message ?? 'No fue posible retroceder el subproceso.')
      return false
    }
  }

  async function handleReevaluate(order) {
    try {
      const updated = normalizeOrder(await kanbanApi.reevaluate(order.id))
      handleUpdateOrder(updated)
      return true
    } catch (error) {
      setMoveError(error?.payload?.message ?? 'No fue posible reevaluar el pedido.')
      return false
    }
  }

  return (
    <>
      {loadError && <div className={styles.kanbanError}>{loadError}</div>}
      <ToastContainer position="top-end" className="position-fixed p-3" style={{ zIndex: 1090 }}>
        <Toast show={Boolean(moveError)} onClose={() => setMoveError(null)} autohide delay={8000} role="alert" aria-live="assertive">
          <Toast.Header closeLabel="Cerrar notificación">
            <i className="bi bi-exclamation-triangle-fill text-warning me-2" aria-hidden="true" />
            <strong className="me-auto">No se pudo realizar la acción</strong>
          </Toast.Header>
          <Toast.Body>{moveError}</Toast.Body>
        </Toast>
      </ToastContainer>
      <DragDropProvider onDragEnd={handleDragEnd}>
        <div className={styles.kanbanWrapper}>
          {columns.map((column) => {
            const columnOrders = sortOrdersForColumn(
              orders.filter(
                (order) => Number(column.generalStepId) === Number(order.generalStepId),
              ),
              column,
              filters,
            )

            return (
              <DroppableColumn
                accent={column.accent}
                count={columnOrders.length}
                icon={column.icon}
                id={column.title}
                key={column.title}
              >
                {loading && <div className={styles.emptyColumn}>Cargando ordenes...</div>}
                {!loading && columnOrders.length > 0
                  ? columnOrders.map((order) => (
                      <KanbanCard
                        isMoveBlocked={!isPaymentConfirmed(order)}
                        isCorrectionRequested={order.correctionRequested}
                        isPaymentDeconfirmationRequested={order.paymentDeconfirmationRequested}
                        isProducing={order.isProducing}
                        canMove={hasPermission(PERMISSIONS.MOVE_ORDERS) && (
                          [2, 3].includes(Number(order.generalStepId)) ||
                          (Number(order.generalStepId) === 1 && hasPermission(PERMISSIONS.START_PRODUCTION))
                        )}
                        canManageIndicators={hasPermission(PERMISSIONS.MANAGE_TAGS)}
                        key={order.id}
                        onOpenDetail={() => openOrderDetail(order)}
                        onToggleIndicator={(indicator) => handleToggleIndicator(order.id, indicator)}
                        {...order}
                      />
                    ))
                  : !loading && <div className={styles.emptyColumn}>Arrastra una orden hacia esta columna.</div>}
              </DroppableColumn>
            )
          })}
        </div>
      </DragDropProvider>
      {pageInfo.hasMore && (
        <div className="d-flex justify-content-center mt-3">
          <button className="btn btn-outline-primary" disabled={loadingMore} onClick={loadMoreOrders} type="button">
            {loadingMore ? 'Cargando…' : 'Cargar más pedidos'}
          </button>
        </div>
      )}
      {detailLoading && <div role="status">Cargando detalle del pedido…</div>}
      <KanbanOffCanvas
        isOpen={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
        onCompleteSubprocess={handleCompleteSubprocess}
        canCompleteSubprocess={hasPermission(PERMISSIONS.UPDATE_SUBPROCESSES)}
        canReview={hasPermission(PERMISSIONS.REVIEW_ORDERS)}
        canRollbackSubprocess={hasPermission(PERMISSIONS.ROLLBACK_SUBPROCESSES)}
        canCancelProduction={hasPermission(PERMISSIONS.CANCEL_ORDERS)}
        canReevaluate={hasPermission(PERMISSIONS.REEVALUATE_ORDERS) && Number(selectedOrder?.generalStepId) === KANBAN_REVISION_STEP}
        onCancelProduction={handleCancelProduction}
        onRollbackSubprocess={handleRollbackSubprocess}
        onReevaluate={handleReevaluate}
        onSendToReview={handleSendToReview}
        order={selectedOrder}
      />
      <MoveToProductionModal
        isOpen={Boolean(pendingProductionMove)}
        onClose={() => setPendingProductionMove(null)}
        onConfirm={confirmProductionMove}
        order={pendingProductionMove?.order}
      />
    </>
  )
}

export default KanbanColumn
