import express from "express";

import {
  getMyWellness,
  updateMyWellness,
} from "../controllers/wellness.controller.js";

import { verifyUser } from "../middleware/verifyUser.js";

const router = express.Router();

router.get(
  "/",
  verifyUser,
  getMyWellness
);

router.put(
  "/",
  verifyUser,
  updateMyWellness
);

export default router;