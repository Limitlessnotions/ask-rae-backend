import express from "express";

import {
  getUserGoals,
  getUserActiveGoals,
  addUserGoal,
  editUserGoal,
  removeUserGoal,
} from "../controllers/accountability.controller.js";

import {
  requireAuth,
} from "../middleware/auth.middleware.js";

const router =
  express.Router();

/**
 * Get all accountability goals.
 *
 * GET /api/accountability
 */
router.get(
  "/",
  requireAuth,
  getUserGoals
);

/**
 * Get only active/incomplete goals.
 *
 * GET /api/accountability/active
 */
router.get(
  "/active",
  requireAuth,
  getUserActiveGoals
);

/**
 * Create a new accountability goal.
 *
 * POST /api/accountability
 */
router.post(
  "/",
  requireAuth,
  addUserGoal
);

/**
 * Update an accountability goal.
 *
 * PATCH /api/accountability/:goalId
 */
router.patch(
  "/:goalId",
  requireAuth,
  editUserGoal
);

/**
 * Delete an accountability goal.
 *
 * DELETE /api/accountability/:goalId
 */
router.delete(
  "/:goalId",
  requireAuth,
  removeUserGoal
);

export default router;