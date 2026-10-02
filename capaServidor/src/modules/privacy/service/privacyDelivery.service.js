export class PrivacyDeliveryError extends Error {
    constructor(code, retryable = false) { super('No fue posible confirmar el envío.'); this.code = code; this.retryable = retryable; }
}

// Same provider/HTTP transport already used for PIN, with independent configuration.
export default class PrivacyDeliveryService {
    constructor({ fetchImpl = globalThis.fetch } = {}) { this.fetchImpl = fetchImpl; }
    async send({ config, request, userId, receivedAt }) {
        let response;
        try {
            response = await this.fetchImpl('https://api.resend.com/emails', {
                method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
                headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `privacy-request/${request.requestId}` },
                body: JSON.stringify({ from: config.from, to: [config.recipient], reply_to: request.email,
                    subject: `Solicitud sobre datos personales · ${request.requestId}`,
                    text: `Solicitud: ${request.requestId}\nFecha de recepción: ${receivedAt.toISOString()}\nUsuario interno: ${userId}\nContacto de la cuenta: ${request.email}\nTipo: ${request.type}\nAsunto: ${request.subject}\n\n${request.description}\n`,
                }),
            });
        } catch { throw new PrivacyDeliveryError('DELIVERY_UNCONFIRMED'); }
        if (!response.ok) {
            await response.body?.cancel().catch(() => {});
            // Explicit rejection permits retry. A server/network error may have sent it.
            throw new PrivacyDeliveryError('DELIVERY_REJECTED', [400, 401, 403, 422, 429].includes(response.status));
        }
        try {
            const data = await response.json();
            if (typeof data?.id !== 'string' || !/^[a-zA-Z0-9-]{1,128}$/.test(data.id)) throw new Error();
            return data.id;
        } catch { throw new PrivacyDeliveryError('DELIVERY_UNCONFIRMED'); }
    }
}
