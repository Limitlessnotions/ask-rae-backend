import express from "express";

import {
  parseReminder,
} from "../controllers/reminder.controller.js";

import {
  verifyUser,
} from "../middleware/auth.middleware.js";

const router =
  express.Router();

/**
 * POST /api/reminders/parse
 *
 * Parse natural-language reminder requests.
 */
router.post(
  "/parse",
  verifyUser,
  parseReminder
);

export default router;