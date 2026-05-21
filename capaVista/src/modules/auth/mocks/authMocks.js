import { ROLES } from '../../../config/roles'

// Adapta el modelo conceptual MER 06 a objetos comodos para esta UI temporal.
// Los campos en espanol son la fuente conceptual; los aliases existen solo para componentes React.
function createMockUser({
  idUsuario,
  primerNombre,
  apellidoPaterno,
  rutUsuario,
  correoUsuario,
  rolUsuario,
  estadoUsuario,
  referenciaFirmaElectronica,
  idUsuarioAutenticacionExterna,
}) {
  return Object.freeze({
    idUsuario,
    primerNombre,
    apellidoPaterno,
    rutUsuario,
    correoUsuario,
    rolUsuario,
    estadoUsuario,
    referenciaFirmaElectronica,
    idUsuarioAutenticacionExterna,

    // Aliases temporales para facilitar la UI React durante el frontend inicial.
    // No representan el modelo conceptual futuro de base de datos.
    id: idUsuario,
    firstName: primerNombre,
    lastName: apellidoPaterno,
    email: correoUsuario,
    role: rolUsuario,
    status: estadoUsuario,
  })
}

// Datos temporales no productivos para simular usuarios en memoria durante el frontend inicial.
// Auth0 futuro se vincula mediante idUsuarioAutenticacionExterna; estos valores no son reales.
// La firma electronica se representa como referencia documental, no como binario ni contenido real.
// La base de datos futura no almacena contrasenas; MOCK_USERS no debe modelarlas.
export const MOCK_USERS = Object.freeze([
  createMockUser({
    idUsuario: 'mock-user-admin-001',
    primerNombre: 'Admin',
    apellidoPaterno: 'Itecsa',
    rutUsuario: '11.111.111-1',
    correoUsuario: 'admin.mock@itecsa.local',
    rolUsuario: ROLES.ADMINISTRADOR,
    estadoUsuario: 'vinculado',
    referenciaFirmaElectronica: 'mock/firma-admin.pdf',
    idUsuarioAutenticacionExterna: 'mock-auth0-admin-001',
  }),
  createMockUser({
    idUsuario: 'mock-user-gerencia-001',
    primerNombre: 'Gerencia',
    apellidoPaterno: 'Itecsa',
    rutUsuario: '22.222.222-2',
    correoUsuario: 'gerencia.mock@itecsa.local',
    rolUsuario: ROLES.GERENCIA,
    estadoUsuario: 'vinculado',
    referenciaFirmaElectronica: 'mock/firma-gerencia.pdf',
    idUsuarioAutenticacionExterna: 'mock-auth0-gerencia-001',
  }),
  createMockUser({
    idUsuario: 'mock-user-operario-001',
    primerNombre: 'Operario',
    apellidoPaterno: 'Itecsa',
    rutUsuario: '33.333.333-3',
    correoUsuario: 'operario.mock@itecsa.local',
    rolUsuario: ROLES.OPERARIO,
    estadoUsuario: 'vinculado',
    referenciaFirmaElectronica: 'mock/firma-operario.pdf',
    idUsuarioAutenticacionExterna: 'mock-auth0-operario-001',
  }),
  createMockUser({
    idUsuario: 'mock-user-ventas-001',
    primerNombre: 'Ventas',
    apellidoPaterno: 'Itecsa',
    rutUsuario: '44.444.444-4',
    correoUsuario: 'ventas.mock@itecsa.local',
    rolUsuario: ROLES.VENTAS,
    estadoUsuario: 'vinculado',
    referenciaFirmaElectronica: 'mock/firma-ventas.pdf',
    idUsuarioAutenticacionExterna: 'mock-auth0-ventas-001',
  }),
  createMockUser({
    idUsuario: 'mock-user-cobranzas-001',
    primerNombre: 'Cobranzas',
    apellidoPaterno: 'Itecsa',
    rutUsuario: '55.555.555-5',
    correoUsuario: 'cobranzas.mock@itecsa.local',
    rolUsuario: ROLES.COBRANZAS,
    estadoUsuario: 'vinculado',
    referenciaFirmaElectronica: 'mock/firma-cobranzas.pdf',
    idUsuarioAutenticacionExterna: 'mock-auth0-cobranzas-001',
  }),
  createMockUser({
    // Usuario desvinculado para validar visualmente RF02/RF09/RF10 sin backend real.
    idUsuario: 'mock-user-desvinculado-001',
    primerNombre: 'Usuario',
    apellidoPaterno: 'Desvinculado',
    rutUsuario: '66.666.666-6',
    correoUsuario: 'desvinculado.mock@itecsa.local',
    rolUsuario: ROLES.OPERARIO,
    estadoUsuario: 'desvinculado',
    referenciaFirmaElectronica: 'mock/firma-desvinculado.pdf',
    idUsuarioAutenticacionExterna: 'mock-auth0-desvinculado-001',
  }),
])

export const DEFAULT_MOCK_USER_ID = MOCK_USERS[0].id
