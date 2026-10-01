import { randomUUID } from 'node:crypto';
import { AppError } from '../../errors/AppError.js';
import { PRIVACY_RIGHTS, PRIVACY_DOMAINS, PRIVACY_SYSTEMS } from '../../../../shared/privacy.js';
import { addBusinessDays, addCalendarDays, deadlineFlags } from './privacyDeadlines.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bad = message => { throw new AppError(400, message); };
function text(value, name, max = 4000, min = 1) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) bad(`${name}: contenido obligatorio o longitud inválida.`);
  return value.trim();
}
function date(value, now) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value)) bad('Fecha de ingreso inválida.');
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed > now) bad('Fecha de ingreso inválida.');
  return parsed;
}
function validateDomains(values) {
  if (!Array.isArray(values) || !values.length || new Set(values).size !== values.length || values.some(d => !PRIVACY_DOMAINS.includes(d))) bad('Selecciona dominios de tratamiento válidos.');
  return values;
}
function noSecrets(value, depth = 0) {
  if (depth > 12) bad('Respuesta demasiado anidada.');
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (/^(pin$|pin_(?:hash|salt|fingerprint|pending_)|pin(?:Hash|Salt|Fingerprint|Pending)|otp$|password|contrase[nñ]a|token|access_token|refresh_token|code_hash|code_salt|secret|authorization|cookie)/i.test(key)) bad('La respuesta contiene campos de autenticación prohibidos.');
    noSecrets(child, depth + 1);
  }
}

