import { ROLE_PERMISSIONS, ROLES, ROLES_CLAIM } from '../../shared/authorization.js';
export function payloadFor(role = ROLES.SOPORTE, extra = {}) {
  return {sub:'auth0|test-user',[ROLES_CLAIM]:[role],permissions:ROLE_PERMISSIONS[role] ?? [],...extra};
}
export function authenticated(req,_res,next) { req.auth={payload:payloadFor()}; next(); }
export async function invoke(handler, req, res) {
  const payload = req.auth?.payload ?? {};
  req.auth = {payload:payloadFor(ROLES.SOPORTE,payload)};
  return handler(req,res);
}
