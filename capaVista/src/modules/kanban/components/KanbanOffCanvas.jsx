import { PaymentDeconfirmationModal } from './PaymentDeconfirmationModal.jsx';
import { CancelProductionModal } from './CancelProductionModal.jsx';
import { SubprocessAuthModal } from './SubprocessAuthModal.jsx';
import { KanbanComments } from './KanbanComments.jsx';
import { KanbanSubprocesses } from './KanbanSubprocesses.jsx';
import { KanbanOrderSummary } from './KanbanOrderSummary.jsx';
import {
  getOrderItems,
  getCommentGroups,
  KANBAN_EN_PRODUCCION_STEP,
  KANBAN_LISTO_PRODUCCION_STEP,
  isLanyardPackagingBlocked,
} from '../utils/kanbanDetail.js';
import { useState } from 'react';
import styles from '../styles/Kanban.module.css';

export default function KanbanOffCanvas({
  canCancelProduction = false,
  canRollbackSubprocess = false,
  canCompleteSubprocess = false,
  canReview = false,
  canReevaluate = false,
  isOpen,
  onApprovePaymentDeconfirmation,
  onClose,
  onCompleteSubprocess,
  onRollbackSubprocess,
  onReevaluate,
  onCancelProduction,
  onSendToReview,
  order,
}) {
  const [authModal, setAuthModal] = useState(null)
  const [operatorPin, setOperatorPin] = useState('')
  const [operatorComment, setOperatorComment] = useState('')
  const [authError, setAuthError] = useState('')
  const [isCompletingSubprocess, setIsCompletingSubprocess] = useState(false)
  const [isCorrectionFormOpen, setIsCorrectionFormOpen] = useState(false)
  const [correctionText, setCorrectionText] = useState('')
  const [correctionError, setCorrectionError] = useState('')
  const [deconfirmationAuthOpen, setDeconfirmationAuthOpen] = useState(false)
  const [deconfirmationPin, setDeconfirmationPin] = useState('')
  const [deconfirmationError, setDeconfirmationError] = useState('')
  const [isApprovingDeconfirmation, setIsApprovingDeconfirmation] = useState(false)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [cancelPin, setCancelPin] = useState('')
  const [cancelComment, setCancelComment] = useState('')
  const [cancelError, setCancelError] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)
  const [isReevaluating, setIsReevaluating] = useState(false)

  if (!isOpen || !order) {
    return null
  }

  const orderItems = getOrderItems(order)
  const commentGroups = getCommentGroups(order)
  const isInProduction = Number(order.generalStepId) === KANBAN_EN_PRODUCCION_STEP
  const canRequestCorrection = canReview && Number(order.generalStepId) === KANBAN_LISTO_PRODUCCION_STEP
  const hasCorrectionRequest = Boolean(order.correctionRequested)
  const canApprovePaymentDeconfirmation =
    canReview && typeof onApprovePaymentDeconfirmation === 'function' &&
    Number(order.generalStepId) === KANBAN_LISTO_PRODUCCION_STEP &&
    Boolean(order.paymentDeconfirmationRequested)

  function openAuthModal(item, process, processIndex, currentProcessIndex) {
    if (
      !canCompleteSubprocess ||
      !isInProduction ||
      process.status === 'done' ||
      processIndex !== currentProcessIndex ||
      isLanyardPackagingBlocked(item, process)
    ) {
      return
    }

    setAuthModal({ item, process, action: 'complete' })
    setOperatorPin('')
    setOperatorComment('')
    setAuthError('')
  }

  function closeAuthModal() {
    if (isCompletingSubprocess) return
    setAuthModal(null)
    setOperatorPin('')
    setOperatorComment('')
    setAuthError('')
  }

  function openRollbackModal(item, process) {
    setAuthModal({ item, process, action: 'rollback' })
    setOperatorPin('')
    setOperatorComment('')
    setAuthError('')
  }

  async function completeSubProcess(event) {
    event.preventDefault()
    if (isCompletingSubprocess) return
    const trimmedPin = operatorPin.trim()

    if (!/^\d{6}$/.test(trimmedPin)) {
      setAuthError('Ingrese un PIN valido de 6 digitos.')
      return
    }

    const trimmedComment = operatorComment.trim()

    if (authModal.action === 'rollback' && !trimmedComment) {
      setAuthError('Debe ingresar una observacion para retroceder.')
      return
    }

    setIsCompletingSubprocess(true)
    const action = authModal.action === 'rollback' ? onRollbackSubprocess : onCompleteSubprocess
    const wasCompleted = await action?.(order, authModal.item, authModal.process, {
      pin: trimmedPin,
      comment: trimmedComment,
    }).finally(() => setIsCompletingSubprocess(false))

    if (wasCompleted === false) {
      setAuthError('No fue posible completar el subproceso.')
      return
    }

    closeAuthModal()
  }

  async function submitCorrection(event) {
    event.preventDefault()
    const trimmedCorrection = correctionText.trim()

    if (!trimmedCorrection) {
      setCorrectionError('Debe especificar la correccion necesaria.')
      return
    }

    const wasSent = await onSendToReview?.(order, trimmedCorrection)
    if (wasSent === false) {
      setCorrectionError('No fue posible enviar el pedido a revisión.')
      return
    }
    setCorrectionText('')
    setCorrectionError('')
    setIsCorrectionFormOpen(false)
  }

  async function submitCancellation(event) {
    event.preventDefault()
    if (isCancelling) return

    const pin = cancelPin.trim()
    const comment = cancelComment.trim()
    if (!/^\d{6}$/.test(pin)) {
      setCancelError('Ingrese un PIN valido de 6 digitos.')
      return
    }
    if (!comment) {
      setCancelError('Debe ingresar una observacion para cancelar.')
      return
    }

    setIsCancelling(true)
    try {
      const wasCancelled = await onCancelProduction?.(order, { pin, comment })
      if (wasCancelled === false) {
        setCancelError('No fue posible cancelar la produccion.')
      }
    } finally {
      setIsCancelling(false)
    }
  }

  function closeDeconfirmationAuthModal() {
    if (isApprovingDeconfirmation) return

    setDeconfirmationAuthOpen(false)
    setDeconfirmationPin('')
    setDeconfirmationError('')
  }

  async function approvePaymentDeconfirmation(event) {
    event.preventDefault()
    const trimmedPin = deconfirmationPin.trim()

    if (!/^\d{6}$/.test(trimmedPin)) {
      setDeconfirmationError('Ingrese un PIN valido de 6 digitos.')
      return
    }

    setIsApprovingDeconfirmation(true)
    setDeconfirmationError('')

    try {
      const wasApproved = await onApprovePaymentDeconfirmation?.(order, {
        pin: trimmedPin,
      })
      if (wasApproved === false) {
        setDeconfirmationError('No fue posible aprobar la desconfirmacion.')
        return
      }
      setDeconfirmationAuthOpen(false)
      setDeconfirmationPin('')
    } finally {
      setIsApprovingDeconfirmation(false)
    }
  }

  return (
    <div className={styles.offcanvasLayer} role="presentation">
      <aside aria-labelledby="kanban-detail-title" className={styles.offcanvasPanel} role="dialog">
        <header className={styles.offcanvasHeader}>
          <div>
            <span className={styles.offcanvasKicker}>{order.salesNoteNumber}</span>
            <h2 id="kanban-detail-title">Detalle del pedido</h2>
          </div>
          <button aria-label="Cerrar detalle" className={styles.offcanvasCloseButton} onClick={onClose} type="button">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <div className={styles.offcanvasBody}>
          <KanbanOrderSummary
            order={order}
            orderItems={orderItems}
          />

          {canApprovePaymentDeconfirmation && (
            <section className={styles.detailSection}>
              <div className={styles.deconfirmationApprovalPanel}>
                <div>
                  <span>Solicitud de desconfirmacion</span>
                  <strong>
                    {order.paymentDeconfirmationRequestedBy || 'Cobranza'} solicita devolver este pedido a Confirmacion de pago.
                  </strong>
                </div>
                <button
                  className={styles.orderCardButton}
                  onClick={() => setDeconfirmationAuthOpen(true)}
                  type="button"
                >
                  <i className="bi bi-check2-circle" aria-hidden="true" />
                  Aprobar Desconfirmacion
                </button>
              </div>
            </section>
          )}

          {canRequestCorrection && (
            <section className={styles.detailSection}>
              <h3>Correccion previa a OP</h3>
              {hasCorrectionRequest && (
                <div className={styles.correctionNotice}>
                  <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
                  <span>Este pedido quedo marcado en correccion.</span>
                </div>
              )}
              <button
                className={styles.correctionButton}
                onClick={() => {
                  setIsCorrectionFormOpen((currentValue) => !currentValue)
                  setCorrectionError('')
                }}
                type="button"
              >
                <i className="bi bi-pencil-square" aria-hidden="true" />
                Solicita correccion
              </button>

              {isCorrectionFormOpen && (
                <form className={styles.correctionForm} onSubmit={submitCorrection}>
                  <label htmlFor="correction-request-text">Especifique la correccion necesaria</label>
                  <textarea
                    id="correction-request-text"
                    onChange={(event) => {
                      setCorrectionText(event.target.value)
                      setCorrectionError('')
                    }}
                    placeholder="Ej: corregir posicion del codigo antes de generar la OP."
                    rows={4}
                    value={correctionText}
                  />
                  {correctionError && <p className={styles.operatorModalError}>{correctionError}</p>}
                  <div className={styles.correctionActions}>
                    <button
                      className={styles.resetFilterButton}
                      onClick={() => {
                        setIsCorrectionFormOpen(false)
                        setCorrectionText('')
                        setCorrectionError('')
                      }}
                      type="button"
                    >
                      Cancelar
                    </button>
                    <button className={styles.orderCardButton} type="submit">
                      Confirmar correccion
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}

          <KanbanSubprocesses
            isInProduction={isInProduction}
            orderItems={orderItems}
            canCompleteSubprocess={canCompleteSubprocess}
            canRollbackSubprocess={canRollbackSubprocess}
            openRollbackModal={openRollbackModal}
            openAuthModal={openAuthModal}
          />

          {canCancelProduction && (
            <section className={`${styles.detailSection} ${styles.dangerZone}`}>
              <h3>Cancelar produccion</h3>
              <button
                className={styles.correctionButton}
                onClick={() => {
                  setCancelError('')
                  setIsCancelModalOpen(true)
                }}
                type="button"
              >
                <i className="bi bi-x-octagon" aria-hidden="true" />
                Cancelar pedido
              </button>
            </section>
          )}

          {canReevaluate && (
            <section className={styles.detailSection}>
              <h3>Revision del pedido</h3>
              <button className={styles.orderCardButton} disabled={isReevaluating} onClick={async () => {
                setIsReevaluating(true)
                try { await onReevaluate?.(order) } finally { setIsReevaluating(false) }
              }} type="button">
                <i className="bi bi-arrow-repeat" aria-hidden="true" />
                {isReevaluating ? 'Reevaluando...' : 'Reevaluar pedido'}
              </button>
            </section>
          )}

          <KanbanComments
            commentGroups={commentGroups}
          />
        </div>
      </aside>

      {authModal && (
        <SubprocessAuthModal
          completeSubProcess={completeSubProcess}
          authModal={authModal}
          isCompletingSubprocess={isCompletingSubprocess}
          closeAuthModal={closeAuthModal}
          setOperatorPin={setOperatorPin}
          setAuthError={setAuthError}
          operatorPin={operatorPin}
          setOperatorComment={setOperatorComment}
          operatorComment={operatorComment}
          authError={authError}
        />
      )}

      {isCancelModalOpen && (
        <CancelProductionModal
          submitCancellation={submitCancellation}
          isCancelling={isCancelling}
          setIsCancelModalOpen={setIsCancelModalOpen}
          setCancelPin={setCancelPin}
          setCancelError={setCancelError}
          cancelPin={cancelPin}
          setCancelComment={setCancelComment}
          cancelComment={cancelComment}
          cancelError={cancelError}
        />
      )}

      {deconfirmationAuthOpen && (
        <PaymentDeconfirmationModal
          approvePaymentDeconfirmation={approvePaymentDeconfirmation}
          isApprovingDeconfirmation={isApprovingDeconfirmation}
          closeDeconfirmationAuthModal={closeDeconfirmationAuthModal}
          order={order}
          setDeconfirmationPin={setDeconfirmationPin}
          setDeconfirmationError={setDeconfirmationError}
          deconfirmationPin={deconfirmationPin}
          deconfirmationError={deconfirmationError}
        />
      )}
    </div>
  )
}
