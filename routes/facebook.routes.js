import express from "express";

import {
  loginWithFacebook,
  reconnectFacebook,
  facebookCallback,
} from "../controllers/facebook.controller.js";

import { verifyUser } from "../middleware/auth.middleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Facebook OAuth — Initial Connection
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
| Facebook OAuth — Reconnection
|--------------------------------------------------------------------------
| Reconnection should clear the existing connection before starting
| a fresh OAuth authorization flow.
|--------------------------------------------------------------------------
*/

router.post(
  "/facebook/reconnect",
  verifyUser,
  reconnectFacebook
);

/*
|--------------------------------------------------------------------------
| Facebook OAuth — Callback
|--------------------------------------------------------------------------
| Facebook redirects here after the user authorizes the app.
| This endpoint must remain public.
|--------------------------------------------------------------------------
*/

router.get(
  "/facebook/callback",
  facebookCallback
);

export default router;