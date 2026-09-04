import { useState } from 'react'
import styles from '../styles/Kanban.module.css'

const KANBAN_LISTO_PRODUCCION_STEP = 1
const KANBAN_EN_PRODUCCION_STEP = 2

function formatStatus(status) {
  return status === 'done' ? 'Completado' : 'Pendiente'
}

function getSubProcessesForItem(item) {
  const existingProcesses = Array.isArray(item.subProcesses) ? item.subProcesses : []

  return existingProcesses.map((process, index) => ({
    ...process,
    id: process.id ?? String(process.id_estado_subproceso ?? index),
    name: process.name ?? process.nombre_estado ?? 'Subproceso',
    status: process.status ?? 'pending',
  }))
}

function isLanyardItem(item) {
  return String(item.product ?? '').toLowerCase().includes('lanyard')
}

function getOrderItems(order) {
  const items = Array.isArray(order.items) && order.items.length > 0
    ? order.items
    : [
        {
          id: `${order.id}-principal`,
          product: order.product,
          quantity: order.quantity,
          dueDate: order.dueDate,
          manufacturingDetails: order.manufacturingDetails,
          subProcesses: order.subProcesses,
        },
      ]

  return items
    .map((item, index) => ({
      ...item,
      id: item.id ?? `${order.id}-${index}`,
      product: item.product ?? order.product ?? 'Producto no definido',
      quantity: item.quantity ?? order.quantity ?? null,
      dueDate: item.dueDate ?? order.dueDate ?? null,
      subProcesses: getSubProcessesForItem(item),
    }))
    .sort((left, right) => {
      const leftPriority = isLanyardItem(left) ? 0 : 1
      const rightPriority = isLanyardItem(right) ? 0 : 1

      return leftPriority - rightPriority
    })
}

function getManufacturingDetails(item, order) {
  const productName = String(item.product ?? '').toLowerCase()
  const isTarjeta = productName.includes('tarjeta')
  const isLanyard = productName.includes('lanyard')
  const details = item.manufacturingDetails ?? {}

  return {
    width: details.width ?? (isTarjeta ? '85.6 mm' : isLanyard ? '20 mm' : 'No definido'),
    length: details.length ?? (isTarjeta ? '53.9 mm' : isLanyard ? '90 cm' : 'No definido'),
    tapeTexture: details.tapeTexture ?? 'Poliester',
    backgroundColor: details.backgroundColor ?? 'No definido',
    reverseLegend: details.reverseLegend ?? details.legend ?? 'No definido',
    frontLegend: details.frontLegend ?? details.legend ?? `${order.clientName ?? 'Cliente'} - ${item.product ?? 'Producto'}`,
    endings: details.endings ?? 'No definido',
    cardType: details.cardType ?? 'Plastificada',
    seller: details.seller ?? order.seller ?? 'Ventas ITECSA',
    dueDate: details.dueDate ?? item.dueDate ?? order.dueDate ?? 'Sin fecha definida',
  }
}

function getInitialDocumentLookup(order) {
  return {
    clientSheetCode: order.productionDocuments?.clientSheetCode ?? order.clientSheetCode ?? '',
    clientSheetError: '',
    clientSheetSearched: Boolean(order.productionDocuments?.clientSheetCode ?? order.clientSheetCode),
    opCode: order.productionDocuments?.opCode ?? order.opCode ?? '',
    opError: '',
    opSearched: Boolean(order.productionDocuments?.opCode ?? order.opCode),
  }
}

