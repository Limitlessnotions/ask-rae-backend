import { db } from "../firebase/firebaseAdmin.js";
import {
  getFacebookLoginUrl,
  exchangeCodeForToken,
  getUserPages,
  generateStateToken,
} from "../services/facebook.service.js";

export const loginWithFacebook = async (req, res) => {
  try {
    const { uid } = req.user;

    // Generate a secure OAuth state token
    const state = generateStateToken();

    // Store the state temporarily in Firestore
    await db.collection("oauth_states").doc(state).set({
      uid,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    const loginUrl = getFacebookLoginUrl(state);

    return res.redirect(loginUrl);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const facebookCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Authorization code missing",
      });
    }

    if (!state) {
      return res.status(400).json({
        success: false,
        message: "OAuth state missing.",
      });
    }

    // Validate OAuth state
    const stateDoc = await db
      .collection("oauth_states")
      .doc(state)
      .get();

    if (!stateDoc.exists) {
      return res.status(400).json({
        success: false,
        message: "Invalid OAuth state.",
      });
    }

    const stateData = stateDoc.data();

    // Check expiration
    if (new Date() > stateData.expiresAt.toDate()) {
      await stateDoc.ref.delete();

      return res.status(400).json({
        success: false,
        message: "OAuth state has expired.",
      });
    }

    // Get the Firebase UID from Firestore
    const uid = stateData.uid;

    // Exchange the authorization code for an access token
    const tokenData = await exchangeCodeForToken(code);

    const accessToken = tokenData.access_token;

    // Fetch the user's Facebook Pages
    const pages = await getUserPages(accessToken);

    // Save Facebook connection to Firestore
    await db.collection("users").doc(uid).set(
      {
        socialAccounts: {
          facebook: {
            connected: true,
            accessToken,
            connectedAt: new Date(),
            pages,
          },
        },
      },
      { merge: true }
    );

    // Delete the OAuth state so it can't be reused
    await stateDoc.ref.delete();

    const redirectUri = process.env.APP_REDIRECT_URI;

    return res.redirect(`${redirectUri}?success=true`);
  } catch (error) {
    console.error(error);

    const redirectUri = process.env.APP_REDIRECT_URI;

    return res.redirect(
      `${redirectUri}?success=false&error=${encodeURIComponent(
        error.response?.data?.error?.message || error.message
      )}`
    );
  }
};