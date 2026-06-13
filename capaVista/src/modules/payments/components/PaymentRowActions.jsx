import { useEffect, useId, useRef } from 'react'
import { PAYMENT_STATUS } from '@/config/status'
import styles from './PaymentRowActions.module.css'

const ACTION_OPTIONS = [
  {
    status: PAYMENT_STATUS.PENDIENTE,
    label: 'Pendiente',
    icon: 'bi-clock',
    className: styles.actionDropdownOptionPending,
  },
  {
    status: PAYMENT_STATUS.CONFIRMADO,
    label: 'Confirmar',
    icon: 'bi-check-circle',
    className: styles.actionDropdownOptionConfirm,
  },
  {
    status: PAYMENT_STATUS.RECHAZADO,
    label: 'Rechazar',
    icon: 'bi-x-circle',
    className: styles.actionDropdownOptionReject,
  },
]

function PaymentActionOption({
  className,
  icon,
  label,
  onClose,
  onSelect,
  order,
  status,
}) {
  if (order.paymentStatus === status) return null

  return (
    <button
      className={`${styles.actionDropdownOption} ${className}`}
      onClick={() => {
        onSelect(order, status)
        onClose?.()
      }}
      role="menuitem"
      type="button"
    >
      <i className={`bi ${icon}`} />
      <span>{label}</span>
    </button>
  )
}

function ManageButton({
  disabled = false,
  disabledTooltip,
  isMobile,
  isOpen,
  onClose,
  onSelect,
  onToggle,
  order,
}) {
  const dropdownRef = useRef(null)
  const menuId = useId()
  const actionRootSelector = `[data-payment-action-root="${order.id}"]`

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event) => {
      if (dropdownRef.current?.contains(event.target)) return

      const actionRoot = event.target.closest?.(actionRootSelector)
      if (actionRoot) return

      onClose?.()
    }

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return

      event.preventDefault()
      onClose?.()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [actionRootSelector, isOpen, onClose])

  const handleMenuKeyDown = (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return

    const options = Array.from(
      event.currentTarget.querySelectorAll('button:not([disabled])'),
    )

    if (options.length === 0) return

    event.preventDefault()

    const currentIndex = options.indexOf(document.activeElement)
    let nextIndex = 0

    if (event.key === 'ArrowDown') {
      nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % options.length
    }

    if (event.key === 'ArrowUp') {
      nextIndex =
        currentIndex < 0
          ? options.length - 1
          : (currentIndex - 1 + options.length) % options.length
    }

    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = options.length - 1

    options[nextIndex]?.focus()
  }

  const tooltip = disabled
    ? disabledTooltip ?? 'No tienes permisos para interactuar con esta accion.'
    : undefined

  return (
    <div
      className={styles.actionDropdownWrap}
      data-disabled={disabled ? 'true' : undefined}
      data-payment-action-root={order.id}
      data-tooltip={tooltip}
      ref={dropdownRef}
    >
      <button
        aria-controls={isOpen ? menuId : undefined}
        aria-expanded={isOpen ? 'true' : 'false'}
        aria-haspopup="menu"
        className={`${styles.actionButton} ${styles.actionButtonManage} ${
          isMobile ? 'w-100' : ''
        }`}
        disabled={disabled}
        onClick={() => {
          if (disabled) return
          onToggle(order.id)
        }}
        type="button"
      >
        Gestionar
      </button>

      {isOpen && !disabled && (
        <div
          aria-label="Acciones de pago"
          className={styles.paymentActionSelect}
          id={menuId}
          onKeyDown={handleMenuKeyDown}
          onPointerDown={(event) => event.stopPropagation()}
          role="menu"
        >
          {ACTION_OPTIONS.map((option) => (
            <PaymentActionOption
              className={option.className}
              icon={option.icon}
              key={option.status}
              label={option.label}
              onClose={onClose}
              onSelect={onSelect}
              order={order}
              status={option.status}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function PaymentRowActions({
  canUpdatePaymentStatus = false,
  editingStatus,
  isMobile = false,
  isUpdatingPaymentStatus = false,
  onCloseEditor,
  onSelectStatus,
  onToggleEditor,
  onViewSignedDetail,
  order,
}) {
  const isConfirmed = order.paymentStatus === PAYMENT_STATUS.CONFIRMADO
  const isManageDisabled =
    !canUpdatePaymentStatus || isUpdatingPaymentStatus || isConfirmed
  const manageDisabledTooltip = isConfirmed
    ? 'El pago confirmado no puede modificarse.'
    : isUpdatingPaymentStatus
      ? 'Actualizando estado de pago.'
      : undefined

  return (
    <div
      className={`${styles.actionControlsGroup} ${
        isMobile ? styles.actionControlsGroupMobile : ''
      }`}
    >
      <ManageButton
        disabled={isManageDisabled}
        disabledTooltip={manageDisabledTooltip}
        isMobile={isMobile}
        isOpen={Boolean(editingStatus[order.id])}
        onClose={onCloseEditor}
        onSelect={onSelectStatus}
        onToggle={onToggleEditor}
        order={order}
      />

      {isConfirmed && (
        <button
          className={`${styles.actionButton} ${styles.actionButtonDetail} ${
            isMobile ? 'w-100' : ''
          }`}
          onClick={() => onViewSignedDetail(order)}
          type="button"
        >
          Ver detalle
        </button>
      )}
    </div>
  )
}
