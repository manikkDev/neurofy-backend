import { Router } from "express";
import { AuthController } from "./authController";
import { authenticate } from "../../middlewares/auth";

const router = Router();

router.post("/signup", AuthController.signup);
router.post("/login", AuthController.login);
router.post("/refresh", AuthController.refreshToken);
router.post("/logout", authenticate, AuthController.logout);
router.get("/me", authenticate, AuthController.getCurrentUser);

export default router;
