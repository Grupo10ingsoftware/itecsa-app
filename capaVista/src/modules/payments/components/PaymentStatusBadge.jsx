import StatusBadge from '@/shared/components/data/StatusBadge'

export default function PaymentStatusBadge({ status, label }) {
  const safeStatus = status || label

  return <StatusBadge label={label || safeStatus} status={safeStatus} />
}
