import { useMemo, useRef, useState } from 'react'
import { buildRegisteredOrder, DEFAULT_ORDER_DRAFT, MOCK_MANAGER_RECORDS } from '../modules/orders/mocks/orderCreate.mock'
import { canContinueFromSalesNote, validateSalesNoteStep } from '../modules/orders/utils/orderCreateValidation'
import { normalizeSalesNoteCode } from '../modules/orders/utils/orderCreateFormatters'

export const ORDER_CREATE_VIEW_MODE = Object.freeze({
  CREATE: 'CREATE',
  SUCCESS: 'SUCCESS',
})

function createInitialDraft() {
  return { ...DEFAULT_ORDER_DRAFT }
}

export function useOrderCreateFlow({ navigate }) {
  const [viewMode, setViewMode] = useState(ORDER_CREATE_VIEW_MODE.CREATE)
  const [draft, setDraft] = useState(createInitialDraft)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [registeredOrder, setRegisteredOrder] = useState(null)
  const searchRequestId = useRef(0)

  const salesNoteIsValid = useMemo(() => canContinueFromSalesNote(draft), [draft])

  function updateDraftField(field, value) {
    setDraft((previous) => {
      const nextValue = field === 'salesNoteCode' ? normalizeSalesNoteCode(value) : value
      const nextDraft = { ...previous, [field]: nextValue }

      if (field === 'salesNoteCode') nextDraft.managerRecord = null

      return nextDraft
    })
    setErrors((previous) => ({ ...previous, [field]: null }))
    setNotice(null)

    if (field === 'salesNoteCode') {
      searchRequestId.current += 1
      setIsSearching(false)
    }
  }

  async function handleSearchSalesNote() {
    const code = normalizeSalesNoteCode(draft.salesNoteCode)

    if (!code) {
      setErrors((previous) => ({ ...previous, salesNoteCode: 'Debe ingresar el codigo de Nota de Venta.' }))
      setNotice({ type: 'error', message: 'Ingrese un codigo de Nota de Venta antes de consultar Manager.' })
      return
    }

    const currentRequestId = searchRequestId.current + 1
    searchRequestId.current = currentRequestId
    setIsSearching(true)
    setNotice(null)
    setErrors((previous) => ({ ...previous, salesNoteCode: null }))

    const simulatedManagerDelay = 3000 + Math.floor(Math.random() * 2001)
    await new Promise((resolve) => window.setTimeout(resolve, simulatedManagerDelay))

    if (searchRequestId.current !== currentRequestId) return

    const managerRecord = MOCK_MANAGER_RECORDS[code]

    if (!managerRecord) {
      setDraft((previous) => ({ ...previous, salesNoteCode: code, managerRecord: null }))
      setIsSearching(false)
      setErrors((previous) => ({
        ...previous,
        salesNoteCode: `No se encontro informacion para ${code}.`,
      }))
      setNotice({ type: 'error', message: `Manager no encontro la Nota de Venta ${code}.` })
      return
    }

    setDraft((previous) => ({ ...previous, salesNoteCode: code, managerRecord }))
    setIsSearching(false)
    setErrors((previous) => ({ ...previous, salesNoteCode: null }))
    setNotice({ type: 'success', message: `Datos de ${code} importados desde Manager.` })
  }

  function handleOpenConfirmModal() {
    const salesNoteErrors = validateSalesNoteStep(draft)

    if (Object.keys(salesNoteErrors).length > 0) {
      setErrors(salesNoteErrors)
      setNotice({ type: 'error', message: 'Consulte una Nota de Venta valida antes de crear el pedido.' })
      return
    }

    setShowConfirmModal(true)
  }

  function handleConfirmRegister() {
    const order = buildRegisteredOrder(draft)

    try {
      const currentOrders = JSON.parse(sessionStorage.getItem('ordersMock') || '[]')
      sessionStorage.setItem('ordersMock', JSON.stringify([...currentOrders, order]))
    } catch {
      // Persistencia temporal para demostrar el flujo visual del mockup.
    }

    setRegisteredOrder(order)
    setShowConfirmModal(false)
    setViewMode(ORDER_CREATE_VIEW_MODE.SUCCESS)
  }

  function resetFlow() {
    searchRequestId.current += 1
    setDraft(createInitialDraft())
    setErrors({})
    setNotice(null)
    setIsSearching(false)
    setRegisteredOrder(null)
    setViewMode(ORDER_CREATE_VIEW_MODE.CREATE)
  }

  function goToKanban() {
    navigate('/kanban')
  }

  return {
    draft,
    errors,
    isSearching,
    notice,
    registeredOrder,
    salesNoteIsValid,
    showConfirmModal,
    viewMode,
    actions: {
      goToKanban,
      handleConfirmRegister,
      handleOpenConfirmModal,
      handleSearchSalesNote,
      resetFlow,
      setShowConfirmModal,
      updateDraftField,
    },
  }
}
