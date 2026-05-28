import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ACTION_STATUS, PAYMENT_STATUS } from '@/config/status'
import { downloadNVPDF } from '@/utils/fileUtils'
import styles from './PaymentConfirmationPage.module.css'

const HOLD_CONFIRM_MS = 2000
const VALID_PAYMENT_STATUSES = Object.values(PAYMENT_STATUS)

const FILTERS = [
  { key: 'TODOS', label: 'Todos' },
  { key: PAYMENT_STATUS.PENDIENTE, label: 'Pendientes' },
  { key: PAYMENT_STATUS.RECHAZADO, label: 'Rechazados' },
  { key: PAYMENT_STATUS.CONFIRMADO, label: 'Confirmados' },
]

const MOCK_ORDERS = [
  {
    id: 1,
    nvNumber: 'NV-2024-0014',
    companyName: 'Empresa Retail Chile Limitada',
    rut: '76.543.210-1',
    productDescription: 'Lanyard corporativo con logo bordado',
    quantity: 200,
    manufacturingData: 'Bordado satinado 10mm – Azul corporativo',
    productType: 'Lanyard',
    nvFileName: 'nv_2024_0014.pdf',
    nvFilePath: null,
    orderStatus: ACTION_STATUS.SOLICITADO,
    paymentStatus: PAYMENT_STATUS.RECHAZADO,
    createdAt: new Date('2024-05-01T06:14:00'),
    updatedAt: null,
  },
  {
    id: 2,
    nvNumber: 'NV-2024-0021',
    companyName: 'Corredora de Seguros Andes',
    rut: '96.123.456-7',
    productDescription: 'Tarjeta de acceso PVC impresa ambos lados',
    quantity: 500,
    manufacturingData: 'Full color digital – 0.84mm – Logo B/N + QR',
    productType: 'Tarjeta',
    nvFileName: 'nv_2024_0021.pdf',
    nvFilePath: null,
    orderStatus: ACTION_STATUS.SOLICITADO,
    paymentStatus: PAYMENT_STATUS.PENDIENTE,
    createdAt: new Date('2024-05-03T11:42:00'),
    updatedAt: null,
  },
  {
    id: 3,
    nvNumber: 'NV-2024-0008',
    companyName: 'Grupo Logístico del Sur',
    rut: '77.987.654-3',
    productDescription: 'Lanyard de seguridad con broche metálico',
    quantity: 450,
    manufacturingData: 'Tejido plano – Rojo / blanco ref. seguridad',
    productType: 'Lanyard',
    nvFileName: 'nv_2024_0008.pdf',
    nvFilePath: null,
    orderStatus: ACTION_STATUS.SOLICITADO,
    paymentStatus: PAYMENT_STATUS.PENDIENTE,
    createdAt: new Date('2024-04-28T08:00:00'),
    updatedAt: null,
  },
  {
    id: 4,
    nvNumber: 'NV-2024-0039',
    companyName: 'Tecnología Educativa S.A.',
    rut: '78.654.321-0',
    productDescription: 'Set mixto: 50 tarjetas + 50 lanyards',
    quantity: 50,
    manufacturingData: 'Tarjeta PVC 0.84mm + Lanyard satin 15mm – Dorado',
    productType: 'Lanyard',
    nvFileName: 'nv_2024_0039.pdf',
    nvFilePath: null,
    orderStatus: ACTION_STATUS.LISTO_PRODUCCION,
    paymentStatus: PAYMENT_STATUS.CONFIRMADO,
    createdAt: new Date('2024-04-25T07:55:00'),
    updatedAt: new Date('2024-05-12T14:30:00'),
  },
]

function formatPaymentDateTime(value) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const displayHour = String(hours % 12 || 12).padStart(2, '0')
  const meridiem = hours < 12 ? 'a. m.' : 'p. m.'

  return `${day}-${month}-${year}, ${displayHour}:${minutes} ${meridiem}`
}

function buildSignature(orderId, paymentStatus) {
  if (paymentStatus !== PAYMENT_STATUS.CONFIRMADO) return null

  return {
    timestamp: formatPaymentDateTime(new Date()),
    userId: `USR-${String(orderId).padStart(4, '0')}`,
    note: 'Firma digital aplicada (RF27)',
  }
}

