export class TextDeliveryError extends Error {
    constructor(code, retryable = false) { super('No fue posible confirmar el envío.'); this.code = code; this.retryable = retryable; }
}

// Transport only; each channel owns its message, recipient and key namespace.
export default class ResendTextDelivery {
    constructor({ fetchImpl = globalThis.fetch } = {}) { this.fetchImpl = fetchImpl; }
    async sendText({ config, replyTo, subject, text, idempotencyKey }) {
        let response;
        try {
            response = await this.fetchImpl('https://api.resend.com/emails', {
                method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
                headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
                body: JSON.stringify({ from: config.from, to: [config.recipient], reply_to: replyTo, subject, text }),
            });
        } catch { throw new TextDeliveryError('DELIVERY_UNCONFIRMED'); }
        if (!response.ok) {
            await response.body?.cancel().catch(() => {});
            throw new TextDeliveryError('DELIVERY_REJECTED', [400, 401, 403, 422, 429].includes(response.status));
        }
        try {
            const data = await response.json();
            if (typeof data?.id !== 'string' || !/^[a-zA-Z0-9-]{1,128}$/.test(data.id)) throw new Error();
            return data.id;
        } catch { throw new TextDeliveryError('DELIVERY_UNCONFIRMED'); }
    }
}
