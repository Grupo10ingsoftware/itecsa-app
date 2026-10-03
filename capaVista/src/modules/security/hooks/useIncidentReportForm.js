import { useRef, useState } from 'react'
import { observationToUtc, validateIncidentFields } from '../../../../../shared/incidentReports'
import { createRequestId } from '../../../shared/utils/createRequestId'

const emptyValues = () => ({ description: '', observedAt: '', module: '', technicalReference: '' })
export function useIncidentReportForm({ email, sendReport, enabled }) {
  const [values, setValues] = useState(emptyValues)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [frozen, setFrozen] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const sending = useRef(false)
  const pending = useRef(null)
  function change(event) {
    if (sending.current || frozen) return
    const { name, value } = event.target
    setValues(current => ({ ...current, [name]: value }))
    setErrors(current => ({ ...current, [name]: undefined }))
    setFeedback(null)
    pending.current = null
  }
  async function submit(event) {
    event.preventDefault()
    if (!enabled || sending.current) return
    const fields = { ...values, observedAt: observationToUtc(values.observedAt) }
    const validation = validateIncidentFields({ ...fields, email })
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
      // Retain the exact UTC payload across retries, even if browser timezone changes.
      pending.current ??= { ...fields, reportId: createRequestId() }
      const result = await sendReport(pending.current)
      if (result?.status !== 'sent' || result.reportId !== pending.current.reportId) throw new Error('Respuesta no confirmada.')
      setFeedback({ kind: 'success', message: result.message, reference: result.reportId, receivedAt: result.receivedAt })
      setValues(emptyValues())
      setFrozen(false)
      pending.current = null
    } catch (error) {
      const uncertain = error?.payload?.code === 'INCIDENT_REVIEW_DELIVERY' || !error?.status || error.status >= 500 && error?.payload?.code !== 'INCIDENT_DELIVERY_FAILED' && error?.payload?.code !== 'INCIDENT_CHANNEL_UNAVAILABLE'
      setFrozen(uncertain)
      setFeedback({ kind: 'danger', message: error?.payload?.message ?? 'No pudimos confirmar el envío. Reintenta sin modificar el reporte para evitar duplicados.', reference: error?.payload?.reportId ?? pending.current?.reportId })
    } finally {
      sending.current = false
      setBusy(false)
    }
  }
  return { values, errors, busy, frozen, feedback, change, submit }
}
