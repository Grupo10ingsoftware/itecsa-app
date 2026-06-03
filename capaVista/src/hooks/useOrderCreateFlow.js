import { useCallback, useEffect, useMemo, useState } from 'react' // <-- Añadido useEffect
import { buildRegisteredOrder, DEFAULT_ORDER_DRAFT, MOCK_MANAGER_RECORDS } from '../modules/orders/mocks/orderCreate.mock'
import { canContinueFromSalesNote, validateDesignFiles, validateSalesNoteStep } from '../modules/orders/utils/orderCreateValidation'
import { normalizeSalesNoteCode } from '../modules/orders/utils/orderCreateFormatters'

export const ORDER_CREATE_VIEW_MODE = Object.freeze({
  CREATE: 'CREATE',
  SUCCESS: 'SUCCESS',
})

function createInitialDraft() {
  return {
    ...DEFAULT_ORDER_DRAFT,
    designFiles: [],
  }
}
const globalMemory = {}
const globalListeners = {}

function usePersistentState(key, initialValue) {

  if (!(key in globalMemory)) {
    globalMemory[key] = typeof initialValue === 'function' ? initialValue() : initialValue
    globalListeners[key] = new Set()
  }

  const [state, setState] = useState(globalMemory[key])

  useEffect(() => {
    const listener = (newValue) => setState(newValue)
    globalListeners[key].add(listener)
    return () => globalListeners[key].delete(listener)
  }, [key])

  const setPersistentState = useCallback((updater) => {
    const previousValue = globalMemory[key]
    const nextValue = typeof updater === 'function' ? updater(previousValue) : updater
    
    globalMemory[key] = nextValue
    globalListeners[key].forEach((listener) => listener(nextValue))
  }, [key])

  return [state, setPersistentState]
}

