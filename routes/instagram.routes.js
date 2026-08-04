import express from "express";

import { verifyUser } from "../middleware/auth.middleware.js";
import { createConnection } from "../services/oauth/oauth.service.js";

import {
  loginWithInstagram,
  instagramCallback,
} from "../controllers/instagram.controller.js";

const router = express.Router();

/**
 * Connect Instagram
 */
router.get(
  "/instagram",
  verifyUser,
  loginWithInstagram
);

/**
 * Instagram OAuth Callback
 */
router.get(
  "/instagram/callback",
  instagramCallback
);

export default router;
