import { Router } from 'express';
import checkJwt from '../../middlewares/checkJwt.js';
import { respondError } from '../../errors/httpErrors.js';
import { AppError } from '../../errors/AppError.js';
import { PRIVACY_PERMISSIONS } from '../../../../shared/privacy.js';
import { privacyConfiguration } from './privacyConfig.js';
import { createPrivacyVault } from './privacyCrypto.js';
import { PrivacyRepository } from './privacyRepository.js';
import { PrivacyService } from './privacyService.js';
import { discoverSubject } from './privacyDiscovery.js';
import { addCalendarDays } from './privacyDeadlines.js';

export function createPrivacyRouter({ authenticate = checkJwt, configuration = privacyConfiguration, service: injected, discovery = discoverSubject } = {}) {
  const router = Router(); let currentService;
  const config = () => typeof configuration === 'function' ? configuration() : configuration;
  const service = () => injected ?? (currentService ??= new PrivacyService({ repository: new PrivacyRepository(), vault: createPrivacyVault(config().key), config: config() }));
  const handle = fn => async (req, res) => { try { await fn(req, res); } catch (error) { respondError(error, req, res); } };
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); res.set('X-Content-Type-Options', 'nosniff'); next(); });
  const enabled = (req, res, next) => {
    try { if (!config().enabled) throw new AppError(409, 'El canal de privacidad aún no está habilitado.', 'PRIVACY_NOT_CONFIGURED'); next(); } catch (error) { respondError(error, req, res); }
  };
  const has = (req, permission) => config().staff.includes(req.auth?.payload?.sub) && req.auth?.payload?.permissions?.includes(permission);
  const staff = permission => (req, res, next) => {
    if (!has(req, permission)) return res.status(403).json({ code: 'FORBIDDEN', message: 'No tienes autorización para expedientes de privacidad.' });
    next();
  };
  const actor = req => req.auth.payload.sub;
  router.get('/notice', handle(async (_req, res) => {
    const c = config();
    if (!c.enabled) return res.json({ available: false });
    const n = c.notice;
    res.json({ available: true, version: n.version, publishedAt: n.publishedAt, responsible: n.responsible, representative: n.representative, postalAddress: n.postalAddress, contactEmail: n.contactEmail, preventionOfficer: n.preventionOfficer ?? null, sections: n.sections });
  }));
  router.use(enabled, authenticate);
  router.use((req, res, next) => {
    if (!req.currentUser || req.currentUser.idAuth0 !== req.auth?.payload?.sub) return res.status(403).json({ code: 'FORBIDDEN', message: 'La identidad local no corresponde exactamente a la sesión.' });
    next();
  });
  router.get('/capabilities', handle(async (req, res) => res.json({ readCases: has(req, PRIVACY_PERMISSIONS.READ), manageCases: has(req, PRIVACY_PERMISSIONS.MANAGE) && has(req, PRIVACY_PERMISSIONS.READ) })));
  router.get('/requests', handle(async (req, res) => res.json(await service().list({ owner: actor(req), cursor: req.query.cursor, limit: req.query.limit }))));
  router.post('/requests', handle(async (req, res) => {
    if (!req.currentUser) throw new AppError(403, 'Identidad local no disponible.');
    res.status(201).json(await service().create(req.body ?? {}, actor(req), req.currentUser));
  }));
  router.get('/requests/:id', handle(async (req, res) => res.json(await service().ownDetail(req.params.id, actor(req)))));
  router.get('/requests/:id/response', handle(async (req, res) => {
    const response = await service().response(req.params.id, actor(req));
    res.set('Content-Disposition', `attachment; filename="respuesta-privacidad-${response.requestId}.json"`);
    res.json(response);
  }));
  router.post('/requests/:id/receipt', handle(async (req, res) => res.json(await service().acknowledge(req.params.id, actor(req)))));
  router.use('/cases', staff(PRIVACY_PERMISSIONS.READ));
  router.get('/cases', handle(async (req, res) => res.json(await service().list({ cursor: req.query.cursor, limit: req.query.limit }))));
  router.get('/cases/deadlines', handle(async (_req, res) => { const now = new Date(); res.json(await service().repository.deadlineCounts(now, addCalendarDays(now, 3))); }));
  router.post('/cases', staff(PRIVACY_PERMISSIONS.MANAGE), handle(async (req, res) => res.status(201).json(await service().create(req.body ?? {}, actor(req)))));
  router.get('/cases/:id', handle(async (req, res) => res.json(await service().staffDetail(req.params.id, actor(req)))));
  router.post('/cases/:id/actions', staff(PRIVACY_PERMISSIONS.MANAGE), handle(async (req, res) => res.json(await service().change(req.params.id, req.body ?? {}, actor(req)))));
  router.get('/cases/:id/discovery', handle(async (req, res) => {
    const row = await service().get(req.params.id);
    // Registrar lectura antes de revelar un borrador; si falla evidencia, no entregar.
    await service().staffDetail(req.params.id, actor(req));
    res.json(await discovery(row, req.query));
  }));
  router.get('/cases/:id/response', handle(async (req, res) => res.json(await service().response(req.params.id, actor(req), true))));
  return router;
}
