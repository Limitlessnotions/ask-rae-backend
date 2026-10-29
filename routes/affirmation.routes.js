
import express from "express";

import {
  getDailyAffirmation,
  getUpcomingDailyAffirmations,
} from "../controllers/affirmation.controller.js";

import {
  saveUserAffirmationSchedule,
  getUserAffirmationSchedule,
  getUpcomingUserAffirmations,
  cancelUserAffirmationSchedule,
} from "../controllers/userAffirmation.controller.js";

import {
  verifyUser,
} from "../middleware/auth.middleware.js";

import {
  recordAffirmationMonitoringEvent,
} from "../controllers/affirmationMonitoring.controller.js";

const router = express.Router();

/**
 * GET /api/affirmation/daily
 *
 * Get today's built-in personalized affirmation.
 */
router.get(
  "/daily",
  verifyUser,
  getDailyAffirmation
);

/**
 * GET /api/affirmation/upcoming
 *
 * Get upcoming built-in daily affirmations.
 */
router.get(
  "/upcoming",
  verifyUser,
  getUpcomingDailyAffirmations
);

/**
 * POST /api/affirmation/user-schedule
 *
 * Create or update the user's separate recurring
 * affirmation schedule.
 *
 * Body:
 * {
 *   "hour": 18,
 *   "minute": 0,
 *   "timezone": "Africa/Lagos"
 * }
 */
router.post(
  "/user-schedule",
  verifyUser,
  saveUserAffirmationSchedule
);

/**
 * GET /api/affirmation/user-schedule
 *
 * Retrieve the user's recurring affirmation schedule.
 */
router.get(
  "/user-schedule",
  verifyUser,
  getUserAffirmationSchedule
);

/**
 * GET /api/affirmation/user-upcoming
 *
 * Get upcoming affirmations for the user's separate series.
 */
router.get(
  "/user-upcoming",
  verifyUser,
  getUpcomingUserAffirmations
);

/**
 * DELETE /api/affirmation/user-schedule
 *
 * Cancel the user-created series without affecting
 * the built-in 8:00 AM affirmation.
 */
router.delete(
  "/user-schedule",
  verifyUser,
  cancelUserAffirmationSchedule
);
/**
 * POST /api/affirmation/monitoring/events
 *
 * Record an authenticated affirmation monitoring event.
 */
router.post(
  "/monitoring/events",
  verifyUser,
  recordAffirmationMonitoringEvent
);

export default router;
