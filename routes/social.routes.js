
import express from "express";

import { verifyUser } from "../middleware/auth.middleware.js";

import {
  getFacebookPages,
  publishSocialContent,
} from "../controllers/social.controller.js";

import {
  getAccounts,
  disconnectSocialAccount,
} from "../controllers/socialAccount.controller.js";

const router = express.Router();

// Get connected social accounts
router.get(
  "/accounts",
  verifyUser,
  getAccounts
);

// Disconnect a social account
router.delete(
  "/accounts/:platform",
  verifyUser,
  disconnectSocialAccount
);

// Get Facebook Pages
router.get(
  "/facebook/pages",
  verifyUser,
  getFacebookPages
);

// Publish social content
router.post(
  "/publish",
  verifyUser,
  publishSocialContent
);

export default router;
