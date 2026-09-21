import { auth } from "../firebase/firebaseAdmin.js";

import {
  getDashboard,
  getFoundingStatus,
  listUsers,
  getUserDetails,
  listPublications,
  listSubscriptions,
  listAuditLogs,
  getSystemHealth,
  writeAuditLog,
} from "../services/admin.service.js";

export async function getMe(req, res) {
  return res.json({
    success: true,
    admin: {
      uid: req.user.uid,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
    },
  });
}

export async function dashboard(req, res) {
  try {
    const data = await getDashboard();

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Admin Dashboard Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load dashboard.",
    });
  }
}

export async function founding(req, res) {
  try {
    const data = await getFoundingStatus();

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Admin Founding Members Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load founding member status.",
    });
  }
}

export async function users(req, res) {
  try {
    const data = await listUsers(req.query);

    return res.json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error("Admin Users Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load users.",
    });
  }
}

export async function userDetails(req, res) {
  try {
    const data = await getUserDetails(req.params.uid);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    console.error("Admin User Details Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load user.",
    });
  }
}

export async function setUserDisabled(req, res) {
  const { uid } = req.params;

  if (!uid) {
    return res.status(400).json({
      success: false,
      message: "User ID is required.",
    });
  }

  if (typeof req.body?.disabled !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "The disabled field must be a boolean.",
    });
  }

  const disabled = req.body.disabled;

  try {
    await auth.updateUser(uid, { disabled });

    await writeAuditLog({
      actor: req.user,
      action: disabled ? "suspend_user" : "reactivate_user",
      targetType: "user",
      targetId: uid,
      metadata: {
        disabled,
      },
    });

    return res.json({
      success: true,
      uid,
      disabled,
    });
  } catch (error) {
    console.error("Admin User Status Error:", error);

    try {
      await writeAuditLog({
        actor: req.user,
        action: disabled ? "suspend_user" : "reactivate_user",
        targetType: "user",
        targetId: uid,
        result: "failed",
        metadata: {
          error: error.message,
        },
      });
    } catch (auditError) {
      console.error("Admin Audit Log Error:", auditError);
    }

    if (error.code === "auth/user-not-found") {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update user status.",
    });
  }
}

export async function subscriptions(req, res) {
  try {
    const data = await listSubscriptions(req.query);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Admin Subscriptions Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load subscriptions.",
    });
  }
}

export async function auditLogs(req, res) {
  try {
    const data = await listAuditLogs(req.query);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Admin Audit Logs Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load audit logs.",
    });
  }
}

export async function publications(req, res) {
  try {
    const data = await listPublications(req.query);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Admin Publications Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load publications.",
    });
  }
}

export async function health(req, res) {
  try {
    const data = await getSystemHealth();

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Admin System Health Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load system health.",
    });
  }
}