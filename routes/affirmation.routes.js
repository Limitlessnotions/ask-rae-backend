import express from "express";

import {
  getDailyAffirmation,
} from "../controllers/affirmation.controller.js";

import {
  verifyUser,
} from "../middleware/auth.middleware.js";

const router =
  express.Router();

/**
 * GET /api/affirmation
 *
 * Generate a personalized daily
 * affirmation for the authenticated user.
 */
router.get(
  "/",
  verifyUser,
  getDailyAffirmation
);

export default router;