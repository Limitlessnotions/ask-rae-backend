import {
  createConnection,
  handleCallback,
} from "../services/oauth/oauth.service.js";

/**
 * --------------------------------------------------------------------------
 * Start Facebook OAuth
 * --------------------------------------------------------------------------
 */
export async function loginWithFacebook(req, res) {
  try {
    const result = await createConnection({
      uid: req.user.uid,
      platform: "facebook",
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
 * Facebook OAuth Callback
 * --------------------------------------------------------------------------
 */
export async function facebookCallback(req, res) {
  try {
    const result = await handleCallback({
      platform: "facebook",
      query: req.query,
    });

    return res.redirect(
      `askrae://oauth/success?platform=facebook&account=${encodeURIComponent(
        result.account.name ??
        result.account.username ??
        ""
      )}`
    );

  } catch (error) {
    console.error(error);

    return res.redirect(
      `askrae://oauth/error?platform=facebook&message=${encodeURIComponent(
        error.message
      )}`
    );
  }
}