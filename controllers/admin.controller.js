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
  return res.json({ success: true, admin: req.user });
}

export async function dashboard(req, res) {
  try { return res.json({ success: true, data: await getDashboard() }); }
  catch (error) { console.error(error); return res.status(500).json({ success: false, message: "Unable to load dashboard." }); }
}

export async function founding(req, res) {
  try { return res.json({ success: true, data: await getFoundingStatus() }); }
  catch (error) { return res.status(500).json({ success: false, message: error.message }); }
}

export async function users(req, res) {
  try { return res.json({ success: true, ...await listUsers(req.query) }); }
  catch (error) { console.error(error); return res.status(500).json({ success: false, message: "Unable to load users." }); }
}

export async function userDetails(req, res) {
  try { return res.json({ success: true, data: await getUserDetails(req.params.uid) }); }
  catch (error) {
    if (error.code === "auth/user-not-found") return res.status(404).json({ success: false, message: "User not found." });
    console.error(error); return res.status(500).json({ success: false, message: "Unable to load user." });
  }
}

export async function setUserDisabled(req, res) {
  const { uid } = req.params;
  try {
    const disabled = Boolean(req.body?.disabled);
    await auth.updateUser(uid, { disabled });
    await writeAuditLog({ actor: req.user, action: disabled ? "suspend_user" : "reactivate_user", targetType: "user", targetId: uid });
    return res.json({ success: true, disabled });
  } catch (error) {
    console.error(error);
    await writeAuditLog({ actor: req.user, action: "change_user_status", targetType: "user", targetId: uid, result: "failed" });
    return res.status(500).json({ success: false, message: "Unable to update user status." });
  }
}

export async function subscriptions(req, res) {
  try { return res.json({ success: true, data: await listSubscriptions(req.query) }); }
  catch (error) { console.error(error); return res.status(500).json({ success: false, message: "Unable to load subscriptions." }); }
}

export async function auditLogs(req, res) {
  try { return res.json({ success: true, data: await listAuditLogs(req.query) }); }
  catch (error) { console.error(error); return res.status(500).json({ success: false, message: "Unable to load audit logs." }); }
}

export async function publications(req, res) {
  try { return res.json({ success: true, data: await listPublications(req.query) }); }
  catch (error) { console.error(error); return res.status(500).json({ success: false, message: "Unable to load publications." }); }
}

export async function health(req, res) {
  try { return res.json({ success: true, data: await getSystemHealth() }); }
  catch (error) { return res.status(500).json({ success: false, message: "Unable to load system health." }); }
}
