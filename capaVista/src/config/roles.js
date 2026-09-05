// Catalogo cerrado de roles oficiales definido por RF04 y el modelo conceptual MER.
export const ROLES = Object.freeze({
  ADMINISTRADOR: 'Administrador Producción',
  SOPORTE: 'Soporte',
  GERENCIA: 'Gerencia',
  PRODUCCION: 'Operario Producción',
  VENTAS: 'Operario Ventas',
  COBRANZAS: 'Operario Cobranzas',
})

export const OFFICIAL_ROLES = Object.freeze(Object.values(ROLES))
export const ADMINISTRATIVE_ROLES = Object.freeze([ROLES.ADMINISTRADOR, ROLES.SOPORTE])

export function isOfficialRole(role) {
  return OFFICIAL_ROLES.includes(role)
}
