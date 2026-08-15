import { Router } from "express";
import checkJwt from "../../../middlewares/checkJwt.js";
import requireAdministrativeRole from "../../../middlewares/requireAdministrativeRole.js";
import {
    createAdminUserHandler,
    createAdminUsersSummaryHandler,
    createListAdminUsersHandler,
    createPasswordSetupEmailHandler,
    createUpdateAdminUserHandler,
    createUpdateAdminUserStatusHandler,
} from "../controller/adminUsers.controller.js";
import { uploadSignatureFile } from "../middleware/signatureUpload.js";

export function createAdminUsersRouter({
    authenticate = checkJwt,
    authorize = requireAdministrativeRole,
    createUser,
    requestPasswordEmail,
    updateUser,
    updateStatus,
    users,
    uploadSignature = uploadSignatureFile,
} = {}) {
    const router = Router();
    router.get(
        "/users",
        authenticate,
        authorize,
        createListAdminUsersHandler({ users }),
    );
    router.get(
        "/users/summary",
        authenticate,
        authorize,
        createAdminUsersSummaryHandler({ users }),
    );
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
    router.patch(
        "/users/:userId",
        authenticate,
        authorize,
        createUpdateAdminUserHandler({ updateUser, users }),
    );
    router.patch(
        "/users/:userId/status",
        authenticate,
        authorize,
        createUpdateAdminUserStatusHandler({ updateStatus, users }),
    );
    return router;
}

export default createAdminUsersRouter();
