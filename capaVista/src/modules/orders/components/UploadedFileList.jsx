import { useState } from 'react'
import SalesNotePreviewModal from './SalesNotePreviewModal'
import { formatFileSize, getFileIconClass } from '../utils/orderCreateFormatters'
import styles from './UploadedFileList.module.css'

export default function UploadedFileList({ files, onRemove, onReplace }) {
  const [previewFile, setPreviewFile] = useState(null)

  if (!files.length) {
    return null
  }

  const handleReplaceChange = (index, event) => {
    const selectedFile = event.target.files?.[0] || null
    if (selectedFile) onReplace(index, selectedFile)
    event.target.value = ''
  }

  return (
    <div className={styles.designList}>
      {files.map((file, index) => {
        const replaceInputId = `design-file-replace-${index}`

        return (
          <div className={styles.fileRow} key={`${file.name}-${file.size}-${index}`}>
            <span className={`${styles.fileIcon} ${styles.fileIconGeneric}`}>
              <i className={`bi ${getFileIconClass(file.name)}`} aria-hidden="true" />
            </span>
            <span>
              <p className={styles.fileTitle}>{file.name}</p>
              <p className={styles.fileMeta}>{formatFileSize(file.size)}</p>
            </span>
            <span className={styles.fileActions}>
              <button className={`${styles.smallAction} ${styles.smallActionBlue}`} onClick={() => setPreviewFile(file)} type="button">
                <i className="bi bi-eye" aria-hidden="true" />
                Ver
              </button>
              <label className={`${styles.smallAction} ${styles.smallActionDark}`} htmlFor={replaceInputId}>
                <i className="bi bi-arrow-repeat" aria-hidden="true" />
                Reemplazar
              </label>
              <input
                accept="application/pdf,.pdf"
                className={styles.hiddenInput}
                id={replaceInputId}
                onChange={(event) => handleReplaceChange(index, event)}
                type="file"
              />
              <button className={`${styles.smallAction} ${styles.smallActionRed}`} onClick={() => onRemove(index)} type="button">
                <i className="bi bi-trash" aria-hidden="true" />
                Eliminar
              </button>
            </span>
          </div>
        )
      })}

      {previewFile && (
        <SalesNotePreviewModal
          description="Revisa el archivo de diseño adjunto antes de continuar con el registro del pedido."
          documentLabel="Archivo de Diseño"
          emptyMessage="La vista previa embebida está disponible para archivos PDF. Este archivo quedó adjunto al registro."
          file={previewFile}
          title="Vista previa"
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  )
}
