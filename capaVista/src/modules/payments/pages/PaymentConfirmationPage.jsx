import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PERMISSIONS } from '@/config/permissions'
import { PAYMENT_STATUS } from '@/config/status'
import { useAuth } from '@/hooks/useAuth'
import PaymentActionConfirmModal from '../components/PaymentActionConfirmModal'
import PaymentFilters from '../components/PaymentFilters'
import PaymentOrderMobileList from '../components/PaymentOrderMobileList'
import PaymentOrdersTable from '../components/PaymentOrdersTable'
import PaymentSummaryCards from '../components/PaymentSummaryCards'
import SalesNotePreviewModal from '../components/SalesNotePreviewModal'
import { usePaymentsApi } from '../hooks/usePaymentsApi'
import {
  getPaymentStatusIdByName,
  normalizePaymentOrder,
  normalizePaymentOrders,
} from '../utils/paymentOrders'
import {
  PREVIEW_CONTEXT,
  formatPaymentDateTime,
  getPdfAsset,
  openPdfForDownload,
  printPdf,
} from '../utils/paymentDocuments'
import styles from './PaymentConfirmationPage.module.css'

const HOLD_CONFIRM_MS = 2000
const FILTERS = [
  { key: 'TODOS', label: 'Todos' },
  { key: PAYMENT_STATUS.PENDIENTE, label: 'Pendientes' },
  { key: PAYMENT_STATUS.RECHAZADO, label: 'Rechazados' },
  { key: PAYMENT_STATUS.CONFIRMADO, label: 'Confirmados' },
]

