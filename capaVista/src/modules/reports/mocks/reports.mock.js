const SUBPROCESS_BY_PRODUCT = Object.freeze({
  Lanyard: ['Impresion', 'Sublimacion', 'Corte', 'Costura'],
  Tarjeta: ['Revisar informacion', 'Ordenar informacion', 'Cargar datos', 'Confeccion', 'Empaquetado'],
  'YoYo con Dome': ['Ensamblado'],
})

function buildStageHours(seed) {
  return {
    'Confirmacion de pago': 7 + (seed % 4) * 2,
    'Listo para produccion': 10 + (seed % 5) * 3,
    'En produccion': 28 + (seed % 6) * 8,
    'Listo para entrega': 3 + (seed % 3) * 2,
  }
}

function buildSubprocessHours(seed, items) {
  return items.flatMap((item, itemIndex) =>
    (SUBPROCESS_BY_PRODUCT[item.productType] ?? []).map((name, processIndex) => ({
      name,
      hours: 3 + ((seed + itemIndex + processIndex) % 6) * 2,
    })),
  )
}

function createOrder({ seed, ...order }) {
  return {
    ...order,
    stageHours: buildStageHours(seed),
    subprocessHours: buildSubprocessHours(seed, order.items),
  }
}

export const REPORT_ORDERS = Object.freeze([
  createOrder({
    seed: 1,
    id: 'PED-2401',
    salesNote: 'NV-2026-1041',
    client: 'TOTALPACK',
    seller: 'Camila Torres',
    createdAt: '2026-07-28T09:10:00',
    estimatedAt: '2026-08-04T18:00:00',
    readyAt: '2026-08-04T16:25:00',
    loadAtEntry: 72,
    items: [{ productType: 'Lanyard', quantity: 680 }],
  }),
  createOrder({
    seed: 2,
    id: 'PED-2402',
    salesNote: 'NV-2026-1042',
    client: 'Constructora Andes',
    seller: 'Diego Rojas',
    createdAt: '2026-07-30T11:40:00',
    estimatedAt: '2026-08-05T18:00:00',
    readyAt: '2026-08-06T12:15:00',
    loadAtEntry: 84,
    items: [{ productType: 'Tarjeta', quantity: 520 }],
  }),
  createOrder({
    seed: 3,
    id: 'PED-2403',
    salesNote: 'NV-2026-1043',
    client: 'Clínica del Sur',
    seller: 'Fernanda Silva',
    createdAt: '2026-08-01T08:35:00',
    estimatedAt: '2026-08-07T18:00:00',
    readyAt: '2026-08-07T15:40:00',
    loadAtEntry: 91,
    items: [
      { productType: 'Lanyard', quantity: 430 },
      { productType: 'Tarjeta', quantity: 430 },
    ],
  }),
  createOrder({
    seed: 4,
    id: 'PED-2404',
    salesNote: 'NV-2026-1044',
    client: 'Municipalidad Central',
    seller: 'Matías Soto',
    createdAt: '2026-08-03T10:20:00',
    estimatedAt: '2026-08-10T18:00:00',
    readyAt: '2026-08-10T17:05:00',
    loadAtEntry: 66,
    items: [{ productType: 'YoYo con Dome', quantity: 360 }],
  }),
  createOrder({
    seed: 5,
    id: 'PED-2405',
    salesNote: 'NV-2026-1045',
    client: 'Universidad Horizonte',
    seller: 'Camila Torres',
    createdAt: '2026-08-04T15:05:00',
    estimatedAt: '2026-08-11T18:00:00',
    readyAt: '2026-08-12T10:30:00',
    loadAtEntry: 88,
    items: [{ productType: 'Lanyard', quantity: 950 }],
  }),
  createOrder({
    seed: 6,
    id: 'PED-2406',
    salesNote: 'NV-2026-1046',
    client: 'Logística Puerto',
    seller: 'Diego Rojas',
    createdAt: '2026-08-05T09:45:00',
    estimatedAt: '2026-08-13T18:00:00',
    readyAt: '2026-08-13T13:20:00',
    loadAtEntry: 79,
    items: [{ productType: 'Tarjeta', quantity: 740 }],
  }),
  createOrder({
    seed: 7,
    id: 'PED-2407',
    salesNote: 'NV-2026-1047',
    client: 'Grupo Boreal',
    seller: 'Fernanda Silva',
    createdAt: '2026-08-07T12:15:00',
    estimatedAt: '2026-08-17T18:00:00',
    readyAt: '2026-08-17T11:50:00',
    loadAtEntry: 95,
    items: [{ productType: 'YoYo con Dome', quantity: 510 }],
  }),
  createOrder({
    seed: 8,
    id: 'PED-2408',
    salesNote: 'NV-2026-1048',
    client: 'Servicios Cordillera',
    seller: 'Matías Soto',
    createdAt: '2026-08-10T08:10:00',
    estimatedAt: '2026-08-18T18:00:00',
    readyAt: '2026-08-20T09:35:00',
    loadAtEntry: 82,
    items: [{ productType: 'Lanyard', quantity: 780 }],
  }),
  createOrder({
    seed: 9,
    id: 'PED-2409',
    salesNote: 'NV-2026-1049',
    client: 'Colegio Los Alerces',
    seller: 'Camila Torres',
    createdAt: '2026-08-11T14:30:00',
    estimatedAt: '2026-08-21T18:00:00',
    readyAt: '2026-08-21T16:10:00',
    loadAtEntry: 77,
    items: [{ productType: 'Tarjeta', quantity: 610 }],
  }),
  createOrder({
    seed: 10,
    id: 'PED-2410',
    salesNote: 'NV-2026-1050',
    client: 'Fundación Futuro',
    seller: 'Diego Rojas',
    createdAt: '2026-08-13T09:00:00',
    estimatedAt: '2026-08-24T18:00:00',
    readyAt: '2026-08-24T14:45:00',
    loadAtEntry: 86,
    items: [
      { productType: 'Lanyard', quantity: 320 },
      { productType: 'YoYo con Dome', quantity: 320 },
    ],
  }),
  createOrder({
    seed: 11,
    id: 'PED-2411',
    salesNote: 'NV-2026-1051',
    client: 'Hotel Pacífico',
    seller: 'Fernanda Silva',
    createdAt: '2026-08-14T16:05:00',
    estimatedAt: '2026-08-25T18:00:00',
    readyAt: '2026-08-26T12:30:00',
    loadAtEntry: 93,
    items: [{ productType: 'Tarjeta', quantity: 870 }],
  }),
  createOrder({
    seed: 12,
    id: 'PED-2412',
    salesNote: 'NV-2026-1052',
    client: 'Comercial Altamar',
    seller: 'Matías Soto',
    createdAt: '2026-08-17T10:50:00',
    estimatedAt: '2026-08-28T18:00:00',
    readyAt: '2026-08-28T09:40:00',
    loadAtEntry: 68,
    items: [{ productType: 'Lanyard', quantity: 540 }],
  }),
  createOrder({
    seed: 13,
    id: 'PED-2413',
    salesNote: 'NV-2026-1053',
    client: 'Agrícola Los Robles',
    seller: 'Camila Torres',
    createdAt: '2026-08-18T13:20:00',
    estimatedAt: '2026-08-28T18:00:00',
    readyAt: '2026-08-31T10:15:00',
    loadAtEntry: 89,
    items: [{ productType: 'YoYo con Dome', quantity: 450 }],
  }),
  createOrder({
    seed: 14,
    id: 'PED-2398',
    salesNote: 'NV-2026-1038',
    client: 'Importadora Norte',
    seller: 'Diego Rojas',
    createdAt: '2026-07-15T08:25:00',
    estimatedAt: '2026-07-24T18:00:00',
    readyAt: '2026-07-24T13:10:00',
    loadAtEntry: 74,
    items: [{ productType: 'Lanyard', quantity: 610 }],
  }),
  createOrder({
    seed: 15,
    id: 'PED-2414',
    salesNote: 'NV-2026-1054',
    client: 'Centro Médico Uno',
    seller: 'Fernanda Silva',
    createdAt: '2026-08-24T09:15:00',
    estimatedAt: '2026-09-02T18:00:00',
    readyAt: '2026-09-02T12:05:00',
    loadAtEntry: 81,
    items: [{ productType: 'Tarjeta', quantity: 560 }],
  }),
])

export const REPORT_DEFAULT_RANGE = Object.freeze({
  from: '2026-08-01',
  to: '2026-08-31',
})

export const REPORT_MONTH_OPTIONS = Object.freeze([
  { value: '2026-07', label: 'Julio 2026' },
  { value: '2026-08', label: 'Agosto 2026' },
  { value: '2026-09', label: 'Septiembre 2026' },
])

export const HIGH_LOAD_THRESHOLD = 80
