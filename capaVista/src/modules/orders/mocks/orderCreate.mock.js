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
