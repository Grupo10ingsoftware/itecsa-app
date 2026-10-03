import ResendTextDelivery from '../../../shared/resendTextDelivery.js';
import { INCIDENT_MODULES } from '../../../../../shared/incidentReports.js';

export default class IncidentDeliveryService extends ResendTextDelivery {
    send({ config, report, userId, receivedAt }) {
        const moduleLabel = INCIDENT_MODULES.find(module => module.value === report.module).label;
        return this.sendText({ config, replyTo: report.email, idempotencyKey: `incident-report/${report.reportId}`,
            subject: `Reporte de posible incidente · ${report.reportId}`,
            text: `Reporte: ${report.reportId}\nRecepción: ${receivedAt.toISOString()}\nObservado: ${report.observedAt} (UTC)\nUsuario interno: ${userId}\nContacto de la cuenta: ${report.email}\nMódulo: ${moduleLabel}\nReferencia técnica: ${report.technicalReference || 'No indicada'}\n\n${report.description}\n\nEste mensaje comunica una sospecha. Su evaluación y gestión corresponden al responsable designado por Itecsa.\n`,
        });
    }
}
