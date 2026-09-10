export function createAuthApi(apiClient) {
  return {
    getProfile: () => apiClient.get('/auth/profile'),
    verify: () => apiClient.get('/auth/verify'),
    debugResetPin: () => apiClient.post('/auth/pin/debug-reset', {}),
    revealPin: () => apiClient.post('/auth/pin/reveal', {}),
    acknowledgePin: () => apiClient.post('/auth/pin/acknowledge', {}),
    requestPinRecovery: () => apiClient.post('/auth/pin-recovery/request', {}),
    confirmPinRecovery: (code) => apiClient.post('/auth/pin-recovery/confirm', { code }),
  }
}
