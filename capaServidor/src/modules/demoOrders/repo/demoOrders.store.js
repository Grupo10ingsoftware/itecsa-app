const KANBAN_STEPS = Object.freeze({
  PAYMENT_CONFIRMATION: 0,
  READY_PRODUCTION: 1,
  IN_PRODUCTION: 2,
  READY_DELIVERY: 3,
})

const DEMO_PAYMENT_STATUS = Object.freeze({
  PENDIENTE: { id_estado_Pago: 1, nombre_estado_pago: 'Pendiente', descripcion_estado_pago: 'Pago pendiente de validacion' },
  CONFIRMADO: { id_estado_Pago: 2, nombre_estado_pago: 'Confirmado', descripcion_estado_pago: 'Pago validado por cobranza' },
  RECHAZADO: { id_estado_Pago: 3, nombre_estado_pago: 'Rechazado', descripcion_estado_pago: 'Pago rechazado por cobranza' },
})

const ANNOUNCEMENT_TYPES = Object.freeze({
  PAYMENT_DECONFIRMATION_REQUESTED: 'payment_deconfirmation_requested',
  PAYMENT_DECONFIRMATION_APPROVED: 'payment_deconfirmation_approved',
  KANBAN_MOVE_TO_PRODUCTION: 'kanban_move_to_production',
})

const availableSalesNotes = [
  {
    nv: 'NV-2026-3001',
    clientName: 'Mall Plaza',
    rut: '76.812.440-5',
    vendedorResponsable: 'Mariana Soto',
    date: '2026-07-01',
    dueDate: '2026-07-10',
    items: [
      {
        product: 'Lanyard',
        quantity: 250,
        manufacturingDetails: {
          width: '20 mm',
          length: '90 cm',
          texture: 'Satinada',
          backgroundColor: 'Naranjo corporativo',
          frontLegend: 'Mall Plaza',
          backLegend: 'Staff Verano',
          endings: 'Mosqueton metalico',
        },
      },
    ],
  },
  {
    nv: 'NV-2026-3002',
    clientName: 'Universidad de Valparaiso',
    rut: '70.800.600-2',
    vendedorResponsable: 'Felipe Araya',
    date: '2026-07-02',
    dueDate: '2026-07-13',
    items: [
      {
        product: 'Tarjeta',
        quantity: 800,
        manufacturingDetails: {
          width: '85 mm',
          length: '54 mm',
          cardType: 'Plastificada',
        },
      },
    ],
  },
  {
    nv: 'NV-2026-3003',
    clientName: 'Clinica Santa Maria',
    rut: '96.768.970-K',
    vendedorResponsable: 'Camila Rojas',
    date: '2026-07-03',
    dueDate: '2026-07-17',
    items: [
      {
        product: 'Lanyard',
        quantity: 600,
        manufacturingDetails: {
          width: '25 mm',
          length: '92 cm',
          texture: 'Tubular',
          backgroundColor: 'Azul clinico',
          frontLegend: 'Clinica Santa Maria',
          backLegend: 'Identificacion Pacientes',
          endings: 'Broche de seguridad y porta credencial',
        },
      },
      {
        product: 'Tarjeta',
        quantity: 450,
        manufacturingDetails: {
          width: '85 mm',
          length: '54 mm',
          cardType: 'Plastificada',
        },
      },
    ],
  },
]

function buildItems(orderId, dueDate, items) {
  return items.map((item, index) => ({
    id: `${orderId}-item-${index + 1}`,
    dueDate,
    product: item.product,
    quantity: item.quantity,
    manufacturingDetails: item.manufacturingDetails ?? null,
  }))
}

