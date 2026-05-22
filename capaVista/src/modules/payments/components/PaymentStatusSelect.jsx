import SelectInput from '@/shared/components/forms/SelectInput'
import { PAYMENT_STATUS_OPTIONS } from '@/config/status'


export default function PaymentStatusSelect({
  value,
  onChange,
  placeholder = 'Cambiar estado…',
  disabled = false,
  id,
  name,
  className = '',
}) {
  return (
    <SelectInput
      id={id}
      name={name}
      label="Estado de Pago"
      value={value}
      onChange={onChange}
      options={PAYMENT_STATUS_OPTIONS}
      placeholder={placeholder}
      disabled={disabled || !value}
      className={className}
    />
  )
}
