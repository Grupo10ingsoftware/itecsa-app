import { auth } from "express-oauth2-jwt-bearer";

let jwtValidator;

export default function checkJwt(req, res, next) {
    if (!jwtValidator) {
        // Valida solo access tokens emitidos por el tenant para esta API.
        jwtValidator = auth({
            audience: process.env.AUTH0_AUDIENCE,
            issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
        });
    }

    return jwtValidator(req, res, next);
}
