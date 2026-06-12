import DesignFilesUploader from './DesignFilesUploader'
import UploadedFileList from './UploadedFileList'
import styles from './DesignFilesStep.module.css'

export default function DesignFilesStep({ draft, error, onFilesAdd, onFileRemove, onFileReplace }) {
  const hasDesignFiles = draft.designFiles.length > 0

  return (
    <div className={`${styles.mainPanel} ${styles.designFilesPanel}`}>
      <section aria-labelledby="design-files-title">
        <header className={styles.designFilesHeader}>
          <h2 className={styles.sectionHeader} id="design-files-title">
            <i className="bi bi-file-earmark-arrow-up" aria-hidden="true" />
            Archivos de Diseño
          </h2>
          <p className={styles.helperText}>
            Los archivos de diseño son opcionales. Puede adjuntar documentos PDF con mockups, instrucciones u otros antecedentes que ayuden en la producción del pedido.
          </p>
        </header>

        {hasDesignFiles && (
          <UploadedFileList files={draft.designFiles} onRemove={onFileRemove} onReplace={onFileReplace} />
        )}

        <div className={styles.designFilesUploadBlock}>
          <DesignFilesUploader onFilesAdd={onFilesAdd} />
          <p className={styles.helperText}>Tamaño máximo permitido: 50 MB por archivo · Formato aceptado: PDF</p>
          {error && <p className={styles.errorText}>{error}</p>}
        </div>
      </section>
    </div>
  )
}
