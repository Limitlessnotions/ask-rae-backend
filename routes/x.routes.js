import express from "express";

import { verifyUser } from "../middleware/auth.middleware.js";

import {
  loginWithX,
  xCallback,
} from "../controllers/x.controller.js";

const router = express.Router();

/**
 * --------------------------------------------------------------------------
 * Start X OAuth
 * --------------------------------------------------------------------------
 */
router.post(
  "/x/start",
  verifyUser,
  loginWithX
);

/**
 * --------------------------------------------------------------------------
 * X OAuth Callback
 * --------------------------------------------------------------------------
 */
router.get(
  "/x/callback",
  xCallback
);

export default router;