const initialOrders = [
  {
    id: 'demo-001',
    nv: 'NV-2026-2001',
    clientName: 'Clinica Davila',
    vendedorResponsable: 'Mariana Soto',
    product: 'Lanyard',
    quantity: 120,
    date: '2026-06-01',
    dueDate: '2026-06-12',
    paymentStatus: 'Pendiente',
    paymentStatusId: 1,
    generalStepId: KANBAN_STEPS.PAYMENT_CONFIRMATION,
    isUrgent: false,
    hasContractPriority: false,
    items: buildItems('demo-001', '2026-06-12', [
      {
        product: 'Lanyard',
        quantity: 120,
        manufacturingDetails: {
          width: '20 mm',
          length: '90 cm',
          texture: 'Satinada',
          backgroundColor: 'Azul',
          frontLegend: 'Clinica Davila',
          backLegend: 'Urgencias',
          endings: 'Mosqueton metalico',
        },
      },
    ]),
  },
  {
    id: 'demo-002',
    nv: 'NV-2026-2002',
    clientName: 'Walmart Chile.',
    vendedorResponsable: 'Felipe Araya',
    product: 'Lanyard',
    quantity: 900,
    date: '2026-06-02',
    dueDate: '2026-06-18',
    paymentStatus: 'Confirmado',
    paymentStatusId: 2,
    generalStepId: KANBAN_STEPS.READY_PRODUCTION,
    paymentDeconfirmationRequested: true,
    paymentDeconfirmationRequestedAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    paymentDeconfirmationRequestedBy: 'Mariana',
    isUrgent: false,
    hasContractPriority: true,
    items: buildItems('demo-002', '2026-06-18', [
      {
        product: 'Lanyard',
        quantity: 900,
        manufacturingDetails: {
          width: '25 mm',
          length: '90 cm',
          texture: 'Tubular',
          backgroundColor: 'Amarillo',
          frontLegend: 'Walmart Chile.',
          backLegend: 'Staff',
          endings: 'Broche plastico',
        },
      },
    ]),
  },
  {
    id: 'demo-003',
    nv: 'NV-2026-2003',
    clientName: 'Banco Estado',
    vendedorResponsable: 'Camila Rojas',
    product: 'Lanyard',
    quantity: 1500,
    date: '2026-06-03',
    dueDate: '2026-06-24',
    paymentStatus: 'Confirmado',
    paymentStatusId: 2,
    generalStepId: KANBAN_STEPS.IN_PRODUCTION,
    isUrgent: true,
    hasContractPriority: false,
    items: buildItems('demo-003', '2026-06-24', [
      {
        product: 'Lanyard',
        quantity: 1500,
        manufacturingDetails: {
          width: '20 mm',
          length: '90 cm',
          texture: 'Lisa',
          backgroundColor: 'Rojo',
          frontLegend: 'Banco Estado',
          backLegend: 'Convencion 2026',
          endings: 'Mosqueton metalico',
        },
      },
    ]),
  },
  {
    id: 'demo-004',
    nv: 'NV-2026-2004',
    clientName: 'Universidad Central',
    vendedorResponsable: 'Diego Munoz',
    product: 'Lanyard',
    quantity: 80,
    date: '2026-06-04',
    dueDate: '2026-06-10',
    paymentStatus: 'Confirmado',
    paymentStatusId: 2,
    generalStepId: KANBAN_STEPS.READY_DELIVERY,
    isUrgent: false,
    hasContractPriority: false,
    items: buildItems('demo-004', '2026-06-10', [
      {
        product: 'Lanyard',
        quantity: 80,
        manufacturingDetails: {
          width: '15 mm',
          length: '85 cm',
          texture: 'Satinada',
          backgroundColor: 'Negro',
          frontLegend: 'U. Central',
          backLegend: 'Acreditacion',
          endings: 'Portacredencial',
        },
      },
    ]),
  },
  {
    id: 'demo-005',
    nv: 'NV-2026-2005',
    clientName: 'Entel',
    vendedorResponsable: 'Paula Vidal',
    product: 'Lanyard',
    quantity: 2000,
    date: '2026-06-05',
    dueDate: '2026-06-29',
    paymentStatus: 'Confirmado',
    paymentStatusId: 2,
    generalStepId: KANBAN_STEPS.IN_PRODUCTION,
    isUrgent: false,
    hasContractPriority: true,
    items: buildItems('demo-005', '2026-06-29', [
      {
        product: 'Lanyard',
        quantity: 2000,
        manufacturingDetails: {
          width: '25 mm',
          length: '90 cm',
          texture: 'Tubular',
          backgroundColor: 'Celeste',
          frontLegend: 'Entel',
          backLegend: 'Equipo Tecnico',
          endings: 'Clip seguridad',
        },
      },
    ]),
  },
  {
    id: 'demo-006',
    nv: 'NV-2026-2006',
    clientName: 'Falabella',
    vendedorResponsable: 'Mariana Soto',
    product: 'Tarjeta',
    quantity: 600,
    date: '2026-06-03',
    dueDate: '2026-06-11',
    paymentStatus: 'Confirmado',
    paymentStatusId: 2,
    generalStepId: KANBAN_STEPS.READY_PRODUCTION,
    items: buildItems('demo-006', '2026-06-11', [
      { product: 'Tarjeta', quantity: 600, manufacturingDetails: { width: '85.6 mm', length: '53.9 mm', cardType: 'Plastificada' } },
    ]),
  },
  {
    id: 'demo-007',
    nv: 'NV-2026-2007',
    clientName: 'Sodimac',
    vendedorResponsable: 'Felipe Araya',
    product: 'Tarjeta',
    quantity: 1200,
    date: '2026-06-04',
    dueDate: '2026-06-15',
    paymentStatus: 'Pendiente',
    paymentStatusId: 1,
    generalStepId: KANBAN_STEPS.PAYMENT_CONFIRMATION,
    items: buildItems('demo-007', '2026-06-15', [
      { product: 'Tarjeta', quantity: 1200, manufacturingDetails: { width: '85.6 mm', length: '53.9 mm', cardType: 'Plastificada' } },
    ]),
  },
  {
    id: 'demo-008',
    nv: 'NV-2026-2008',
    clientName: 'Mutual de Seguridad',
    vendedorResponsable: 'Camila Rojas',
    product: 'Tarjeta',
    quantity: 350,
    date: '2026-06-06',
    dueDate: '2026-06-19',
    paymentStatus: 'Confirmado',
    paymentStatusId: 2,
    generalStepId: KANBAN_STEPS.IN_PRODUCTION,
    items: buildItems('demo-008', '2026-06-19', [
      { product: 'Tarjeta', quantity: 350, manufacturingDetails: { width: '85.6 mm', length: '53.9 mm', cardType: 'Plastificada' } },
    ]),
  },
  {
    id: 'demo-009',
    nv: 'NV-2026-2009',
    clientName: 'Metro de Santiago',
    vendedorResponsable: 'Diego Munoz',
    product: 'Tarjeta',
    quantity: 900,
    date: '2026-06-07',
    dueDate: '2026-06-22',
    paymentStatus: 'Confirmado',
    paymentStatusId: 2,
    generalStepId: KANBAN_STEPS.READY_DELIVERY,
    items: buildItems('demo-009', '2026-06-22', [
      { product: 'Tarjeta', quantity: 900, manufacturingDetails: { width: '85.6 mm', length: '53.9 mm', cardType: 'Plastificada' } },
    ]),
  },
  {
    id: 'demo-010',
    nv: 'NV-2026-2010',
    clientName: 'Cencosud',
    vendedorResponsable: 'Paula Vidal',
    product: 'Tarjeta',
    quantity: 1800,
    date: '2026-06-08',
    dueDate: '2026-06-26',
    paymentStatus: 'Confirmado',
    paymentStatusId: 2,
    generalStepId: KANBAN_STEPS.READY_PRODUCTION,
    items: buildItems('demo-010', '2026-06-26', [
      { product: 'Tarjeta', quantity: 1800, manufacturingDetails: { width: '85.6 mm', length: '53.9 mm', cardType: 'Plastificada' } },
    ]),
  },
  ...[
    ['demo-011', 'NV-2026-2011', 'Minera Los Andes', 'Mariana Soto', 450, 300, '2026-06-11', 1],
    ['demo-012', 'NV-2026-2012', 'Hospital Regional', 'Felipe Araya', 1100, 700, '2026-06-17', 2],
    ['demo-013', 'NV-2026-2013', 'Colegio San Pedro', 'Camila Rojas', 95, 250, '2026-06-18', 0],
    ['demo-014', 'NV-2026-2014', 'Aguas Andinas', 'Diego Munoz', 1700, 1000, '2026-06-25', 2],
    ['demo-015', 'NV-2026-2015', 'Red Salud', 'Paula Vidal', 650, 400, '2026-06-30', 3],
  ].map(([id, nv, clientName, vendedorResponsable, lanyards, cards, dueDate, generalStepId], index) => ({
    id,
    nv,
    clientName,
    vendedorResponsable,
    product: 'Mixto',
    quantity: Number(lanyards) + Number(cards),
    date: `2026-06-${String(index + 9).padStart(2, '0')}`,
    dueDate,
    paymentStatus: generalStepId === 0 ? 'Pendiente' : 'Confirmado',
    paymentStatusId: generalStepId === 0 ? 1 : 2,
    generalStepId,
    isUrgent: index === 1,
    hasContractPriority: index === 3,
    items: buildItems(id, dueDate, [
      { product: 'Lanyard', quantity: Number(lanyards), manufacturingDetails: { width: '20 mm', length: '90 cm', texture: 'Satinada', backgroundColor: 'Blanco', frontLegend: clientName, backLegend: 'Evento corporativo', endings: 'Mosqueton metalico' } },
      { product: 'Tarjeta', quantity: Number(cards), manufacturingDetails: { width: '85.6 mm', length: '53.9 mm', cardType: 'Plastificada' } },
    ]),
  })),
]

