import styles from './DocumentPreviewModalLayout.module.css'

const MODAL_CLASS_BY_VARIANT = {
  salesNote: {
    backdrop: styles.salesNoteModalBackdrop,
    dialog: styles.salesNoteModalDialog,
    expandedDialog: styles.salesNoteModalDialogExpanded,
    header: styles.salesNoteModalHeader,
    kicker: styles.salesNoteModalKicker,
    headerDescription: styles.salesNoteModalHeaderDescription,
    closeButton: styles.salesNoteModalCloseButton,
    footer: styles.salesNoteModalFooter,
    dialogExtra: '',
  },
  actionConfirm: {
    backdrop: styles.confirmModalBackdrop,
    dialog: styles.confirmModalDialog,
    expandedDialog: styles.confirmModalDialogExpanded,
    header: styles.confirmModalHeader,
    kicker: styles.confirmModalKicker,
    headerDescription: styles.confirmModalHeaderDescription,
    closeButton: styles.confirmModalCloseButton,
    footer: styles.confirmModalFooter,
    dialogExtra: 'overflow-hidden',
  },
}

export default function DocumentPreviewModalLayout({
  bodyClassName,
  children,
  closeAriaLabel,
  description,
  expanded = false,
  footer,
  kicker,
  onClose,
  title,
  titleId,
  variant = 'salesNote',
}) {
  const modalClasses = MODAL_CLASS_BY_VARIANT[variant]

  return (
    <div
      className={`${modalClasses.backdrop} d-flex align-items-center justify-content-center position-fixed`}
      onMouseDown={onClose}
      role="presentation"
    >
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className={`${modalClasses.dialog} ${
          expanded ? modalClasses.expandedDialog : ''
        } bg-white ${modalClasses.dialogExtra} w-100`}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header
          className={`${modalClasses.header} d-flex align-items-start justify-content-between`}
        >
          <div>
            <span className={modalClasses.kicker}>{kicker}</span>
            <h2 id={titleId}>{title}</h2>
            <p className={modalClasses.headerDescription}>{description}</p>
          </div>

          <button
            aria-label={closeAriaLabel}
            className={modalClasses.closeButton}
            onClick={onClose}
            type="button"
          >
            <i className="bi bi-x-lg" />
          </button>
        </header>

        <div className={bodyClassName}>{children}</div>

        <footer
          className={`${modalClasses.footer} d-flex gap-3 justify-content-end`}
        >
          {footer}
        </footer>
      </section>
    </div>
  )
}
