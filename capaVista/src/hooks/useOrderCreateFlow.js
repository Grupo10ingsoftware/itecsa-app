import { useMemo, useState } from 'react'
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

export function useOrderCreateFlow({ navigate }) {
  const [viewMode, setViewMode] = useState(ORDER_CREATE_VIEW_MODE.CREATE)
  const [currentStep, setCurrentStep] = useState(1)
  const [draft, setDraft] = useState(createInitialDraft)
  const [errors, setErrors] = useState({})
  const [designFileError, setDesignFileError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [registeredOrder, setRegisteredOrder] = useState(null)

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

  function goToDesignStep() {
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

  function handleAddDesignFiles(files) {
    if (!files.length) return

    const nextFiles = [...draft.designFiles, ...files]
    const validationError = validateDesignFiles(nextFiles)

    if (validationError) {
      setDesignFileError(validationError)
      return
    }

    setDesignFileError(null)
    setDraft((previous) => ({ ...previous, designFiles: [...previous.designFiles, ...files] }))
  }

  function handleRemoveDesignFile(indexToRemove) {
    setDraft((previous) => ({
      ...previous,
      designFiles: previous.designFiles.filter((_, index) => index !== indexToRemove),
    }))
  }

  function handleReplaceDesignFile(indexToReplace, replacementFile) {
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
  }

  function goToReviewStep() {
    const validationError = validateDesignFiles(draft.designFiles)

    if (validationError) {
      setDesignFileError(validationError)
      setNotice({ type: 'error', message: 'Revise los archivos de diseno antes de continuar.' })
      return
    }

    setDesignFileError(null)
    setCurrentStep(3)
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
    const order = buildRegisteredOrder(draft)

    try {
      const currentOrders = JSON.parse(sessionStorage.getItem('ordersMock') || '[]')
      sessionStorage.setItem('ordersMock', JSON.stringify([...currentOrders, order]))
    } catch {
      // Persistencia local solo para continuidad visual del flujo frontend.
    }

    setRegisteredOrder(order)
    setShowConfirmModal(false)
    setViewMode(ORDER_CREATE_VIEW_MODE.SUCCESS)
  }

  function resetFlow() {
    setCurrentStep(1)
    setDraft(createInitialDraft())
    setErrors({})
    setDesignFileError(null)
    setNotice(null)
    setRegisteredOrder(null)
    setViewMode(ORDER_CREATE_VIEW_MODE.CREATE)
  }

  function goToKanban() {
    navigate('/kanban')
  }

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
