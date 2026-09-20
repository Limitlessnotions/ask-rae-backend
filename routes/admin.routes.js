import express from "express";
import { requireAdmin } from "../middleware/admin.middleware.js";
import {
  getMe, dashboard, founding, users, userDetails,
  setUserDisabled, subscriptions, auditLogs, publications, health,
} from "../controllers/admin.controller.js";

const router = express.Router();
router.use(requireAdmin("support"));
router.get("/me", getMe);
router.get("/dashboard", dashboard);
router.get("/founding-members", founding);
router.get("/users", users);
router.get("/users/:uid", userDetails);
router.patch("/users/:uid/status", requireAdmin("admin"), setUserDisabled);
router.get("/subscriptions", subscriptions);
router.get("/audit-logs", requireAdmin("admin"), auditLogs);
router.get("/publications", publications);
router.get("/system-health", requireAdmin("developer"), health);
export default router;
