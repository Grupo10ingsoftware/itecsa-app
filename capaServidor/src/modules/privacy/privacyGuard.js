import { PRIVACY_DOMAINS } from '../../../../shared/privacy.js';
import { privacyEnabled } from './privacyConfig.js';
import { PrivacyRepository } from './privacyRepository.js';
import { respondError } from '../../errors/httpErrors.js';
import { AppError } from '../../errors/AppError.js';

const families = [
  ['users', '/api/admin'], ['orders', '/api/orders'], ['orders', '/api/order-details'], ['orders', '/api/order-status'],
  ['payments', '/api/payment-status'], ['messages', '/api/messages'], ['history', '/api/history'], ['metrics', '/api/metrics'],
  ['calendar', '/api/production-calendar'], ['production', '/api/production-load'], ['production', '/api/production-capacity'],
  ['clients', '/api/clients'], ['orders', '/api/demo-orders'], ['orders', '/api/products'],
];
export function privacyDomain(path) {
  return families.find(([, prefix]) => path === prefix || path.startsWith(`${prefix}/`))?.[0] ?? null;
}
export function createPrivacyGuard({ enabled = () => privacyEnabled(), repository = new PrivacyRepository() } = {}) {
  return async (req, res, next) => {
    try {
      if (!enabled()) return next();
      const pathname = (req.originalUrl ?? req.path ?? '').split('?')[0];
      // /auth/verify mantiene únicamente el acceso a identidad/canal de derechos.
      const identityOnly = pathname === '/api/auth/verify' && req.method === 'GET';
      const domain = pathname.startsWith('/api/auth/') ? 'users' : privacyDomain(pathname);
      if (!domain) return next();
      const restrictions = await repository.restrictions();
      if (restrictions.some(r => !Array.isArray(r.domains) || r.domains.some(d => !PRIVACY_DOMAINS.includes(d)))) throw new Error('Alcance de restricción inválido.');
      if (restrictions.some(r => r.domains.includes(domain))) {
        if (identityOnly) { req.privacyIdentityOnly = true; return next(); }
        throw new AppError(423, 'Esta operación está suspendida temporalmente por una revisión de privacidad.', 'PRIVACY_RESTRICTED');
      }
      return next();
    } catch (error) { return respondError(error, req, res); }
  };
}
export default createPrivacyGuard();
