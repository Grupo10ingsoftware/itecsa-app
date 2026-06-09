import { Router } from "express";
import checkJwt from "../../../middlewares/checkJwt.js";
import requireAdministrador from "../../../middlewares/requireAdministrador.js";
import {
    createAdminUserHandler,
    createPasswordSetupEmailHandler,
} from "../controller/adminUsers.controller.js";

export function createAdminUsersRouter({
    authenticate = checkJwt,
    authorize = requireAdministrador,
    createUser,
    requestPasswordEmail,
    users,
} = {}) {
    const router = Router();
    router.post(
        "/users",
        authenticate,
        authorize,
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
