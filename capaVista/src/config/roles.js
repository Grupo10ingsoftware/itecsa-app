// Catalogo cerrado de roles oficiales definido por RF04 y el modelo conceptual MER.
export const ROLES = Object.freeze({
  ADMINISTRADOR: 'Administrador Produccion',
  SOPORTE: 'Soporte',
  GERENCIA: 'Gerencia',
  PRODUCCION: 'Operario Produccion',
  VENTAS: 'Operario Ventas',
  COBRANZAS: 'Operario Cobranzas',
})

export const OFFICIAL_ROLES = Object.freeze(Object.values(ROLES))
export const ADMINISTRATIVE_ROLES = Object.freeze([ROLES.ADMINISTRADOR, ROLES.SOPORTE])

export function isOfficialRole(role) {
  return OFFICIAL_ROLES.includes(role)
}

// Las etiquetas son solo de presentación; los contratos usan el valor oficial.
export function getRoleLabel(role) {
  if (role === ROLES.ADMINISTRADOR) return 'Administrador Producción'
  if (role === ROLES.PRODUCCION) return 'Operario Producción'
  return role
}
