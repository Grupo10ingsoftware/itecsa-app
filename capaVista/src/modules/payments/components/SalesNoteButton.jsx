import styles from './SalesNoteButton.module.css'

export default function SalesNoteButton({ order, isMobile = false, onOpen }) {
  const hasSalesNoteFile = Boolean(order?.nvFilePath)

  return (
    <button
      className={`${styles.salesNoteButton} ${isMobile ? 'w-100' : ''}`}
      disabled={!hasSalesNoteFile}
      onClick={() => {
        if (!hasSalesNoteFile) return
        onOpen(order)
      }}
      title={
        hasSalesNoteFile
          ? 'Visualizar Nota de Venta'
          : 'Sin archivo de Nota de Venta asociado'
      }
      type="button"
    >
      <i className="bi bi-file-earmark-text" />
      {hasSalesNoteFile ? 'Nota de venta' : 'Sin archivo'}
    </button>
  )
}
