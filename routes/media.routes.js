import express from "express";

import { verifyUser } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

import {
  upload as uploadMedia,
} from "../controllers/media.controller.js";

const router = express.Router();

router.post(
  "/upload",
  verifyUser,
  upload.single("file"),
  uploadMedia
);

export default router;