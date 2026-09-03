export const ORDER_FLOW_STEPS = Object.freeze([
  {
    id: 1,
    title: 'Nota de Venta',
    subtitle: 'Ingrese la informacion principal',
  },
  {
    id: 2,
    title: 'Archivos de Diseno',
    subtitle: 'Adjunte archivos opcionales',
  },
  {
    id: 3,
    title: 'Revision y Registro',
    subtitle: 'Revise y registre el pedido',
  },
])

export const DEFAULT_ORDER_DRAFT = Object.freeze({
  salesNoteCode: '',
  comments: '',
  managerRecord: null,
  priority: null,
})
