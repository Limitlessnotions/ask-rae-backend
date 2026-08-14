import express from "express";

import {
  getMyWellness,
  updateMyWellness,
} from "../controllers/wellness.controller.js";

import {
  verifyUser,
} from "../middleware/auth.middleware.js";

const router =
  express.Router();

/**
 * GET /api/wellness
 *
 * Get the authenticated user's
 * wellness profile.
 */
router.get(
  "/",
  verifyUser,
  getMyWellness
);

/**
 * PATCH /api/wellness
 *
 * Update the authenticated user's
 * wellness profile.
 */
router.patch(
  "/",
  verifyUser,
  updateMyWellness
);

export default router;