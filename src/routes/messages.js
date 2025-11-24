import express from "express";
import auth from "../middleware/auth.js";
import {
  createMessage,
  getMessagesForConversation,
  getConversations,
  editMessage,
  deleteMessage,
  markMessageAsRead,
  createOrGetConversation,
  leaveConversation, 
} from "../controllers/messageController.js";

const router = express.Router();

router.post("/conversations", auth, createOrGetConversation);
router.get("/conversations", auth, getConversations);

router.delete("/conversations/:conversationId/leave", auth, leaveConversation);

router.post("/", auth, createMessage);
router.get("/conversation/:conversation_id", auth, getMessagesForConversation);
router.put("/:id", auth, editMessage);
router.delete("/:id", auth, deleteMessage);
router.post("/:id/read", auth, markMessageAsRead);

export default router;