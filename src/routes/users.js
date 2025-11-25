import express from "express";
import auth from "../middleware/auth.js";
import UserController from "../controllers/userController.js";

const router = express.Router();

router.get("/", auth, UserController.getUsers);
router.get("/search", auth, UserController.searchUsers);
router.get("/profile", auth, UserController.getUserProfile);
router.put("/profile", auth, UserController.updateUserProfile);

router.post("/change-password", auth, UserController.changePasswordWithToken);
router.post("/change-password/email", UserController.changePasswordByEmail);

router.delete("/delete", auth, UserController.deleteAccount);
router.get("/:id", auth, UserController.getUserById);

export default router;
