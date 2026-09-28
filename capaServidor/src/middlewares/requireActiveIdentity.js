import users from '../modules/users/repo/users.repo.js';
import { getAuth0UserRole } from '../modules/users/service/auth0Management.service.js';
import { roleFromPayload } from '../../../shared/authorization.js';

const ACTIVE_STATUSES = new Set(['Activo', 'Vinculado']);
const ACCESS_DENIED = 'Usuario desvinculado o rol desactualizado. Renueva tu sesion.';

export function createRequireActiveIdentity({ repository = users, resolveAuth0Role = getAuth0UserRole } = {}) {
  return async (req, res, next) => {
    const payload = req.auth?.payload;
    if (!payload?.sub) return res.status(401).json({ message: 'Sesion no valida.' });

    const role = roleFromPayload(payload);
    if (!role || !Array.isArray(payload.permissions) || payload.permissions.some(p => typeof p !== 'string')) {
      return res.status(403).json({ message: 'La sesion no tiene un rol o permisos validos.' });
    }

    try {
      let user = await repository.findByAuth0Id(payload.sub);
      if (!user || !ACTIVE_STATUSES.has(user.estadoUsuario)) {
        return res.status(403).json({ message: ACCESS_DENIED });
      }

      if (user.rolUsuario !== role) {
        // El token puede ser anterior a otro cambio: confirmar el rol actual antes de escribir.
        const currentAuth0Role = await resolveAuth0Role(payload.sub);
        if (currentAuth0Role !== role) {
          return res.status(403).json({ message: ACCESS_DENIED });
        }
        user = await repository.updateRoleIfCurrent(payload.sub, user.rolUsuario, role);
        if (!user || !ACTIVE_STATUSES.has(user.estadoUsuario) || user.rolUsuario !== role) {
          return res.status(403).json({ message: ACCESS_DENIED });
        }
      }

      req.currentUser = user;
      return next();
    } catch {
      return res.status(503).json({
        code: 'INTERNAL_ERROR',
        message: 'No fue posible verificar el acceso.',
        requestId: req.requestId,
      });
    }
  };
}

export default createRequireActiveIdentity();
