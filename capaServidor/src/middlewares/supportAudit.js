import { ROLES } from "../../../shared/authorization.js";
import SecurityAuditRepository from "../modules/security/repo/securityAudit.repo.js";
import { safeLogger } from "../shared/safeLogger.js";

export function createSupportAudit({ repository = new SecurityAuditRepository(), logger = safeLogger } = {}) {
    return function supportAudit(req, res, next) {
        res.on("finish", () => {
            const isSupport = req.currentUser?.rolUsuario === ROLES.SOPORTE;
            const isUserAdministration = req.method !== "GET" && req.originalUrl?.startsWith("/api/admin/users");
            if (!isSupport && !isUserAdministration) return;
            const actorUserId = req.currentUser?.idUsuario ?? null;

            repository.record({
                eventType: isSupport ? "support.request" : "user_administration.request",
                actorUserId,
                action: `${req.method} ${req.baseUrl || req.path}`,
                resourceType: "http_request",
                resourceId: req.params?.orderId ?? req.params?.userId ?? null,
                requestId: req.requestId,
                outcome: res.statusCode < 400 ? "allowed" : "denied",
                reasonCode: `HTTP_${res.statusCode}`,
            }).catch((error) => logger.error("security_audit.write_failed", {
                requestId: req.requestId,
                actorId: actorUserId,
                code: error?.code ?? "AUDIT_WRITE_FAILED",
                outcome: "error",
            }));
        });
        next();
    };
}

export default createSupportAudit();
