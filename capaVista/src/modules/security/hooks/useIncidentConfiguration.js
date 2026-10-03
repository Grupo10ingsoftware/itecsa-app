import { useCallback, useEffect, useState } from 'react'

const pendingState = { loading: true, reportsEnabled: false, contactEmail: '', error: null }

export function useIncidentConfiguration(api) {
  const [result, setResult] = useState(null)
  const [revision, setRevision] = useState(0)
  const retry = useCallback(() => setRevision(value => value + 1), [])
  useEffect(() => {
    let active = true
    api.configuration().then(result => {
      if (typeof result?.reportsEnabled !== 'boolean' || typeof result?.contactEmail !== 'string') throw new Error('Invalid channel configuration')
      if (active) setResult({ api, revision, state: { reportsEnabled: result.reportsEnabled, contactEmail: result.contactEmail, loading: false, error: null } })
    }).catch(() => {
      if (active) setResult({ api, revision, state: { loading: false, reportsEnabled: false, contactEmail: '', error: 'No fue posible comprobar el canal de reportes. Intenta nuevamente.' } })
    })
    return () => { active = false }
  }, [api, revision])
  const state = result?.api === api && result.revision === revision ? result.state : pendingState
  return { ...state, retry }
}
