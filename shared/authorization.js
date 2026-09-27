// Modelo funcional ITECSA. Soporte es exclusivamente tecnico de desarrollo/testing.
export const ROLES = Object.freeze({
  ADMINISTRADOR: 'Administrador Produccion', ADMIN_VENTAS: 'Administrador Ventas',
  ADMIN_COBRANZAS: 'Administrador Cobranzas', PRODUCCION: 'Operario Produccion',
  VENTAS: 'Operario Ventas', COBRANZAS: 'Operario Cobranzas', GERENCIA: 'Gerencia', SOPORTE: 'Soporte',
});
export const FUNCTIONAL_ROLES = Object.freeze(Object.values(ROLES).filter(r => r !== ROLES.SOPORTE));
export const RECOGNIZED_ROLES = Object.freeze([...FUNCTIONAL_ROLES, ROLES.SOPORTE]);
export const ADMIN_ROLES = Object.freeze([ROLES.ADMINISTRADOR, ROLES.ADMIN_VENTAS, ROLES.ADMIN_COBRANZAS, ROLES.SOPORTE]);
export const PERMISSIONS = Object.freeze({
  READ_PROFILE: 'read:own-profile', MANAGE_PIN: 'manage:own-pin', READ_ORDERS: 'read:orders',
  READ_CAPACITY: 'read:production-capacity', READ_MESSAGES: 'read:own-messages', UPDATE_MESSAGES: 'update:own-messages',
  MANAGE_USERS: 'manage:users', READ_SALES_NOTES: 'read:sales-notes', CREATE_ORDERS: 'create:orders',
  REEVALUATE_ORDERS: 'reevaluate:orders', READ_PAYMENTS: 'read:payments', UPDATE_PAYMENT_STATUS: 'update:payment-status',
  REVISE_PAYMENT_STATUS: 'revise:payment-status', MOVE_ORDERS: 'move:orders', START_PRODUCTION: 'start:production',
  UPDATE_SUBPROCESSES: 'update:production-subprocesses', ROLLBACK_SUBPROCESSES: 'rollback:production-subprocesses',
  MANAGE_CAPACITY: 'manage:production-capacity', MANAGE_PRODUCTION_LOAD: 'manage:production-load', MANAGE_TAGS: 'manage:order-tags', REVIEW_ORDERS: 'review:orders',
  CANCEL_ORDERS: 'cancel:orders', READ_CALENDAR: 'read:production-calendar', UPDATE_DELIVERY_DATE: 'update:order-delivery-date',
  VIEW_METRICS: 'view:metrics',
});
export const BUSINESS_PERMISSIONS = Object.freeze(Object.values(PERMISSIONS));
const P = PERMISSIONS;
const common = [P.READ_PROFILE,P.MANAGE_PIN,P.READ_ORDERS,P.READ_CAPACITY,P.READ_MESSAGES,P.UPDATE_MESSAGES];
const sales = [P.READ_SALES_NOTES,P.CREATE_ORDERS,P.REEVALUATE_ORDERS,P.READ_CALENDAR];
const collections = [P.READ_PAYMENTS,P.UPDATE_PAYMENT_STATUS];
const production = [P.MOVE_ORDERS,P.UPDATE_SUBPROCESSES];
export const ROLE_PERMISSIONS = Object.freeze(Object.fromEntries(Object.entries({
  [ROLES.ADMINISTRADOR]: [...common,P.MANAGE_USERS,...production,P.START_PRODUCTION,P.ROLLBACK_SUBPROCESSES,P.MANAGE_CAPACITY,P.MANAGE_PRODUCTION_LOAD,P.MANAGE_TAGS,P.REVIEW_ORDERS,P.CANCEL_ORDERS,P.READ_CALENDAR,P.UPDATE_DELIVERY_DATE, P.VIEW_METRICS],
  [ROLES.ADMIN_VENTAS]: [...common,P.MANAGE_USERS,...sales],
  [ROLES.ADMIN_COBRANZAS]: [...common,P.MANAGE_USERS,...collections,P.REVISE_PAYMENT_STATUS],
  [ROLES.PRODUCCION]: [...common,...production], [ROLES.VENTAS]: [...common,...sales],
  [ROLES.COBRANZAS]: [...common,...collections], [ROLES.GERENCIA]: [...common,P.VIEW_METRICS],
  [ROLES.SOPORTE]: BUSINESS_PERMISSIONS,
}).map(([role,permissions]) => [role,Object.freeze(permissions)])));
export const ROLES_CLAIM = 'https://itecsa.local/roles';
export function roleFromPayload(payload) {
  const roles = payload?.[ROLES_CLAIM];
  return Array.isArray(roles) && roles.length === 1 && RECOGNIZED_ROLES.includes(roles[0]) ? roles[0] : null;
}
export function can(role, permissions, permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission) === true && Array.isArray(permissions) && permissions.includes(permission);
}
// Excepcion tecnica unica: alcance interdepartamental; no omite permisos, PIN ni reglas de estado.
export function manageableRoles(role) {
  if (role === ROLES.SOPORTE) return FUNCTIONAL_ROLES;
  const departments = {
    [ROLES.ADMINISTRADOR]: [ROLES.ADMINISTRADOR,ROLES.PRODUCCION],
    [ROLES.ADMIN_VENTAS]: [ROLES.ADMIN_VENTAS,ROLES.VENTAS],
    [ROLES.ADMIN_COBRANZAS]: [ROLES.ADMIN_COBRANZAS,ROLES.COBRANZAS],
  };
  return departments[role] ?? [];
}
export function canManageUser(actorRole, targetRole) {
  return manageableRoles(actorRole).includes(targetRole);
}
