export { ROLES, FUNCTIONAL_ROLES, ADMIN_ROLES as ADMINISTRATIVE_ROLES, manageableRoles } from '../../../shared/authorization.js';
import { ROLES, FUNCTIONAL_ROLES, RECOGNIZED_ROLES } from '../../../shared/authorization.js';
// Opciones funcionales: nunca ofrecer Soporte en formularios.
export const OFFICIAL_ROLES = FUNCTIONAL_ROLES;
export function isOfficialRole(role) { return RECOGNIZED_ROLES.includes(role); }
export function getRoleLabel(role) {
  if (role === ROLES.ADMINISTRADOR) return 'Administrador Producción';
  if (role === ROLES.PRODUCCION) return 'Operario Producción';
  return role;
}
