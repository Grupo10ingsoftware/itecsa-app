export function createPrivacyApi(client) {
  return {
    getDocuments: () => client.get('/privacy/documents'),
    sendRequest: body => client.post('/privacy/requests', body),
  }
}
