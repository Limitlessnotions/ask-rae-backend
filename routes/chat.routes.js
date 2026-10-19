import express from "express";
import { chat } from "../controllers/chat.controller.js";
import {
  getUserConversations,
  getUserConversationMessages,
} from "../controllers/conversation.controller.js";
import { verifyUser } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", verifyUser, chat);

router.get("/conversations", verifyUser, getUserConversations);

router.get(
  "/conversations/:conversationId/messages",
  verifyUser,
  getUserConversationMessages
);

export default router;
