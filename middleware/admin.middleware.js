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
    const trimmed = item.trim();
    if (!trimmed) continue;

    const [uid, role = "admin"] = trimmed.split(":");
    const normalizedRole = String(role).toLowerCase();

    if (uid && ROLE_RANK[normalizedRole]) {
      result[uid] = normalizedRole;
    }
  }

  return result;
}

function getRequiredRole(minRole) {
  const normalized = String(minRole || "support").toLowerCase();

  if (!ROLE_RANK[normalized]) {
    throw new Error(`Invalid admin role requirement: ${minRole}`);
  }

  return normalized;
}

export function requireAdmin(minRole = "support") {
  const requiredRole = getRequiredRole(minRole);

  return async (req, res, next) => {
    try {
      const authorization = req.headers.authorization;

      if (!authorization?.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          message: "Authorization header missing.",
        });
      }

      const idToken = authorization.slice("Bearer ".length).trim();

      if (!idToken) {
        return res.status(401).json({
          success: false,
          message: "Authorization token missing.",
        });
      }

      const decoded = await auth.verifyIdToken(idToken, true);

      const envRoles = envAdminRoles();

      /*
       * Firebase custom claims take precedence over the environment
       * fallback. This means the actual Firebase adminRole claim is
       * authoritative when present.
       */
      const claimRole = String(decoded.adminRole || "").toLowerCase();
      const envRole = envRoles[decoded.uid];

      const role = claimRole || envRole || "";

      if (!ROLE_RANK[role]) {
        return res.status(403).json({
          success: false,
          message: "Admin access required.",
        });
      }

      if (ROLE_RANK[role] < ROLE_RANK[requiredRole]) {
        return res.status(403).json({
          success: false,
          message: "Insufficient admin permissions.",
        });
      }

      req.user = {
        uid: decoded.uid,
        email: decoded.email || null,
        name: decoded.name || null,
        role,
      };

      return next();
    } catch (error) {
      console.error("Admin Auth Error:", error.message);

      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }
  };
}

export const requireOwner = requireAdmin("owner");
export const requireDeveloper = requireAdmin("developer");
export const requireAdminRole = requireAdmin("admin");
export const requireSupport = requireAdmin("support");