import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import OrderCreateConfirmModal from '../src/modules/orders/components/OrderCreateConfirmModal'
import SalesNoteStep from '../src/modules/orders/components/SalesNoteStep'
import { validateSalesNoteStep } from '../src/modules/orders/utils/orderCreateValidation'

export function run() {
  const draft = { salesNoteCode: 'A', comments: '', managerRecord: { numeroNota: 'A', items: [] } }
  const modal = renderToStaticMarkup(<OrderCreateConfirmModal draft={draft} isRegistering onCancel={() => {}} onConfirm={() => {}} />)
  assert.match(modal, /role="dialog"/)
  assert.match(modal, /aria-busy="true"/)
  assert.match(modal, /aria-labelledby="register-order-modal-title"/)
  assert.match(modal, /aria-label="Cerrar confirmacion" disabled=""/)
  const step = renderToStaticMarkup(<SalesNoteStep draft={draft} errors={{}} onChange={() => {}} onSearch={() => {}} onPriorityChange={() => {}} />)
  assert.match(step, /<textarea aria-labelledby="order-observations-label"/)
  assert.match(step, /id="order-observations-label"/)
  assert.ok(validateSalesNoteStep({ ...draft, comments: 'x'.repeat(301) }).comments)
  console.log('7 verificaciones Orders: dialogo, envio pendiente, etiqueta y limite de observacion OK')
}
