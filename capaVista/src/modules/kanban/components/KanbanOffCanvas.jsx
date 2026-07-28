import { useState } from 'react'
import styles from '../styles/Kanban.module.css'

const KANBAN_LISTO_PRODUCCION_STEP = 1
const KANBAN_EN_PRODUCCION_STEP = 2

function formatStatus(status) {
  return status === 'done' ? 'Completado' : 'Pendiente'
}

const processTemplates = {
  lanyard: [
    { id: 'impresion', name: 'Impresion', status: 'pending' },
    { id: 'sublimacion', name: 'Sublimacion', status: 'pending' },
    { id: 'corte', name: 'Corte', status: 'pending' },
    { id: 'costura', name: 'Costura', status: 'pending' },
    { id: 'empaquetado', name: 'Empaquetado', status: 'pending' },
  ],
  tarjeta: [
    { id: 'revision-info', name: 'Revision info', status: 'pending' },
    { id: 'orden-info', name: 'Orden info', status: 'pending' },
    { id: 'carga-info', name: 'Carga info', status: 'pending' },
    { id: 'confeccion', name: 'Confeccion', status: 'pending' },
    { id: 'empaquetado', name: 'Empaquetado', status: 'pending' },
  ],
}

function getProductKey(productName) {
  const normalizedProductName = String(productName ?? '').toLowerCase()

  if (normalizedProductName.includes('lanyard')) return 'lanyard'
  if (normalizedProductName.includes('tarjeta')) return 'tarjeta'

  return null
}

function normalizeProcessName(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
}

function getSubProcessesForOrder(order) {
  const existingProcesses = Array.isArray(order.subProcesses) ? order.subProcesses : []
  const productKey = getProductKey(order.product)
  const template = productKey ? processTemplates[productKey] : existingProcesses

  return template.map((templateProcess) => {
    const existingProcess = existingProcesses.find(
      (process) =>
        process.id === templateProcess.id ||
        normalizeProcessName(process.name) === normalizeProcessName(templateProcess.name),
    )

    return {
      ...templateProcess,
      ...existingProcess,
      id: templateProcess.id,
      name: templateProcess.name,
      status: existingProcess?.status ?? templateProcess.status,
    }
  })
}

function getManufacturingDetails(order) {
  const productName = String(order.product ?? '').toLowerCase()
  const isTarjeta = productName.includes('tarjeta')
  const isLanyard = productName.includes('lanyard')

  return {
    width: order.manufacturingDetails?.width ?? (isTarjeta ? '85.6 mm' : isLanyard ? '20 mm' : 'No definido'),
    length: order.manufacturingDetails?.length ?? (isTarjeta ? '53.9 mm' : isLanyard ? '90 cm' : 'No definido'),
    legend: order.manufacturingDetails?.legend ?? `${order.clientName ?? 'Cliente'} - ${order.product ?? 'Producto'}`,
    seller: order.manufacturingDetails?.seller ?? 'Ventas ITECSA',
    dueDate: order.manufacturingDetails?.dueDate ?? order.dueDate ?? 'Sin fecha definida',
  }
}

