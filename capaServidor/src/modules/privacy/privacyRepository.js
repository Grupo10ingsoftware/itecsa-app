import getPrismaClient from '../../database/prisma.js';
import { AppError } from '../../errors/AppError.js';

export class PrivacyRepository {
  constructor({ database = getPrismaClient } = {}) { this.database = database; }
  get(id) { return this.database().privacyRequest.findUnique({ where: { id } }); }
  async list({ owner, cursor, limit = 25 } = {}) {
    const rows = await this.database().privacyRequest.findMany({
      where: { ...(owner ? { owner_auth0: owner } : {}), ...(cursor ? { id: { gt: cursor } } : {}) },
      orderBy: { id: 'asc' }, take: limit + 1,
    });
    return { rows: rows.slice(0, limit), nextCursor: rows.length > limit ? rows[limit - 1].id : null };
  }
  async create(row, event, restriction) {
    return this.database().$transaction(async tx => {
      const created = await tx.privacyRequest.create({ data: row });
      await tx.privacyAction.create({ data: event });
      if (restriction) await tx.privacyRestriction.create({ data: restriction });
      return created;
    });
  }
  async change(id, version, update, event, restriction) {
    return this.database().$transaction(async tx => {
      const result = await tx.privacyRequest.updateMany({ where: { id, version }, data: { ...update, version: { increment: 1 } } });
      if (result.count !== 1) throw new AppError(409, 'El expediente cambió. Actualiza antes de continuar.');
      await tx.privacyAction.create({ data: event });
      if (restriction) await tx.privacyRestriction.upsert({ where: { request_id: id }, create: restriction, update: { domains: restriction.domains, active: restriction.active, released_at: restriction.released_at } });
      return tx.privacyRequest.findUnique({ where: { id } });
    });
  }
  actions(id) { return this.database().privacyAction.findMany({ where: { request_id: id }, orderBy: { occurred_at: 'asc' } }); }
  restrictions() { return this.database().privacyRestriction.findMany({ where: { active: true }, select: { domains: true } }); }
  async deadlineCounts(now, soon) {
    const db = this.database();
    const [overdue, dueSoon, blockingOverdue] = await Promise.all([
      db.privacyRequest.count({ where: { status: { not: 'responded' }, due_at: { lt: now } } }),
      db.privacyRequest.count({ where: { status: { not: 'responded' }, due_at: { gte: now, lte: soon } } }),
      db.privacyRequest.count({ where: { block_due_at: { lt: now }, block_decided_at: null } }),
    ]);
    return { overdue, dueSoon, blockingOverdue };
  }
  async subjectExists(kind, id) {
    if (kind === 'other') return id === null;
    const model = kind === 'user' ? this.database().usuario : this.database().cliente;
    return !!await model.findUnique({ where: { [kind === 'user' ? 'id_usuario' : 'id_cliente']: id }, select: { [kind === 'user' ? 'id_usuario' : 'id_cliente']: true } });
  }
}
