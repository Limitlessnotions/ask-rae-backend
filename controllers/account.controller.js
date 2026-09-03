import { db, auth } from "../firebase/firebaseAdmin.js";

/**
 * Permanently delete the authenticated user's
 * Firestore data and Firebase Authentication account.
 */
export async function deleteAccount(req, res) {
  const uid = req.user.uid;

  try {
    console.log(`🗑️ Starting account deletion for user: ${uid}`);

    /**
     * Delete the entire users/{uid} document tree,
     * including all nested subcollections.
     */
    const userRef = db.collection("users").doc(uid);

    await db.recursiveDelete(userRef);

    console.log(
      `✅ Firestore data deleted for user: ${uid}`
    );

    /**
     * Delete the Firebase Authentication account.
     */
    await auth.deleteUser(uid);

    console.log(
      `✅ Firebase Auth account deleted for user: ${uid}`
    );

    return res.json({
      success: true,
      message: "Your Ask Rae account has been permanently deleted.",
    });
  } catch (error) {
    console.error(
      `❌ Account deletion failed for user ${uid}:`,
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "We couldn't completely delete your account. Please try again.",
    });
  }
}