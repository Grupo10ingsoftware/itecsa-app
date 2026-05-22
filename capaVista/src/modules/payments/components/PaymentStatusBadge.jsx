import StatusBadge from '@/shared/components/data/StatusBadge'



export default function PaymentStatusBadge({ status, label }) {
  return <StatusBadge label={label || status} status={status} />
}
