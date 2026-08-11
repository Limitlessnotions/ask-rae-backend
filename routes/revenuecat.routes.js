import express from "express";

import {
  handleRevenueCatWebhook,
} from "../controllers/revenuecat.controller.js";

const router = express.Router();

router.post(
  "/webhook",
  handleRevenueCatWebhook
);

export default router;