export function createAuthApi(apiClient) {
  return {
    verify: () => apiClient.get('/auth/verify'),
    revealPin: () => apiClient.post('/auth/pin/reveal', {}),
    acknowledgePin: () => apiClient.post('/auth/pin/acknowledge', {}),
    requestPinRecovery: () => apiClient.post('/auth/pin-recovery/request', {}),
    confirmPinRecovery: (code) => apiClient.post('/auth/pin-recovery/confirm', { code }),
  }
}
