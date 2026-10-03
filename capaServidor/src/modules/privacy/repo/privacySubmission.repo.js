import getPrismaClient from '../../../database/prisma.js';

export default class PrivacySubmissionRepo {
    constructor({ database = getPrismaClient } = {}) { this.database = database; }
    async reserve(data) {
        try { return { row: await this.database().privacySubmission.create({ data }), created: true }; }
        catch (error) {
            if (error.code !== 'P2002') throw error;
            const row = await this.database().privacySubmission.findUnique({ where: { id: data.id } });
            if (!row) throw error;
            return { row, created: false };
        }
    }
    async claimRetry(id) {
        const result = await this.database().privacySubmission.updateMany({ where: { id, status: 'failed' }, data: { status: 'sending', error_code: null } });
        return result.count === 1;
    }
    finish(id, data) { return this.database().privacySubmission.update({ where: { id }, data }); }
}
