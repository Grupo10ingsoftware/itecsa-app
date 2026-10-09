import { PERMISSIONS as P } from '../../../shared/authorization.js';
// Alias de componentes heredados; los valores son capacidades canónicas de negocio.
export const PERMISSIONS = Object.freeze({ ...P,
  VIEW_KANBAN_MODULE: P.READ_ORDERS, VIEW_PAYMENTS_MODULE: P.READ_PAYMENTS,
  VIEW_OWN_PROFILE: P.READ_PROFILE, CREATE_USERS_VISUALLY: P.MANAGE_USERS,
  MANAGE_USERS_VISUALLY: P.MANAGE_USERS, VIEW_ORDERS_MODULE: P.CREATE_ORDERS,
  MOVE_KANBAN_TO_PRODUCTION: P.START_PRODUCTION,
});
