import express from "express";

import { verifyUser } from "../middleware/auth.middleware.js";

import {
  createConnection,
} from "../services/oauth/oauth.service.js";

import {
  loginWithX,
  xCallback,
} from "../controllers/x.controller.js";

const router = express.Router();


export default router;