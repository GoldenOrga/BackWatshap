import express from "express";
import AuthController from "../controllers/authController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/refresh-token", AuthController.refreshToken);
router.post("/logout", auth, AuthController.logout);

export default router;
