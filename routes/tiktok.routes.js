import express from "express";

import { verifyUser } from "../middleware/auth.middleware.js";

import {
  createConnection,
} from "../services/oauth/oauth.service.js";

import {
  loginWithTikTok,
  tiktokCallback,
} from "../controllers/tiktok.controller.js";

const router = express.Router();


/**
 * Production Route
 */
router.get(
  "/tiktok",
  verifyUser,
  loginWithTikTok
);

/**
 * Callback
 */
router.get(
  "/tiktok/callback",
  tiktokCallback
);

export default router;