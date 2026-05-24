import { useState, useCallback } from 'react'
import { formatDateTimeDDMMYYYY, formatRut } from '@/utils/formatters'
import { ACTION_STATUS, ORDER_STATUS_OPTIONS, PAYMENT_STATUS } from '@/config/status'
import { downloadNVPDF } from '@/utils/fileUtils'
import PaymentStatusBadge from '../components/PaymentStatusBadge'
import PaymentStatusSelect from '../components/PaymentStatusSelect'
import styles from './PaymentConfirmationPage.module.css'

/* ────────────────────────────────────────────────
  Ordenes de ejemplo para la vista de confirmación de pago.
  En un caso real, estos datos vendrían de una consulta a la
  base de datos o una API. Aquí se incluyen campos relevantes
  para mostrar en la tabla y probar las funcionalidades de RF27,
  RF28, RF29, y RF25 (observaciones).
   ──────────────────────────────────────────────── */
const MOCK_ORDERS = [
  {
    id: 1,
    nvNumber: 'NV-2024-0014',
    companyName: 'Empresa Retail Chile Limitada',
    rut: '78.123.456-7',
    productDescription: 'Lanyard corporativo con logo bordado',
    quantity: 200,
    manufacturingData: 'Bordado satinado 10mm – Azul corporativo',
    productType: 'Lanyard',
    nvFileName: 'nv_2024_0014.pdf',
    nvFilePath: null,
    orderStatus: ACTION_STATUS.SOLICITADO,
    paymentStatus: PAYMENT_STATUS.PENDIENTE,
    observations: '',
    createdAt: new Date('2024-05-01T09:14:00'),
    updatedAt: null,
  },
  {
    id: 2,
    nvNumber: 'NV-2024-0021',
    companyName: 'Corredora de Seguros Andes',
    rut: '76.987.234-1',
    productDescription: 'Tarjeta de acceso PVC impresa ambos lados',
    quantity: 500,
    manufacturingData: 'Full color digital – 0.84mm – Logo B/N + QR',
    productType: 'Tarjeta',
    nvFileName: 'nv_2024_0021.pdf',
    nvFilePath: null,
    orderStatus: ACTION_STATUS.SOLICITADO,
    paymentStatus: PAYMENT_STATUS.PENDIENTE,
    observations: 'Cliente requiere entrega antes del 20 de mayo',
    createdAt: new Date('2024-05-03T11:42:00'),
    updatedAt: null,
  },
  {
    id: 3,
    nvNumber: 'NV-2024-0008',
    companyName: 'Grupo Logístico del Sur',
    rut: '85.432.198-5',
    productDescription: 'Lanyard de seguridad con broche metálico',
    quantity: 450,
    manufacturingData: 'Tejido plano – Rojo / blanco ref. seguridad',
    productType: 'Lanyard',
    nvFileName: 'nv_2024_0008.pdf',
    nvFilePath: null,
    orderStatus: ACTION_STATUS.LISTO_PRODUCCION,
    paymentStatus: PAYMENT_STATUS.PENDIENTE,
    observations: '',
    createdAt: new Date('2024-04-28T08:00:00'),
    updatedAt: null,
  },
  {
    id: 4,
    nvNumber: 'NV-2024-0030',
    companyName: 'Tecnología Educativa S.A.',
    rut: '96.111.223-9',
    productDescription: 'Set mixto: 50 tarjetas + 50 lanyards',
    quantity: 50,
    manufacturingData: 'Tarjeta PVC 0.84mm + Lanyard satin 15mm – Dorado',
    productType: 'Lanyard',
    nvFileName: 'nv_2024_0030.pdf',
    nvFilePath: null,
    orderStatus: ACTION_STATUS.LISTO_PRODUCCION,
    paymentStatus: PAYMENT_STATUS.CONFIRMADO,
    observations: 'Confirmado por cobranzas 12-05-2026 14:30',
    createdAt: new Date('2024-04-25T07:55:00'),
    updatedAt: new Date('2024-05-12T14:30:00'),
  },
]


