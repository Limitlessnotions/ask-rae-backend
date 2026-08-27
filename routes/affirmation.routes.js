import express from "express";

import {
  getDailyAffirmation,
  getUpcomingDailyAffirmations,
} from "../controllers/affirmation.controller.js";

import {
  verifyUser,
} from "../middleware/auth.middleware.js";

const router =
  express.Router();

/**
 * GET /api/affirmation/daily
 *
 * Get today's personalized affirmation
 * for the authenticated user.
 */
router.get(
  "/daily",
  verifyUser,
  getDailyAffirmation
);

/**
 * GET /api/affirmation/upcoming
 *
 * Get personalized affirmations for
 * upcoming calendar days.
 */
router.get(
  "/upcoming",
  verifyUser,
  getUpcomingDailyAffirmations
);

export default router;