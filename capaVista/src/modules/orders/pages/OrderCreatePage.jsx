import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ACTION_STATUS } from '@/config/status'
import { required, requiredFile, isPdf, validateAll, greaterThanZero } from '@/utils/validators'
import OrderForm from './OrderForm'
import styles from './OrderCreatePage.module.css'

/* ────────────────────────────────────────────────────────────────────────────
   Datos simulados del "manager" (sistema externo de nombre por definir).
   En producción, estos datos vendrían desde una API real.
   Mapeados por código de Nota de Venta.
   ──────────────────────────────────────────────────────────────────────────── */
const MANAGER_DATA = {
  'NV-2024-0014': {
    companyName: 'Empresa Retail Chile Limitada',
    rut: '78.123.456-7',
    productDescription: 'Lanyard corporativo con logo bordado',
    quantity: 200,
    manufacturingData: 'Bordado satinado 10mm – Azul corporativo',
    productType: 'Lanyard',
  },
  'NV-2024-0021': {
    companyName: 'Corredora de Seguros Andes',
    rut: '76.987.234-1',
    productDescription: 'Tarjeta de acceso PVC impresa ambos lados',
    quantity: 500,
    manufacturingData: 'Full color digital – 0.84mm – Logo B/N + QR',
    productType: 'Tarjeta',
  },
  'NV-2024-0008': {
    companyName: 'Grupo Logístico del Sur',
    rut: '85.432.198-5',
    productDescription: 'Lanyard de seguridad con broche metálico',
    quantity: 450,
    manufacturingData: 'Tejido plano – Rojo / blanco ref. seguridad',
    productType: 'Lanyard',
  },
}

/* ────────────────────────────────────────────────────────────────────────────
   Capacidad simulada (porcentaje de uso de la línea de producción).
   >90% dispara la notificación de sobrecarga.
   ──────────────────────────────────────────────────────────────────────────── */
const CAPACITY_THRESHOLD = 90
const MOCK_CURRENT_CAPACITY = 75 // porcentaje de capacidad ocupada (simulado)

/* ────────────────────────────────────────────────────────────────────────────
   Ordenes ya registradas (para RF23 — control de duplicados).
   en producción esto vendría desde la base de datos.
   ──────────────────────────────────────────────────────────────────────────── */
const EXISTING_ORDERS = ['NV-2024-0008', 'NV-2024-0030']

/* ────────────────────────────────────────────────────────────────────────────
   Estados de notificación que se muestran al usuario
   ──────────────────────────────────────────────────────────────────────────── */
const NOTIFICATION = {
  NONE: 'NONE',
  SUCCESS: 'SUCCESS',
  ERROR_DUPLICATE: 'ERROR_DUPLICATE',
  ERROR_OVERLOAD: 'ERROR_OVERLOAD',
  ERROR_FIELDS: 'ERROR_FIELDS',
}

/* ────────────────────────────────────────────────────────────────────────────
   Valores iniciales del formulario
   ──────────────────────────────────────────────────────────────────────────── */
const INITIAL_FORM_DATA = {
  nvCode: '',
  pdfFile: null,
  designFile: null,
  companyName: '',
  rut: '',
  productDescription: '',
  quantity: '',
  manufacturingData: '',
  productType: '',
  comments: '',
  createdAt: null,
  orderStatus: null,
  paymentStatus: null,
}

/**
 * OrderCreatePage — página de creación de pedido por medio de Nota de Venta.
 *
 * RF19:  Formulario que solicita Número de NV y archivo PDF.
 * RF20:  Autocompleta campos tras búsqueda por número de NV.
 * RF21:  Registra fecha (DD-MM-YYYY) y hora (HH:MM:SS) de creación.
 * RF22:  Identifica el producto como Lanyard o Tarjeta.
 * RF23:  Corrobora que el código de NV no esté duplicado en la base de datos.
 * RF24:  Muestra mensaje de duplicación específico.
 * RF25:  Permite adjuntar archivos de diseño.
 * RF18:  Validación de campos obligatorios vacíos.
 * RF--:  Notificación cuando la capacidad actual supera el 90%.
 */