export default function PaymentConfirmationPage() {
  const { hasPermission } = useAuth()
  const paymentsApi = usePaymentsApi()
  const holdTimerRef = useRef(null)
  // Mock historico/fallback dev: createMockPaymentOrders() documenta el shape
  // esperado por esta vista. No usar como fuente productiva.
  const [orders, setOrders] = useState([])
  const [paymentStatuses, setPaymentStatuses] = useState([])
  const [activeFilter, setActiveFilter] = useState('TODOS')
  const [editingStatus, setEditingStatus] = useState({})
  const [pendingTransition, setPendingTransition] = useState(null)
  const [previewState, setPreviewState] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [updateError, setUpdateError] = useState(null)
  const [isUpdatingPaymentStatus, setIsUpdatingPaymentStatus] = useState(false)
  const [isHoldingConfirmation, setIsHoldingConfirmation] = useState(false)
  const canUpdatePaymentStatus = hasPermission(PERMISSIONS.UPDATE_PAYMENT_STATUS)

  const clearHoldTimer = useCallback(() => {
    if (!holdTimerRef.current) return

    window.clearTimeout(holdTimerRef.current)
    holdTimerRef.current = null
  }, [])

  useEffect(() => {
    return () => clearHoldTimer()
  }, [clearHoldTimer])

  useEffect(() => {
    if (canUpdatePaymentStatus) return

    const resetTimer = window.setTimeout(() => {
      clearHoldTimer()
      setEditingStatus({})
      setIsHoldingConfirmation(false)
      setPendingTransition(null)
    }, 0)

    return () => window.clearTimeout(resetTimer)
  }, [canUpdatePaymentStatus, clearHoldTimer])

  const loadPaymentData = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    setUpdateError(null)

    try {
      const [ordersResponse, statusesResponse] = await Promise.all([
        paymentsApi.getPaymentOrders(),
        paymentsApi.getPaymentStatuses(),
      ])

      setOrders(normalizePaymentOrders(ordersResponse))
      setPaymentStatuses(Array.isArray(statusesResponse) ? statusesResponse : [])
    } catch (error) {
      console.error('Error cargando pagos:', error)
      setOrders([])
      setPaymentStatuses([])
      setLoadError(
        error?.payload?.message ??
          'No fue posible cargar los pedidos de pago.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [paymentsApi])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      loadPaymentData()
    }, 0)

    return () => window.clearTimeout(loadTimer)
  }, [loadPaymentData])

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

  const handleUpdatePaymentStatus = useCallback(async (orderId, newStatus) => {
    if (!canUpdatePaymentStatus || isUpdatingPaymentStatus) return false

    const paymentStatusId = getPaymentStatusIdByName(paymentStatuses, newStatus)

    if (!paymentStatusId) {
      setUpdateError('No fue posible resolver el estado de pago seleccionado.')
      return false
    }

    setIsUpdatingPaymentStatus(true)
    setUpdateError(null)

    try {
      const updatedOrder = await paymentsApi.updatePaymentStatus(orderId, {
        paymentStatusId,
        observacion: `Cambio de estado a ${newStatus} desde modulo de pagos.`,
      })

      if (updatedOrder?.id_pedido !== undefined || updatedOrder?.id !== undefined) {
        const normalizedOrder = normalizePaymentOrder(updatedOrder)

        setOrders((prev) =>
          prev.map((order) =>
            order.id === normalizedOrder.id ? normalizedOrder : order,
          ),
        )
      } else {
        await loadPaymentData()
      }

      setEditingStatus((prev) => ({ ...prev, [orderId]: false }))
      return true
    } catch (error) {
      console.error('Error actualizando estado de pago:', error)
      setUpdateError(
        error?.payload?.message ??
          'No fue posible actualizar el estado de pago.',
      )
      return false
    } finally {
      setIsUpdatingPaymentStatus(false)
    }
  }, [
    canUpdatePaymentStatus,
    isUpdatingPaymentStatus,
    loadPaymentData,
    paymentStatuses,
    paymentsApi,
  ])

  const handleDownloadNV = useCallback(async (order, variant, options = {}) => {
    try {
      const pdfAsset = getPdfAsset(order, variant, options)

      if (pdfAsset.filePath) {
        openPdfForDownload(
          pdfAsset.filePath,
          pdfAsset.fileName || `${order.nvNumber}.pdf`,
        )
        return
      }

      return
    } catch (err) {
      console.error('Error downloading NV PDF:', err)
    }
  }, [])

  const handlePrintNV = useCallback((filePath) => {
    printPdf(filePath)
  }, [])

  const handleFilterChange = useCallback((filterKey) => {
    setActiveFilter(filterKey)
    setEditingStatus({})
  }, [])

  const handleSearchChange = useCallback((nextSearchTerm) => {
    setSearchTerm(nextSearchTerm)
    setEditingStatus({})
  }, [])

  const openPaymentEditor = useCallback((orderId) => {
    if (!canUpdatePaymentStatus || isUpdatingPaymentStatus) {
      setEditingStatus({})
      return
    }

    setEditingStatus((prev) => ({
      [orderId]: !prev[orderId],
    }))
  }, [canUpdatePaymentStatus, isUpdatingPaymentStatus])

  const closePaymentEditor = useCallback(() => {
    setEditingStatus({})
  }, [])

  const openPaymentActionConfirmation = useCallback((order, targetStatus) => {
    if (!canUpdatePaymentStatus || isUpdatingPaymentStatus) {
      setEditingStatus({})
      setPendingTransition(null)
      return
    }

    if (
      order.paymentStatus === PAYMENT_STATUS.CONFIRMADO &&
      targetStatus !== PAYMENT_STATUS.CONFIRMADO
    ) {
      setEditingStatus({})
      setPendingTransition(null)
      setUpdateError('El pago confirmado no puede modificarse.')
      return
    }

    if (order.paymentStatus === targetStatus) {
      setEditingStatus({})
      return
    }

    setPendingTransition({ order, targetStatus })
    setEditingStatus({})
  }, [canUpdatePaymentStatus, isUpdatingPaymentStatus])

  const closePaymentActionConfirmation = useCallback(() => {
    if (isUpdatingPaymentStatus) return

    clearHoldTimer()
    setIsHoldingConfirmation(false)
    setPendingTransition(null)
  }, [clearHoldTimer, isUpdatingPaymentStatus])

  const completePendingTransition = useCallback(async () => {
    if (!canUpdatePaymentStatus) {
      clearHoldTimer()
      setIsHoldingConfirmation(false)
      setPendingTransition(null)
      return
    }

    if (!pendingTransition) return

    const wasUpdated = await handleUpdatePaymentStatus(
      pendingTransition.order.id,
      pendingTransition.targetStatus,
    )

    clearHoldTimer()
    setIsHoldingConfirmation(false)

    if (wasUpdated) {
      setPendingTransition(null)
    }
  }, [
    canUpdatePaymentStatus,
    clearHoldTimer,
    handleUpdatePaymentStatus,
    pendingTransition,
  ])

  const startHoldConfirmation = useCallback(() => {
    if (!canUpdatePaymentStatus || isUpdatingPaymentStatus) return
    if (!pendingTransition || holdTimerRef.current) return

    setIsHoldingConfirmation(true)
    holdTimerRef.current = window.setTimeout(
      completePendingTransition,
      HOLD_CONFIRM_MS,
    )
  }, [
    canUpdatePaymentStatus,
    completePendingTransition,
    isUpdatingPaymentStatus,
    pendingTransition,
  ])

  const cancelHoldConfirmation = useCallback(() => {
    if (isUpdatingPaymentStatus) return

    clearHoldTimer()
    setIsHoldingConfirmation(false)
  }, [clearHoldTimer, isUpdatingPaymentStatus])

  const openOriginalPreview = useCallback((order) => {
    setPreviewState({ context: PREVIEW_CONTEXT.ORIGINAL, order })
  }, [])

  const openSignedDetailPreview = useCallback((order) => {
    if (!order?.isSigned || !order?.nvFilePath) return

    setPreviewState({ context: PREVIEW_CONTEXT.SIGNED_DETAIL, order })
  }, [])

  return (
    <main className={`container-fluid ${styles.page}`}>
      <section className={styles.dashboardShell}>
        <header
          className={`${styles.hero} d-flex flex-column flex-lg-row align-items-start align-items-lg-center justify-content-between gap-3`}
        >
          <div>
            <span className={styles.sectionLabel}>Cobranzas</span>
            <h1 className={styles.pageTitle}>Confirmacion de pago</h1>
          </div>
        </header>

        <PaymentSummaryCards counters={counters} />

        <PaymentFilters
          activeFilter={activeFilter}
          filters={FILTERS}
          getFilterCount={getFilterCount}
          onFilterChange={handleFilterChange}
          onSearchChange={handleSearchChange}
          searchTerm={searchTerm}
        />

        {loadError && (
          <div className={`alert alert-danger ${styles.stateMessage}`} role="alert">
            <span>{loadError}</span>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={loadPaymentData}
              type="button"
            >
              Reintentar
            </button>
          </div>
        )}

        {updateError && (
          <div className={`alert alert-warning ${styles.stateMessage}`} role="alert">
            {updateError}
          </div>
        )}

        {isLoading ? (
          <div className={styles.loadingState}>Cargando pedidos de pago...</div>
        ) : (
          <>
            <PaymentOrdersTable
              canUpdatePaymentStatus={canUpdatePaymentStatus}
              editingStatus={editingStatus}
              isUpdatingPaymentStatus={isUpdatingPaymentStatus}
              onCloseEditor={closePaymentEditor}
              onOpenSalesNote={openOriginalPreview}
              onSelectStatus={openPaymentActionConfirmation}
              onToggleEditor={openPaymentEditor}
              onViewSignedDetail={openSignedDetailPreview}
              orders={filteredOrders}
            />

            <PaymentOrderMobileList
              canUpdatePaymentStatus={canUpdatePaymentStatus}
              editingStatus={editingStatus}
              isUpdatingPaymentStatus={isUpdatingPaymentStatus}
              onCloseEditor={closePaymentEditor}
              onOpenSalesNote={openOriginalPreview}
              onSelectStatus={openPaymentActionConfirmation}
              onToggleEditor={openPaymentEditor}
              onViewSignedDetail={openSignedDetailPreview}
              orders={filteredOrders}
            />
          </>
        )}
      </section>

      <SalesNotePreviewModal
        context={previewState?.context}
        key={`${previewState?.context || 'closed'}-${previewState?.order?.id || 'none'}`}
        onClose={() => setPreviewState(null)}
        onDownload={handleDownloadNV}
        onPrint={handlePrintNV}
        order={previewState?.order}
      />

      <PaymentActionConfirmModal
        isHolding={isHoldingConfirmation}
        isUpdating={isUpdatingPaymentStatus}
        paymentsApi={paymentsApi}
        onCancel={closePaymentActionConfirmation}
        onHoldEnd={cancelHoldConfirmation}
        onHoldStart={startHoldConfirmation}
        order={pendingTransition?.order}
        targetStatus={pendingTransition?.targetStatus}
      />
    </main>
  )
}