export class PrivacyService {
  constructor({ repository, vault, config, now = () => new Date() }) {
    this.repository = repository; this.vault = vault; this.config = config; this.now = now;
  }
  document(row) { return this.vault.open(row.document_cipher, `request:${row.id}`); }
  summary(row) {
    return { id: row.id, rights: row.rights, status: row.status, receivedAt: row.received_at, dueAt: row.due_at, blockingDueAt: row.block_due_at, blockingDecidedAt: row.block_decided_at, verifiedAt: row.verified_at, extended: row.extension_used, version: row.version, ...deadlineFlags(row, this.now()) };
  }
  async get(id, owner) {
    if (!UUID.test(id)) throw new AppError(404, 'Solicitud no disponible.');
    const row = await this.repository.get(id.toLowerCase());
    if (!row || (owner && row.owner_auth0 !== owner)) throw new AppError(404, 'Solicitud no disponible.');
    return row;
  }
  async list({ owner, cursor, limit } = {}) {
    if (cursor && !UUID.test(cursor)) bad('Cursor inválido.');
    limit = limit === undefined ? 25 : Number(limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) bad('Límite inválido.');
    const { rows, nextCursor } = await this.repository.list({ owner, cursor, limit });
    return { requests: rows.map(row => this.summary(row)), nextCursor };
  }
  event(id, actor, action, detail, now) {
    return { request_id: id, actor_auth0: actor, action, detail_cipher: this.vault.seal(detail, `action:${id}:${action}`), occurred_at: now };
  }
  restriction(id, domains, now, active = true) {
    return { id: randomUUID(), request_id: id, domains, active, activated_at: now, released_at: active ? null : now };
  }
  async create(input, actor, user = null) {
    const now = this.now();
    const id = text(input.clientRequestId, 'Identificador', 36).toLowerCase();
    if (!UUID.test(id)) bad('Identificador de solicitud inválido.');
    const existing = await this.repository.get(id);
    if (existing) {
      if (existing.owner_auth0 === actor && user) {
        const prior = this.document(existing);
        if (prior.details !== String(input.details ?? '').trim() || JSON.stringify(existing.rights) !== JSON.stringify(input.rights) || !!existing.block_due_at !== (input.rights?.includes('blocking') || input.blockingRequested === true)) throw new AppError(409, 'El identificador ya se usó con otra solicitud. Recarga antes de registrar una nueva.');
        return this.summary(existing);
      }
      throw new AppError(409, 'Identificador ya utilizado.');
    }
    if (!Array.isArray(input.rights) || !input.rights.length || new Set(input.rights).size !== input.rights.length || input.rights.some(r => !PRIVACY_RIGHTS.includes(r))) bad('Selecciona uno o más derechos válidos.');
    if (input.blockingRequested !== undefined && typeof input.blockingRequested !== 'boolean') bad('Solicitud de bloqueo inválida.');
    const email = text(user?.correoUsuario ?? input.email, 'Correo de respuesta', 255);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) bad('Correo de respuesta inválido.');
    const received = user ? now : date(input.receivedAt, now);
    const blocking = input.rights.includes('blocking') || input.blockingRequested === true;
    const domains = blocking ? validateDomains(this.config.notice.blockingDomains.blocking) : null;
    const document = {
      name: user ? `${user.nombreUsuario ?? ''} ${user.apellidoUsuario ?? ''}`.trim() || email : text(input.name, 'Nombre', 200),
      email, details: text(input.details, 'Solicitud', 8000),
      source: user ? 'authenticated' : text(input.source, 'Canal de ingreso', 100),
      acknowledgement: user ? { channel: 'authenticated_portal', reference: id, at: now.toISOString() } : { channel: text(input.acknowledgementChannel, 'Canal de acuse', 100), reference: text(input.acknowledgementEvidence, 'Evidencia de acuse', 1000), at: now.toISOString() },
      identity: user ? { method: 'active_authenticated_session', actor, evidence: 'JWT verificado y cuenta local activa' } : null,
      decisions: null, systems: null, execution: null, response: null,
      assignedTo: this.config.staff[0], policyVersion: this.config.notice.version, policyDigest: this.config.digest,
      suspensionDomains: domains ?? [],
    };
    const row = { id, owner_auth0: user ? actor : null, subject_kind: user ? 'user' : 'other', subject_id: user?.idUsuario ?? null,
      rights: input.rights, document_cipher: this.vault.seal(document, `request:${id}`), status: user ? 'verified' : 'received',
      received_at: received, due_at: addCalendarDays(received, 30), block_due_at: blocking ? addBusinessDays(received, 2, this.config.notice.calendar) : null,
      block_decided_at: null, verified_at: user ? now : null, extension_used: false, version: 0, updated_at: now };
    if (user && (!Number.isInteger(row.subject_id) || row.subject_id <= 0)) throw new AppError(403, 'Identidad local no disponible.');
    const created = await this.repository.create(row, this.event(id, actor, 'received', { channel: document.source, rights: row.rights, acknowledgement: document.acknowledgement }, now), domains ? this.restriction(id, domains, now) : null);
    return this.summary(created);
  }
  async ownDetail(id, owner) {
    const row = await this.get(id, owner); const doc = this.document(row);
    const decisions = doc.decisions ? Object.fromEntries(Object.entries(doc.decisions).map(([right, d]) => [right, { outcome: d.outcome, reason: d.reason }])) : null;
    return { ...this.summary(row), details: doc.details, acknowledgement: doc.acknowledgement, decisions, responseAvailable: !!doc.response };
  }
  async staffDetail(id, actor) {
    const row = await this.get(id);
    id = row.id;
    // Lecturas también son evidencia, cifrada; no cambian el plazo/version de negocio.
    await this.repository.change(id, row.version, {}, this.event(id, actor, 'case_read', {}, this.now()));
    const actions = await this.repository.actions(id);
    return { ...this.summary({ ...row, version: row.version + 1 }), subjectKind: row.subject_kind, subjectId: row.subject_id, document: this.document(row), actions: actions.map(a => ({ action: a.action, actor: a.actor_auth0, at: a.occurred_at, detail: this.vault.open(a.detail_cipher, `action:${id}:${a.action}`) })) };
  }
  async change(id, input, actor) {
    const row = await this.get(id); const doc = this.document(row); const now = this.now();
    id = row.id;
    if (!Number.isInteger(input.version) || input.version !== row.version) throw new AppError(409, 'El expediente cambió. Actualiza antes de continuar.');
    const action = input.action;
    const update = {}; let restriction; let evidence = {};
    if (row.status === 'responded' && action !== 'release') throw new AppError(409, 'La respuesta enviada es inmutable. Crea una solicitud nueva si corresponde.');
    switch (action) {
      case 'assign':
        if (!this.config.staff.includes(input.assignee)) bad('La persona asignada no está habilitada para privacidad.');
        doc.assignedTo = input.assignee; evidence = { assignee: input.assignee }; break;
      case 'verify': {
        if (row.verified_at) throw new AppError(409, 'La identidad ya está verificada.');
        if (!['user', 'client', 'other'].includes(input.subjectKind)) bad('Tipo de titular inválido.');
        const subjectId = input.subjectKind === 'other' ? null : input.subjectId;
        if (input.subjectKind !== 'other' && (!Number.isInteger(subjectId) || subjectId <= 0)) bad('Identificador interno inválido.');
        if (!await this.repository.subjectExists(input.subjectKind, subjectId)) bad('Titular interno no disponible.');
        if (input.contactVerified !== true || input.representationReviewed !== true) bad('Verificar contacto e identidad/representación antes de continuar.');
        doc.identity = { method: text(input.method, 'Método de verificación', 200), evidence: text(input.evidence, 'Referencia de verificación', 2000), verifiedBy: actor };
        update.verified_at = now; update.subject_kind = input.subjectKind; update.subject_id = subjectId; update.status = 'verified';
        evidence = doc.identity; break;
      }
      case 'extend':
        if (row.extension_used || doc.response) throw new AppError(409, 'No se puede prorrogar esta solicitud.');
        if (now > row.due_at) throw new AppError(409, 'No se permite una prórroga retroactiva.');
        evidence = { reason: text(input.reason, 'Motivo de prórroga', 2000), notificationEvidence: text(input.notificationEvidence, 'Evidencia de comunicación de prórroga', 2000) };
        update.extension_used = true; update.due_at = addCalendarDays(new Date(row.due_at), 30); break;
      case 'block_decision':
        if (!row.block_due_at || row.block_decided_at) throw new AppError(409, 'No hay decisión de bloqueo pendiente.');
        if (!row.verified_at) throw new AppError(409, 'Verifica identidad antes de resolver el bloqueo. La suspensión preventiva permanece.');
        if (!['accepted', 'rejected'].includes(input.outcome)) bad('Resultado de bloqueo inválido.');
        evidence = { outcome: input.outcome, reason: text(input.reason, 'Fundamento del bloqueo', 4000), notificationEvidence: text(input.notificationEvidence, 'Evidencia de comunicación al titular', 2000) };
        if (input.outcome === 'rejected') {
          evidence.agencyEvidence = text(input.agencyEvidence, 'Evidencia de comunicación a la Agencia', 2000);
          restriction = this.restriction(id, this.config.notice.blockingDomains.blocking, now, false);
          doc.suspensionDomains = [];
        }
        doc.blockDecision = evidence; update.block_decided_at = now; break;
      case 'scope':
        if (!row.block_due_at || doc.blockDecision?.outcome === 'rejected') throw new AppError(409, 'No hay suspensión activa aplicable.');
        evidence = { domains: validateDomains(input.domains), completenessEvidence: text(input.evidence, 'Evidencia de cobertura del alcance', 4000) };
        if (doc.execution?.oppositionDomains?.some(d => !evidence.domains.includes(d))) bad('La nueva cobertura no puede reactivar dominios suspendidos por oposición aceptada.');
        doc.suspensionDomains = evidence.domains;
        restriction = this.restriction(id, evidence.domains, now); break;
      case 'review': {
        if (!row.verified_at || doc.response) throw new AppError(409, 'La revisión requiere identidad verificada y respuesta aún no preparada.');
        if (!input.decisions || typeof input.decisions !== 'object' || Object.keys(input.decisions).length !== row.rights.length) bad('Resolver cada derecho solicitado.');
        const decisions = {};
        for (const right of row.rights) {
          const decision = input.decisions[right];
          if (!decision || !['accepted', 'partial', 'denied'].includes(decision.outcome)) bad('Resultado por derecho inválido.');
          decisions[right] = { outcome: decision.outcome, reason: text(decision.reason, 'Fundamento', 4000, 10), plan: decision.outcome === 'denied' ? null : text(decision.plan, 'Plan de actuación', 4000, 10) };
          if (right === 'portability' && decision.outcome !== 'denied' && input.portabilityConditionsConfirmed !== true) bad('Confirmar condiciones de procedencia de portabilidad.');
        }
        doc.decisions = decisions; doc.execution = null; doc.systems = null; update.status = 'reviewed'; evidence = { decisions }; break;
      }
      case 'execute': {
        if (!doc.decisions || doc.response) throw new AppError(409, 'Revisa los derechos antes de registrar ejecución.');
        const execution = {};
        for (const right of row.rights) {
          if (doc.decisions[right].outcome !== 'denied') execution[right] = text(input.execution?.[right], `Evidencia de ${right}`, 4000, 10);
        }
        if (!Array.isArray(input.systems) || input.systems.length !== PRIVACY_SYSTEMS.length || new Set(input.systems.map(s => s.system)).size !== PRIVACY_SYSTEMS.length) bad('Revisar todos los sistemas/copias del expediente.');
        const systems = input.systems.map(s => {
          if (!PRIVACY_SYSTEMS.includes(s.system) || !['completed', 'not_applicable'].includes(s.status)) bad('Existen sistemas sin revisar o estados inválidos.');
          return { system: s.system, status: s.status, evidence: text(s.evidence, 'Evidencia o justificación por sistema', 4000, 10) };
        });
        if (row.block_due_at && !row.block_decided_at) throw new AppError(409, 'Resolver el bloqueo antes de preparar la respuesta final.');
        if (doc.decisions.opposition && doc.decisions.opposition.outcome !== 'denied') {
          const oppositionDomains = validateDomains(input.oppositionDomains);
          doc.suspensionDomains = [...new Set([...(doc.suspensionDomains ?? []), ...oppositionDomains])];
          restriction = this.restriction(id, doc.suspensionDomains, now);
          execution.oppositionDomains = oppositionDomains;
        }
        doc.execution = execution; doc.systems = systems; update.status = 'executed'; evidence = { execution, systems }; break;
      }
      case 'prepare_response':
        if (!doc.decisions || !doc.execution || !doc.systems || doc.response) throw new AppError(409, 'Completa revisión y ejecución antes de preparar respuesta.');
        if (!input.response || Array.isArray(input.response) || typeof input.response !== 'object') bad('La respuesta debe ser un objeto JSON estructurado.');
        if (JSON.stringify(input.response).length > 60000) bad('Respuesta demasiado grande. Entregar por canal seguro y registrar referencia.');
        noSecrets(input.response);
        if (input.thirdPartyReviewed !== true || input.minimizationReviewed !== true) bad('Revisar terceros y minimización antes de entregar.');
        text(input.response.summary, 'Resumen de respuesta', 12000, 10);
        doc.response = { ...input.response, requestId: id, decisions: Object.fromEntries(Object.entries(doc.decisions).map(([right, d]) => [right, { outcome: d.outcome, reason: d.reason }])), preparedAt: now.toISOString(), policyVersion: doc.policyVersion, complaintInformation: 'Si existe denegación total o parcial, puede reclamar ante la Agencia de Protección de Datos Personales dentro de treinta días hábiles, conforme al artículo 11 y al procedimiento aplicable. Reforma vigente desde el 1 de diciembre de 2026.' };
        doc.preparedAt = now.toISOString(); update.status = 'response_ready'; evidence = { thirdPartyReviewed: true, minimizationReviewed: true }; break;
      case 'deliver':
        if (row.status !== 'response_ready' || !doc.response) throw new AppError(409, 'No hay respuesta preparada para remitir.');
        evidence = { channel: text(input.channel, 'Canal de remisión', 100), recipient: text(input.recipient, 'Destinatario', 255), reference: text(input.evidence, 'Evidencia de remisión', 4000), sentAt: date(input.sentAt, now).toISOString() };
        if (evidence.recipient.toLowerCase() !== doc.email.toLowerCase()) bad('Remitir únicamente al contacto verificado del expediente.');
        if (new Date(evidence.sentAt) < new Date(doc.preparedAt)) bad('La remisión no puede ser anterior a la respuesta.');
        doc.delivery = evidence; update.status = 'responded'; break;
      case 'release':
        if (row.status !== 'responded' || !doc.suspensionDomains?.length) throw new AppError(409, 'Resolver y remitir la respuesta antes de levantar la suspensión.');
        evidence = { reason: text(input.reason, 'Fundamento para levantar suspensión', 4000), legalReviewEvidence: text(input.evidence, 'Evidencia de revisión de usos permitidos', 4000) };
        restriction = this.restriction(id, this.config.notice.blockingDomains.blocking, now, false); break;
      default: bad('Actuación de privacidad desconocida.');
    }
    update.document_cipher = this.vault.seal(doc, `request:${id}`);
    return this.summary(await this.repository.change(id, row.version, update, this.event(id, actor, action, evidence, now), restriction));
  }
  async response(id, actor, staff = false) {
    const row = await this.get(id, staff ? undefined : actor); const doc = this.document(row);
    id = row.id;
    if (!row.verified_at || !doc.response) throw new AppError(404, 'Respuesta no disponible.');
    if (!staff) {
      doc.responseFetchedAt = this.now().toISOString();
      await this.repository.change(id, row.version, { document_cipher: this.vault.seal(doc, `request:${id}`) }, this.event(id, actor, 'response_downloaded', {}, this.now()));
    } else {
      await this.repository.change(id, row.version, {}, this.event(id, actor, 'response_read', {}, this.now()));
    }
    return doc.response;
  }
  async acknowledge(id, actor) {
    const row = await this.get(id, actor); const doc = this.document(row);
    id = row.id;
    if (row.status === 'responded') return this.summary(row);
    if (row.status !== 'response_ready' || !doc.responseFetchedAt) throw new AppError(409, 'Descarga la respuesta antes de confirmar recepción.');
    doc.delivery = { channel: 'authenticated_portal', recipient: doc.email, reference: id, sentAt: this.now().toISOString(), acknowledgedBy: actor };
    return this.summary(await this.repository.change(id, row.version, { status: 'responded', document_cipher: this.vault.seal(doc, `request:${id}`) }, this.event(id, actor, 'receipt_acknowledged', doc.delivery, this.now())));
  }
}
