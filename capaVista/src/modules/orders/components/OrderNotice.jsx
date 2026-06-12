import styles from './OrderNotice.module.css'

export default function OrderNotice({ notice }) {
  if (!notice) return null

  const iconClass = notice.type === 'error' ? 'bi-exclamation-triangle' : 'bi-check-circle'
  const alertClass = notice.type === 'error' ? styles.toastAlertError : styles.toastAlertSuccess

  return (
    <div className={`${styles.toastAlert} ${alertClass}`} role="status">
      <i className={`bi ${iconClass}`} aria-hidden="true" />
      <span>{notice.message}</span>
    </div>
  )
}
