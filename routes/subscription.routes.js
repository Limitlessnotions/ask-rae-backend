import express from "express";

import { verifyUser } from "../middleware/auth.middleware.js";

import {
  getMySubscription,
  checkSubscription,
  getMySubscriptionOffer,
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
 * Get the subscription offer available
 * to the current user.
 *
 * First 100 global users:
 * Founding Member - $14.99/month
 *
 * Users after the first 100:
 * Premium - $24.99/month
 */
router.get(
  "/subscription/offer",
  verifyUser,
  getMySubscriptionOffer
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