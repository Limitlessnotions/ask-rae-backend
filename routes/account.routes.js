import express from "express";

import { verifyUser } from "../middleware/auth.middleware.js";

import {
  deleteAccount,
} from "../controllers/account.controller.js";

const router = express.Router();

/**
 * Permanently delete the authenticated user's account
 * and all associated Ask Rae Firestore data.
 */
router.delete(
  "/",
  verifyUser,
  deleteAccount
);

export default router;