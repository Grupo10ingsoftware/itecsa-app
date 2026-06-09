import { Router } from "express";
import checkJwt from "../../../middlewares/checkJwt.js";
import requireAdministrador from "../../../middlewares/requireAdministrador.js";
import {
    createAdminUserHandler,
    createPasswordSetupEmailHandler,
} from "../controller/adminUsers.controller.js";
import { uploadSignatureFile } from "../middleware/signatureUpload.js";

export function createAdminUsersRouter({
    authenticate = checkJwt,
    authorize = requireAdministrador,
    createUser,
    requestPasswordEmail,
    users,
    uploadSignature = uploadSignatureFile,
} = {}) {
    const router = Router();
    router.post(
        "/users",
        authenticate,
        authorize,
        uploadSignature,
        createAdminUserHandler({ createUser, requestPasswordEmail, users }),
    );
    router.post(
        "/users/password-setup-email",
        authenticate,
        authorize,
        createPasswordSetupEmailHandler({ requestPasswordEmail }),
    );
    return router;
}

export default createAdminUsersRouter();
