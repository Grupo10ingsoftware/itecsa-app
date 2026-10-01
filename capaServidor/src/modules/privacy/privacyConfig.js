import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { PRIVACY_DOMAINS, PRIVACY_RIGHTS } from '../../../../shared/privacy.js';

export function privacyEnabled(env = process.env) {
  if (env.PRIVACY_ENABLED !== undefined && !['true', 'false'].includes(env.PRIVACY_ENABLED)) throw new Error('PRIVACY_ENABLED debe ser true o false.');
  return env.PRIVACY_ENABLED === 'true';
}

export function loadPrivacyConfiguration(env = process.env) {
  if (!privacyEnabled(env)) return { enabled: false, staff: [], notice: null };
  if (!/^[a-fA-F0-9]{64}$/.test(env.PRIVACY_ENCRYPTION_KEY ?? '')) throw new Error('PRIVACY_ENCRYPTION_KEY debe contener 32 bytes hexadecimales.');
  const staff = String(env.PRIVACY_STAFF_SUBJECTS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  if (!staff.length || new Set(staff).size !== staff.length) throw new Error('Definir PRIVACY_STAFF_SUBJECTS sin duplicados.');
  if (!env.PRIVACY_POLICY_PATH || !path.isAbsolute(env.PRIVACY_POLICY_PATH)) throw new Error('PRIVACY_POLICY_PATH debe ser una ruta absoluta.');
  const raw = fs.readFileSync(env.PRIVACY_POLICY_PATH, 'utf8');
  const notice = JSON.parse(raw);
  validateNotice(notice);
  return { enabled: true, staff, notice, digest: createHash('sha256').update(raw).digest('hex'), key: env.PRIVACY_ENCRYPTION_KEY };
}

export function validateNotice(notice) {
  const validDay = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
  const required = ['version', 'publishedAt', 'approvedBy', 'approvalReference', 'responsible', 'representative', 'postalAddress', 'contactEmail'];
  if (notice.approved !== true || required.some(k => typeof notice[k] !== 'string' || !notice[k].trim() || /PENDIENTE|POR CONFIRMAR|EJEMPLO/i.test(notice[k]))) throw new Error('El aviso requiere aprobación y datos organizacionales confirmados.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notice.contactEmail) || !Number.isFinite(Date.parse(notice.publishedAt))) throw new Error('Contacto o fecha de aviso no válidos.');
  const sections = ['dataAndSubjects', 'sources', 'purposesAndBases', 'recipients', 'transfers', 'retention', 'security', 'rights', 'complaints', 'consentWithdrawal', 'automatedDecisions'];
  if (!notice.sections || sections.some(k => typeof notice.sections[k] !== 'string' || !notice.sections[k].trim() || /PENDIENTE|POR CONFIRMAR/i.test(notice.sections[k]))) throw new Error('Completar todas las secciones del aviso antes de publicar.');
  const calendar = notice.calendar;
  if (!calendar || !validDay(calendar.from) || !validDay(calendar.through) || calendar.from > calendar.through || !Array.isArray(calendar.holidays) || new Set(calendar.holidays).size !== calendar.holidays.length || calendar.holidays.some(d => !validDay(d) || d < calendar.from || d > calendar.through)) throw new Error('Definir calendario hábil revisado, cobertura y feriados.');
  if (!notice.blockingDomains || PRIVACY_RIGHTS.some(r => !Array.isArray(notice.blockingDomains[r]) || notice.blockingDomains[r].some(d => !PRIVACY_DOMAINS.includes(d))) || !notice.blockingDomains.blocking.length) throw new Error('Definir alcance conservador de suspensión por derecho.');
}

let cached;
export function privacyConfiguration() {
  if (!cached) cached = loadPrivacyConfiguration();
  return cached;
}
