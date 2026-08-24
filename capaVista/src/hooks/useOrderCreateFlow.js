import { useMemo, useState } from 'react'
import { DEFAULT_ORDER_DRAFT, MOCK_MANAGER_RECORDS } from '../modules/orders/mocks/orderCreate.mock'
import { canContinueFromSalesNote, validateSalesNoteStep } from '../modules/orders/utils/orderCreateValidation'
import { normalizeSalesNoteCode } from '../modules/orders/utils/orderCreateFormatters'
import { useOrdersApi } from '../modules/orders/hooks/useOrdersApi'

export const ORDER_CREATE_VIEW_MODE = Object.freeze({
  CREATE: 'CREATE',
  SUCCESS: 'SUCCESS',
})

function createInitialDraft() {
  return {
    ...DEFAULT_ORDER_DRAFT,
  }
}

export function useOrderCreateFlow({ navigate }) {
  const ordersApi = useOrdersApi()
  const [viewMode, setViewMode] = useState(ORDER_CREATE_VIEW_MODE.CREATE)
  const [currentStep, setCurrentStep] = useState(1)
  const [draft, setDraft] = useState(createInitialDraft)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [registeredOrder, setRegisteredOrder] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  function handleUrgentChange(isUrgent) {
    setDraft((previous) => ({ ...previous, isUrgent }))
  }

  function handleSearchSalesNote() {
    const code = normalizeSalesNoteCode(draft.salesNoteCode)

    if (!code) {
      setErrors((previous) => ({ ...previous, salesNoteCode: 'Debe ingresar el codigo de Nota de Venta.' }))
      setNotice({ type: 'error', message: 'Ingrese un codigo de Nota de Venta antes de buscar informacion.' })
      return
    }

    const managerRecord = MOCK_MANAGER_RECORDS[code]

    if (!managerRecord) {
      setDraft((previous) => ({ ...previous, salesNoteCode: code, managerRecord: null }))
      setErrors((previous) => ({
        ...previous,
        salesNoteCode: `No se encontro informacion para ${code}.`,
      }))
      setNotice({ type: 'error', message: `No se encontro informacion para ${code}.` })
      return
    }

    setDraft((previous) => ({ ...previous, salesNoteCode: code, managerRecord }))
    setErrors((previous) => ({ ...previous, salesNoteCode: null }))
    setNotice({ type: 'success', message: `Informacion de ${code} importada correctamente.` })
  }

  function goToReviewStep() {
    const salesNoteErrors = validateSalesNoteStep(draft)

    if (Object.keys(salesNoteErrors).length > 0) {
      setErrors(salesNoteErrors)
      setNotice({
        type: 'error',
        message: 'Complete el codigo, busque/exporte la informacion y adjunte el PDF obligatorio antes de continuar.',
      })
      return
    }

    setCurrentStep(2)
    setNotice(null)
  }

  function goBackOneStep() {
    setCurrentStep((step) => Math.max(1, step - 1))
    setNotice(null)
  }

  function handleOpenConfirmModal() {
    const salesNoteErrors = validateSalesNoteStep(draft)

    if (Object.keys(salesNoteErrors).length > 0) {
      setCurrentStep(1)
      setErrors(salesNoteErrors)
      setNotice({ type: 'error', message: 'No se puede registrar el pedido sin Nota de Venta y PDF obligatorio.' })
      return
    }

    setShowConfirmModal(true)
  }

  function handleConfirmRegister() {
    if (!draft.managerRecord) {
      setNotice({ type: 'error', message: 'Falta la informacion de la Nota de Venta.' })
      return
    }

    const payload = {
      rut_cliente: draft.managerRecord.rut,
      nombre_cliente: draft.managerRecord.client,
      razon_social: undefined,
      estado_cliente: undefined,
      id_etiqueta: draft.isUrgent ? 1 : null,
      productos: [
        {
          nombre_producto: draft.managerRecord.productType,
          cantidad: Number(draft.managerRecord.quantity),
          fecha_estimada_termino: null,
        },
      ],
    }

    setIsSubmitting(true)
    ordersApi.createOrder(payload)
      .then((order) => {
        setRegisteredOrder(order)
        setShowConfirmModal(false)
        setViewMode(ORDER_CREATE_VIEW_MODE.SUCCESS)
      })
      .catch((error) => {
        const message = error?.payload?.message || error?.message || 'Error al registrar el pedido.'
        setNotice({ type: 'error', message })
      })
      .finally(() => {
        setIsSubmitting(false)
      })
  }

  function resetFlow() {
    setCurrentStep(1)
    setDraft(createInitialDraft())
    setErrors({})
    setNotice(null)
    setRegisteredOrder(null)
    setShowConfirmModal(false)
    setIsSubmitting(false)
    setViewMode(ORDER_CREATE_VIEW_MODE.CREATE)
  }

  function goToKanban() {
    navigate('/kanban')
  }

  const continueFromCurrentStep = currentStep === 1
    ? goToReviewStep
    : handleOpenConfirmModal

  return {
    currentStep,
    draft,
    errors,
    isSubmitting,
    notice,
    registeredOrder,
    salesNoteIsValid,
    showConfirmModal,
    viewMode,
    actions: {
      continueFromCurrentStep,
      goBackOneStep,
      goToKanban,
      handleConfirmRegister,
      handleOpenConfirmModal,
      handleSearchSalesNote,
      handleUrgentChange,
      resetFlow,
      setShowConfirmModal,
      updateDraftField,
    },
  }
}
