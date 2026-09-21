import express from "express";

import {
  requireSupport,
  requireAdminRole,
  requireDeveloper,
} from "../middleware/admin.middleware.js";

import {
  getMe,
  dashboard,
  founding,
  users,
  userDetails,
  setUserDisabled,
  subscriptions,
  auditLogs,
  publications,
  health,
} from "../controllers/admin.controller.js";

const router = express.Router();

/*
 * All admin routes require at least Support access.
 */
router.use(requireSupport);

/*
 * Support+
 * Read-only administrative data.
 */
router.get("/me", getMe);
router.get("/dashboard", dashboard);
router.get("/founding-members", founding);
router.get("/users", users);
router.get("/users/:uid", userDetails);
router.get("/subscriptions", subscriptions);
router.get("/publications", publications);

/*
 * Admin+
 * Administrative actions and sensitive audit information.
 */
router.patch(
  "/users/:uid/status",
  requireAdminRole,
  setUserDisabled
);

router.get(
  "/audit-logs",
  requireAdminRole,
  auditLogs
);

/*
 * Developer+
 * Infrastructure/system configuration health.
 */
router.get(
  "/system-health",
  requireDeveloper,
  health
);

export default router;