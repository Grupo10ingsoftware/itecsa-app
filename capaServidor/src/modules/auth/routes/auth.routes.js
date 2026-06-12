import { Router } from "express";
import checkJwt from "../../../middlewares/checkJwt.js";
import { verifyAuthSessionHandler } from "../controller/auth.controller.js";

const router = Router();

router.get("/verify", checkJwt, verifyAuthSessionHandler);

export default router;
