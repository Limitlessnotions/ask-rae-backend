import express from "express";

import { verifyUser } from "../middleware/auth.middleware.js";

import {
  loginWithInstagram,
  instagramCallback,
} from "../controllers/instagram.controller.js";

const router = express.Router();

/**
 * Start Instagram OAuth
 */
router.post(
  "/instagram/start",
  verifyUser,
  loginWithInstagram
);

/**
 * Instagram Callback
 */
router.get(
  "/instagram/callback",
  instagramCallback
);

export default router;