import express from "express";

import {
  getUserGoals,
  getUserActiveGoals,
  addUserGoal,
  editUserGoal,
  removeUserGoal,
} from "../controllers/accountability.controller.js";

import {
  verifyUser,
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
  verifyUser,
  getUserGoals
);

/**
 * Get only active/incomplete goals.
 *
 * GET /api/accountability/active
 */
router.get(
  "/active",
  verifyUser,
  getUserActiveGoals
);

/**
 * Create a new accountability goal.
 *
 * POST /api/accountability
 */
router.post(
  "/",
  verifyUser,
  addUserGoal
);

/**
 * Update an accountability goal.
 *
 * PATCH /api/accountability/:goalId
 */
router.patch(
  "/:goalId",
  verifyUser,
  editUserGoal
);

/**
 * Delete an accountability goal.
 *
 * DELETE /api/accountability/:goalId
 */
router.delete(
  "/:goalId",
  verifyUser,
  removeUserGoal
);

export default router;