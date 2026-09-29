import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import PaymentCredentialsModal from '../src/modules/payments/components/PaymentCredentialsModal.jsx'

export function App() {
  const [order, setOrder] = useState(null)
  const [attempts, setAttempts] = useState(0)
  const [succeed, setSucceed] = useState(false)
  return <>
    <button id="open-first" onClick={() => setOrder({ id: 1, nvNumber: 'TEST-1', paymentStatus: 'Pendiente' })}>Abrir pedido 1</button>
    <button id="open-second" onClick={() => setOrder({ id: 2, nvNumber: 'TEST-2', paymentStatus: 'Rechazado' })}>Abrir pedido 2</button>
    <button id="success-mode" onClick={() => setSucceed(true)}>Aceptar siguiente envío</button>
    <output id="attempts">{attempts}</output>
    <output id="results">Pendiente</output>
    {order && <PaymentCredentialsModal
      key={order.id}
      order={order}
      targetStatus="Confirmado"
      onCancel={() => setOrder(null)}
      onConfirm={async () => {
        await pause()
        setAttempts((value) => value + 1)
        if (succeed) setOrder(null)
        return succeed
      }}
    />}
  </>
}

createRoot(document.getElementById('root')).render(<App />)

const pause = () => new Promise((resolve) => setTimeout(resolve, 30))
const pinInput = () => document.querySelector('input[type="password"]')
const setInput = (element, value) => {
  const setter = Object.getOwnPropertyDescriptor(element.constructor.prototype, 'value').set
  setter.call(element, value)
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

async function test() {
  try {
    await pause()
    document.getElementById('open-first').click()
    await pause()
    if (pinInput()?.value !== '') throw new Error('PIN inicial no vacío')
    if (document.activeElement !== pinInput()) throw new Error('Foco inicial fuera del PIN')

    setInput(pinInput(), '123456')
    await pause()
    if (pinInput()?.value !== '123456') throw new Error('PIN no editable')
    document.querySelector('[aria-label="Cerrar validacion"]').click()
    await pause()
    document.getElementById('open-first').click()
    await pause()
    if (pinInput()?.value !== '') throw new Error('PIN persiste al reabrir')

    setInput(pinInput(), '123456')
    await pause()
    document.getElementById('open-second').click()
    await pause()
    if (pinInput()?.value !== '') throw new Error('PIN persiste al cambiar pedido')
    const comment = document.querySelector('textarea')
    if (comment?.value !== '') throw new Error('Motivo persiste al cambiar pedido')
    setInput(pinInput(), '123456')
    setInput(comment, 'Corrección de prueba')
    await pause()
    document.querySelector('[aria-label="Cerrar validacion"]').click()
    await pause()
    document.getElementById('open-second').click()
    await pause()
    if (pinInput()?.value !== '' || document.querySelector('textarea')?.value !== '') {
      throw new Error('Credenciales persisten al reabrir pedido 2')
    }
    setInput(pinInput(), '123456')
    setInput(document.querySelector('textarea'), 'Corrección de prueba')
    await pause()
    const form = document.querySelector('form[role="dialog"]')
    form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))
    form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))
    await new Promise((resolve) => setTimeout(resolve, 120))
    if (pinInput()?.value !== '') throw new Error('PIN persiste tras fallo')
    if (document.getElementById('attempts')?.textContent !== '1') throw new Error('No hubo exactamente un envío')
    if (document.querySelector('textarea')?.value !== 'Corrección de prueba') throw new Error('Motivo perdido tras fallo')
    document.getElementById('success-mode').click()
    setInput(pinInput(), '123456')
    await pause()
    form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))
    await new Promise((resolve) => setTimeout(resolve, 120))
    if (pinInput()) throw new Error('Modal sigue abierto tras éxito')
    if (document.getElementById('attempts')?.textContent !== '2') throw new Error('Número incorrecto de envíos')
    document.getElementById('open-second').click()
    await pause()
    if (pinInput()?.value !== '' || document.querySelector('textarea')?.value !== '') {
      throw new Error('Credenciales persisten tras éxito')
    }
    document.getElementById('results').textContent = 'PIN_TEST_RESULT:PASS'
  } catch (error) {
    document.getElementById('results').textContent = `PIN_TEST_RESULT:FAIL:${error.message}`
  }
}

test()
