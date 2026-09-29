import requireCapability, { PERMISSIONS as P } from "../../../middlewares/requireCapability.js";
import { Router } from "express";
import checkJwt from "../../../middlewares/checkJwt.js";
import pinService from "../service/pin.service.js";
import { createPasswordResetRateLimit } from "../../../middlewares/rateLimit.js";
import {
    createGetProfileHandler,
    createDebugResetPinHandler,
    createAcknowledgePinHandler,
    createConfirmPinRecoveryHandler,
    createPasswordResetRequestHandler,
    createRequestPinRecoveryHandler,
    createRevealPinHandler,
    createVerifyAuthSessionHandler,
} from "../controller/auth.controller.js";

export { createPasswordResetRateLimit } from "../../../middlewares/rateLimit.js";

export function createAuthRouter({
    authenticate = checkJwt,
    passwordResetRateLimit = createPasswordResetRateLimit(),
    users,
    requestPasswordEmail,
    logger,
    pins = pinService,
    includeDebugRoutes = false,
    passwordResetMinimumDelayMs,
    passwordResetRandom,
} = {}) {
    const router = Router();

    router.get("/profile", authenticate, requireCapability(P.READ_PROFILE), createGetProfileHandler({ users }));

    router.get(
        "/verify",
        authenticate,
        requireCapability(P.READ_PROFILE),
        createVerifyAuthSessionHandler({ users, pins, logger }),
    );
    if (includeDebugRoutes) {
        router.post("/pin/debug-reset", authenticate, requireCapability(P.MANAGE_PIN), createDebugResetPinHandler({ pins }));
    }
    router.post("/pin/reveal", authenticate, requireCapability(P.MANAGE_PIN), createRevealPinHandler({ pins }));
    router.post("/pin/acknowledge", authenticate, requireCapability(P.MANAGE_PIN), createAcknowledgePinHandler({ pins }));
    router.post(
        "/pin-recovery/request",
        authenticate,
        requireCapability(P.MANAGE_PIN),
        createRequestPinRecoveryHandler({ pins }),
    );
    router.post(
        "/pin-recovery/confirm",
        authenticate,
        requireCapability(P.MANAGE_PIN),
        createConfirmPinRecoveryHandler({ pins }),
    );
    router.post(
        "/password-reset/request",
        passwordResetRateLimit,
        createPasswordResetRequestHandler({
            users,
            requestPasswordEmail,
            logger,
            minimumDelayMs: passwordResetMinimumDelayMs,
            random: passwordResetRandom,
        }),
    );

    return router;
}

export default createAuthRouter();
