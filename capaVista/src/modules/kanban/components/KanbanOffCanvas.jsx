import { useState } from 'react'
import styles from '../styles/Kanban.module.css'

function formatStatus(status) {
  return status === 'done' ? 'Completado' : 'Pendiente'
}

export default function KanbanOffCanvas({ isOpen, onClose, onUpdateOrder, order }) {
  const [comment, setComment] = useState('')

  if (!isOpen || !order) {
    return null
  }

  const subProcesses = Array.isArray(order.subProcesses) ? order.subProcesses : []
  const comments = Array.isArray(order.comments) ? order.comments : []

  function updateSubProcess(processId) {
    const nextOrder = {
      ...order,
      subProcesses: subProcesses.map((process) =>
        process.id === processId
          ? { ...process, status: process.status === 'done' ? 'pending' : 'done' }
          : process,
      ),
    }

    onUpdateOrder(nextOrder)
  }

  function addComment(event) {
    event.preventDefault()
    const trimmedComment = comment.trim()

    if (!trimmedComment) {
      return
    }

    onUpdateOrder({
      ...order,
      comments: [
        ...comments,
        {
          id: `${order.id}-${Date.now()}`,
          text: trimmedComment,
        },
      ],
    })
    setComment('')
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
            <div className={styles.subProcessList}>
              {subProcesses.map((process) => (
                <button
                  className={`${styles.subProcessItem} ${process.status === 'done' ? styles.subProcessDone : ''}`}
                  key={process.id}
                  onClick={() => updateSubProcess(process.id)}
                  type="button"
                >
                  <span>{process.name}</span>
                  <strong>{formatStatus(process.status)}</strong>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.detailSection}>
            <h3>Comentarios</h3>
            <form className={styles.commentForm} onSubmit={addComment}>
              <textarea
                onChange={(event) => setComment(event.target.value)}
                placeholder="Agregar comentario"
                rows={3}
                value={comment}
              />
              <button className={styles.orderCardButton} type="submit">
                Agregar comentario
              </button>
            </form>
            <ul className={styles.commentList}>
              {comments.map((item) => (
                <li key={item.id}>{item.text}</li>
              ))}
              {comments.length === 0 && <li className={styles.emptyComment}>Sin comentarios.</li>}
            </ul>
          </section>
        </div>
      </aside>
    </div>
  )
}