function getPaymentActionMeta(targetStatus) {
  if (targetStatus === PAYMENT_STATUS.CONFIRMADO) {
    return {
      icon: 'bi-check-circle',
      modalTitle: 'Confirmar pago',
      question: '¿Quieres confirmar el pago de esta nota de venta?',
      statusLabel: PAYMENT_STATUS.CONFIRMADO,
      holdLabel: 'Mantener para confirmar cambio',
      completedLabel: 'Confirmando cambio...',
    }
  }

  if (targetStatus === PAYMENT_STATUS.RECHAZADO) {
    return {
      icon: 'bi-x-circle',
      modalTitle: 'Rechazar pago',
      question: '¿Quieres rechazar el pago de esta nota de venta?',
      statusLabel: PAYMENT_STATUS.RECHAZADO,
      holdLabel: 'Mantener para confirmar cambio',
      completedLabel: 'Confirmando cambio...',
    }
  }

  return {
    icon: 'bi-arrow-counterclockwise',
    modalTitle: 'Marcar como pendiente',
    question: '¿Quieres marcar este pago como pendiente?',
    statusLabel: PAYMENT_STATUS.PENDIENTE,
    holdLabel: 'Mantener para confirmar cambio',
    completedLabel: 'Confirmando cambio...',
  }
}

/*
  TODO equipo:
  Este modal de vista previa de Nota de Venta queda temporalmente dentro de
  PaymentConfirmationPage.jsx para mantener el cambio concentrado en payments.

  Según la arquitectura modular del stack, cuando el equipo apruebe reutilizarlo
  debería moverse a:
  src/modules/payments/components/SalesNotePreviewModal.jsx
*/
function SalesNotePreviewDialog({ order, onClose, onDownload }) {
  if (!order) return null

  return (
    <div
      className={`${styles.salesNoteModalBackdrop} d-flex align-items-center justify-content-center position-fixed`}
      onMouseDown={onClose}
      role="presentation"
    >
      <section
        aria-labelledby="sales-note-preview-title"
        aria-modal="true"
        className={`${styles.salesNoteModalDialog} bg-white overflow-auto w-100`}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header
          className={`${styles.salesNoteModalHeader} d-flex align-items-start justify-content-between`}
        >
          <div>
            <span className={styles.salesNoteModalKicker}>Nota de Venta</span>
            <h2 id="sales-note-preview-title">Vista previa</h2>
          </div>

          <button
            aria-label="Cerrar vista previa"
            className={styles.salesNoteModalCloseButton}
            onClick={onClose}
            type="button"
          >
            <i className="bi bi-x-lg" />
          </button>
        </header>

        <div className={styles.salesNoteModalPreview}>
          <div className={`${styles.salesNoteModalPreviewTop} d-grid`}>
            <div>
              <span>N° Nota de Venta</span>
              <strong>{order.nvNumber}</strong>
            </div>

            <div>
              <span>Archivo asociado</span>
              <strong>{order.nvFileName || 'Sin archivo'}</strong>
            </div>
          </div>

          <div className={`${styles.salesNoteModalPreviewBody} d-grid`}>
            <div>
              <span>Fecha</span>
              <p>{formatPaymentDateTime(order.createdAt)}</p>
            </div>

            <div>
              <span>Cliente</span>
              <p>{order.companyName}</p>
            </div>

            <div>
              <span>RUT</span>
              <p>{order.rut}</p>
            </div>

            <div>
              <span>Estado de pago</span>
              <p>{order.paymentStatus}</p>
            </div>

            <div className={styles.salesNoteModalFullRow}>
              <span>Producto</span>
              <p>{order.productDescription}</p>
            </div>

            <div className={styles.salesNoteModalFullRow}>
              <span>Datos de fabricación</span>
              <p>{order.manufacturingData}</p>
            </div>
          </div>
        </div>

        <footer
          className={`${styles.salesNoteModalFooter} d-flex gap-3 justify-content-end`}
        >
          <button
            className="btn btn-outline-secondary"
            onClick={onClose}
            type="button"
          >
            Cerrar
          </button>

          <button
            className="btn btn-dark"
            disabled={!order.nvFileName}
            onClick={() => onDownload(order)}
            type="button"
          >
            <i className="bi bi-file-earmark-arrow-down me-1" />
            Descargar PDF
          </button>
        </footer>
      </section>
    </div>
  )
}

