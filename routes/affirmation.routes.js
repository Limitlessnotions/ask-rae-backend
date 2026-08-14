import express from "express";

import {
  getDailyAffirmation,
} from "../controllers/affirmation.controller.js";

import {
  requireAuth,
} from "../middleware/auth.middleware.js";

const router =
  express.Router();

/**
 * Get a personalized daily affirmation.
 *
 * GET /api/affirmation
 */
router.get(
  "/",
  requireAuth,
  getDailyAffirmation
);

export default router;