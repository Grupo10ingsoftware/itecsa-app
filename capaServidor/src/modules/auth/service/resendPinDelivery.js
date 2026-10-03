import { PinDeliveryConfigurationError } from '../../../config/pinDelivery.js';

export class ResendPinDeliveryProvider {
    #apiKey;
    constructor({ apiKey, from, fetchImpl = globalThis.fetch } = {}) {
        if (!apiKey?.trim() || !from?.trim() || /[\r\n]/.test(apiKey + from)) {
            throw new PinDeliveryConfigurationError();
        }
        this.#apiKey = apiKey;
        this.from = from;
        this.fetchImpl = fetchImpl;
    }

    async sendCode({ to, code, expiresAt }) {
        try {
            const expiry = new Date(expiresAt);
            if (typeof to !== 'string' || !to.trim() || /[\r\n]/.test(to) ||
                !/^\d{6}$/.test(code) || !Number.isFinite(+expiry)) throw new Error();
            const response = await this.fetchImpl('https://api.resend.com/emails', {
                method: 'POST',
                redirect: 'error',
                signal: AbortSignal.timeout(10000),
                headers: { Authorization: `Bearer ${this.#apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from: this.from,
                    to: [to],
                    subject: 'Código de recuperación de PIN',
                    text: `Se solicitó recuperar tu PIN.\n\nTu código de verificación es: ${code}\n\nVence el ${expiry.toISOString()} (UTC).\n\nSi no solicitaste esta recuperación, puedes ignorar este mensaje.`,
                }),
            });
            if (!response.ok) {
                await response.body?.cancel();
                throw new Error();
            }
            const result = await response.json();
            if (typeof result?.id !== 'string' || !result.id) throw new Error();
        } catch {
            // Never propagate transport errors, response bodies, recipients or OTPs.
            const error = new Error('No fue posible enviar el codigo de recuperacion.');
            error.code = 'PIN_RECOVERY_DELIVERY_FAILED';
            throw error;
        }
    }
}
