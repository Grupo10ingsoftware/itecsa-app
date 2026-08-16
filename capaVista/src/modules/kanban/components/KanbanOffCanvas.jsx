import { useState } from 'react'
import styles from '../styles/Kanban.module.css'

const KANBAN_EN_PRODUCCION_STEP = 2

function formatStatus(process) {
  if (process.status === 'done') return process.operatorEmail || 'Completado'
  if (process.status === 'current') return 'En curso'

  return 'Bloqueado'
}

function formatCommentMeta(comment) {
  const parts = []

  if (comment.operatorEmail) parts.push(comment.operatorEmail)
  if (comment.createdAt) {
    const date = new Date(comment.createdAt)
    if (!Number.isNaN(date.getTime())) {
      parts.push(date.toLocaleString('es-CL'))
    }
  }

  return parts.join(' - ')
}

function getOrderItems(order) {
  if (Array.isArray(order?.items) && order.items.length > 0) {
    return order.items
  }

  return [
    {
      id: `${order.id}-principal`,
      detailId: null,
      product: order.product,
      quantity: order.quantity ?? null,
      dueDate: order.dueDate ?? null,
      subProcesses: Array.isArray(order.subProcesses) ? order.subProcesses : [],
      comments: [],
    },
  ]
}

export default function KanbanOffCanvas({
  error,
  isLoading = false,
  isOpen,
  onClose,
  onCompleteSubprocess,
  order,
}) {
  const [authModal, setAuthModal] = useState(null)
  const [operatorComment, setOperatorComment] = useState('')
  const [authError, setAuthError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !order) {
    return null
  }

  const orderItems = getOrderItems(order)
  const comments =
    Array.isArray(order.comments) && order.comments.length > 0
      ? order.comments
      : orderItems.flatMap((item) => (Array.isArray(item.comments) ? item.comments : []))
  const isInProduction = Number(order.generalStepId) === KANBAN_EN_PRODUCCION_STEP

  function openAuthModal(item, process) {
    if (!isInProduction || process.status !== 'current' || !item.detailId || !process.id) {
      return
    }

    setAuthModal({ item, process })
    setOperatorComment('')
    setAuthError('')
  }

  function closeAuthModal() {
    if (isSubmitting) return

    setAuthModal(null)
    setOperatorComment('')
    setAuthError('')
  }

  async function completeSubProcess(event) {
    event.preventDefault()

    if (!authModal?.item?.detailId || !authModal?.process?.id) {
      setAuthError('No fue posible resolver el subproceso seleccionado.')
      return
    }

    setIsSubmitting(true)
    setAuthError('')

    try {
      const wasCompleted = await onCompleteSubprocess?.({
        detailId: authModal.item.detailId,
        subprocessId: authModal.process.id,
        comment: operatorComment.trim(),
      })

      if (wasCompleted === false) {
        setAuthError('No fue posible completar el subproceso.')
        return
      }

      setAuthModal(null)
      setOperatorComment('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.offcanvasLayer} role="presentation">
      <aside aria-labelledby="kanban-detail-title" className={styles.offcanvasPanel} role="dialog">
        <header className={styles.offcanvasHeader}>
          <div>
            <span className={styles.offcanvasKicker}>{order.nv}</span>
            <h2 id="kanban-detail-title">Detalle del pedido</h2>
          </div>
          <button aria-label="Cerrar detalle" className={styles.offcanvasCloseButton} onClick={onClose} type="button">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <div className={styles.offcanvasBody}>
          {error && <div className={styles.kanbanError}>{error}</div>}
          {isLoading && <div className={styles.detailLoading}>Cargando detalle del pedido...</div>}

          <section className={styles.detailSection}>
            <h3>Resumen</h3>
            <dl className={styles.detailList}>
              <div>
                <dt>Cliente</dt>
                <dd>{order.clientName}</dd>
              </div>
              <div>
                <dt>Producto</dt>
                <dd>{order.product}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{order.orderStatus}</dd>
              </div>
              <div>
                <dt>Pago</dt>
                <dd>{order.paymentStatus || 'Sin informacion'}</dd>
              </div>
            </dl>
          </section>

          <section className={styles.detailSection}>
            <h3>Subprocesos</h3>
            {!isInProduction && (
              <div className={styles.stepperNotice}>
                <i className="bi bi-lock-fill" aria-hidden="true" />
                <span>Los subprocesos se habilitan cuando el pedido llega a En produccion.</span>
              </div>
            )}

            <div className={styles.stepperStack}>
              {orderItems.map((item) => (
                <article className={styles.stepperGroup} key={item.id}>
                  <h4>{item.product}</h4>
                  <dl className={styles.detailList}>
                    <div>
                      <dt>Cantidad</dt>
                      <dd>{item.quantity ?? 'No definida'}</dd>
                    </div>
                    <div>
                      <dt>Fecha estimada</dt>
                      <dd>{item.dueDate || 'Sin fecha definida'}</dd>
                    </div>
                  </dl>

                  {item.subProcesses.length > 0 ? (
                    <div className={styles.subProcessStepper}>
                      {item.subProcesses.map((process, index) => {
                        const isDone = process.status === 'done'
                        const isCurrent = isInProduction && process.status === 'current'
                        const isLocked = !isInProduction || process.status === 'locked'

                        return (
                          <button
                            aria-current={isCurrent ? 'step' : undefined}
                            className={[
                              styles.subProcessStep,
                              isDone ? styles.subProcessDone : '',
                              isCurrent ? styles.subProcessCurrent : '',
                              isLocked ? styles.subProcessLocked : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            disabled={isLoading || isLocked || isDone}
                            key={process.id}
                            onClick={() => openAuthModal(item, process)}
                            type="button"
                          >
                            <span className={styles.subProcessMarker}>
                              {isDone ? <i className="bi bi-check-lg" aria-hidden="true" /> : index + 1}
                            </span>
                            <span className={styles.subProcessContent}>
                              <span>{process.name}</span>
                              <strong>{formatStatus(process)}</strong>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className={styles.stepperNotice}>
                      <i className="bi bi-info-circle-fill" aria-hidden="true" />
                      <span>Este producto no tiene subprocesos configurados.</span>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className={styles.detailSection}>
            <h3>Comentarios</h3>
            <ul className={styles.commentList}>
              {comments.map((item) => (
                <li key={item.id}>
                  <span>{item.text}</span>
                  {formatCommentMeta(item) && <small>{formatCommentMeta(item)}</small>}
                </li>
              ))}
              {comments.length === 0 && <li className={styles.emptyComment}>Sin comentarios.</li>}
            </ul>
          </section>
        </div>
      </aside>

      {authModal && (
        <div className={styles.operatorModalLayer} role="presentation">
          <form
            aria-labelledby="operator-modal-title"
            className={styles.operatorModal}
            onSubmit={completeSubProcess}
            role="dialog"
          >
            <header className={styles.operatorModalHeader}>
              <div>
                <span className={styles.offcanvasKicker}>Validacion operario</span>
                <h3 id="operator-modal-title">{authModal.process.name}</h3>
              </div>
              <button
                aria-label="Cerrar validacion"
                className={styles.offcanvasCloseButton}
                disabled={isSubmitting}
                onClick={closeAuthModal}
                type="button"
              >
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            </header>

            <div className={styles.operatorModalBody}>
              <p className={styles.operatorModalText}>
                El avance quedara asociado al usuario autenticado.
              </p>
              <label>
                <span>Comentario opcional</span>
                <textarea
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setOperatorComment(event.target.value)
                    setAuthError('')
                  }}
                  placeholder="Describe una observacion del traspaso si corresponde."
                  rows={3}
                  value={operatorComment}
                />
              </label>
              {authError && <p className={styles.operatorModalError}>{authError}</p>}
            </div>

            <footer className={styles.operatorModalFooter}>
              <button className={styles.resetFilterButton} disabled={isSubmitting} onClick={closeAuthModal} type="button">
                Cancelar
              </button>
              <button className={styles.orderCardButton} disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Completando...' : 'Completar subproceso'}
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  )
}
