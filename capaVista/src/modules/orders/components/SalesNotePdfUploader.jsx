import { useState } from 'react'
import SalesNotePreviewModal from './SalesNotePreviewModal'
import { formatFileSize } from '../utils/orderCreateFormatters'
import styles from './SalesNotePdfUploader.module.css'

export default function SalesNotePdfUploader({ file, error, salesNoteCode, onFileChange }) {
  const [showPreview, setShowPreview] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const inputId = 'sales-note-pdf-upload'

  const selectFile = (selectedFile) => {
    onFileChange(selectedFile || null)
  }

  const handleInputChange = (event) => {
    selectFile(event.target.files?.[0] || null)
    event.target.value = ''
  }

  const handleDragOver = (event) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (event) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    selectFile(event.dataTransfer.files?.[0] || null)
  }

  if (file) {
    return (
      <>
        <div className={`${styles.fileCardClean} ${styles.fileCardValid}`}>
          <span className={`${styles.fileIcon} ${styles.fileIconPdf}`}>
            <i className="bi bi-file-earmark-pdf" aria-hidden="true" />
          </span>
          <span>
            <p className={styles.fileTitle}>{file.name}</p>
            <p className={styles.fileMeta}>Documento PDF · {formatFileSize(file.size)}</p>
          </span>
          <span className={styles.fileActions}>
            <button className={styles.smallAction} onClick={() => setShowPreview(true)} type="button">
              <i className="bi bi-eye" aria-hidden="true" />
              Ver
            </button>
            <label className={`${styles.smallAction} ${styles.smallActionDark}`} htmlFor={inputId}>
              <i className="bi bi-arrow-repeat" aria-hidden="true" />
              Reemplazar
            </label>
            <button
              className={`${styles.smallAction} ${styles.smallActionRed}`}
              onClick={() => {
                setShowPreview(false)
                onFileChange(null)
              }}
              type="button"
            >
              <i className="bi bi-trash" aria-hidden="true" />
              Eliminar
            </button>
            <input
              accept="application/pdf,.pdf"
              className={styles.hiddenInput}
              id={inputId}
              onChange={handleInputChange}
              type="file"
            />
          </span>
        </div>

        {error && <p className={styles.errorText}>{error}</p>}

        {showPreview && <SalesNotePreviewModal file={file} salesNoteCode={salesNoteCode} onClose={() => setShowPreview(false)} />}
      </>
    )
  }

  return (
    <>
      <label
        className={`${styles.uploadZoneClean} ${isDragging ? styles.uploadZoneActive : ''}`}
        htmlFor={inputId}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <span className={styles.uploadIcon}>
          <i className="bi bi-file-earmark-pdf" aria-hidden="true" />
        </span>
        <span className={styles.uploadMainText}>Arrastre y suelte el PDF aquí</span>
        <span>o haga clic para seleccionar</span>
        <input
          accept="application/pdf,.pdf"
          className={styles.hiddenInput}
          id={inputId}
          onChange={handleInputChange}
          type="file"
        />
      </label>
      {error && <p className={styles.errorText}>{error}</p>}
    </>
  )
}