function buildSignature(orderId, paymentStatus) {
  if (paymentStatus !== PAYMENT_STATUS.CONFIRMADO) return null
  return {
    timestamp: formatDateTimeDDMMYYYY(new Date()),
    userId: `USR-${String(orderId).padStart(4, '0')}`,
    note: 'Firma digital aplicada (RF27)',
  }
}


export default function PaymentConfirmationPage() {
  const [orders, setOrders] = useState(MOCK_ORDERS)
  const [editingStatus, setEditingStatus] = useState({})
  const [editingOrderStatus, setEditingOrderStatus] = useState({})
  const [editingObs, setEditingObs] = useState({})
  const [editingObsDraft, setEditingObsDraft] = useState({})

  const handleUpdatePaymentStatus = useCallback((orderId, newStatus) => {
    const sig = buildSignature(orderId, newStatus)

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o
        const updated = {
          ...o,
          paymentStatus: newStatus,
          updatedAt: new Date(),
        }

        if (newStatus === PAYMENT_STATUS.CONFIRMADO) {
          updated.orderStatus = ACTION_STATUS.LISTO_PRODUCCION
        }
        if (sig) {
          updated.signature = sig 
        }
        return updated
      }),
    )
    setEditingStatus((p) => ({ ...p, [orderId]: false }))
  }, [])

  const handleUpdateOrderStatus = useCallback((orderId, newStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, orderStatus: newStatus } : o)),
    )
    setEditingOrderStatus((p) => ({ ...p, [orderId]: false }))
  }, [])

  const handleEditObs = useCallback((orderId) => {
    const order = orders.find((o) => o.id === orderId)
    if (order) setEditingObsDraft((p) => ({ ...p, [orderId]: order.observations }))
    setEditingObs((p) => ({ ...p, [orderId]: true }))
  }, [orders])

  const handleSaveObs = useCallback(
    (orderId) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, observations: editingObsDraft[orderId] || '', updatedAt: new Date() }
            : o,
        ),
      )
      setEditingObs((p) => ({ ...p, [orderId]: false }))
    },
    [editingObsDraft],
  )

  const handleCancelObs = useCallback((orderId) => {
    setEditingObs((p) => ({ ...p, [orderId]: false }))
  }, [])

  const handleDownloadNV = useCallback(
    async (order) => {
      try {
        await downloadNVPDF(order.nvNumber)
      } catch (err) {
        console.error('Error downloading NV PDF:', err)
      }
    },
    [],
  )

  return (
    <div className={styles.page}>
      {/* ═══════════════ Header de la pagina ═══════════════
          RF27: Botón en el pedido — acción "Confirmación de Pago"
          que redirige a esta vista. En el Kanban el botón aparece
          debajo de cada tarjeta; aquí la vista ya está abierta.   */}
      <div className={styles.header}>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <h1 className={styles.pageTitle}>Confirmación de Pago</h1>
            <p className={styles.pageSubtitle}>
              Actualiza el estado de pago aplicando la firma digital al <em>Confirmar</em>
            </p>
          </div>
          <span className="badge bg-light text-dark border fs-6">
            <i className="bi bi-person-badge me-1" />
            Rol: Cobranzas
          </span>
        </div>
      </div>

      {/* ═══════════════ Tabla de órdenes ═══════════════ */}
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead>
            <tr>
              {/*En esta parte se aplica 7 tablas de datos Donde aplica el numero de nota de venta, cliente, producto*/}
              <th className={styles.thNv}>N° Nota de Venta</th>
              <th className={styles.thCliente}>Cliente</th>
              <th className={styles.thProducto}>Producto / Cant.</th>
              <th className={styles.thFabri}>Datos de Fabricación</th>
              <th className={styles.thTipo}>Tipo Producto</th>
              <th className={styles.thNVArchivo}>NV · PDF</th>
              <th className={styles.thPago}>Estado Pago <i className="bi bi-info-circle text-muted" title="Efectúa la firma digital al confirmar" /></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                {/* 1 · Número NV */}
                <td className={styles.tdNv}>
                  <span className="fw-semibold">{order.nvNumber}</span>
                  <br />
                  <small className="text-muted d-block mt-1">
                    <i className="bi bi-calendar3 me-1" />
                    {formatDateTimeDDMMYYYY(order.createdAt)}
                  </small>
                </td>

                {/* 2 · Razón Social + RUT */}
                <td className={styles.tdCliente}>
                  <span className="fw-medium">{order.companyName}</span>
                  <br />
                  <small className="text-muted d-block mt-1">
                    RUT: {formatRut(order.rut)}
                  </small>
                </td>

                {/* 3 · Descripción Producto + Cantidad */}
                <td className={styles.tdProducto}>
                  <span>{order.productDescription}</span>
                  <span className={`badge bg-light text-dark border ms-2 ${styles.qtyBadge}`}>
                    × {order.quantity}
                  </span>
                </td>

                {/* 4 · Datos de Fabricación */}
                <td className={styles.tdFabri}>
                  <span className="d-block" style={{ maxWidth: '220px' }}>
                    {order.manufacturingData}
                  </span>
                </td>

                {/* 5 · Tipo Producto */}
                <td className={styles.tdTipo}>
                  <span
                    className={`badge ${order.productType === 'Lanyard' ? 'bg-primary' : 'bg-purple text-white'}`}
                    style={order.productType === 'Tarjeta' ? { background: '#7c3aed' } : {}}
                  >
                    {order.productType}
                  </span>
                </td>

                {/* 6 · NV descargar el pdf del archivo */}
                <td className={styles.tdNVArchivo}>
                  {order.nvFileName ? (
                    <button
                      className={`btn btn-outline-secondary btn-sm ${styles.downloadBtn}`}
                      onClick={() => handleDownloadNV(order)}
                      type="button"
                      title="Descargar Nota de Venta PDF"
                    >
                      <i className={`bi ${order.nvFilePath ? 'bi-file-earmark-pdf' : 'bi-file-earmark'} me-1`} />
                      {order.nvFileName}
                    </button>
                  ) : (
                    <span className="text-muted small">
                      <i className="bi bi-paperclip me-1" />
                      Sin archivo
                    </span>
                  )}
                </td>

                {/* 7 · Estado de Pago + acción de actualización (RF27) */}
                <td className={styles.tdPago}>
                  {editingStatus[order.id] ? (
                    <PaymentStatusSelect
                      value={order.paymentStatus}
                      onChange={(e) => handleUpdatePaymentStatus(order.id, e.target.value)}
                      id={`pay-sel-${order.id}`}
                      name={`pay-sel-${order.id}`}
                    />
                  ) : (
                    /* RF27: al actualizar a Confirmado */
                    <button
                      className={`btn btn-sm w-100 ${styles.paymentActionBtn}`}
                      onClick={() => setEditingStatus((p) => ({ ...p, [order.id]: true }))}
                      title="Actualizar estado de pago"
                      type="button"
                    >
                      <PaymentStatusBadge label={order.paymentStatus} />
                      <i className="bi bi-pencil ms-2 text-muted" />
                    </button>
                  )}

                  {/* Firmas digitales registradas */}
                  {order.signature && (
                    <div className={styles.signatureBox} title="Firma digital registrada">
                      <i className="bi bi-pen-fill" /> {order.signature.timestamp}
                      <br />
                      <small>{order.signature.note} · {order.signature.userId}</small>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      
      <div className="card mb-4 mt-4">
        <div className="card-header">
          <h5 className="card-title mb-0">
            <i className="bi bi-chat-square-text me-2" />
            Observaciones de Pedido
          </h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            {orders.map((order) => (
              <div key={`obs-${order.id}`} className="col-md-6">
                <label
                  htmlFor={`obs-${order.id}`}
                  className="form-label fw-semibold"
                >
                  {order.nvNumber}
                </label>

                {editingObs[order.id] ? (
                  <div className="d-flex gap-2">
                    <textarea
                      id={`obs-${order.id}`}
                      className="form-control"
                      rows={2}
                      value={editingObsDraft[order.id] || ''}
                      onChange={(e) =>
                        setEditingObsDraft((p) => ({
                          ...p,
                          [order.id]: e.target.value,
                        }))
                      }
                      placeholder="Ingrese observaciones del pedido…"
                    />
                    <div className="d-flex flex-column gap-1">
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleSaveObs(order.id)}
                        type="button"
                      >
                        <i className="bi bi-check" />
                      </button>
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => handleCancelObs(order.id)}
                        type="button"
                      >
                        <i className="bi bi-x" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`${styles.obsDisplay} form-control`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleEditObs(order.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') handleEditObs(order.id)
                    }}
                    title="Haga clic para editar"
                  >
                    {order.observations
                      ? order.observations
                      : <span className="text-muted fst-italic">Sin observaciones — clic para editar</span>}
                  </div>
                )}

                <small className="text-muted">
                  Última actualización:{' '}
                  {order.updatedAt
                    ? formatDateTimeDDMMYYYY(order.updatedAt)
                    : '—'}
                </small>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════ Chips de acciones disponibles por pedido ═══════════════ */}
      <div className="mt-4">
        <p className="text-muted small mb-2">
          <i className="bi bi-layers me-1" /> Acciones disponibles por pedido
        </p>
        <div className="d-flex flex-wrap gap-2">
          {orders.map((order) => (
            <div key={`chip-${order.id}`} className={`${styles.actionChip} border rounded-pill px-3 py-2`}>
              <strong>{order.nvNumber}</strong>
              <span className="mx-2 text-muted">·</span>

              {/* Botón de confirmar el pago */}
              {order.paymentStatus !== PAYMENT_STATUS.CONFIRMADO && (
                <button
                  className={`btn btn-sm ${styles.chipBtn} btn-outline-success me-1`}
                  onClick={() => handleUpdatePaymentStatus(order.id, PAYMENT_STATUS.CONFIRMADO)}
                  type="button"
                  title="Confirmar pago + firma digital"
                >
                  <i className="bi bi-check-circle" />
                </button>
              )}
              {order.paymentStatus === PAYMENT_STATUS.CONFIRMADO && (
                <span className="badge bg-success me-1">
                  <i className="bi bi-check-circle me-1" />
                  Pagado
                </span>
              )}

              {/* Cambiar estado pedido */}
              <button
                className={`btn btn-sm ${styles.chipBtn} btn-link p-0 me-1`}
                onClick={() =>
                  setEditingOrderStatus((p) => ({
                    ...p,
                    [order.id]: !p[order.id],
                  }))
                }
                type="button"
                title={editingOrderStatus[order.id] ? 'Cerrar' : 'Editar estado pedido'}
              >
                <i className={`bi ${editingOrderStatus[order.id] ? 'bi-chevron-up' : 'bi-sliders'}`} />
              </button>

              {editingOrderStatus[order.id] && (
                <div className={styles.chipDropdown}>
                  <small className="text-muted">Estado pedido:</small>
                  <select
                    className="form-select form-select-sm"
                    value={order.orderStatus}
                    onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                  >
                    {ORDER_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <span className="mx-2 text-muted">|</span>
              <PaymentStatusBadge status={order.paymentStatus} />
              <span className="mx-1 text-muted">/</span>
              <StatusBadgeRaw status={order.orderStatus} />

              {/* NV PDF download action chip */}
              <button
                className={`btn btn-sm ${styles.chipBtn} btn-link px-0`}
                onClick={() => handleDownloadNV(order)}
                type="button"
                title="Descargar NV PDF"
              >
                <i className="bi bi-file-earmark-arrow-down text-danger" />
                <span className="small ms-1">NV</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


function StatusBadgeRaw({ status }) {
  const badgeClass = (() => {
    const s = status.toLowerCase()
    if (s.includes('listo')) return 'bg-info text-dark'
    if (s.includes('progreso')) return 'bg-primary text-white'
    return 'bg-warning text-dark'
  })()
  return <span className={`badge ${badgeClass} ${styles.badge}`}>{status}</span>
}
