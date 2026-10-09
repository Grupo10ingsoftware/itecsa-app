import { BUSINESS_PERMISSIONS, can, roleFromPayload } from '../../../shared/authorization.js';
export { PERMISSIONS } from '../../../shared/authorization.js';
export default function requireCapability(...permissions) {
  if (!permissions.length || permissions.some(p => !BUSINESS_PERMISSIONS.includes(p))) throw new TypeError('Capacidad desconocida');
  return (req,res,next) => {
    const payload = req.auth?.payload;
    if (!permissions.some(p => can(roleFromPayload(payload),payload?.permissions,p))) {
      return res.status(403).json({message:'No tienes autorizacion para esta accion.'});
    }
    return next();
  };
}