export function useOrderCreateFlow({ navigate }) {
  const [viewMode, setViewMode] = usePersistentState('order_viewMode', ORDER_CREATE_VIEW_MODE.CREATE)
  const [currentStep, setCurrentStep] = usePersistentState('order_currentStep', 1)
  const [draft, setDraft] = usePersistentState('order_draft', createInitialDraft)
  const [errors, setErrors] = usePersistentState('order_errors', {})
  const [designFileError, setDesignFileError] = usePersistentState('order_designFileError', null)
  const [notice, setNotice] = usePersistentState('order_notice', null)
  const [showConfirmModal, setShowConfirmModal] = usePersistentState('order_showConfirmModal', false)
  const [registeredOrder, setRegisteredOrder] = usePersistentState('order_registeredOrder', null)

  const salesNoteIsValid = useMemo(() => canContinueFromSalesNote(draft), [draft])

  const updateDraftField = useCallback((field, value) => {
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
  }, [])

  const handleSearchSalesNote = useCallback(() => {
    const code = normalizeSalesNoteCode(draft.salesNoteCode)

    if (!code) {
      setErrors((previous) => ({ ...previous, salesNoteCode: 'Debe ingresar el código de Nota de Venta.' }))
      setNotice({ type: 'error', message: 'Ingrese un código de Nota de Venta antes de buscar información.' })
      return
    }

    const managerRecord = MOCK_MANAGER_RECORDS[code]

    if (!managerRecord) {
      setDraft((previous) => ({ ...previous, salesNoteCode: code, managerRecord: null }))
      setErrors((previous) => ({
        ...previous,
        salesNoteCode: `No se encontró información simulada para ${code}.`,
      }))
      setNotice({ type: 'error', message: `No se encontró información simulada para ${code}.` })
      return
    }

    setDraft((previous) => ({ ...previous, salesNoteCode: code, managerRecord }))
    setErrors((previous) => ({ ...previous, salesNoteCode: null }))
    setNotice({ type: 'success', message: `Información de ${code} importada correctamente desde el mock.` })
  }, [draft.salesNoteCode])

  const goToDesignStep = useCallback(() => {
    const salesNoteErrors = validateSalesNoteStep(draft)

    if (Object.keys(salesNoteErrors).length > 0) {
      setErrors(salesNoteErrors)
      setNotice({ type: 'error', message: 'Complete el código, busque/exporte la información y adjunte el PDF obligatorio antes de continuar.' })
      return
    }

    setCurrentStep(2)
    setNotice(null)
  }, [draft])

  const handleAddDesignFiles = useCallback((files) => {
    if (!files.length) return

    const nextFiles = [...draft.designFiles, ...files]
    const validationError = validateDesignFiles(nextFiles)

    if (validationError) {
      setDesignFileError(validationError)
      return
    }

    setDesignFileError(null)
    setDraft((previous) => ({ ...previous, designFiles: [...previous.designFiles, ...files] }))
  }, [draft.designFiles])

  const handleRemoveDesignFile = useCallback((indexToRemove) => {
    setDraft((previous) => ({
      ...previous,
      designFiles: previous.designFiles.filter((_, index) => index !== indexToRemove),
    }))
  }, [])

  const handleReplaceDesignFile = useCallback((indexToReplace, replacementFile) => {
    if (!replacementFile) return

    const nextFiles = draft.designFiles.map((file, index) => (
      index === indexToReplace ? replacementFile : file
    ))
    const validationError = validateDesignFiles(nextFiles)

    if (validationError) {
      setDesignFileError(validationError)
      return
    }

    setDesignFileError(null)
    setDraft((previous) => ({
      ...previous,
      designFiles: previous.designFiles.map((file, index) => (
        index === indexToReplace ? replacementFile : file
      )),
    }))
  }, [draft.designFiles])

  const goToReviewStep = useCallback(() => {
    const validationError = validateDesignFiles(draft.designFiles)

    if (validationError) {
      setDesignFileError(validationError)
      setNotice({ type: 'error', message: 'Revise los archivos de diseño antes de continuar.' })
      return
    }

    setDesignFileError(null)
    setCurrentStep(3)
    setNotice(null)
  }, [draft.designFiles])

  const goBackOneStep = useCallback(() => {
    setCurrentStep((step) => Math.max(1, step - 1))
    setNotice(null)
  }, [])

  const handleOpenConfirmModal = useCallback(() => {
    const salesNoteErrors = validateSalesNoteStep(draft)

    if (Object.keys(salesNoteErrors).length > 0) {
      setCurrentStep(1)
      setErrors(salesNoteErrors)
      setNotice({ type: 'error', message: 'No se puede registrar el pedido sin Nota de Venta y PDF obligatorio.' })
      return
    }

    setShowConfirmModal(true)
  }, [draft])

  const handleConfirmRegister = useCallback(() => {
    const order = buildRegisteredOrder(draft)

    try {
      const currentOrders = JSON.parse(sessionStorage.getItem('ordersMock') || '[]')
      sessionStorage.setItem('ordersMock', JSON.stringify([...currentOrders, order]))
    } catch {
      // La persistencia local es solo apoyo visual; el registro en memoria de React se mantiene.
    }

    setRegisteredOrder(order)
    setShowConfirmModal(false)
    setViewMode(ORDER_CREATE_VIEW_MODE.SUCCESS)
  }, [draft])

  const resetFlow = useCallback(() => {
    setCurrentStep(1)
    setDraft(createInitialDraft())
    setErrors({})
    setDesignFileError(null)
    setNotice(null)
    setRegisteredOrder(null)
    setViewMode(ORDER_CREATE_VIEW_MODE.CREATE)
  }, [])

  const goToKanban = useCallback(() => {
    navigate('/kanban')
  }, [navigate])

  const continueFromCurrentStep = currentStep === 1
    ? goToDesignStep
    : currentStep === 2
      ? goToReviewStep
      : handleOpenConfirmModal

  return {
    currentStep,
    designFileError,
    draft,
    errors,
    notice,
    registeredOrder,
    salesNoteIsValid,
    showConfirmModal,
    viewMode,
    actions: {
      continueFromCurrentStep,
      goBackOneStep,
      goToKanban,
      handleAddDesignFiles,
      handleConfirmRegister,
      handleOpenConfirmModal,
      handleRemoveDesignFile,
      handleReplaceDesignFile,
      handleSearchSalesNote,
      resetFlow,
      setShowConfirmModal,
      updateDraftField,
    },
  }
}