/*
  TODO equipo:
  Este modal de confirmación segura queda temporalmente dentro de esta página
  para validar el flujo con Cobranzas. Si se reutiliza, conviene moverlo a
  shared/components/feedback/HoldConfirmModal.jsx o a payments/components/.
*/
function PaymentActionConfirmDialog({
  isHolding,
  onCancel,
  onHoldEnd,
  onHoldStart,
  order,
  targetStatus,
}) {
  if (!order || !targetStatus) return null

  const actionMeta = getPaymentActionMeta(targetStatus)

  return (
    <div
      className={`${styles.confirmModalBackdrop} d-flex align-items-center justify-content-center position-fixed`}
      onMouseDown={onCancel}
      role="presentation"
    >
      <section
        aria-labelledby="payment-action-confirm-title"
        aria-modal="true"
        className={`${styles.confirmModalDialog} bg-white overflow-auto w-100`}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header
          className={`${styles.confirmModalHeader} d-flex align-items-start justify-content-between`}
        >
          <div>
            <span className={styles.confirmModalKicker}>Cambio de estado</span>
            <h2 id="payment-action-confirm-title">{actionMeta.modalTitle}</h2>
          </div>

          <button
            aria-label="Cancelar cambio de estado"
            className={styles.confirmModalCloseButton}
            onClick={onCancel}
            type="button"
          >
            <i className="bi bi-x-lg" />
          </button>
        </header>

        <div className={styles.confirmModalBody}>
          <div className={styles.confirmModalQuestion}>
            <i className={`bi ${actionMeta.icon}`} />
            <div>
              <p>{actionMeta.question}</p>
              <small>
                Esta acción requiere confirmación sostenida para prevenir cambios
                accidentales.
              </small>
            </div>
          </div>

          <div className={`${styles.confirmModalDetailGrid} d-grid`}>
            <div>
              <span>N° Nota de Venta</span>
              <strong>{order.nvNumber}</strong>
            </div>

            <div>
              <span>Cliente</span>
              <strong>{order.companyName}</strong>
            </div>

            <div>
              <span>RUT</span>
              <strong>{order.rut}</strong>
            </div>

            <div>
              <span>Nuevo estado</span>
              <strong>{actionMeta.statusLabel}</strong>
            </div>
          </div>
        </div>

        <footer
          className={`${styles.confirmModalFooter} d-flex gap-3 justify-content-end`}
        >
          <button
            className="btn btn-outline-secondary"
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>

          <button
            className={`${styles.holdConfirmButton} ${
              isHolding ? styles.holdConfirmButtonHolding : ''
            }`}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onHoldStart()
              }
            }}
            onKeyUp={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onHoldEnd()
              }
            }}
            onPointerCancel={onHoldEnd}
            onPointerDown={onHoldStart}
            onPointerLeave={onHoldEnd}
            onPointerUp={onHoldEnd}
            type="button"
          >
            <span>{isHolding ? actionMeta.completedLabel : actionMeta.holdLabel}</span>
          </button>
        </footer>
      </section>
    </div>
  )
}

