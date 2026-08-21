// El stepper se conserva temporalmente solo para que los componentes antiguos
// sigan siendo comparables durante la etapa de mockup. Ya no se usa en la vista.
export const ORDER_FLOW_STEPS = Object.freeze([
  { id: 1, title: 'Nota de Venta', subtitle: 'Ingrese la informacion principal' },
  { id: 2, title: 'Archivos de Diseno', subtitle: 'Adjunte archivos opcionales' },
  { id: 3, title: 'Revision y Registro', subtitle: 'Revise y registre el pedido' },
])

export const ORDER_PROCESS_STATUS = Object.freeze({
  CONFIRMACION_PAGO: 'Confirmacion de pago',
})

export const ORDER_PAYMENT_STATUS = Object.freeze({
  PENDIENTE: 'Pendiente',
})

export const ORDER_PRIORITY = Object.freeze({
  NORMAL: 'normal',
  APRESURADA: 'apresurada',
  CLIENTE_VIP: 'cliente-vip',
})

export const ORDER_PRIORITY_OPTIONS = Object.freeze([
  Object.freeze({
    value: ORDER_PRIORITY.NORMAL,
    label: 'Normal',
    description: 'Flujo y plazos habituales',
    icon: 'bi-circle',
    tone: 'normal',
  }),
  Object.freeze({
    value: ORDER_PRIORITY.APRESURADA,
    label: 'Apresurada',
    description: 'Requiere atención prioritaria',
    icon: 'bi-lightning-charge-fill',
    tone: 'rush',
  }),
  Object.freeze({
    value: ORDER_PRIORITY.CLIENTE_VIP,
    label: 'Cliente VIP',
    description: 'Máxima prioridad de atención',
    icon: 'bi-star-fill',
    tone: 'vip',
  }),
])

export function getOrderPriorityMeta(value) {
  return ORDER_PRIORITY_OPTIONS.find((option) => option.value === value) || ORDER_PRIORITY_OPTIONS[0]
}

export const EXISTING_SALES_NOTES = Object.freeze(['NV-2024-0008', 'NV-2024-0030'])

export const MOCK_MANAGER_RECORDS = Object.freeze({
  'NV-2026-3001': Object.freeze({
    client: 'Mall Plaza',
    rut: '76.812.440-5',
    responsibleSeller: 'Mariana Soto',
    issueDate: '01/07/2026',
    dueDate: '10/07/2026',
    items: Object.freeze([
      Object.freeze({ product: 'Lanyard', quantity: 250 }),
    ]),
  }),
  'NV-2026-3002': Object.freeze({
    client: 'Universidad de Valparaiso',
    rut: '70.800.600-2',
    responsibleSeller: 'Felipe Araya',
    issueDate: '02/07/2026',
    dueDate: '13/07/2026',
    items: Object.freeze([
      Object.freeze({ product: 'Tarjeta', quantity: 800 }),
    ]),
  }),
  'NV-2026-3003': Object.freeze({
    client: 'Clinica Santa Maria',
    rut: '96.768.970-K',
    responsibleSeller: 'Camila Rojas',
    issueDate: '03/07/2026',
    dueDate: '17/07/2026',
    items: Object.freeze([
      Object.freeze({ product: 'Lanyard', quantity: 600 }),
      Object.freeze({ product: 'Tarjeta', quantity: 450 }),
    ]),
  }),
  'NV-2024-0014': Object.freeze({
    client: 'Constructora Horizonte SpA',
    rut: '76.123.456-7',
    responsibleSeller: 'Mariana Soto',
    issueDate: '08/05/2024',
    dueDate: '20/05/2024',
    items: Object.freeze([
      Object.freeze({ product: 'Estructuras Metalicas', quantity: 4 }),
    ]),
  }),
  'NV-2024-0021': Object.freeze({
    client: 'Industrias Andinas S.A.',
    rut: '76.543.210-9',
    responsibleSeller: 'Felipe Araya',
    issueDate: '15/05/2024',
    dueDate: '29/05/2024',
    items: Object.freeze([
      Object.freeze({ product: 'Paneles electricos', quantity: 12 }),
    ]),
  }),
  'NV-2024-0035': Object.freeze({
    client: 'Comercial Sur Ltda.',
    rut: '79.221.332-4',
    responsibleSeller: 'Camila Rojas',
    issueDate: '21/05/2024',
    dueDate: '04/06/2024',
    items: Object.freeze([
      Object.freeze({ product: 'Lanyard', quantity: 300 }),
    ]),
  }),
})

export const DEFAULT_ORDER_DRAFT = Object.freeze({
  salesNoteCode: '',
  comments: '',
  managerRecord: null,
  priority: ORDER_PRIORITY.NORMAL,
})

export function buildRegisteredOrder(draft) {
  const now = new Date()
  const record = draft.managerRecord || {}
  const items = record.items || []
  const generatedId = `PED-${String(now.getTime()).slice(-5)}`

  return {
    id: generatedId,
    salesNoteCode: draft.salesNoteCode.trim(),
    client: record.client || 'Cliente no importado',
    rut: record.rut || '—',
    responsibleSeller: record.responsibleSeller || '—',
    productType: items.map((item) => item.product).join(', ') || '—',
    quantity: items.reduce((total, item) => total + Number(item.quantity || 0), 0),
    items: items.map((item, index) => ({ ...item, id: `${generatedId}-${index + 1}` })),
    issueDate: record.issueDate || now.toLocaleDateString('es-CL'),
    dueDate: record.dueDate || null,
    orderStatus: ORDER_PROCESS_STATUS.CONFIRMACION_PAGO,
    paymentStatus: ORDER_PAYMENT_STATUS.PENDIENTE,
    priority: draft.priority || ORDER_PRIORITY.NORMAL,
    comments: draft.comments,
    createdBy: 'Usuario Auditoria',
    createdAt: now.toLocaleString('es-CL'),
    updatedAt: now.toLocaleString('es-CL'),
    channel: 'Web App',
    assignedTo: '—',
  }
}
