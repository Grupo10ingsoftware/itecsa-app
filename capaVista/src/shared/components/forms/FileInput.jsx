import { useState } from 'react'
import styles from './FileInput.module.css'

/**
 * FileInput — componente reutilizable de carga de archivos con validación visual.
 * Diseñado principalmente para archivos PDF (Nota de Venta y archivos de diseño).
 *
 * @param {string}              label           — etiqueta visible del campo
 * @param {File|null}           file            — archivo seleccionado actualmente
 * @param {(f:File|null)=>void} onFileChange    — callback cuando el usuario elige un archivo
 * @param {string}              accept          — atributo accept (ej. "application/pdf")
 * @param {number}              [maxSizeMB=10]  — tamaño máximo permitido en MB
 * @param {string}              [error]         — mensaje de error a mostrar
 * @param {boolean}             [disabled=false]
 */
export default function FileInput({
  label,
  file,
  onFileChange,
  accept,
  maxSizeMB = 10,
  error,
  disabled = false,
}) {
  const [dragOver, setDragOver] = useState(false)

  const handleChange = (e) => {
    const selected = e.target.files?.[0] || null
    onFileChange(selected)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    const dropped = e.dataTransfer.files?.[0] || null
    onFileChange(dropped)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    if (!disabled) setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleClear = () => {
    onFileChange(null)
  }

  const fileSizeLabel = file
    ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
    : null

  return (
    <div className={`mb-3 ${disabled ? styles.disabled : ''}`}>
      {label && (
        <label className="form-label text-secondary">{label}</label>
      )}

      <div
        className={`${styles.dropzone} ${dragOver ? styles.dragOver : ''} ${
          error ? 'is-invalid' : ''
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && document.getElementById(`file-input-${label}`)?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') !disabled && document.getElementById(`file-input-${label}`)?.click()
        }}
      >
        <input
          id={`file-input-${label}`}
          type="file"
          accept={accept}
          onChange={handleChange}
          disabled={disabled}
          className={styles.hiddenInput}
        />

        {!file ? (
          <div className={styles.emptyState}>
            <i className={`bi ${accept?.includes('pdf') ? 'bi-file-earmark-pdf' : 'bi-file-earmark-arrow-up'} ${styles.icon}`} />
            <p className="mb-0 small">Haga clic o arrastre un archivo aquí</p>
          </div>
        ) : (
          <div className={styles.fileInfo}>
            <i className={`bi ${accept?.includes('pdf') ? 'bi-file-earmark-pdf' : 'bi-file-earmark'} ${styles.icon}`} />
            <div className={styles.fileDetails}>
              <span className="fw-semibold d-block">{file.name}</span>
              {fileSizeLabel && (
                <span className="text-muted small">{fileSizeLabel}</span>
              )}
            </div>
            {!disabled && (
              <button
                type="button"
                className={`${styles.clearBtn} btn btn-sm btn-outline-danger`}
                onClick={(e) => {
                  e.stopPropagation()
                  handleClear()
                }}
                title="Quitar archivo"
              >
                <i className="bi bi-x" />
              </button>
            )}
          </div>
        )}
      </div>

      {error && <div className="invalid-feedback d-block">{error}</div>}

      {maxSizeMB && !file && (
        <small className="text-muted">Tamaño máximo permitido: {maxSizeMB} MB</small>
      )}
    </div>
  )
}