const demoSeedConfirmedAt = new Date().toISOString()

let demoOrders = initialOrders.map((order) => ({
  ...order,
  items: order.items.map((item) => ({ ...item })),
  lastPaymentValidation:
    order.paymentStatus === DEMO_PAYMENT_STATUS.CONFIRMADO.nombre_estado_pago
      ? {
          email: 'demo@itecsa.cl',
          observacion: 'Pago confirmado en datos demo iniciales.',
          validatedAt: demoSeedConfirmedAt,
        }
      : order.lastPaymentValidation,
}))

let announcementSequence = 3
let demoAnnouncements = [
  {
    id: 'ann-001',
    type: ANNOUNCEMENT_TYPES.PAYMENT_DECONFIRMATION_REQUESTED,
    orderId: 'demo-002',
    nv: 'NV-2026-2002',
    responsible: 'Mariana',
    summary: 'Mariana solicita la desconfirmacion del pedido NV-2026-2002',
    createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
  },
  {
    id: 'ann-002',
    type: ANNOUNCEMENT_TYPES.PAYMENT_DECONFIRMATION_APPROVED,
    orderId: 'demo-006',
    nv: 'NV-2026-2006',
    responsible: 'Felipe',
    summary: 'Felipe ha hecho efectiva la desconfirmacion del pedido NV-2026-2006',
    createdAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
  },
]

