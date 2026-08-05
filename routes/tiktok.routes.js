import express from "express";

import { verifyUser } from "../middleware/auth.middleware.js";

import {
  loginWithTikTok,
  tiktokCallback,
} from "../controllers/tiktok.controller.js";

const router = express.Router();

/**
 * --------------------------------------------------------------------------
 * Start TikTok OAuth
 * --------------------------------------------------------------------------
 */
router.post(
  "/tiktok/start",
  verifyUser,
  loginWithTikTok
);

/**
 * --------------------------------------------------------------------------
 * TikTok Callback
 * --------------------------------------------------------------------------
 */
router.get(
  "/tiktok/callback",
  tiktokCallback
);

export default router;