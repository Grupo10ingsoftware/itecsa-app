import ResendTextDelivery from '../../../shared/resendTextDelivery.js';
export { TextDeliveryError as PrivacyDeliveryError } from '../../../shared/resendTextDelivery.js';

export default class PrivacyDeliveryService extends ResendTextDelivery {
    send({ config, request, userId, receivedAt }) {
        return this.sendText({ config, replyTo: request.email, idempotencyKey: `privacy-request/${request.requestId}`,
            subject: `Solicitud sobre datos personales · ${request.requestId}`,
            text: `Solicitud: ${request.requestId}\nFecha de recepción: ${receivedAt.toISOString()}\nUsuario interno: ${userId}\nContacto de la cuenta: ${request.email}\nTipo: ${request.type}\nAsunto: ${request.subject}\n\n${request.description}\n`,
        });
    }
}
