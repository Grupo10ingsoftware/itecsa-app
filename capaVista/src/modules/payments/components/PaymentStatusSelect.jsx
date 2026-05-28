import SelectInput from '@/shared/components/forms/SelectInput'
import { PAYMENT_STATUS_OPTIONS } from '@/config/status'

const PAYMENT_STATUS_VALUES = PAYMENT_STATUS_OPTIONS.map((option) => option.value)

export default function PaymentStatusSelect({
  value,
  onChange,
  disabled = false,
  id,
  name,
  className = '',
  optionClassName = '',
  activeOptionClassName = '',
  presentation = 'select',
}) {
  const safeValue = PAYMENT_STATUS_VALUES.includes(value)
    ? value
    : PAYMENT_STATUS_OPTIONS[0].value

  const handleChange = (event) => {
    const nextValue = event.target.value

    if (!PAYMENT_STATUS_VALUES.includes(nextValue)) return

    onChange?.(event)
  }

  const handleMenuSelection = (nextValue) => {
    if (disabled || !PAYMENT_STATUS_VALUES.includes(nextValue)) return

    onChange?.({
      target: {
        id,
        name,
        value: nextValue,
      },
    })
  }

  if (presentation === 'menu') {
    return (
      <div
        aria-label="Estado de Pago"
        className={className}
        id={id}
        role="listbox"
      >
        {PAYMENT_STATUS_OPTIONS.map((option) => {
          const isSelected = option.value === safeValue

          return (
            <button
              aria-selected={isSelected}
              className={`${optionClassName} ${
                isSelected ? activeOptionClassName : ''
              }`}
              disabled={disabled}
              key={option.value}
              onClick={() => handleMenuSelection(option.value)}
              role="option"
              type="button"
            >
              {option.label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <SelectInput
      id={id}
      name={name}
      label="Estado de Pago"
      value={safeValue}
      onChange={handleChange}
      options={PAYMENT_STATUS_OPTIONS}
      disabled={disabled}
      className={className}
    />
  )
}
