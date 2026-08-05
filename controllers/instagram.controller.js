import {
  createConnection,
  handleCallback,
} from "../services/oauth/oauth.service.js";

/**
 * --------------------------------------------------------------------------
 * Start Instagram OAuth
 * --------------------------------------------------------------------------
 */
export async function loginWithInstagram(req, res) {
  try {
    const result = await createConnection({
      uid: req.user.uid,
      platform: "instagram",
    });

    return res.json({
      success: true,
      authorizationUrl: result.authorizationUrl,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

/**
 * --------------------------------------------------------------------------
 * Instagram OAuth Callback
 * --------------------------------------------------------------------------
 */
export async function instagramCallback(req, res) {
  try {
    const result = await handleCallback({
      platform: "instagram",
      query: req.query,
    });

    return res.redirect(
      `askrae://oauth/success?platform=instagram&account=${encodeURIComponent(
        result.account.username ??
        result.account.displayName ??
        ""
      )}`
    );

  } catch (error) {
    console.error(error);

    return res.redirect(
      `askrae://oauth/error?platform=instagram&message=${encodeURIComponent(
        error.message
      )}`
    );
  }
}