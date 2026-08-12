export const ORDER_FLOW_STEPS = Object.freeze([
  {
    id: 1,
    title: 'Nota de Venta',
    subtitle: 'Ingrese la información principal',
  },
  {
    id: 2,
    title: 'Archivos de Diseño',
    subtitle: 'Adjunte archivos opcionales',
  },
  {
    id: 3,
    title: 'Revisión y Registro',
    subtitle: 'Revise y registre el pedido',
  },
])

export const ORDER_PROCESS_STATUS = Object.freeze({
  CONFIRMACION_PAGO: 'Confirmación de pago',
})

export const ORDER_PAYMENT_STATUS = Object.freeze({
  PENDIENTE: 'Pendiente',
})

export const EXISTING_SALES_NOTES = Object.freeze(['NV-2024-0008', 'NV-2024-0030'])

export const MOCK_MANAGER_RECORDS = Object.freeze({
  'NV-2026-3001': Object.freeze({
    client: 'Mall Plaza',
    rut: '76.812.440-5',
    productType: 'Lanyard',
    quantity: 250,
    issueDate: '01/07/2026',
    createdAtLabel: '01/07/2026 09:20',
    seller: 'Mariana Soto',
    dueDate: '10/07/2026',
    productionData: Object.freeze([
      Object.freeze({
        product: 'Lanyard',
        quantity: 250,
        width: '20 mm',
        length: '90 cm',
        texture: 'Satinada',
        backgroundColor: 'Naranjo corporativo',
        frontLegend: 'Mall Plaza',
        backLegend: 'Staff Verano',
        endings: 'Mosqueton metalico',
      }),
    ]),
  }),
  'NV-2026-3002': Object.freeze({
    client: 'Universidad de Valparaiso',
    rut: '70.800.600-2',
    productType: 'Tarjeta',
    quantity: 800,
    issueDate: '02/07/2026',
    createdAtLabel: '02/07/2026 10:05',
    seller: 'Felipe Araya',
    dueDate: '13/07/2026',
    productionData: Object.freeze([
      Object.freeze({
        product: 'Tarjeta',
        quantity: 800,
        width: '85 mm',
        length: '54 mm',
        cardType: 'Plastificada',
      }),
    ]),
  }),
  'NV-2026-3003': Object.freeze({
    client: 'Clinica Santa Maria',
    rut: '96.768.970-K',
    productType: 'Mixto',
    quantity: 1050,
    issueDate: '03/07/2026',
    createdAtLabel: '03/07/2026 11:40',
    seller: 'Camila Rojas',
    dueDate: '17/07/2026',
    productionData: Object.freeze([
      Object.freeze({
        product: 'Lanyard',
        quantity: 600,
        width: '25 mm',
        length: '92 cm',
        texture: 'Tubular',
        backgroundColor: 'Azul clinico',
        frontLegend: 'Clinica Santa Maria',
        backLegend: 'Identificacion Pacientes',
        endings: 'Broche de seguridad y porta credencial',
      }),
      Object.freeze({
        product: 'Tarjeta',
        quantity: 450,
        width: '85 mm',
        length: '54 mm',
        cardType: 'Plastificada',
      }),
    ]),
  }),
  'NV-2024-0014': Object.freeze({
    client: 'Constructora Horizonte SpA',
    rut: '76.123.456-7',
    productType: 'Estructuras Metálicas',
    quantity: 4,
    issueDate: '08/05/2024',
    createdAtLabel: '08/05/2024 11:24',
  }),
  'NV-2024-0021': Object.freeze({
    client: 'Industrias Andinas S.A.',
    rut: '76.543.210-9',
    productType: 'Paneles eléctricos',
    quantity: 12,
    issueDate: '15/05/2024',
    createdAtLabel: '15/05/2024 10:35',
  }),
  'NV-2024-0035': Object.freeze({
    client: 'Comercial Sur Ltda.',
    rut: '79.221.332-4',
    productType: 'Lanyard',
    quantity: 300,
    issueDate: '21/05/2024',
    createdAtLabel: '21/05/2024 09:15',
  }),
})

export const DEFAULT_ORDER_DRAFT = Object.freeze({
  salesNoteCode: '',
  salesNotePdf: null,
  designFiles: Object.freeze([]),
  comments: '',
  managerRecord: null,
})


export function buildRegisteredOrder(draft) {
  const now = new Date()
  const record = draft.managerRecord || {}
  const generatedId = `PED-${String(now.getTime()).slice(-5)}`

  return {
    id: generatedId,
    salesNoteCode: draft.salesNoteCode.trim(),
    client: record.client || 'Cliente no importado',
    rut: record.rut || '—',
    productType: record.productType || '—',
    quantity: record.quantity || '—',
    issueDate: record.issueDate || now.toLocaleDateString('es-CL'),
    orderStatus: ORDER_PROCESS_STATUS.CONFIRMACION_PAGO,
    paymentStatus: ORDER_PAYMENT_STATUS.PENDIENTE,
    salesNotePdf: draft.salesNotePdf
      ? {
          name: draft.salesNotePdf.name,
          type: 'PDF',
          sizeLabel: `${Math.max(draft.salesNotePdf.size / 1024, 1).toFixed(0)} KB`,
          uploadedAt: now.toLocaleString('es-CL'),
        }
      : null,
    designFiles: draft.designFiles.map((file, index) => ({
      id: `${file.name}-${index}`,
      name: file.name,
      type: file.name.split('.').pop()?.toUpperCase() || 'Archivo',
      sizeLabel: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      uploadedAt: now.toLocaleString('es-CL'),
    })),
    comments: draft.comments,
    createdBy: 'Usuario Auditoría',
    createdAt: now.toLocaleString('es-CL'),
    updatedAt: now.toLocaleString('es-CL'),
    channel: 'Web App',
    assignedTo: '—',
  }
}
