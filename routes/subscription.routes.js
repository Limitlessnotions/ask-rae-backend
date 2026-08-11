import express from "express";

import { verifyUser } from "../middleware/auth.middleware.js";

import {
  getMySubscription,
  checkSubscription,
} from "../controllers/subscription.controller.js";

const router = express.Router();

/**
 * Get current user's subscription
 */
router.get(
  "/subscription",
  verifyUser,
  getMySubscription
);

/**
 * Check subscription status
 */
router.get(
  "/subscription/status",
  verifyUser,
  checkSubscription
);

export default router;