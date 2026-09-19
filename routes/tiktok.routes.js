import express from "express";

import { verifyUser } from "../middleware/auth.middleware.js";

import {
  loginWithTikTok,
  tiktokCallback,
  getTikTokPublishStatus,
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

/**
 * --------------------------------------------------------------------------
 * Check TikTok Publish Status
 * --------------------------------------------------------------------------
 *
 * Requires Firebase authentication.
 *
 * Body:
 *
 * {
 *   "publishId": "v_pub_url~v2-1.7687179840579340295"
 * }
 *
 */
router.post(
  "/tiktok/status",
  verifyUser,
  getTikTokPublishStatus
);

export default router;