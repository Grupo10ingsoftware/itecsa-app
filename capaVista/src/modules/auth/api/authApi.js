export function createAuthApi(apiClient) {
  return {
    verify: () => apiClient.get('/auth/verify'),
  }
}
