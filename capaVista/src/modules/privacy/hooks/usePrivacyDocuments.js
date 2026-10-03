import { useCallback, useEffect, useState } from 'react'

export function usePrivacyDocuments(api) {
  const [state, setState] = useState({ loading: true, documents: [], requestsEnabled: false, error: null })
  const [revision, setRevision] = useState(0)
  const retry = useCallback(() => setRevision(value => value + 1), [])
  useEffect(() => {
    let active = true
    api.getDocuments().then(result => {
      if (active) setState({ ...result, loading: false, error: null })
    }).catch(() => {
      if (active) setState({ loading: false, documents: [], requestsEnabled: false, error: 'No fue posible cargar la información. Intenta nuevamente.' })
    })
    return () => { active = false }
  }, [api, revision])
  return { ...state, retry }
}
