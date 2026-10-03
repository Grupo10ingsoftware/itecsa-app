export function createIncidentReportsApi(client) {
  return {
    configuration: () => client.get('/security/incident-reports/config'),
    submit: report => client.post('/security/incident-reports', report),
  }
}
