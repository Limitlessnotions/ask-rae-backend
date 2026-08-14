import express from "express";

import {
  parseCalendarEvent,
} from "../controllers/calendar.controller.js";

import {
  verifyUser,
} from "../middleware/auth.middleware.js";

const router =
  express.Router();

/**
 * POST /api/calendar/parse
 *
 * Parse a natural-language calendar
 * request using Rae's AI service.
 */
router.post(
  "/parse",
  verifyUser,
  parseCalendarEvent
);

export default router;