export default function PaymentConfirmationPage() {
  const holdTimerRef = useRef(null)
  const [orders, setOrders] = useState(MOCK_ORDERS)
  const [activeFilter, setActiveFilter] = useState('TODOS')
  const [editingStatus, setEditingStatus] = useState({})
  const [pendingTransition, setPendingTransition] = useState(null)
  const [previewOrder, setPreviewOrder] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isHoldingConfirmation, setIsHoldingConfirmation] = useState(false)

  const clearHoldTimer = useCallback(() => {
    if (!holdTimerRef.current) return

    window.clearTimeout(holdTimerRef.current)
    holdTimerRef.current = null
  }, [])

  useEffect(() => {
    return () => clearHoldTimer()
  }, [clearHoldTimer])

  const counters = useMemo(() => {
    return {
      all: orders.length,
      pending: orders.filter(
        (order) => order.paymentStatus === PAYMENT_STATUS.PENDIENTE,
      ).length,
      rejected: orders.filter(
        (order) => order.paymentStatus === PAYMENT_STATUS.RECHAZADO,
      ).length,
      confirmed: orders.filter(
        (order) => order.paymentStatus === PAYMENT_STATUS.CONFIRMADO,
      ).length,
    }
  }, [orders])

  const summaryCards = useMemo(
    () => [
      {
        key: 'pending',
        label: 'Pendientes',
        count: counters.pending,
        icon: 'bi-clock',
        iconClassName: styles.summaryIconPending,
      },
      {
        key: 'rejected',
        label: 'Rechazados',
        count: counters.rejected,
        icon: 'bi-x',
        iconClassName: styles.summaryIconRejected,
      },
      {
        key: 'confirmed',
        label: 'Confirmados',
        count: counters.confirmed,
        icon: 'bi-check',
        iconClassName: styles.summaryIconConfirmed,
      },
    ],
    [counters],
  )

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return orders.filter((order) => {
      const matchesFilter =
        activeFilter === 'TODOS' || order.paymentStatus === activeFilter

      const searchableText = [
        order.nvNumber,
        order.companyName,
        order.rut,
        order.paymentStatus,
        formatPaymentDateTime(order.createdAt),
      ]
        .join(' ')
        .toLowerCase()

      const matchesSearch =
        normalizedSearch.length === 0 || searchableText.includes(normalizedSearch)

      return matchesFilter && matchesSearch
    })
  }, [activeFilter, orders, searchTerm])

  const getFilterCount = useCallback(
    (filterKey) => {
      if (filterKey === 'TODOS') return counters.all
      if (filterKey === PAYMENT_STATUS.PENDIENTE) return counters.pending
      if (filterKey === PAYMENT_STATUS.RECHAZADO) return counters.rejected
      if (filterKey === PAYMENT_STATUS.CONFIRMADO) return counters.confirmed

      return 0
    },
    [counters],
  )

  const handleUpdatePaymentStatus = useCallback((orderId, newStatus) => {
    if (!VALID_PAYMENT_STATUSES.includes(newStatus)) return

    const signature = buildSignature(orderId, newStatus)

    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order

        const updatedOrder = {
          ...order,
          paymentStatus: newStatus,
          updatedAt: new Date(),
        }

        if (newStatus === PAYMENT_STATUS.CONFIRMADO) {
          updatedOrder.orderStatus = ACTION_STATUS.LISTO_PRODUCCION
          updatedOrder.signature = signature
        }

        if (newStatus !== PAYMENT_STATUS.CONFIRMADO) {
          delete updatedOrder.signature
        }

        return updatedOrder
      }),
    )

    setEditingStatus((prev) => ({ ...prev, [orderId]: false }))
  }, [])

  const handleDownloadNV = useCallback(async (order) => {
    try {
      await downloadNVPDF(order.nvNumber)
    } catch (err) {
      console.error('Error downloading NV PDF:', err)
    }
  }, [])

  const handleFilterChange = useCallback((filterKey) => {
    setActiveFilter(filterKey)
    setEditingStatus({})
  }, [])

  const openPaymentEditor = useCallback((orderId) => {
    setEditingStatus((prev) => ({
      [orderId]: !prev[orderId],
    }))
  }, [])

  const openPaymentActionConfirmation = useCallback((order, targetStatus) => {
    if (order.paymentStatus === targetStatus) {
      setEditingStatus({})
      return
    }

    setPendingTransition({ order, targetStatus })
    setEditingStatus({})
  }, [])

  const closePaymentActionConfirmation = useCallback(() => {
    clearHoldTimer()
    setIsHoldingConfirmation(false)
    setPendingTransition(null)
  }, [clearHoldTimer])

  const completePendingTransition = useCallback(() => {
    if (!pendingTransition) return

    handleUpdatePaymentStatus(
      pendingTransition.order.id,
      pendingTransition.targetStatus,
    )

    clearHoldTimer()
    setIsHoldingConfirmation(false)
    setPendingTransition(null)
  }, [clearHoldTimer, handleUpdatePaymentStatus, pendingTransition])

  const startHoldConfirmation = useCallback(() => {
    if (!pendingTransition || holdTimerRef.current) return

    setIsHoldingConfirmation(true)
    holdTimerRef.current = window.setTimeout(
      completePendingTransition,
      HOLD_CONFIRM_MS,
    )
  }, [completePendingTransition, pendingTransition])

  const cancelHoldConfirmation = useCallback(() => {
    clearHoldTimer()
    setIsHoldingConfirmation(false)
  }, [clearHoldTimer])

  const renderPaymentStatusPill = (status) => {
    const statusClassByValue = {
      [PAYMENT_STATUS.PENDIENTE]: styles.statusPending,
      [PAYMENT_STATUS.RECHAZADO]: styles.statusRejected,
      [PAYMENT_STATUS.CONFIRMADO]: styles.statusConfirmed,
    }

    return (
      <span
        className={`${styles.paymentStatusPill} ${
          statusClassByValue[status] || styles.statusPending
        }`}
      >
        {status}
      </span>
    )
  }

  const renderSalesNoteButton = (order, isMobile = false) => (
    <button
      className={`${styles.salesNoteButton} ${isMobile ? 'w-100' : ''}`}
      onClick={() => setPreviewOrder(order)}
      title="Visualizar Nota de Venta"
      type="button"
    >
      <i className="bi bi-file-earmark-text" />
      Nota de venta
    </button>
  )

  const renderPaymentActionOption = (order, targetStatus, label, icon, className) => {
    if (order.paymentStatus === targetStatus) return null

    return (
      <button
        className={`${styles.actionDropdownOption} ${className}`}
        onClick={() => openPaymentActionConfirmation(order, targetStatus)}
        role="menuitem"
        type="button"
      >
        <i className={`bi ${icon}`} />
        <span>{label}</span>
      </button>
    )
  }

  const renderManageButton = (order, isMobile = false) => (
    <div className={styles.actionDropdownWrap}>
      <button
        aria-expanded={editingStatus[order.id] ? 'true' : 'false'}
        className={`${styles.actionButton} ${styles.actionButtonManage} ${
          isMobile ? 'w-100' : ''
        }`}
        onClick={() => openPaymentEditor(order.id)}
        type="button"
      >
        Gestionar
      </button>

      {editingStatus[order.id] && (
        <div
          aria-label="Acciones de pago"
          className={styles.paymentActionSelect}
          role="menu"
        >
          {renderPaymentActionOption(
            order,
            PAYMENT_STATUS.PENDIENTE,
            'Pendiente',
            'bi-clock',
            styles.actionDropdownOptionPending,
          )}

          {renderPaymentActionOption(
            order,
            PAYMENT_STATUS.CONFIRMADO,
            'Confirmar',
            'bi-check-circle',
            styles.actionDropdownOptionConfirm,
          )}

          {renderPaymentActionOption(
            order,
            PAYMENT_STATUS.RECHAZADO,
            'Rechazar',
            'bi-x-circle',
            styles.actionDropdownOptionReject,
          )}
        </div>
      )}
    </div>
  )
  const renderActionControl = (order, isMobile = false) => {
    const isConfirmed = order.paymentStatus === PAYMENT_STATUS.CONFIRMADO

    return (
      <div
        className={`${styles.actionControlsGroup} ${
          isMobile ? styles.actionControlsGroupMobile : ''
        }`}
      >
        {renderManageButton(order, isMobile)}

        {isConfirmed && (
          <button
            className={`${styles.actionButton} ${styles.actionButtonDetail} ${
              isMobile ? 'w-100' : ''
            }`}
            onClick={() => setPreviewOrder(order)}
            type="button"
          >
            Ver detalle
          </button>
        )}
      </div>
    )
  }

  return (
    <main className={`container-fluid ${styles.page}`}>
      <section className={styles.dashboardShell}>
        <header
          className={`${styles.hero} d-flex flex-column flex-lg-row align-items-start align-items-lg-center justify-content-between gap-3`}
        >
          <div>
            <span className={styles.sectionLabel}>Cobranzas</span>
            <h1 className={styles.pageTitle}>Confirmación de pago</h1>
          </div>

        </header>

        <section
          className={`row row-cols-1 row-cols-lg-3 g-2 ${styles.summaryGrid}`}
          aria-label="Resumen de pagos"
        >
          {summaryCards.map((card) => (
            <div className="col" key={card.key}>
              <article
                className={`${styles.summaryCard} d-flex align-items-center h-100`}
              >
                <i className={`bi ${card.icon} ${card.iconClassName}`} />
                <div>
                  <span>{card.label}</span>
                  <strong>{card.count}</strong>
                  <p>{card.note}</p>
                </div>
              </article>
            </div>
          ))}
        </section>

        <section
          className={`${styles.toolbar} d-flex flex-column flex-lg-row align-items-stretch align-items-lg-center justify-content-between gap-3`}
          aria-label="Filtros de pago"
        >
          <div className="d-flex flex-wrap gap-3 gap-xl-4">
            {FILTERS.map((filter) => (
              <button
                className={`${styles.filterButton} ${
                  activeFilter === filter.key ? styles.filterButtonActive : ''
                }`}
                key={filter.key}
                onClick={() => handleFilterChange(filter.key)}
                type="button"
              >
                {filter.label}
                <span className={styles.filterCount}>
                  {getFilterCount(filter.key)}
                </span>
              </button>
            ))}
          </div>

          <label
            className={`${styles.searchBox} d-flex align-items-center`}
            htmlFor="payment-search"
          >
            <span className="visually-hidden">Buscar pedido o cliente</span>
            <input
              id="payment-search"
              onChange={(event) => {
                setSearchTerm(event.target.value)
                setEditingStatus({})
              }}
              placeholder="Buscar..."
              type="search"
              value={searchTerm}
            />
            <i className="bi bi-search" />
          </label>
        </section>

        <section
          className={`d-none d-lg-block ${styles.desktopTableWrap}`}
          aria-label="Tabla de pagos"
        >
          <table className={`table table-hover align-middle mb-0 ${styles.paymentTable}`}>
            <colgroup>
              <col className={styles.colOrder} />
              <col className={styles.colDate} />
              <col className={styles.colClient} />
              <col className={styles.colRut} />
              <col className={styles.colSalesNote} />
              <col className={styles.colPaymentStatus} />
              <col className={styles.colActions} />
            </colgroup>

            <thead>
              <tr>
                <th>Pedido</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th className={styles.rutColumn}>RUT</th>
                <th>Ver Nota de Venta</th>
                <th>Estado pago</th>
                <th className={styles.actionsColumn}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td className={styles.orderCell}>{order.nvNumber}</td>
                    <td className={styles.dateCell}>
                      {formatPaymentDateTime(order.createdAt)}
                    </td>
                    <td className={styles.clientCell}>{order.companyName}</td>
                    <td className={styles.rutCell}>{order.rut}</td>
                    <td>{renderSalesNoteButton(order)}</td>
                    <td>{renderPaymentStatusPill(order.paymentStatus)}</td>
                    <td className={styles.actionsCell}>
                      {renderActionControl(order)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className={styles.emptyState} colSpan="7">
                    No hay pedidos que coincidan con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section
          className={`d-lg-none ${styles.mobileList}`}
          aria-label="Pedidos de pago"
        >
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <article className={styles.mobileCard} key={`mobile-${order.id}`}>
                <header
                  className={`${styles.mobileCardHeader} d-flex flex-column flex-sm-row align-items-start justify-content-between gap-3`}
                >
                  <div>
                    <span>Pedido</span>
                    <strong>{order.nvNumber}</strong>
                  </div>
                  {renderPaymentStatusPill(order.paymentStatus)}
                </header>

                <dl className={styles.mobileDataList}>
                  <div>
                    <dt>Fecha</dt>
                    <dd>{formatPaymentDateTime(order.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Cliente</dt>
                    <dd>{order.companyName}</dd>
                  </div>
                  <div>
                    <dt>RUT</dt>
                    <dd>{order.rut}</dd>
                  </div>
                </dl>

                <div className="d-grid gap-2 mt-3">
                  {renderSalesNoteButton(order, true)}
                  {renderActionControl(order, true)}
                </div>
              </article>
            ))
          ) : (
            <div className={styles.mobileCard}>
              No hay pedidos que coincidan con los filtros aplicados.
            </div>
          )}
        </section>
      </section>

      <SalesNotePreviewDialog
        onClose={() => setPreviewOrder(null)}
        onDownload={handleDownloadNV}
        order={previewOrder}
      />

      <PaymentActionConfirmDialog
        isHolding={isHoldingConfirmation}
        onCancel={closePaymentActionConfirmation}
        onHoldEnd={cancelHoldConfirmation}
        onHoldStart={startHoldConfirmation}
        order={pendingTransition?.order}
        targetStatus={pendingTransition?.targetStatus}
      />
    </main>
  )
}