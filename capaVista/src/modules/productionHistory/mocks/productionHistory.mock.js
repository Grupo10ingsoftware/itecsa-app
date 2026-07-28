function buildSampleImage({ title, version, color }) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 620">
      <rect width="960" height="620" fill="#f8fafc"/>
      <rect x="64" y="56" width="832" height="508" rx="28" fill="${color}"/>
      <rect x="104" y="96" width="752" height="428" rx="18" fill="#ffffff" opacity="0.92"/>
      <circle cx="178" cy="168" r="42" fill="${color}" opacity="0.82"/>
      <rect x="252" y="140" width="472" height="28" rx="14" fill="#111827"/>
      <rect x="252" y="196" width="360" height="18" rx="9" fill="#64748b"/>
      <rect x="252" y="236" width="480" height="18" rx="9" fill="#94a3b8"/>
      <rect x="152" y="318" width="656" height="116" rx="18" fill="${color}" opacity="0.14"/>
      <text x="480" y="381" text-anchor="middle" fill="#111827" font-family="Arial, sans-serif" font-size="40" font-weight="700">${title}</text>
      <text x="480" y="430" text-anchor="middle" fill="#334155" font-family="Arial, sans-serif" font-size="24">Version ${version}</text>
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const SAMPLE_STATUS = Object.freeze({
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  REVIEW: 'En revision',
  FINAL: 'Definitiva',
})

