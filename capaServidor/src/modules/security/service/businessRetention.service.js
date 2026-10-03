import { safeLogger } from '../../../shared/safeLogger.js';

const BATCH_SIZE = 100;

export function readBusinessRetentionConfig(env = process.env) {
    const mode = env.BUSINESS_RETENTION_MODE?.trim() || 'disabled';
    if (!['disabled', 'dry-run', 'delete'].includes(mode)) {
        throw new Error('BUSINESS_RETENTION_MODE debe ser disabled, dry-run o delete.');
    }
    return { mode, months: 6 };
}

// Calendar months in UTC, clamping month-end dates (August 31 -> February 28/29).
export function sixMonthsAgo(now) {
    if (!(now instanceof Date) || !Number.isFinite(+now)) throw new Error('Fecha invalida.');
    const cutoff = new Date(now);
    cutoff.setUTCDate(1);
    cutoff.setUTCMonth(cutoff.getUTCMonth() - 6);
    const lastDay = new Date(Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + 1, 0)).getUTCDate();
    cutoff.setUTCDate(Math.min(now.getUTCDate(), lastDay));
    return cutoff;
}

export function retentionDefinitions(cutoff) {
    // Fail closed for unknown states, missing dates, active details or recent activity.
    const closedOrder = {
        Estado_Pedido: { is: { nombre_etapa: { in: ['Terminado', 'Finalizado', 'Cancelado'] } } },
        fecha_creacion: { lt: cutoff },
        Registros: { none: { FECHA_HORA: { gte: cutoff } } },
        Detalle_pedido: { none: { OR: [
            { fecha_real_termino: null }, { fecha_real_termino: { gte: cutoff } },
        ] } },
    };
    const oldOptionalDate = field => ({ OR: [{ [field]: null }, { [field]: { lt: cutoff } }] });
    return {
        messages: {
            model: 'mensaje', key: 'id_mensaje',
            where: { fecha_publicacion: { lt: cutoff }, OR: [
                { id_pedido: null }, { Pedidos: { is: closedOrder } },
            ] },
            async dependencies(tx, ids) {
                await tx.mENSAJE_USUARIO.deleteMany({ where: { id_mensaje: { in: ids } } });
            },
        },
        comments: {
            model: 'comentario_Produccion', key: 'id_comentario_produccion',
            where: { fecha_comentario: { lt: cutoff }, Detalle_pedido: { is: {
                Pedidos: { is: closedOrder },
            } } },
        },
        history: {
            model: 'registros', key: 'ID_REGISTRO',
            where: {
                FECHA_HORA: { lt: cutoff }, Pedidos: { is: closedOrder },
                AND: [
                    { OR: [{ Registro_Etapas: { is: null } }, { Registro_Etapas: { is: {
                        fecha_hora_salida: { lt: cutoff }, ...oldOptionalDate('fecha_hora_entrada'),
                    } } }] },
                    { OR: [{ Registro_Pago: { is: null } }, { Registro_Pago: { is: oldOptionalDate('fecha_registro') } }] },
                    { OR: [{ registro_subprocesos: { is: null } }, { registro_subprocesos: { is: {
                        fecha_hora_salida: { lt: cutoff }, ...oldOptionalDate('fecha_hora_entrada'),
                        Avance_Lanyard: { none: {} },
                        Detalle_pedido: { is: { Pedidos: { is: closedOrder } } },
                    } } }] },
                ],
            },
            async dependencies(tx, ids) {
                const where = { id_registro: { in: ids } };
                await tx.registro_Pago.deleteMany({ where });
                await tx.registro_Etapas.deleteMany({ where });
                await tx.registro_subprocesos.deleteMany({ where });
            },
        },
        audit: {
            model: 'securityAuditEvent', key: 'id_security_audit_event',
            where: { occurred_at: { lt: cutoff } },
        },
    };
}

export async function cleanupBusinessRetention({ client, env = process.env, now = new Date(), logger = safeLogger }) {
    const { mode, months } = readBusinessRetentionConfig(env);
    if (mode === 'disabled') return { mode };
    const cutoff = sixMonthsAgo(now);
    const reports = {};
    for (const [category, definition] of Object.entries(retentionDefinitions(cutoff))) {
        const { model, key, where, dependencies } = definition;
        const runBatch = async tx => {
            const rows = await tx[model].findMany({ where, select: { [key]: true }, orderBy: { [key]: 'asc' }, take: BATCH_SIZE + 1 });
            const ids = rows.slice(0, BATCH_SIZE).map(row => row[key]);
            let deletedCount = 0;
            if (mode === 'delete' && ids.length) {
                await dependencies?.(tx, ids);
                // Eligibility reads and dependent deletes share a serializable transaction.
                // Deleting child rows changes relation filters, so use selected IDs here.
                deletedCount = (await tx[model].deleteMany({ where: { [key]: { in: ids } } })).count;
            }
            return { mode, retentionMonths: months, cutoff: cutoff.toISOString(), candidateCount: ids.length, deletedCount, hasMore: rows.length > BATCH_SIZE };
        };
        const report = mode === 'delete'
            ? await client.$transaction(runBatch, { isolationLevel: 'Serializable', maxWait: 5000, timeout: 15000 })
            : await runBatch(client);
        reports[category] = report;
        logger.info(`retention.${category}`, report);
    }
    return reports;
}
