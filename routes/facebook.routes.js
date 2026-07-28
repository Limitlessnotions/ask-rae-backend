import express from "express";
import {
  loginWithFacebook,
  facebookCallback,
} from "../controllers/facebook.controller.js";
import { verifyUser } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * Step 1
 * User taps "Connect Facebook"
 */
router.get("/facebook", verifyUser, loginWithFacebook);

/**
 * Step 2
 * Facebook redirects here
 */
router.get("/facebook/callback", facebookCallback);

export default router;