function ProductionDocumentLookup({ onUpdateOrder, order }) {
  const [documentLookup, setDocumentLookup] = useState(() => getInitialDocumentLookup(order))

  function updateDocumentLookup(field, value) {
    setDocumentLookup((currentLookup) => ({
      ...currentLookup,
      [field]: value,
      [`${field.replace('Code', '')}Error`]: '',
      [`${field.replace('Code', '')}Searched`]: false,
    }))
  }

  function searchProductionDocument(kind) {
    const codeField = kind === 'op' ? 'opCode' : 'clientSheetCode'
    const errorField = kind === 'op' ? 'opError' : 'clientSheetError'
    const searchedField = kind === 'op' ? 'opSearched' : 'clientSheetSearched'
    const trimmedCode = documentLookup[codeField].trim()

    if (!trimmedCode) {
      setDocumentLookup((currentLookup) => ({
        ...currentLookup,
        [errorField]: kind === 'op' ? 'Debe ingresar el codigo de OP.' : 'Debe ingresar el codigo de ficha de cliente.',
        [searchedField]: false,
      }))
      return
    }

    const nextProductionDocuments = {
      ...(order.productionDocuments ?? {}),
      [codeField]: trimmedCode,
      [`${kind}ExportedAt`]: new Date().toISOString(),
    }

    setDocumentLookup((currentLookup) => ({
      ...currentLookup,
      [codeField]: trimmedCode,
      [errorField]: '',
      [searchedField]: true,
    }))

    onUpdateOrder({
      ...order,
      productionDocuments: nextProductionDocuments,
    })
  }

  return (
    <section className={styles.documentLookupSection} aria-labelledby="production-documents-title">
      <h3 className={styles.documentLookupHeader} id="production-documents-title">
        <i className="bi bi-file-earmark-text" aria-hidden="true" />
        Documentos para produccion
      </h3>

      <div className={styles.documentLookupGrid}>
        <div className={styles.documentLookupBlock}>
          <label className={styles.documentLookupLabel} htmlFor="op-code">
            Codigo de OP <span className={styles.documentRequiredMark}>*</span>
          </label>
          <div className={styles.documentLookupRow}>
            <span className={styles.documentInputWrapper}>
              <input
                className={[
                  styles.documentLookupInput,
                  documentLookup.opSearched && !documentLookup.opError ? styles.documentLookupInputValid : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                id="op-code"
                onChange={(event) => updateDocumentLookup('opCode', event.target.value)}
                placeholder="Ingrese el codigo de OP"
                type="text"
                value={documentLookup.opCode}
              />
              {documentLookup.opSearched && !documentLookup.opError && (
                <span className={styles.documentInlineCheck} aria-label="OP encontrada">
                  <i className="bi bi-check-lg" aria-hidden="true" />
                </span>
              )}
            </span>
            <button className={styles.documentSearchButton} onClick={() => searchProductionDocument('op')} type="button">
              <i className="bi bi-search" aria-hidden="true" />
              Buscar / Exportar informacion
            </button>
          </div>
          {documentLookup.opError && <p className={styles.documentErrorText}>{documentLookup.opError}</p>}
        </div>

        <div className={styles.documentLookupBlock}>
          <label className={styles.documentLookupLabel} htmlFor="client-sheet-code">
            Codigo de ficha de cliente <span className={styles.documentRequiredMark}>*</span>
          </label>
          <div className={styles.documentLookupRow}>
            <span className={styles.documentInputWrapper}>
              <input
                className={[
                  styles.documentLookupInput,
                  documentLookup.clientSheetSearched && !documentLookup.clientSheetError
                    ? styles.documentLookupInputValid
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                id="client-sheet-code"
                onChange={(event) => updateDocumentLookup('clientSheetCode', event.target.value)}
                placeholder="Ingrese el codigo de ficha de cliente"
                type="text"
                value={documentLookup.clientSheetCode}
              />
              {documentLookup.clientSheetSearched && !documentLookup.clientSheetError && (
                <span className={styles.documentInlineCheck} aria-label="Ficha de cliente encontrada">
                  <i className="bi bi-check-lg" aria-hidden="true" />
                </span>
              )}
            </span>
            <button
              className={styles.documentSearchButton}
              onClick={() => searchProductionDocument('clientSheet')}
              type="button"
            >
              <i className="bi bi-search" aria-hidden="true" />
              Buscar / Exportar informacion
            </button>
          </div>
          {documentLookup.clientSheetError && <p className={styles.documentErrorText}>{documentLookup.clientSheetError}</p>}
        </div>
      </div>
    </section>
  )
}

export default function KanbanOffCanvas({
  isOpen,
  onApprovePaymentDeconfirmation,
  onClose,
  onCompleteSubprocess,
  onUpdateOrder,
  order,
}) {
  const [authModal, setAuthModal] = useState(null)
  const [operatorPin, setOperatorPin] = useState('')
  const [operatorComment, setOperatorComment] = useState('')
  const [authError, setAuthError] = useState('')
  const [isCorrectionFormOpen, setIsCorrectionFormOpen] = useState(false)
  const [correctionText, setCorrectionText] = useState('')
  const [correctionError, setCorrectionError] = useState('')
  const [deconfirmationAuthOpen, setDeconfirmationAuthOpen] = useState(false)
  const [deconfirmationPin, setDeconfirmationPin] = useState('')
  const [deconfirmationError, setDeconfirmationError] = useState('')
  const [isApprovingDeconfirmation, setIsApprovingDeconfirmation] = useState(false)

  if (!isOpen || !order) {
    return null
  }

  const orderItems = getOrderItems(order)
  const comments = Array.isArray(order.comments) ? order.comments : []
  const isInProduction = Number(order.generalStepId) === KANBAN_EN_PRODUCCION_STEP
  const canRequestCorrection = Number(order.generalStepId) === KANBAN_LISTO_PRODUCCION_STEP
  const hasCorrectionRequest = Boolean(order.correctionRequested)
  const canApprovePaymentDeconfirmation =
    Number(order.generalStepId) === KANBAN_LISTO_PRODUCCION_STEP &&
    Boolean(order.paymentDeconfirmationRequested)

  function openAuthModal(item, process, processIndex, currentProcessIndex) {
    if (!isInProduction || process.status === 'done' || processIndex !== currentProcessIndex) {
      return
    }

    setAuthModal({ item, process })
    setOperatorPin('')
    setOperatorComment('')
    setAuthError('')
  }

  function closeAuthModal() {
    setAuthModal(null)
    setOperatorPin('')
    setOperatorComment('')
    setAuthError('')
  }

  async function completeSubProcess(event) {
    event.preventDefault()
    const trimmedPin = operatorPin.trim()

    if (!/^\d{6}$/.test(trimmedPin)) {
      setAuthError('Ingrese un PIN valido de 6 digitos.')
      return
    }

    const trimmedComment = operatorComment.trim()

    const wasCompleted = await onCompleteSubprocess?.(order, authModal.item, authModal.process, {
      pin: trimmedPin,
      comment: trimmedComment,
    })

    if (wasCompleted === false) {
      setAuthError('No fue posible completar el subproceso.')
      return
    }

    closeAuthModal()
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
            <div className={styles.summaryStack}>
              {orderItems.map((item) => {
                const manufacturingDetails = getManufacturingDetails(item, order)
                const isLanyard = isLanyardItem(item)

                return (
                  <article className={styles.summaryCard} key={item.id}>
                    <h4>{item.product}</h4>
                    <dl className={styles.detailList}>
                      <div>
                        <dt>Fecha</dt>
                        <dd>{manufacturingDetails.dueDate}</dd>
                      </div>
                      <div>
                        <dt>Tipo de producto</dt>
                        <dd>{item.product}</dd>
                      </div>
                      <div>
                        <dt>Cantidad</dt>
                        <dd>{item.quantity ?? 'No definida'}</dd>
                      </div>
                      <div>
                        <dt>Ancho {isLanyard ? 'Cinta' : ''}</dt>
                        <dd>{manufacturingDetails.width}</dd>
                      </div>
                      <div>
                        <dt>Largo {isLanyard ? 'Cinta' : ''}</dt>
                        <dd>{manufacturingDetails.length}</dd>
                      </div>
                      {isLanyard ? (
                        <>
                          <div>
                            <dt>Textura cinta</dt>
                            <dd>{manufacturingDetails.tapeTexture}</dd>
                          </div>
                          <div>
                            <dt>Color de Fondo</dt>
                            <dd>{manufacturingDetails.backgroundColor}</dd>
                          </div>
                          <div>
                            <dt>Leyenda Reversa</dt>
                            <dd>{manufacturingDetails.reverseLegend}</dd>
                          </div>
                          <div>
                            <dt>Leyenda Anverso</dt>
                            <dd>{manufacturingDetails.frontLegend}</dd>
                          </div>
                          <div>
                            <dt>Terminaciones</dt>
                            <dd>{manufacturingDetails.endings}</dd>
                          </div>
                        </>
                      ) : (
                        <div>
                          <dt>Tipo de tarjeta</dt>
                          <dd>{manufacturingDetails.cardType}</dd>
                        </div>
                      )}
                      <div>
                        <dt>Cliente</dt>
                        <dd>{order.clientName}</dd>
                      </div>
                      <div>
                        <dt>Vendedor responsable</dt>
                        <dd>{manufacturingDetails.seller}</dd>
                      </div>
                    </dl>
                  </article>
                )
              })}
            </div>
          </section>

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

          {canRequestCorrection && (
            <ProductionDocumentLookup key={order.id} onUpdateOrder={onUpdateOrder} order={order} />
          )}

          <section className={styles.detailSection}>
            <h3>Subprocesos</h3>
            {!isInProduction && (
              <div className={styles.stepperNotice}>
                <i className="bi bi-lock-fill" aria-hidden="true" />
                <span>Los subprocesos se habilitan cuando el pedido llega a En produccion.</span>
              </div>
            )}
            <div className={styles.stepperStack}>
              {orderItems.map((item) => {
                const currentProcessIndex = item.subProcesses.findIndex((process) => process.status !== 'done')

                return (
                  <article className={styles.stepperGroup} key={item.id}>
                    <h4>{item.product}</h4>
                    <div className={styles.subProcessStepper}>
                      {item.subProcesses.map((process, index) => {
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
                            onClick={() => openAuthModal(item, process, index, currentProcessIndex)}
                            type="button"
                          >
                            <span className={styles.subProcessMarker}>
                              {isDone ? <i className="bi bi-check-lg" aria-hidden="true" /> : index + 1}
                            </span>
                            <span className={styles.subProcessContent}>
                              <span>{process.name}</span>
                              <strong>
                                {isDone
                                  ? formatStatus(process.status)
                                  : isCurrent && isInProduction
                                    ? 'En curso'
                                    : 'Bloqueado'}
                              </strong>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>

          <section className={styles.detailSection}>
            <h3>Comentarios</h3>
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
                <span className={styles.offcanvasKicker}>Validacion PIN</span>
                <h3 id="operator-modal-title">{authModal.process.name}</h3>
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
                <span>PIN</span>
                <input
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) => {
                    setOperatorPin(event.target.value.replace(/\D/g, '').slice(0, 6))
                    setAuthError('')
                  }}
                  placeholder="000000"
                  type="password"
                  value={operatorPin}
                />
              </label>
              <label>
                <span>Comentario opcional</span>
                <textarea
                  onChange={(event) => setOperatorComment(event.target.value)}
                  placeholder="Describe una observacion del traspaso si corresponde."
                  rows={3}
                  value={operatorComment}
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

      {deconfirmationAuthOpen && (
        <div className={styles.operatorModalLayer} role="presentation">
          <form
            aria-labelledby="deconfirmation-approval-modal-title"
            className={styles.operatorModal}
            onSubmit={approvePaymentDeconfirmation}
            role="dialog"
          >
            <header className={styles.operatorModalHeader}>
              <div>
                <span className={styles.offcanvasKicker}>Validacion PIN</span>
                <h3 id="deconfirmation-approval-modal-title">Aprobar desconfirmacion</h3>
              </div>
              <button
                aria-label="Cerrar validacion"
                className={styles.offcanvasCloseButton}
                disabled={isApprovingDeconfirmation}
                onClick={closeDeconfirmationAuthModal}
                type="button"
              >
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            </header>

            <div className={styles.operatorModalBody}>
              <p className={styles.operatorModalText}>Ingrese su PIN para devolver {order.nv} a Confirmacion de pago.</p>
              <label>
                <span>PIN</span>
                <input
                  autoComplete="one-time-code"
                  disabled={isApprovingDeconfirmation}
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) => {
                    setDeconfirmationPin(event.target.value.replace(/\D/g, '').slice(0, 6))
                    setDeconfirmationError('')
                  }}
                  placeholder="000000"
                  type="password"
                  value={deconfirmationPin}
                />
              </label>
              {deconfirmationError && <p className={styles.operatorModalError}>{deconfirmationError}</p>}
            </div>

            <footer className={styles.operatorModalFooter}>
              <button className={styles.resetFilterButton} disabled={isApprovingDeconfirmation} onClick={closeDeconfirmationAuthModal} type="button">
                Cancelar
              </button>
              <button className={styles.orderCardButton} disabled={isApprovingDeconfirmation} type="submit">
                {isApprovingDeconfirmation ? 'Aprobando...' : 'Confirmar'}
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  )
}
