import { useRef, useState } from 'react'
import { validateRequestFields } from '../../../../../shared/privacyRequests'
import { createRequestId } from '../../../shared/utils/createRequestId'

const emptyValues = () => ({ type: '', subject: '', description: '' })
export function useDataRequestForm({ email, sendRequest }) {
  const [values, setValues] = useState(emptyValues)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [frozen, setFrozen] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const sending = useRef(false)
  const requestId = useRef(null)
  function change(event) {
    if (sending.current || frozen) return
    const { name, value } = event.target
    setValues(current => ({ ...current, [name]: value }))
    setErrors(current => ({ ...current, [name]: undefined }))
    setFeedback(null)
    requestId.current = null
  }
  async function submit(event) {
    event.preventDefault()
    if (sending.current) return
    const validation = validateRequestFields({ ...values, email })
    setErrors(validation)
    if (Object.keys(validation).length) {
      setFeedback({ kind: 'danger', message: 'Revisa los campos indicados antes de enviar.' })
      event.currentTarget.querySelector(`[name="${Object.keys(validation)[0]}"]`)?.focus()
      return
    }
    sending.current = true
    setBusy(true)
    setFeedback(null)
    try {
      requestId.current ??= createRequestId()
      const result = await sendRequest({ ...values, email, requestId: requestId.current })
      if (result?.status !== 'sent' || result.requestId !== requestId.current) throw new Error('Respuesta no confirmada.')
      setFeedback({ kind: 'success', message: result.message, reference: result.requestId, receivedAt: result.receivedAt })
      setValues(emptyValues())
      setFrozen(false)
      requestId.current = null
    } catch (error) {
      const uncertain = error?.payload?.code === 'PRIVACY_REVIEW_DELIVERY' || !error?.status || error.status >= 500 && error?.payload?.code !== 'PRIVACY_DELIVERY_FAILED' && error?.payload?.code !== 'PRIVACY_CHANNEL_UNAVAILABLE'
      setFrozen(uncertain)
      setFeedback({ kind: 'danger', message: error?.payload?.message ?? 'No pudimos confirmar el envío. Reintenta sin modificar el formulario para evitar duplicados.', reference: error?.payload?.requestId ?? requestId.current })
    } finally {
      sending.current = false
      setBusy(false)
    }
  }
  return { values, errors, busy, frozen, feedback, change, submit }
}
