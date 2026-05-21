// La base de datos futura no almacena contraseñas; estas credenciales son solo datos temporales para simular login visual.
// Este fixture no representa el modelo Usuario y debe reemplazarse por backend/Auth0 en una integracion futura.
const MOCK_AUTH_CREDENTIALS = Object.freeze([
  Object.freeze({
    idUsuario: 'mock-user-admin-001',
    correoUsuario: 'admin.mock@itecsa.local',
    password: 'AdminMock1!',
  }),
  Object.freeze({
    idUsuario: 'mock-user-gerencia-001',
    correoUsuario: 'gerencia.mock@itecsa.local',
    password: 'GerenciaMock1!',
  }),
  Object.freeze({
    idUsuario: 'mock-user-operario-001',
    correoUsuario: 'operario.mock@itecsa.local',
    password: 'OperarioMock1!',
  }),
  Object.freeze({
    idUsuario: 'mock-user-ventas-001',
    correoUsuario: 'ventas.mock@itecsa.local',
    password: 'VentasMock1!',
  }),
  Object.freeze({
    idUsuario: 'mock-user-cobranzas-001',
    correoUsuario: 'cobranzas.mock@itecsa.local',
    password: 'CobranzasMock1!',
  }),
  Object.freeze({
    idUsuario: 'mock-user-desvinculado-001',
    correoUsuario: 'desvinculado.mock@itecsa.local',
    password: 'DesvinculadoMock1!',
  }),
])

export function findMockLoginCredential(email) {
  const normalizedEmail = email.trim().toLowerCase()

  return MOCK_AUTH_CREDENTIALS.find((credential) => {
    return credential.correoUsuario.toLowerCase() === normalizedEmail
  })
}
