import { useMemo, useState } from 'react'
import { DEFAULT_ORDER_DRAFT } from '../modules/orders/mocks/orderCreate.mock'
import { useOrdersApi } from '../modules/orders/hooks/useOrdersApi'
import { canContinueFromSalesNote, validateSalesNoteStep } from '../modules/orders/utils/orderCreateValidation'
import { normalizeSalesNoteCode } from '../modules/orders/utils/orderCreateFormatters'

export const ORDER_CREATE_VIEW_MODE = Object.freeze({
  CREATE: 'CREATE',
  SUCCESS: 'SUCCESS',
})

function createInitialDraft() {
  return {
    ...DEFAULT_ORDER_DRAFT,
  }
}

function getErrorMessage(error, fallback) {
  return error?.payload?.message || error?.message || fallback
}

function toDisplayRecord(salesNote) {
  const items = Array.isArray(salesNote.items) ? salesNote.items : []
  const productTypes = [...new Set(items.map((item) => item.tipoProducto).filter(Boolean))]

  return {
    ...salesNote,
    client: salesNote.cliente?.nombre ?? '-',
    rut: salesNote.cliente?.rut ?? '-',
    seller: salesNote.origen?.usuarioManager ?? '-',
    dueDate: salesNote.fechaEntregaTentativaOrigen ?? '-',
    productType: productTypes.length > 1 ? 'Mixto' : productTypes[0] ?? '-',
    quantity: items.reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0),
    productionData: items.map((item) => ({
      ...item,
      product: item.producto,
      quantity: item.cantidad,
    })),
  }
}

function buildCreateOrderPayload(draft) {
  return {
    numeroNota: draft.managerRecord.numeroNota,
    fechaEntregaTentativaOrigen: draft.managerRecord.fechaEntregaTentativaOrigen,
    cliente: draft.managerRecord.cliente,
    origen: draft.managerRecord.origen,
    observaciones: draft.managerRecord.observaciones,
    observacionInterna: draft.comments?.trim() || null,
    priority: draft.priority,
    items: draft.managerRecord.items,
    itemsSinSeguimientoProductivo: draft.managerRecord.itemsSinSeguimientoProductivo,
  }
}

export function useOrderCreateFlow({ navigate }) {
  const ordersApi = useOrdersApi()
  const [viewMode, setViewMode] = useState(ORDER_CREATE_VIEW_MODE.CREATE)
  const [draft, setDraft] = useState(createInitialDraft)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [registeredOrder, setRegisteredOrder] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

  const salesNoteIsValid = useMemo(() => canContinueFromSalesNote(draft), [draft])

  function updateDraftField(field, value) {
    setDraft((previous) => {
      const nextValue = field === 'salesNoteCode' ? normalizeSalesNoteCode(value) : value
      const nextDraft = { ...previous, [field]: nextValue }

      if (field === 'salesNoteCode') {
        nextDraft.managerRecord = null
      }

      return nextDraft
    })
    setErrors((previous) => ({ ...previous, [field]: null }))
    setNotice(null)
  }

  async function handleSearchSalesNote() {
    const code = normalizeSalesNoteCode(draft.salesNoteCode)

    if (!code) {
      setErrors((previous) => ({ ...previous, salesNoteCode: 'Debe ingresar el codigo de Nota de Venta.' }))
      setNotice({ type: 'error', message: 'Ingrese un codigo de Nota de Venta antes de buscar informacion.' })
      return
    }

    setIsSearching(true)

    try {
      const salesNote = await ordersApi.getSalesNote(code)
      const managerRecord = toDisplayRecord(salesNote)

      setDraft((previous) => ({ ...previous, salesNoteCode: code, managerRecord }))
      setErrors((previous) => ({ ...previous, salesNoteCode: null }))
      setNotice({ type: 'success', message: `Informacion de ${code} importada correctamente.` })
    } catch (error) {
      const message = getErrorMessage(error, `No se encontro informacion para ${code}.`)
      setDraft((previous) => ({ ...previous, salesNoteCode: code, managerRecord: null }))
      setErrors((previous) => ({
        ...previous,
        salesNoteCode: message,
      }))
      setNotice({ type: 'error', message })
    } finally {
      setIsSearching(false)
    }
  }

  function updatePriority(priority) {
    setDraft((previous) => ({
      ...previous,
      priority: previous.priority === priority ? null : priority,
    }))
  }

  function handleOpenConfirmModal() {
    const salesNoteErrors = validateSalesNoteStep(draft)

    if (Object.keys(salesNoteErrors).length > 0) {
      setErrors(salesNoteErrors)
      setNotice({
        type: 'error',
        message: 'Debe ingresar el codigo y buscar la informacion de la Nota de Venta antes de registrar.',
      })
      return
    }

    setShowConfirmModal(true)
  }

  async function handleConfirmRegister() {
    setIsRegistering(true)
    try {
      const order = await ordersApi.createOrder(buildCreateOrderPayload(draft))

      setRegisteredOrder(order)
      setShowConfirmModal(false)
      setViewMode(ORDER_CREATE_VIEW_MODE.SUCCESS)
    } catch (error) {
      const message = getErrorMessage(error, 'No fue posible registrar el pedido.')
      setShowConfirmModal(false)
      setNotice({ type: 'error', message })
    } finally {
      setIsRegistering(false)
    }
  }

  function resetFlow() {
    setDraft(createInitialDraft())
    setErrors({})
    setNotice(null)
    setRegisteredOrder(null)
    setViewMode(ORDER_CREATE_VIEW_MODE.CREATE)
  }

  function goToKanban() {
    navigate('/kanban')
  }

  return {
    draft,
    errors,
    notice,
    registeredOrder,
    isRegistering,
    isSearching,
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
      updatePriority,
    },
  }
}