function cloneOrder(order) {
  return {
    ...order,
    items: order.items.map((item) => ({ ...item, manufacturingDetails: item.manufacturingDetails ? { ...item.manufacturingDetails } : null })),
  }
}

function getPaymentConfirmedAt(order) {
  if (order.paymentStatus !== DEMO_PAYMENT_STATUS.CONFIRMADO.nombre_estado_pago) {
    return null
  }

  return order.lastPaymentValidation?.validatedAt ?? null
}

function getFirstName(value) {
  const rawValue = String(value ?? '').trim()

  if (!rawValue) return 'Usuario'

  const localPart = rawValue.includes('@') ? rawValue.split('@')[0] : rawValue
  const firstToken = localPart.split(/[.\s_-]+/).find(Boolean)

  if (!firstToken) return 'Usuario'

  return firstToken.charAt(0).toUpperCase() + firstToken.slice(1).toLowerCase()
}

function addAnnouncement({ order, responsible, summary, type }) {
  announcementSequence += 1

  const announcement = {
    id: `ann-${String(announcementSequence).padStart(3, '0')}`,
    type,
    orderId: order.id,
    nv: order.nv,
    responsible,
    summary,
    createdAt: new Date().toISOString(),
  }

  demoAnnouncements = [announcement, ...demoAnnouncements]

  return { ...announcement }
}

export function listDemoOrders() {
  return demoOrders.map(cloneOrder)
}

export function listDemoPaymentStatuses() {
  return Object.values(DEMO_PAYMENT_STATUS).map((status) => ({ ...status }))
}

export function listAvailableDemoSalesNotes() {
  const usedSalesNotes = new Set(demoOrders.map((order) => order.nv))

  return availableSalesNotes
    .filter((salesNote) => !usedSalesNotes.has(salesNote.nv))
    .map((salesNote) => ({
      ...salesNote,
      items: salesNote.items.map((item) => ({ ...item })),
    }))
}

export function listDemoAnnouncements() {
  return demoAnnouncements
    .slice()
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .map((announcement) => ({ ...announcement }))
}

