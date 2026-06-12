import SalesNotePdfUploader from './SalesNotePdfUploader'
import styles from './SalesNoteStep.module.css'

export default function SalesNoteStep({ draft, errors, onChange, onSearch }) {
  const hasCode = Boolean(draft.salesNoteCode?.trim())
  return (
    <div className={styles.mainPanelClean}>
      <section className={styles.sectionCardClean} aria-labelledby="sales-note-data-title">
        <h2 className={styles.sectionHeader} id="sales-note-data-title">
          <i className="bi bi-file-earmark-text" aria-hidden="true" />
          Datos de Nota de Venta
        </h2>

        <div className={styles.formBlock}>
          <label className={styles.label} htmlFor="sales-note-code">
            Código de Nota de Venta <span className={styles.requiredMark}>*</span>
          </label>

          <div className={styles.codeFieldRow}>
            <span className={styles.inputWrapper}>
              <input
                className={`${styles.input} ${hasCode && !errors.salesNoteCode ? styles.inputValid : ''}`}
                id="sales-note-code"
                onChange={(event) => onChange('salesNoteCode', event.target.value)}
                placeholder="Ingrese el código de Nota de Venta"
                type="text"
                value={draft.salesNoteCode}
              />
              {hasCode && !errors.salesNoteCode && (
                <span className={styles.inlineCheck} aria-label="Código ingresado">
                  <i className="bi bi-check-lg" aria-hidden="true" />
                </span>
              )}
            </span>

            <button className={styles.searchButton} onClick={onSearch} type="button">
              <i className="bi bi-search" aria-hidden="true" />
              Buscar / Exportar información
            </button>
          </div>

          {errors.salesNoteCode && <p className={styles.errorText}>{errors.salesNoteCode}</p>}
        </div>
      </section>

      <section className={styles.sectionCardClean} aria-labelledby="sales-note-pdf-title">
        <h2 className={styles.sectionHeader} id="sales-note-pdf-title">
          <i className="bi bi-filetype-pdf" aria-hidden="true" />
          Nota de Venta
        </h2>
        <div className={styles.formBlock}>
          <label className={styles.label} htmlFor="sales-note-pdf-upload">
            Archivo de Nota de Venta <span className={styles.requiredMark}>*</span>
          </label>
          <SalesNotePdfUploader
            error={errors.salesNotePdf}
            file={draft.salesNotePdf}
            salesNoteCode={draft.salesNoteCode}
            onFileChange={(file) => onChange('salesNotePdf', file)}
          />
        </div>
        <p className={styles.helperText}>Tamaño máximo permitido: 10 MB · Formato PDF.</p>
      </section>
    </div>
  )
}
