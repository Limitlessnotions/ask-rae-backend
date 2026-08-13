import express from "express";

import {
  parseReminder,
} from "../controllers/reminder.controller.js";

import { verifyUser } from "../middleware/verifyUser.js";

const router = express.Router();

router.post(
  "/parse",
  verifyUser,
  parseReminder
);

export default router;