export function listDemoPaymentOrders() {
  return demoOrders.map((order) => ({
    id_pedido: order.id,
    fecha_creacion: order.date,
    fecha_estimada_termino: order.dueDate,
    id_estado_pago: order.paymentStatusId,
    estado_pago: order.paymentStatus,
    id_etapa_general: order.generalStepId,
    nombre_etapa_general: order.generalStepId === KANBAN_STEPS.PAYMENT_CONFIRMATION
      ? 'Confirmacion de pago'
      : order.generalStepId === KANBAN_STEPS.READY_PRODUCTION
        ? 'Listo para produccion'
        : order.generalStepId === KANBAN_STEPS.IN_PRODUCTION
          ? 'En produccion'
          : 'Listo para entrega',
    nombre_cliente: order.clientName,
    razon_social: order.clientName,
    rut_cliente: order.rut ?? 'RUT demo',
    nombre_producto: order.product,
    descripcion_producto: order.items.map((item) => item.product).join(', '),
    cantidad: order.quantity,
    detalles: order.items.map((item) => ({
      id_detalle_pedido: item.id,
      nombre_producto: item.product,
      cantidad: item.quantity,
      fecha_estimada_termino: item.dueDate,
    })),
    numero_nota_venta: order.nv,
    fecha_registro: order.lastPaymentValidation?.validatedAt ?? null,
    paymentConfirmedAt: getPaymentConfirmedAt(order),
    paymentDeconfirmationRequested: Boolean(order.paymentDeconfirmationRequested),
    paymentDeconfirmationRequestedAt: order.paymentDeconfirmationRequestedAt ?? null,
    paymentDeconfirmationRequestedBy: order.paymentDeconfirmationRequestedBy ?? null,
  }))
}

export function updateDemoOrderDeliveryDate(orderId, dueDate) {
  let updatedOrder = null

  demoOrders = demoOrders.map((order) => {
    if (order.id !== orderId) return order

    updatedOrder = {
      ...order,
      dueDate,
      items: order.items.map((item) => ({ ...item, dueDate })),
    }

    return updatedOrder
  })

  return updatedOrder ? cloneOrder(updatedOrder) : null
}

export function updateDemoOrderStep(orderId, generalStepId, audit = {}) {
  let updatedOrder = null

  demoOrders = demoOrders.map((order) => {
    if (order.id !== orderId) return order

    const previousStepId = Number(order.generalStepId)
    const nextStepId = Number(generalStepId)

    updatedOrder = {
      ...order,
      generalStepId: nextStepId,
      productionMoveAudit: audit.operatorEmail
        ? {
            operatorEmail: audit.operatorEmail,
            movedAt: new Date().toISOString(),
          }
        : order.productionMoveAudit,
    }

    if (
      previousStepId === KANBAN_STEPS.READY_PRODUCTION &&
      nextStepId === KANBAN_STEPS.IN_PRODUCTION
    ) {
      const responsible = getFirstName(audit.operatorEmail)

      addAnnouncement({
        order: updatedOrder,
        responsible,
        type: ANNOUNCEMENT_TYPES.KANBAN_MOVE_TO_PRODUCTION,
        summary: `${responsible} hizo efectivo el cambio de estado del pedido ${order.nv}`,
      })
    }

    return updatedOrder
  })

  return updatedOrder ? cloneOrder(updatedOrder) : null
}

