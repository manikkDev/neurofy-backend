import { Router } from "express";
import { AuthController } from "./authController";
import { authenticate } from "../../middlewares/auth";
import { authLimiter } from "../../middlewares/security";

const router = Router();

router.post("/signup", authLimiter, AuthController.signup);
router.post("/login", authLimiter, AuthController.login);
router.post("/refresh", authLimiter, AuthController.refreshToken);
router.post("/logout", authenticate, AuthController.logout);
router.get("/me", authenticate, AuthController.getCurrentUser);

export default router;
