import express from "express";
import { chat } from "../controllers/chat.controller.js";
import { verifyUser } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", verifyUser, chat);

export default router;