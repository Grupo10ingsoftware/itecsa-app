import users from '../modules/users/repo/users.repo.js';
import { roleFromPayload } from '../../../shared/authorization.js';
export function createRequireActiveIdentity({ repository = users } = {}) {
  return async (req,res,next) => {
    const payload = req.auth?.payload;
    if (!payload?.sub) return res.status(401).json({message:'Sesion no valida.'});
    const role = roleFromPayload(payload);
    if (!role || !Array.isArray(payload.permissions) || payload.permissions.some(p => typeof p !== 'string')) {
      return res.status(403).json({message:'La sesion no tiene un rol o permisos validos.'});
    }
    try {
      const user = await repository.findByAuth0Id(payload.sub);
      if (!user || !['Activo','Vinculado'].includes(user.estadoUsuario) || user.rolUsuario !== role) {
        return res.status(403).json({message:'Usuario desvinculado o rol desactualizado. Renueva tu sesion.'});
      }
      req.currentUser = user;
      return next();
    } catch { return res.status(503).json({message:'No fue posible verificar el acceso.'}); }
  };
}
export default createRequireActiveIdentity();
