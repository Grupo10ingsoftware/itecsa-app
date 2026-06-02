import { useState } from 'react'
import styles from './DesignFilesUploader.module.css'

export default function DesignFilesUploader({ onFilesAdd }) {
  const [isDragging, setIsDragging] = useState(false)
  const inputId = 'design-files-upload'

  const addFiles = (fileList) => {
    const selectedFiles = Array.from(fileList || [])
    if (selectedFiles.length > 0) onFilesAdd(selectedFiles)
  }

  const handleInputChange = (event) => {
    addFiles(event.target.files)
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
    addFiles(event.dataTransfer.files)
  }

  return (
    <label
      className={`${styles.uploadZone} ${isDragging ? styles.uploadZoneActive : ''}`}
      htmlFor={inputId}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <span className={styles.uploadIcon}>
        <i className="bi bi-file-earmark-arrow-up" aria-hidden="true" />
      </span>
      <span className={styles.uploadMainText}>Arrastre y suelte archivos aquí</span>
      <span>o haga clic para seleccionar</span>
      <input
        accept="application/pdf,.pdf"
        className={styles.hiddenInput}
        id={inputId}
        multiple
        onChange={handleInputChange}
        type="file"
      />
    </label>
  )
}