export default function OrderCreatePage() {
  const navigate = useNavigate()

  // ── Estado del formulario
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  const [designFiles] = useState([]) // reservado para RF25 en iteraciones futuras

  // ── Errores de validación
  const [errors, setErrors] = useState({})

  // ── Notificación activa
  const [notification, setNotification] = useState(NOTIFICATION.NONE)
  const [notificationMsg, setNotificationMsg] = useState('')

  // ── Control de sobrecarga de capacidad (simulado)
  const [capacityInfo] = useState({
    current: MOCK_CURRENT_CAPACITY,
    threshold: CAPACITY_THRESHOLD,
  })
  const capacityPercent = capacityInfo.current
  const capacityLimit = capacityInfo.threshold
  const isOverloaded = capacityPercent >= capacityLimit

  // ── Cierra la notificación después de 5 segundos
  useEffect(() => {
    if (notification !== NOTIFICATION.NONE) {
      const timer = setTimeout(() => {
        setNotification(NOTIFICATION.NONE)
        setNotificationMsg('')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  // ── Muestra una notificación al usuario
  const showNotification = useCallback((type, msg) => {
    setNotification(type)
    setNotificationMsg(msg)
  }, [])

  // ── Callback genérico para cambiar un campo del formulario
  const onFieldChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Limpia el error del campo al modificarlo
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }))
    }
  }, [errors])

  // ── Valida el formulario actual y devuelve un objeto de errores
  const validateForm = useCallback((data) => {
    const fieldErrors = {}

    // Campos obligatorios de la NV (RF19 / RF18)
    const nvError = required(data.nvCode, 'Código de Nota de Venta')
    if (nvError) fieldErrors.nvCode = nvError

    const pdfError = validateAll([
      { validate: requiredFile, args: [data.pdfFile, 'Archivo PDF de Nota de Venta'] },
      { validate: isPdf, args: [data.pdfFile] },
    ])
    if (pdfError) fieldErrors.pdfFile = pdfError

    // Datos importados desde el manager (RF20)
    if (!data.companyName) fieldErrors.companyName = 'Razón social es obligatoria. Busque la NV primero.'
    if (!data.rut) fieldErrors.rut = 'RUT Cliente es obligatorio. Busque la NV primero.'
    if (!data.productDescription) fieldErrors.productDescription = 'Descripción de producto es obligatoria. Busque la NV primero.'
    if (!data.productType) fieldErrors.productType = 'Debe seleccionar el tipo de producto.'

    // Cantidad y datos de fabricación (RF22)
    const qtyError = greaterThanZero(data.quantity, 'Cantidad')
    if (qtyError) fieldErrors.quantity = qtyError

    if (!data.manufacturingData) fieldErrors.manufacturingData = 'Datos para fabricación son obligatorios.'

    return fieldErrors
  }, [])

  // ── Botón de búsqueda / exportar información del manager (RF20)
  const handleSearchNv = useCallback(() => {
    const nvCodeValue = formData.nvCode.trim()

    if (!nvCodeValue) {
      showNotification(NOTIFICATION.ERROR_FIELDS, 'Debe ingresar el código de Nota de Venta.')
      onFieldChange('nvCode', nvCodeValue)
      return
    }

    // Simula la consulta al manager externo
    const managerRecord = MANAGER_DATA[nvCodeValue]

    if (!managerRecord) {
      showNotification(
        NOTIFICATION.ERROR_FIELDS,
        `No se encontró información para el código "${nvCodeValue}" en el sistema manager.`
      )
      return
    }

    // Autocompleta los campos (RF20)
    const now = new Date()
    const updatedData = {
      ...formData,
      ...managerRecord,
      createdAt: now,
      orderStatus: ACTION_STATUS.SOLICITADO,
    }
    setFormData(updatedData)
    showNotification(
      NOTIFICATION.SUCCESS,
      `Información de Nota de Venta "${nvCodeValue}" importada correctamente.`
    )
  }, [formData, showNotification, onFieldChange])

  // ── Agregar archivo de diseño (pila) — RF25
  // onDesignFileChange se expone como parte de la prop de OrderForm y
  // puede integrarse con el componente FileInput en una iteración posterior.

  // ── Botón de confirmar pedido (RF19, RF21, RF22, RF23, RF24)
  const handleConfirmOrder = useCallback(() => {
    // Cálculos locales para evitar dependencias en el array de useCallback
    const overloaded = capacityPercent >= capacityLimit

    const formErrors = validateForm(formData)

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors)
      showNotification(NOTIFICATION.ERROR_FIELDS, 'Hay campos obligatorios vacíos. Revise el formulario.')
      return
    }

    // RF23 / RF24: Verifica que el código de NV no esté duplicado
    if (EXISTING_ORDERS.includes(formData.nvCode.trim())) {
      showNotification(
        NOTIFICATION.ERROR_DUPLICATE,
        'Ya existe una Nota de Venta con el código ingresado. No se permite duplicar'
      )
      return
    }

    // Verificación de sobrecarga de capacidad
    if (overloaded) {
      showNotification(
        NOTIFICATION.ERROR_OVERLOAD,
        `Pedido ingresado con sobrecarga. La capacidad actual es del ${capacityPercent}% (supera el límite del ${capacityLimit}%).`
      )
      // No bloquea el pedido; solo advierte
    }

    // RF21: Fecha y hora ya registradas en createdAt al buscar la NV
    const orderPayload = {
      id: Date.now(),
      nvNumber: formData.nvCode.trim(),
      companyName: formData.companyName,
      rut: formData.rut,
      productDescription: formData.productDescription,
      quantity: Number(formData.quantity),
      manufacturingData: formData.manufacturingData,
      productType: formData.productType,
      pdfFile: formData.pdfFile,
      designFiles: [...designFiles],
      comments: formData.comments,
      createdAt: formData.createdAt || new Date(),
      orderStatus: ACTION_STATUS.SOLICITADO,
      paymentStatus: null,
    }

    // Guarda el pedido en sessionStorage para que PaymentConfirmationPage lo tome
    const existing = JSON.parse(sessionStorage.getItem('pendingOrders') || '[]')
    sessionStorage.setItem('pendingOrders', JSON.stringify([...existing, orderPayload]))

    showNotification(
      NOTIFICATION.SUCCESS,
      `Pedido ${formData.nvCode.trim()} registrado exitosamente. Redirigiendo a Confirmación de Pago…`
    )

     // Redirige a la página de Confirmación de Pago después de 1.5 segundos
     setTimeout(() => {
       navigate('/pagos')
     }, 1500)
    }, [formData, designFiles, validateForm, showNotification, navigate, capacityLimit, capacityPercent])

  // ── Renderiza la barra de notificaciones
  const renderNotification = () => {
    if (notification === NOTIFICATION.NONE) return null

    let alertClass = 'alert-info'
    let icon = 'bi-info-circle'

    switch (notification) {
      case NOTIFICATION.SUCCESS:
        alertClass = 'alert-success'
        icon = 'bi-check-circle'
        break
      case NOTIFICATION.ERROR_DUPLICATE:
        alertClass = 'alert-danger'
        icon = 'bi-x-circle'
        break
      case NOTIFICATION.ERROR_OVERLOAD:
        alertClass = 'alert-warning'
        icon = 'bi-exclamation-triangle'
        break
      case NOTIFICATION.ERROR_FIELDS:
        alertClass = 'alert-danger'
        icon = 'bi-exclamation-circle'
        break
      default:
        break
    }

    return (
      <div className={`alert ${alertClass} d-flex align-items-center gap-2`} role="alert">
        <i className={`bi ${icon} fs-5`} />
        <span>{notificationMsg}</span>
      </div>
    )
  }

  // ── Renderiza la alerta de sobrecarga de capacidad
  const renderCapacityWarning = () => {
    if (!isOverloaded) return null
    return (
      <div className="alert alert-warning d-flex align-items-center gap-2" role="alert">
        <i className="bi bi-speedometer2 fs-5" />
        <div>
          <strong>Atención — Capacidad al {capacityPercent}%</strong>
          <br />
          <small>
            La capacidad de producción actual supera el límite del {capacityLimit}%.
            Los pedidos nuevos se ingresarán con sobrecarga.
          </small>
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════════════════════
     JSX principal
     ═══════════════════════════════════════════════════════════════════ */
  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <h1 className={styles.pageTitle}>Registro de Pedido</h1>
            <p className={styles.pageSubtitle}>
              Crear un nuevo pedido ingresando el código de Nota de Venta y su archivo PDF asociado.
            </p>
          </div>
          <span className="badge bg-light text-dark border fs-6">
            <i className="bi bi-person-badge me-1" />
            Rol: Ventas
          </span>
        </div>
      </div>

      {/* ── Notificaciones ── */}
      <div className="mb-3">{renderCapacityWarning()}</div>
      <div className="mb-3">{renderNotification()}</div>

      {/* ── Formulario principal ── */}
      <OrderForm
        formData={formData}
        onFieldChange={onFieldChange}
        onSearchNv={handleSearchNv}
        onConfirmOrder={handleConfirmOrder}
        errors={errors}
        disabled={false}
      />
    </div>
  )
}