export function updateDemoOrderPaymentStatus(orderId, paymentStatusId, credentials = {}) {
  const nextPaymentStatusId = Number(paymentStatusId)
  const nextStatus = listDemoPaymentStatuses().find(
    (status) => Number(status.id_estado_Pago) === nextPaymentStatusId,
  )

  if (!nextStatus) return { error: 'STATUS_NOT_FOUND' }

  if (!credentials.email || !credentials.password) {
    return { error: 'MISSING_CREDENTIALS' }
  }

  let updatedOrder = null

  demoOrders = demoOrders.map((order) => {
    if (order.id !== orderId) return order

    const isCurrentlyConfirmed =
      order.paymentStatus === DEMO_PAYMENT_STATUS.CONFIRMADO.nombre_estado_pago
    const isNextConfirmed =
      nextStatus.nombre_estado_pago === DEMO_PAYMENT_STATUS.CONFIRMADO.nombre_estado_pago

    if (isCurrentlyConfirmed && !isNextConfirmed) {
      return order
    }

    const nextGeneralStepId =
      isNextConfirmed
        ? KANBAN_STEPS.READY_PRODUCTION
        : KANBAN_STEPS.PAYMENT_CONFIRMATION

    updatedOrder = {
      ...order,
      paymentStatus: nextStatus.nombre_estado_pago,
      paymentStatusId: nextPaymentStatusId,
      generalStepId: nextGeneralStepId,
      lastPaymentValidation: isNextConfirmed
        ? {
            email: credentials.email,
            observacion: credentials.observacion ?? null,
            validatedAt: new Date().toISOString(),
          }
        : order.lastPaymentValidation,
      paymentDeconfirmationRequested: isNextConfirmed
        ? false
        : order.paymentDeconfirmationRequested,
      paymentDeconfirmationRequestedAt: isNextConfirmed
        ? null
        : order.paymentDeconfirmationRequestedAt,
      paymentDeconfirmationRequestedBy: isNextConfirmed
        ? null
        : order.paymentDeconfirmationRequestedBy,
    }

    return updatedOrder
  })

  if (!updatedOrder) {
    const orderExists = demoOrders.some((order) => order.id === orderId)

    return { error: orderExists ? 'DIRECT_DECONFIRMATION_NOT_ALLOWED' : 'ORDER_NOT_FOUND' }
  }

  return { order: cloneOrder(updatedOrder) }
}

export function requestDemoPaymentDeconfirmation(orderId, data = {}) {
  let updatedOrder = null

  demoOrders = demoOrders.map((order) => {
    if (order.id !== orderId) return order

    if (
      order.paymentStatus !== DEMO_PAYMENT_STATUS.CONFIRMADO.nombre_estado_pago ||
      Number(order.generalStepId) !== KANBAN_STEPS.READY_PRODUCTION
    ) {
      return order
    }

    const responsible = getFirstName(data.responsible ?? data.email)
    const requestedAt = new Date().toISOString()

    updatedOrder = {
      ...order,
      paymentDeconfirmationRequested: true,
      paymentDeconfirmationRequestedAt: requestedAt,
      paymentDeconfirmationRequestedBy: responsible,
    }

    addAnnouncement({
      order: updatedOrder,
      responsible,
      type: ANNOUNCEMENT_TYPES.PAYMENT_DECONFIRMATION_REQUESTED,
      summary: `${responsible} solicita la desconfirmacion del pedido ${order.nv}`,
    })

    return updatedOrder
  })

  if (!updatedOrder) {
    const orderExists = demoOrders.some((order) => order.id === orderId)

    return { error: orderExists ? 'REQUEST_NOT_ALLOWED' : 'ORDER_NOT_FOUND' }
  }

  return { order: cloneOrder(updatedOrder) }
}

export function approveDemoPaymentDeconfirmation(orderId, credentials = {}) {
  if (!credentials.email || !credentials.password) {
    return { error: 'MISSING_CREDENTIALS' }
  }

  let updatedOrder = null

  demoOrders = demoOrders.map((order) => {
    if (order.id !== orderId) return order

    if (!order.paymentDeconfirmationRequested) {
      return order
    }

    const responsible = getFirstName(credentials.email)

    updatedOrder = {
      ...order,
      paymentStatus: DEMO_PAYMENT_STATUS.PENDIENTE.nombre_estado_pago,
      paymentStatusId: DEMO_PAYMENT_STATUS.PENDIENTE.id_estado_Pago,
      generalStepId: KANBAN_STEPS.PAYMENT_CONFIRMATION,
      paymentDeconfirmationRequested: false,
      paymentDeconfirmationRequestedAt: null,
      paymentDeconfirmationRequestedBy: null,
    }

    addAnnouncement({
      order: updatedOrder,
      responsible,
      type: ANNOUNCEMENT_TYPES.PAYMENT_DECONFIRMATION_APPROVED,
      summary: `${responsible} ha hecho efectiva la desconfirmacion del pedido ${order.nv}`,
    })

    return updatedOrder
  })

  if (!updatedOrder) {
    const orderExists = demoOrders.some((order) => order.id === orderId)

    return { error: orderExists ? 'REQUEST_NOT_FOUND' : 'ORDER_NOT_FOUND' }
  }

  return { order: cloneOrder(updatedOrder) }
}

export { ANNOUNCEMENT_TYPES, DEMO_PAYMENT_STATUS, KANBAN_STEPS }
