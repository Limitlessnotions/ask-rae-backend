import { auth } from "../firebase/firebaseAdmin.js";

const ROLE_RANK = {
  support: 1,
  developer: 2,
  admin: 3,
  owner: 4,
};

function envAdminRoles() {
  const raw = process.env.ASK_RAE_ADMIN_UIDS || "";
  const result = {};
  for (const item of raw.split(",")) {
    const [uid, role = "admin"] = item.trim().split(":");
    if (uid) result[uid] = role.toLowerCase();
  }
  return result;
}

export function requireAdmin(minRole = "support") {
  return async (req, res, next) => {
    try {
      const authorization = req.headers.authorization;
      if (!authorization?.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Authorization header missing." });
      }

      const idToken = authorization.slice("Bearer ".length);
      const decoded = await auth.verifyIdToken(idToken, true);
      const envRoles = envAdminRoles();
      const role = String(decoded.adminRole || envRoles[decoded.uid] || "").toLowerCase();

      if (!role || !ROLE_RANK[role] || ROLE_RANK[role] < ROLE_RANK[minRole]) {
        return res.status(403).json({ success: false, message: "Admin access required." });
      }

      req.user = {
        uid: decoded.uid,
        email: decoded.email || null,
        name: decoded.name || null,
        role,
      };

      next();
    } catch (error) {
      console.error("Admin Auth Error:", error.message);
      return res.status(401).json({ success: false, message: "Invalid authentication token." });
    }
  };
}

export const requireOwner = requireAdmin("owner");
export const requireAdminRole = requireAdmin("admin");
