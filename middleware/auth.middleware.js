import { auth } from "../firebase/firebaseAdmin.js";

/**
 * Verify Firebase Authentication
 */
export async function verifyUser(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        success: false,
        message: "Authorization header missing.",
      });
    }

    if (!authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format.",
      });
    }

    const idToken = authorization.split("Bearer ")[1];

    const decodedToken =
      await auth.verifyIdToken(idToken);

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
    };

    next();

  } catch (error) {
    console.error("Firebase Auth Error:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid authentication token.",
    });
  }
}