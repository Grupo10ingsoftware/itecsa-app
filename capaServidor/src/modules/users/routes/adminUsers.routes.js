import { Router } from "express";
import checkJwt from "../../../middlewares/checkJwt.js";
import requireAdministrador from "../../../middlewares/requireAdministrador.js";
import requirePin from "../../../middlewares/requirePin.js";
import pinService from "../../auth/service/pin.service.js";
import {
    createAdminUserHandler,
    createAdminUsersSummaryHandler,
    createListAdminUsersHandler,
    createPasswordSetupEmailHandler,
    createUpdateAdminUserHandler,
    createUpdateAdminUserStatusHandler,
} from "../controller/adminUsers.controller.js";

export function createAdminUsersRouter({
    authenticate = checkJwt,
    authorize = requireAdministrador,
    createUser,
    requestPasswordEmail,
    updateUser,
    updateStatus,
    users,
    pins = pinService,
    validatePin = requirePin,
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
        createAdminUserHandler({ createUser, requestPasswordEmail, users, pins }),
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
        validatePin,
        createUpdateAdminUserHandler({ updateUser, users }),
    );
    router.patch(
        "/users/:userId/status",
        authenticate,
        authorize,
        validatePin,
        createUpdateAdminUserStatusHandler({ updateStatus, users, pins }),
    );
    return router;
}

export default createAdminUsersRouter();
