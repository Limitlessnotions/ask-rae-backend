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
 * Get today's personalized
 * affirmation for the authenticated user.
 *
 * Query parameters:
 *
 * timezone
 *   IANA timezone, e.g.
 *   Africa/Lagos
 *   America/New_York
 *   Europe/London
 */
router.get(
  "/daily",
  verifyUser,
  getDailyAffirmation
);

/**
 * GET /api/affirmation/upcoming
 *
 * Get/generate upcoming personalized
 * daily affirmations.
 *
 * Query parameters:
 *
 * days
 *   Number of days to prepare.
 *
 * timezone
 *   IANA timezone.
 */
router.get(
  "/upcoming",
  verifyUser,
  getUpcomingDailyAffirmations
);

export default router;