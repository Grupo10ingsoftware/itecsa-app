import styles from './SalesNoteButton.module.css'

export default function SalesNoteButton({ order, isMobile = false, onOpen }) {
  return (
    <button
      className={`${styles.salesNoteButton} ${isMobile ? 'w-100' : ''}`}
      onClick={() => onOpen(order)}
      title="Visualizar Nota de Venta previa a firma"
      type="button"
    >
      <i className="bi bi-file-earmark-text" />
      Nota de venta
    </button>
  )
}
