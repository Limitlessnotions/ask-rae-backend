
import express from "express";

import { verifyUser } from "../middleware/auth.middleware.js";

import {
  createLifeHubRecord,
  listLifeHubRecords,
  getLifeHubRecord,
  updateLifeHubRecord,
  deleteLifeHubRecord,
} from "../controllers/lifeHub.controller.js";

const router = express.Router();

router.use(verifyUser);

router.post(
  "/:moduleSlug/:collection",
  createLifeHubRecord
);

router.get(
  "/:moduleSlug/:collection",
  listLifeHubRecords
);

router.get(
  "/:moduleSlug/:collection/:recordId",
  getLifeHubRecord
);

router.patch(
  "/:moduleSlug/:collection/:recordId",
  updateLifeHubRecord
);

router.delete(
  "/:moduleSlug/:collection/:recordId",
  deleteLifeHubRecord
);

export default router;
