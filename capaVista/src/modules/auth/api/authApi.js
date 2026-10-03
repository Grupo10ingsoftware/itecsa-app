export function createAuthApi(apiClient, { subject } = {}) {
  // Share only simultaneous profile reads (e.g. StrictMode mount effects).
  // Settled personal data is never cached; every later visit is authorized again.
  let profileInFlight
  function getProfile() {
    if (profileInFlight && profileInFlight.subject === subject) return profileInFlight.request
    const request = apiClient.get('/auth/profile').finally(() => {
      if (profileInFlight?.request === request) profileInFlight = null
    })
    profileInFlight = { subject, request }
    return request
  }
  return {
    getProfile,
    getProfileMovements: ({ page = 1, perPage = 10, search = '' } = {}) =>
      apiClient.get(`/auth/profile/movements?${new URLSearchParams({ page, perPage, ...(search ? { search } : {}) })}`),
    verify: () => apiClient.get('/auth/verify'),
    debugResetPin: () => apiClient.post('/auth/pin/debug-reset', {}),
    revealPin: () => apiClient.post('/auth/pin/reveal', {}),
    acknowledgePin: () => apiClient.post('/auth/pin/acknowledge', {}),
    requestPinRecovery: () => apiClient.post('/auth/pin-recovery/request', {}),
    confirmPinRecovery: (code) => apiClient.post('/auth/pin-recovery/confirm', { code }),
  }
}
