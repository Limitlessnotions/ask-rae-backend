import express from "express";
import { verifyUser } from "../middleware/auth.middleware.js";
import { getFacebookPages } from "../controllers/pages.controller.js";

const router = express.Router();

router.get("/facebook/pages", verifyUser, getFacebookPages);

export default router;