import express from "express";
import {
  loginWithFacebook,
  facebookCallback,
} from "../controllers/facebook.controller.js";

import { verifyUser } from "../middleware/auth.middleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Step 1
|--------------------------------------------------------------------------
| Mobile app calls this endpoint with Firebase Bearer token.
| Backend verifies the user and returns the Facebook OAuth URL.
|--------------------------------------------------------------------------
*/

router.post(
  "/facebook/start",
  verifyUser,
  loginWithFacebook
);

/*
|--------------------------------------------------------------------------
| Step 2
|--------------------------------------------------------------------------
| Facebook redirects here after login.
|--------------------------------------------------------------------------
*/

router.get(
  "/facebook/callback",
  facebookCallback
);

export default router;