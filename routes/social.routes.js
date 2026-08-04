import express from "express";
import { verifyUser } from "../middleware/auth.middleware.js";

import {
  getFacebookPages,
  publishSocialContent,
} from "../controllers/social.controller.js";

import {
  getAccounts,
} from "../controllers/socialAccount.controller.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Connected Social Accounts
|--------------------------------------------------------------------------
*/

router.get(
  "/accounts",
  verifyUser,
  getAccounts
);

/*
|--------------------------------------------------------------------------
| Facebook
|--------------------------------------------------------------------------
*/

router.get(
  "/facebook/pages",
  verifyUser,
  getFacebookPages
);

/*
|--------------------------------------------------------------------------
| Universal Publisher
|--------------------------------------------------------------------------
*/

router.post(
  "/publish",
  verifyUser,
  publishSocialContent
);

export default router;