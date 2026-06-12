import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PERMISSIONS } from '@/config/permissions'
import { PAYMENT_STATUS } from '@/config/status'
import { useAuth } from '@/hooks/useAuth'
import { downloadNVPDF } from '@/utils/fileUtils'
import PaymentActionConfirmModal from '../components/PaymentActionConfirmModal'
import PaymentFilters from '../components/PaymentFilters'
import PaymentOrderMobileList from '../components/PaymentOrderMobileList'
import PaymentOrdersTable from '../components/PaymentOrdersTable'
import PaymentSummaryCards from '../components/PaymentSummaryCards'
import SalesNotePreviewModal from '../components/SalesNotePreviewModal'
import { createMockPaymentOrders } from '../mocks/paymentOrders.mock'
import {
  applyMockPaymentStatusTransition,
  isValidPaymentStatus,
} from '../mocks/paymentTransitions.mock'
import {
  PREVIEW_CONTEXT,
  formatPaymentDateTime,
  getPdfAsset,
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
  const holdTimerRef = useRef(null)
  const [orders, setOrders] = useState(() => createMockPaymentOrders())
  const [activeFilter, setActiveFilter] = useState('TODOS')
  const [editingStatus, setEditingStatus] = useState({})
  const [pendingTransition, setPendingTransition] = useState(null)
  const [previewState, setPreviewState] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
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

  const handleUpdatePaymentStatus = useCallback((orderId, newStatus) => {
    if (!canUpdatePaymentStatus) return
    if (!isValidPaymentStatus(newStatus)) return

    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order

        return applyMockPaymentStatusTransition(order, newStatus)
      }),
    )

    setEditingStatus((prev) => ({ ...prev, [orderId]: false }))
  }, [canUpdatePaymentStatus])

  const handleDownloadNV = useCallback(async (order, variant, options = {}) => {
    try {
      const pdfAsset = getPdfAsset(order, variant, options)

      if (pdfAsset.filePath) {
        const link = document.createElement('a')

        link.href = pdfAsset.filePath
        link.download = pdfAsset.fileName || `${order.nvNumber}.pdf`
        document.body.appendChild(link)
        link.click()
        link.remove()
        return
      }

      await downloadNVPDF(order.nvNumber)
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
    if (!canUpdatePaymentStatus) {
      setEditingStatus({})
      return
    }

    setEditingStatus((prev) => ({
      [orderId]: !prev[orderId],
    }))
  }, [canUpdatePaymentStatus])

  const closePaymentEditor = useCallback(() => {
    setEditingStatus({})
  }, [])

  const openPaymentActionConfirmation = useCallback((order, targetStatus) => {
    if (!canUpdatePaymentStatus) {
      setEditingStatus({})
      setPendingTransition(null)
      return
    }

    if (order.paymentStatus === targetStatus) {
      setEditingStatus({})
      return
    }

    setPendingTransition({ order, targetStatus })
    setEditingStatus({})
  }, [canUpdatePaymentStatus])

  const closePaymentActionConfirmation = useCallback(() => {
    clearHoldTimer()
    setIsHoldingConfirmation(false)
    setPendingTransition(null)
  }, [clearHoldTimer])

  const completePendingTransition = useCallback(() => {
    if (!canUpdatePaymentStatus) {
      clearHoldTimer()
      setIsHoldingConfirmation(false)
      setPendingTransition(null)
      return
    }

    if (!pendingTransition) return

    handleUpdatePaymentStatus(
      pendingTransition.order.id,
      pendingTransition.targetStatus,
    )

    clearHoldTimer()
    setIsHoldingConfirmation(false)
    setPendingTransition(null)
  }, [
    canUpdatePaymentStatus,
    clearHoldTimer,
    handleUpdatePaymentStatus,
    pendingTransition,
  ])

  const startHoldConfirmation = useCallback(() => {
    if (!canUpdatePaymentStatus) return
    if (!pendingTransition || holdTimerRef.current) return

    setIsHoldingConfirmation(true)
    holdTimerRef.current = window.setTimeout(
      completePendingTransition,
      HOLD_CONFIRM_MS,
    )
  }, [canUpdatePaymentStatus, completePendingTransition, pendingTransition])

  const cancelHoldConfirmation = useCallback(() => {
    clearHoldTimer()
    setIsHoldingConfirmation(false)
  }, [clearHoldTimer])

  const openOriginalPreview = useCallback((order) => {
    setPreviewState({ context: PREVIEW_CONTEXT.ORIGINAL, order })
  }, [])

  const openSignedDetailPreview = useCallback((order) => {
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
            <h1 className={styles.pageTitle}>Confirmación de pago</h1>
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

        <PaymentOrdersTable
          canUpdatePaymentStatus={canUpdatePaymentStatus}
          editingStatus={editingStatus}
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
          onCloseEditor={closePaymentEditor}
          onOpenSalesNote={openOriginalPreview}
          onSelectStatus={openPaymentActionConfirmation}
          onToggleEditor={openPaymentEditor}
          onViewSignedDetail={openSignedDetailPreview}
          orders={filteredOrders}
        />
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
        onCancel={closePaymentActionConfirmation}
        onHoldEnd={cancelHoldConfirmation}
        onHoldStart={startHoldConfirmation}
        order={pendingTransition?.order}
        targetStatus={pendingTransition?.targetStatus}
      />
    </main>
  )
}
