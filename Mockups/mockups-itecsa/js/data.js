/* Datos embebidos para mockups estáticos ITECSA. No hay backend. */
window.ITECSA_DATA = {
  roles: ['Administrador', 'Ventas', 'Cobranzas', 'Operario', 'Gerencia'],
  messages: {
    duplicateNV: 'Ya existe una Nota de Venta con el código ingresado. No se permite duplicar.',
    paymentWait: 'Pedido en espera de confirmación de pago.',
    capacityAlert: 'La capacidad disponible para la fecha solicitada está sobre el 90%.',
    readyDelivery: 'El pedido cambió a Listo para entrega.',
    noPermission: 'No tienes permisos para acceder a este módulo.'
  },
  users: [
    { nombre: 'Dana Administradora', rol: 'Administrador', email: 'admin@itecsa.example', estado: 'Vinculado', rut: '20.111.111-1', firma: 'Firma electrónica Dana Administradora' },
    { nombre: 'Valentina Ventas', rol: 'Ventas', email: 'ventas@itecsa.example', estado: 'Vinculado', rut: '20.222.222-2', firma: 'Firma electrónica Valentina Ventas' },
    { nombre: 'Carlos Cobranzas', rol: 'Cobranzas', email: 'cobranzas@itecsa.example', estado: 'Vinculado', rut: '20.333.333-3', firma: 'Firma electrónica Carlos Cobranzas' },
    { nombre: 'Alonso Operario', rol: 'Operario', email: 'operario@itecsa.example', estado: 'Vinculado', rut: '20.444.444-4', firma: 'Firma electrónica Alonso Operario' },
    { nombre: 'Jaime Gerencia', rol: 'Gerencia', email: 'gerencia@itecsa.example', estado: 'Vinculado', rut: '20.555.555-5', firma: 'Firma electrónica Jaime Gerencia' }
  ],
  orders: [
    {
      nv: 'NV-2026-0148', op: 'OP-2026-0081', cliente: 'Municipalidad Norte', rut: '76.148.210-8', producto: 'Lanyard sublimado 20 mm', tipo: 'Lanyard', cantidad: 450, fecha: '18-05-2026', estado: 'En producción', etiqueta: 'Prioridad', responsable: 'Alonso Pérez', pago: 'Confirmado', vendedor: 'Valentina Ventas', atraso: 'Leve', fechaEstimada: '18-05-2026', fabricacion: 'Logo institucional a 4 colores, gancho metálico, cinta 20 mm.', documentos: { nvPdf: true, op: true, ficha: true, cobro: 'NV firmada digitalmente' }
    },
    {
      nv: 'NV-2026-0152', op: 'OP-2026-0084', cliente: 'Colegio Andino', rut: '76.152.330-4', producto: 'Tarjeta PVC personalizada', tipo: 'Tarjeta', cantidad: 300, fecha: '20-05-2026', estado: 'Listo para producción', etiqueta: 'Urgencia', responsable: 'Fabián Rojas', pago: 'Confirmado', vendedor: 'Valentina Ventas', atraso: 'Sin atraso', fechaEstimada: '20-05-2026', fabricacion: 'Tarjeta PVC con nombre, cargo, fotografía y código interno.', documentos: { nvPdf: true, op: true, ficha: false, cobro: 'NV firmada digitalmente' }
    },
    {
      nv: 'NV-2026-0155', op: 'OP pendiente', cliente: 'Clínica Central', rut: '76.155.009-2', producto: 'Lanyard sublimado 15 mm', tipo: 'Lanyard', cantidad: 120, fecha: '21-05-2026', estado: 'Confirmación de pago', etiqueta: 'Atraso', responsable: 'Cobranzas', pago: 'Pendiente', vendedor: 'Valentina Ventas', atraso: 'Crítico', fechaEstimada: '23-05-2026', fabricacion: 'Cinta 15 mm, diseño con patrón repetido y clip plástico.', documentos: { nvPdf: true, op: false, ficha: false, cobro: 'Documento de cobro pendiente' }
    },
    {
      nv: 'NV-2026-0160', op: 'OP-2026-0089', cliente: 'Banco Austral', rut: '76.160.800-1', producto: 'Tarjeta credencial', tipo: 'Tarjeta', cantidad: 800, fecha: '24-05-2026', estado: 'Listo para entrega', etiqueta: 'Sin etiqueta', responsable: 'Mati Silva', pago: 'Confirmado', vendedor: 'Valentina Ventas', atraso: 'Sin atraso', fechaEstimada: '24-05-2026', fabricacion: 'Credencial PVC, banda magnética simulada y diseño corporativo.', documentos: { nvPdf: true, op: true, ficha: true, cobro: 'NV firmada digitalmente' }
    },
    {
      nv: 'NV-2026-0164', op: 'OP-2026-0091', cliente: 'Universidad Pacífico', rut: '76.164.550-7', producto: 'Lanyard sublimado 25 mm', tipo: 'Lanyard', cantidad: 1000, fecha: '27-05-2026', estado: 'En producción', etiqueta: 'Urgencia, Atraso', responsable: 'Marcela Soto', pago: 'Confirmado', vendedor: 'Valentina Ventas', atraso: 'Crítico', fechaEstimada: '29-05-2026', fabricacion: 'Cinta 25 mm, impresión completa, costura reforzada.', documentos: { nvPdf: true, op: true, ficha: true, cobro: 'NV firmada digitalmente' }
    }
  ],
  capacity: [
    { dia: '18-05-2026', max: 1000, usada: 880, producto: 'Lanyard', disponible: 120 },
    { dia: '19-05-2026', max: 1000, usada: 930, producto: 'Lanyard', disponible: 70 },
    { dia: '20-05-2026', max: 900, usada: 620, producto: 'Tarjeta', disponible: 280 },
    { dia: '21-05-2026', max: 1000, usada: 910, producto: 'Lanyard', disponible: 90 },
    { dia: '22-05-2026', max: 900, usada: 300, producto: 'Tarjeta', disponible: 600 },
    { dia: '23-05-2026', max: 1000, usada: 950, producto: 'Lanyard', disponible: 50 },
    { dia: '24-05-2026', max: 900, usada: 800, producto: 'Tarjeta', disponible: 100 },
    { dia: '27-05-2026', max: 1000, usada: 980, producto: 'Lanyard', disponible: 20 }
  ],
  announcements: [
    { titulo: 'Revisión de prioridades semanales', texto: 'Se solicita revisar pedidos con etiqueta Urgencia antes del cierre diario.', autor: 'Dana Administradora', fecha: '09-05-2026', hora: '09:15:00' },
    { titulo: 'Actualización de capacidad', texto: 'La capacidad de lanyards fue ajustada para el bloque del 21-05-2026.', autor: 'Dana Administradora', fecha: '08-05-2026', hora: '17:40:00' }
  ],
  notifications: [
    { mensaje: 'Nuevo pedido creado', nv: 'NV-2026-0155', destinatario: 'Cobranzas', leida: false, fecha: '09-05-2026', hora: '08:30:00' },
    { mensaje: 'Pedido urgente', nv: 'NV-2026-0164', destinatario: 'Operario', leida: false, fecha: '09-05-2026', hora: '10:05:00' },
    { mensaje: 'El pedido cambió a Listo para entrega.', nv: 'NV-2026-0160', destinatario: 'Ventas', leida: true, fecha: '09-05-2026', hora: '11:20:00' }
  ],
  histories: {
    'NV-2026-0148': [
      { fecha: '09-05-2026', hora: '11:21:00', usuario: 'Alonso Operario', estado: 'En producción', accion: 'Subproceso Sublimación actualizado', comentario: 'Avance registrado con firma.' },
      { fecha: '09-05-2026', hora: '09:10:00', usuario: 'Dana Administradora', estado: 'Listo para producción', accion: 'OP y ficha cliente adjuntadas', comentario: 'Documentos completos.' },
      { fecha: '08-05-2026', hora: '16:25:00', usuario: 'Carlos Cobranzas', estado: 'Listo para producción', accion: 'Pago confirmado', comentario: 'Firmado digitalmente por Carlos Cobranzas' }
    ],
    'NV-2026-0152': [
      { fecha: '09-05-2026', hora: '10:45:00', usuario: 'Carlos Cobranzas', estado: 'Listo para producción', accion: 'Pago confirmado', comentario: 'Firmado digitalmente por Carlos Cobranzas' },
      { fecha: '09-05-2026', hora: '10:15:00', usuario: 'Valentina Ventas', estado: 'Confirmación de pago', accion: 'Pedido registrado', comentario: 'Datos importados desde Manager.' }
    ],
    'NV-2026-0155': [
      { fecha: '09-05-2026', hora: '08:30:00', usuario: 'Valentina Ventas', estado: 'Confirmación de pago', accion: 'Pedido registrado', comentario: 'Pendiente de confirmación de pago.' }
    ],
    'NV-2026-0160': [
      { fecha: '09-05-2026', hora: '11:20:00', usuario: 'Mati Silva', estado: 'Listo para entrega', accion: 'Pedido finalizado', comentario: 'El pedido cambió a Listo para entrega.' },
      { fecha: '09-05-2026', hora: '09:00:00', usuario: 'Alonso Operario', estado: 'En producción', accion: 'Subproceso Cargar datos completado', comentario: 'Ficha cliente firmada.' }
    ],
    'NV-2026-0164': [
      { fecha: '09-05-2026', hora: '12:05:00', usuario: 'Marcela Soto', estado: 'En producción', accion: 'Atraso informado', comentario: 'Pedido marcado con Urgencia y Atraso.' },
      { fecha: '09-05-2026', hora: '08:50:00', usuario: 'Dana Administradora', estado: 'Listo para producción', accion: 'OP y ficha cliente adjuntadas', comentario: 'Ingreso bajo sobrecarga operativa.' }
    ]
  }
};
