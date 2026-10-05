import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { parseKanbanOrderDetailDTO } from '../src/modules/orders/utils/orderDto'
import { normalizeOrder } from '../src/modules/kanban/utils/kanbanOrderMapping'
import KanbanOffCanvas from '../src/modules/kanban/components/KanbanOffCanvas'

const detail = {
  id: 24072, salesNoteNumber: '24072', clientName: 'Demo 003', dueDate: '2026-09-11',
  generalStepId: 3, orderStatus: 'En producción', createdAt: null,
  paymentStatusId: 2, paymentStatus: 'Confirmado',
  labels: [{ id: 3, name: 'Urgencia' }],
  seller: null,
  items: [{ id: '1', product: 'Tarjeta', quantity: 400, dueDate: '2026-09-11', manufacturingDetails: null, lanyardProgress: null, subProcesses: [] }],
  comments: [], commentGroups: { all: [], source: [], subprocesses: [], system: [] },
}

export function run() {
  for (const labels of [detail.labels, []]) {
    const order = normalizeOrder(parseKanbanOrderDetailDTO({ ...detail, labels }))
    const markup = renderToStaticMarkup(<KanbanOffCanvas isOpen order={order} onClose={() => {}} />)
    assert.match(markup, /Detalle del pedido/)
    assert.match(markup, /24072/)
    if (labels.length) assert.match(markup, /Urgencia/)
  }
  assert.throws(() => parseKanbanOrderDetailDTO({ ...detail, labels: [{ id: 3 }] }), /labels\[0\]/)
  const loading = renderToStaticMarkup(<KanbanOffCanvas isOpen isLoading order={normalizeOrder(detail)} onClose={() => {}} />)
  assert.match(loading, /Cargando detalle del pedido/)
}
