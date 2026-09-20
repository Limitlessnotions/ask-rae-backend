import { auth } from "./firebase/firebaseAdmin.js";

const [, , uid, role = "owner"] = process.argv;
if (!uid) {
  console.error("Usage: node scripts-set-admin.mjs <firebase-uid> [owner|admin|developer|support]");
  process.exit(1);
}
if (!["owner", "admin", "developer", "support"].includes(role)) {
  console.error("Invalid role.");
  process.exit(1);
}
const user = await auth.getUser(uid);
await auth.setCustomUserClaims(uid, { ...(user.customClaims || {}), adminRole: role });
console.log(`Set ${role} admin role for ${uid}. The user must sign in again to receive the updated ID token.`);
