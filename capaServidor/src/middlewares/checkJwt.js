import { auth } from "express-oauth2-jwt-bearer";

import requireActiveIdentity from "./requireActiveIdentity.js";
import { authenticatedRateLimit } from "./rateLimit.js";
import privacyGuard from '../modules/privacy/privacyGuard.js';
let jwtValidator;

export default function checkJwt(req, res, next) {
    if (!jwtValidator) {
        // Valida solo access tokens emitidos por el tenant para esta API.
        jwtValidator = auth({
            audience: process.env.AUTH0_AUDIENCE,
            issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
        });
    }

    return jwtValidator(req, res, (error) => error ? next(error) : requireActiveIdentity(
        req,
        res,
        (identityError) => identityError ? next(identityError) : authenticatedRateLimit(req, res, (limitError) => limitError ? next(limitError) : privacyGuard(req, res, next)),
    ));
}
