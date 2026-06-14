import { PAYMENT_STATUS } from '@/config/status'


export const PDF_VARIANT = {
  ORIGINAL: 'original',
  SIGNED: 'signed',
}

export const PREVIEW_CONTEXT = {
  ORIGINAL: 'original',
  SIGNED_DETAIL: 'signed-detail',
}

export function formatPaymentDateTime(value) {
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

export function getPaymentActionMeta(targetStatus) {
  if (targetStatus === PAYMENT_STATUS.CONFIRMADO) {
    return {
      icon: 'bi-check-circle',
      modalTitle: 'Confirmar pago',
      question: '¿Quieres confirmar el pago de esta nota de venta?',
      statusLabel: PAYMENT_STATUS.CONFIRMADO,
      previewTitle: 'Vista previa de Nota de Venta firmada',
      previewDescription:
        'Se muestra el documento firmado si existe una ruta asociada.',
      pdfVariant: PDF_VARIANT.SIGNED,
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
      previewTitle: 'Vista previa de Nota de Venta a rechazar',
      previewDescription:
        'Se muestra el documento original asociado al pago que será rechazado.',
      pdfVariant: PDF_VARIANT.ORIGINAL,
      holdLabel: 'Mantener para confirmar cambio',
      completedLabel: 'Confirmando cambio...',
    }
  }

  return {
    icon: 'bi-arrow-counterclockwise',
    modalTitle: 'Marcar como pendiente',
    question: '¿Quieres marcar este pago como pendiente?',
    statusLabel: PAYMENT_STATUS.PENDIENTE,
    previewTitle: 'Vista previa de Nota de Venta',
    previewDescription:
      'Se muestra el documento original asociado al pago que volverá a quedar pendiente.',
    pdfVariant: PDF_VARIANT.ORIGINAL,
    holdLabel: 'Mantener para confirmar cambio',
    completedLabel: 'Confirmando cambio...',
  }
}

export function getPdfAsset(order, variant = PDF_VARIANT.ORIGINAL, options = {}) {
  if (!order) {
    return {
      filePath: null,
      fileName: 'Sin archivo',
      label: 'Sin archivo',
      isSigned: false,
    }
  }

  const wantsSigned = variant === PDF_VARIANT.SIGNED
  const signedFilePath = options.fallbackSignedFilePath || (
    order.isSigned ? order.nvFilePath : null
  )
  const signedFileName =
    options.fallbackSignedFileName || order.nvFileName || 'Documento firmado.pdf'

  if (wantsSigned) {
    return {
      filePath: signedFilePath,
      fileName: signedFilePath ? signedFileName : 'Sin PDF firmado',
      label: signedFilePath ? 'Documento firmado' : 'Sin PDF firmado',
      isSigned: true,
    }
  }

  return {
    filePath: order.nvFilePath || null,
    fileName: order.nvFileName || 'Sin archivo',
    label: order.nvFilePath ? 'Documento original' : 'Sin archivo',
    isSigned: false,
  }
}

function isIOSDevice() {
  if (typeof navigator === 'undefined') return false

  const userAgent = navigator.userAgent || ''
  const platform = navigator.platform || ''

  return (
    /iPad|iPhone|iPod/.test(userAgent) ||
    (platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function isMobileDevice() {
  if (typeof navigator === 'undefined') return false

  const userAgent = navigator.userAgent || ''

  return (
    isIOSDevice() ||
    /Android|webOS|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(userAgent)
  )
}

function openPdfForMobilePrint(filePath) {
  const openedWindow = window.open(filePath, '_blank', 'noopener,noreferrer')

  if (openedWindow) return true

  const link = document.createElement('a')
  link.href = filePath
  link.target = '_blank'
  link.rel = 'noreferrer'
  document.body.appendChild(link)
  link.click()
  link.remove()

  return false
}

function openPdfAsFallback(filePath) {
  const fallbackWindow = window.open(filePath, '_blank', 'noopener,noreferrer')

  if (!fallbackWindow) {
    const link = document.createElement('a')
    link.href = filePath
    link.target = '_blank'
    link.rel = 'noreferrer'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }
}

export function openPdfForDownload(filePath, fileName = 'documento.pdf') {
  if (!filePath || typeof window === 'undefined' || typeof document === 'undefined') return

  const openedWindow = window.open(filePath, '_blank')

  if (openedWindow) {
    openedWindow.opener = null
    return
  }

  const link = document.createElement('a')
  link.href = filePath
  link.download = fileName
  link.target = '_blank'
  link.rel = 'noreferrer'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export function openFileForDownload(filePath, fileName = 'archivo') {
  if (!filePath || typeof window === 'undefined' || typeof document === 'undefined') return

  const openedWindow = window.open(filePath, '_blank')

  if (openedWindow) {
    openedWindow.opener = null
    return
  }

  const link = document.createElement('a')
  link.href = filePath
  link.download = fileName
  link.target = '_blank'
  link.rel = 'noreferrer'
  document.body.appendChild(link)
  link.click()
  link.remove()
}


const PRINT_REQUEST_COOLDOWN_MS = 1500

let activePrintJob = null
let lastPrintRequest = {
  filePath: null,
  timestamp: 0,
}

async function createPrintablePdfObjectUrl(filePath) {
  const response = await fetch(filePath)

  if (!response.ok) {
    throw new Error('No fue posible cargar el PDF para impresión.')
  }

  const pdfBlob = await response.blob()
  const printableBlob = pdfBlob.type === 'application/pdf'
    ? pdfBlob
    : new Blob([pdfBlob], { type: 'application/pdf' })

  return URL.createObjectURL(printableBlob)
}

function revokePrintJobObjectUrl(printJob) {
  if (!printJob?.objectUrl) return

  URL.revokeObjectURL(printJob.objectUrl)
  printJob.objectUrl = null
}

function clearActivePrintJob({ removeFrame = true } = {}) {
  if (!activePrintJob) return

  window.clearTimeout(activePrintJob.printDelayTimer)
  window.clearTimeout(activePrintJob.cleanupTimer)
  window.removeEventListener('afterprint', activePrintJob.cleanup)

  if (removeFrame) {
    activePrintJob.printFrame?.remove()
  }

  revokePrintJobObjectUrl(activePrintJob)
  activePrintJob = null
}

function removePreviousPrintFrame() {
  clearActivePrintJob()

  const previousFrame = document.querySelector('[data-payments-print-frame="true"]')
  previousFrame?.remove()
}

function shouldIgnoreDuplicatePrintRequest(filePath) {
  const now = Date.now()
  const isSameFile = lastPrintRequest.filePath === filePath
  const isTooSoon = now - lastPrintRequest.timestamp < PRINT_REQUEST_COOLDOWN_MS

  if (isSameFile && isTooSoon) {
    return true
  }

  lastPrintRequest = {
    filePath,
    timestamp: now,
  }

  return false
}

export async function printPdf(filePath) {
  if (!filePath || typeof window === 'undefined' || typeof document === 'undefined') return

  if (shouldIgnoreDuplicatePrintRequest(filePath)) return

  if (isMobileDevice()) {
    openPdfForMobilePrint(filePath)
    return
  }

  removePreviousPrintFrame()

  let objectUrl = null

  try {
    objectUrl = await createPrintablePdfObjectUrl(filePath)
  } catch (error) {
    console.error('Error preparando PDF para impresión:', error)
    openPdfAsFallback(filePath)
    return
  }

  const printFrame = document.createElement('iframe')
  let cleanupTimer = null
  let hasRequestedPrint = false

  const cleanup = () => {
    window.clearTimeout(cleanupTimer)
    window.removeEventListener('afterprint', cleanup)
    printFrame.remove()

    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
      objectUrl = null
    }

    if (activePrintJob?.printFrame === printFrame) {
      activePrintJob = null
    }
  }

  printFrame.dataset.paymentsPrintFrame = 'true'
  printFrame.title = 'Impresión de Nota de Venta'
  printFrame.setAttribute('aria-hidden', 'true')
  printFrame.style.border = '0'
  printFrame.style.bottom = '0'
  printFrame.style.height = '1px'
  printFrame.style.opacity = '0'
  printFrame.style.pointerEvents = 'none'
  printFrame.style.position = 'fixed'
  printFrame.style.right = '0'
  printFrame.style.width = '1px'

  activePrintJob = {
    cleanup,
    cleanupTimer,
    filePath,
    objectUrl,
    printDelayTimer: null,
    printFrame,
  }

  printFrame.onload = () => {
    if (hasRequestedPrint) return
    hasRequestedPrint = true

    const printDelayTimer = window.setTimeout(() => {
      try {
        printFrame.contentWindow?.focus()
        printFrame.contentWindow?.print()
        window.addEventListener('afterprint', cleanup, { once: true })

        cleanupTimer = window.setTimeout(cleanup, 120000)

        if (activePrintJob?.printFrame === printFrame) {
          activePrintJob.cleanupTimer = cleanupTimer
        }
      } catch (error) {
        console.error('Error imprimiendo PDF:', error)
        cleanup()
        openPdfAsFallback(filePath)
      }
    }, 500)

    if (activePrintJob?.printFrame === printFrame) {
      activePrintJob.printDelayTimer = printDelayTimer
    }
  }

  printFrame.onerror = () => {
    cleanup()
    openPdfAsFallback(filePath)
  }

  printFrame.src = objectUrl
  document.body.appendChild(printFrame)
}