export const PRODUCTION_HISTORY_ORDERS = Object.freeze([
  {
    id: '1008',
    orderNumber: 'NV-2026-1008',
    managerOrderId: 'MGR-89322',
    productType: 'Lanyard sublimado',
    clientName: 'Colegio Andino',
    clientRut: '76.944.210-5',
    sellerName: 'Camila Rojas',
    quantity: 850,
    orderStatus: 'En produccion',
    createdAt: '2026-07-18',
    finalSampleId: '1008-v4',
    samples: [
      {
        id: '1008-v4',
        version: 4,
        status: SAMPLE_STATUS.FINAL,
        isFinal: true,
        createdAt: '2026-07-23T10:20:00',
        resolvedAt: '2026-07-24T15:10:00',
        responsible: 'Valentina Perez',
        reviewer: 'Ignacio Salas',
        observations: 'Muestra aprobada con colores institucionales ajustados.',
        changeReason: 'Se corrigio tono azul y separacion de logo.',
        imageUrl: buildSampleImage({ title: 'Lanyard final', version: 4, color: '#f97316' }),
        specifications: {
          ancho: '20 mm',
          largo: '90 cm',
          material: 'Poliester satinado',
          leyenda: 'Colegio Andino 2026',
          color: 'Azul institucional',
        },
      },
      {
        id: '1008-v3',
        version: 3,
        status: SAMPLE_STATUS.REJECTED,
        isFinal: false,
        createdAt: '2026-07-22T09:15:00',
        resolvedAt: '2026-07-22T17:35:00',
        responsible: 'Valentina Perez',
        reviewer: 'Ignacio Salas',
        observations: 'Cliente solicita disminuir saturacion del color principal.',
        changeReason: 'El azul no coincidia con manual de marca.',
        imageUrl: buildSampleImage({ title: 'Lanyard ajuste', version: 3, color: '#2563eb' }),
        specifications: {
          ancho: '20 mm',
          largo: '90 cm',
          material: 'Poliester satinado',
          leyenda: 'Colegio Andino 2026',
          color: 'Azul intenso',
        },
      },
      {
        id: '1008-v2',
        version: 2,
        status: SAMPLE_STATUS.APPROVED,
        isFinal: false,
        createdAt: '2026-07-20T12:00:00',
        resolvedAt: '2026-07-21T11:10:00',
        responsible: 'Nicolas Vera',
        reviewer: 'Camila Rojas',
        observations: 'Diseno aprobado internamente, enviado a cliente.',
        changeReason: 'Se incorporo logo secundario.',
        imageUrl: buildSampleImage({ title: 'Lanyard logos', version: 2, color: '#0f766e' }),
        specifications: {
          ancho: '20 mm',
          largo: '90 cm',
          material: 'Poliester satinado',
          leyenda: 'Colegio Andino',
          color: 'Azul y blanco',
        },
      },
      {
        id: '1008-v1',
        version: 1,
        status: SAMPLE_STATUS.REJECTED,
        isFinal: false,
        createdAt: '2026-07-19T09:40:00',
        resolvedAt: '2026-07-19T16:20:00',
        responsible: 'Nicolas Vera',
        reviewer: 'Camila Rojas',
        observations: 'Primera propuesta incompleta.',
        changeReason: 'Faltaba leyenda lateral.',
        imageUrl: buildSampleImage({ title: 'Lanyard base', version: 1, color: '#64748b' }),
        specifications: {
          ancho: '20 mm',
          largo: '90 cm',
          material: 'Poliester',
          leyenda: 'Pendiente',
          color: 'Azul',
        },
      },
    ],
  },
  {
    id: '1007',
    orderNumber: 'NV-2026-1007',
    managerOrderId: 'MGR-89310',
    productType: 'Tarjeta PVC',
    clientName: 'Clinica Norte',
    clientRut: '96.512.030-1',
    sellerName: 'Mario Fuentes',
    quantity: 1200,
    orderStatus: 'Listo para produccion',
    createdAt: '2026-07-15',
    finalSampleId: '1007-v2',
    samples: [
      {
        id: '1007-v2',
        version: 2,
        status: SAMPLE_STATUS.FINAL,
        isFinal: true,
        createdAt: '2026-07-17T14:35:00',
        resolvedAt: '2026-07-18T10:05:00',
        responsible: 'Daniel Munoz',
        reviewer: 'Mario Fuentes',
        observations: 'Version definitiva con banda y datos variables.',
        changeReason: 'Se ajusto posicion del QR.',
        imageUrl: buildSampleImage({ title: 'Tarjeta final', version: 2, color: '#16a34a' }),
        specifications: {
          ancho: '85.6 mm',
          largo: '53.9 mm',
          material: 'PVC blanco',
          leyenda: 'Credencial paciente',
          terminacion: 'Laminado brillante',
        },
      },
      {
        id: '1007-v1',
        version: 1,
        status: SAMPLE_STATUS.REJECTED,
        isFinal: false,
        createdAt: '2026-07-16T11:00:00',
        resolvedAt: '2026-07-16T18:30:00',
        responsible: 'Daniel Munoz',
        reviewer: 'Mario Fuentes',
        observations: 'QR quedo muy cerca del margen.',
        changeReason: 'Reubicar QR y aumentar contraste.',
        imageUrl: buildSampleImage({ title: 'Tarjeta inicial', version: 1, color: '#dc2626' }),
        specifications: {
          ancho: '85.6 mm',
          largo: '53.9 mm',
          material: 'PVC blanco',
          leyenda: 'Credencial',
          terminacion: 'Laminado brillante',
        },
      },
    ],
  },
  {
    id: '1006',
    orderNumber: 'NV-2026-1006',
    managerOrderId: 'MGR-89288',
    productType: 'Credencial corporativa',
    clientName: 'Minera Sur',
    clientRut: '77.128.455-8',
    sellerName: 'Fernanda Leiva',
    quantity: 420,
    orderStatus: 'En revision de muestra',
    createdAt: '2026-07-12',
    finalSampleId: null,
    samples: [
      {
        id: '1006-v1',
        version: 1,
        status: SAMPLE_STATUS.REVIEW,
        isFinal: false,
        createdAt: '2026-07-14T08:50:00',
        resolvedAt: null,
        responsible: 'Sofia Campos',
        reviewer: null,
        observations: 'Pendiente de respuesta del cliente.',
        changeReason: 'Primera muestra generada desde especificaciones comerciales.',
        imageUrl: buildSampleImage({ title: 'Credencial revision', version: 1, color: '#7c3aed' }),
        specifications: {
          ancho: '86 mm',
          largo: '54 mm',
          material: 'PVC con chip',
          leyenda: 'Acceso faena',
          terminacion: 'Mate',
        },
      },
    ],
  },
  {
    id: '1005',
    orderNumber: 'NV-2026-1005',
    managerOrderId: 'MGR-89260',
    productType: 'Lanyard tubular',
    clientName: 'Universidad Central',
    clientRut: '70.112.900-4',
    sellerName: 'Paula Silva',
    quantity: 2000,
    orderStatus: 'Listo para entrega',
    createdAt: '2026-07-08',
    finalSampleId: '1005-v3',
    samples: [
      {
        id: '1005-v3',
        version: 3,
        status: SAMPLE_STATUS.FINAL,
        isFinal: true,
        createdAt: '2026-07-11T13:20:00',
        resolvedAt: '2026-07-12T09:00:00',
        responsible: 'Valentina Perez',
        reviewer: 'Paula Silva',
        observations: 'Aprobada para produccion masiva.',
        changeReason: 'Se corrigio grosor de tipografia.',
        imageUrl: buildSampleImage({ title: 'Tubular final', version: 3, color: '#ea580c' }),
        specifications: {
          ancho: '15 mm',
          largo: '92 cm',
          material: 'Tubular poliester',
          leyenda: 'Universidad Central',
          accesorio: 'Mosqueton metalico',
        },
      },
      {
        id: '1005-v2',
        version: 2,
        status: SAMPLE_STATUS.REJECTED,
        isFinal: false,
        createdAt: '2026-07-10T10:25:00',
        resolvedAt: '2026-07-10T18:00:00',
        responsible: 'Valentina Perez',
        reviewer: 'Paula Silva',
        observations: 'Tipografia muy delgada para produccion.',
        changeReason: 'Aumentar peso visual de marca.',
        imageUrl: buildSampleImage({ title: 'Tubular texto', version: 2, color: '#f59e0b' }),
        specifications: {
          ancho: '15 mm',
          largo: '92 cm',
          material: 'Tubular poliester',
          leyenda: 'Universidad Central',
          accesorio: 'Mosqueton metalico',
        },
      },
      {
        id: '1005-v1',
        version: 1,
        status: SAMPLE_STATUS.REJECTED,
        isFinal: false,
        createdAt: '2026-07-09T09:10:00',
        resolvedAt: '2026-07-09T15:00:00',
        responsible: 'Sofia Campos',
        reviewer: 'Paula Silva',
        observations: 'Cliente solicita cambiar accesorio.',
        changeReason: 'Cambiar gancho plastico por metalico.',
        imageUrl: buildSampleImage({ title: 'Tubular inicial', version: 1, color: '#475569' }),
        specifications: {
          ancho: '15 mm',
          largo: '92 cm',
          material: 'Tubular poliester',
          leyenda: 'Universidad',
          accesorio: 'Gancho plastico',
        },
      },
    ],
  },
  {
    id: '1004',
    orderNumber: 'NV-2026-1004',
    managerOrderId: 'MGR-89241',
    productType: 'Tarjeta visita premium',
    clientName: 'Estudio Legal Rivas',
    clientRut: '78.009.331-2',
    sellerName: 'Cristobal Diaz',
    quantity: 600,
    orderStatus: 'Confirmacion de pago',
    createdAt: '2026-07-04',
    finalSampleId: null,
    samples: [],
  },
])

export function getProductionHistoryOrders() {
  return PRODUCTION_HISTORY_ORDERS.map(({ samples, ...order }) => ({
    ...order,
    sampleCount: samples.length,
    hasFinalSample: samples.some((sample) => sample.isFinal),
  }))
}

export function getProductionHistoryOrderById(orderId) {
  return PRODUCTION_HISTORY_ORDERS.find((order) => String(order.id) === String(orderId)) ?? null
}