export default function KanbanOffCanvas({ isOpen, onClose, onUpdateOrder, order }) {
  const [comment, setComment] = useState('')
  const [authModal, setAuthModal] = useState(null)
  const [operatorEmail, setOperatorEmail] = useState('')
  const [operatorPassword, setOperatorPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [isCorrectionFormOpen, setIsCorrectionFormOpen] = useState(false)
  const [correctionText, setCorrectionText] = useState('')
  const [correctionError, setCorrectionError] = useState('')

  if (!isOpen || !order) {
    return null
  }

  const subProcesses = getSubProcessesForOrder(order)
  const comments = Array.isArray(order.comments) ? order.comments : []
  const currentProcessIndex = subProcesses.findIndex((process) => process.status !== 'done')
  const manufacturingDetails = getManufacturingDetails(order)
  const isInProduction = Number(order.generalStepId) === KANBAN_EN_PRODUCCION_STEP
  const canRequestCorrection = Number(order.generalStepId) === KANBAN_LISTO_PRODUCCION_STEP
  const hasCorrectionRequest = Boolean(order.correctionRequested)

  function openAuthModal(process, processIndex) {
    if (!isInProduction || process.status === 'done' || processIndex !== currentProcessIndex) {
      return
    }

    setAuthModal(process)
    setOperatorEmail('')
    setOperatorPassword('')
    setAuthError('')
  }

  function closeAuthModal() {
    setAuthModal(null)
    setOperatorEmail('')
    setOperatorPassword('')
    setAuthError('')
  }

  function completeSubProcess(event) {
    event.preventDefault()
    const trimmedEmail = operatorEmail.trim()

    if (!trimmedEmail || !operatorPassword) {
      setAuthError('Ingrese correo y contrasena del operario.')
      return
    }

    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setAuthError('Ingrese un correo valido.')
      return
    }

    const nextOrder = {
      ...order,
      subProcesses: subProcesses.map((process) =>
        process.id === authModal.id
          ? {
              ...process,
              status: 'done',
              operatorEmail: trimmedEmail,
              completedAt: new Date().toISOString(),
            }
          : process,
      ),
    }

    onUpdateOrder(nextOrder)
    closeAuthModal()
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

  function submitCorrection(event) {
    event.preventDefault()
    const trimmedCorrection = correctionText.trim()

    if (!trimmedCorrection) {
      setCorrectionError('Debe especificar la correccion necesaria.')
      return
    }

    onUpdateOrder({
      ...order,
      correctionRequested: true,
      correctionComment: trimmedCorrection,
      correctionRequestedAt: new Date().toISOString(),
    })
    setCorrectionText('')
    setCorrectionError('')
    setIsCorrectionFormOpen(false)
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
              <div>
                <dt>Ancho</dt>
                <dd>{manufacturingDetails.width}</dd>
              </div>
              <div>
                <dt>Largo</dt>
                <dd>{manufacturingDetails.length}</dd>
              </div>
              <div>
                <dt>Leyenda</dt>
                <dd>{manufacturingDetails.legend}</dd>
              </div>
              <div>
                <dt>Vendedor responsable</dt>
                <dd>{manufacturingDetails.seller}</dd>
              </div>
              <div>
                <dt>Fecha de termino</dt>
                <dd>{manufacturingDetails.dueDate}</dd>
              </div>
            </dl>
          </section>

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

          <section className={styles.detailSection}>
            <h3>Subprocesos</h3>
            {!isInProduction && (
              <div className={styles.stepperNotice}>
                <i className="bi bi-lock-fill" aria-hidden="true" />
                <span>Los subprocesos se habilitan cuando el pedido llega a En produccion.</span>
              </div>
            )}
            <div className={styles.subProcessStepper}>
              {subProcesses.map((process, index) => {
                const isDone = process.status === 'done'
                const isCurrent = isInProduction && index === currentProcessIndex
                const isLocked = !isInProduction || (!isDone && !isCurrent)

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
                    disabled={isLocked || isDone}
                    key={process.id}
                    onClick={() => openAuthModal(process, index)}
                    type="button"
                  >
                    <span className={styles.subProcessMarker}>
                      {isDone ? <i className="bi bi-check-lg" aria-hidden="true" /> : index + 1}
                    </span>
                    <span className={styles.subProcessContent}>
                      <span>{process.name}</span>
                      <strong>
                        {isDone
                          ? process.operatorEmail || formatStatus(process.status)
                          : isCurrent && isInProduction
                            ? 'En curso'
                            : 'Bloqueado'}
                      </strong>
                    </span>
                  </button>
                )
              })}
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
                <h3 id="operator-modal-title">{authModal.name}</h3>
              </div>
              <button
                aria-label="Cerrar validacion"
                className={styles.offcanvasCloseButton}
                onClick={closeAuthModal}
                type="button"
              >
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            </header>

            <div className={styles.operatorModalBody}>
              <label>
                <span>Correo</span>
                <input
                  autoComplete="email"
                  onChange={(event) => setOperatorEmail(event.target.value)}
                  placeholder="operario@itecsa.cl"
                  type="email"
                  value={operatorEmail}
                />
              </label>
              <label>
                <span>Contrasena</span>
                <input
                  autoComplete="current-password"
                  onChange={(event) => setOperatorPassword(event.target.value)}
                  placeholder="Ingrese contrasena"
                  type="password"
                  value={operatorPassword}
                />
              </label>
              {authError && <p className={styles.operatorModalError}>{authError}</p>}
            </div>

            <footer className={styles.operatorModalFooter}>
              <button className={styles.resetFilterButton} onClick={closeAuthModal} type="button">
                Cancelar
              </button>
              <button className={styles.orderCardButton} type="submit">
                Completar subproceso
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  )
}
