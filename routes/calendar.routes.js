import express from "express";

import {
  parseCalendarEvent,
} from "../controllers/calendar.controller.js";

import { verifyUser } from "../middleware/verifyUser.js";

const router = express.Router();

router.post(
  "/parse",
  verifyUser,
  parseCalendarEvent
);

export default router;