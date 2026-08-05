import {
  createConnection,
  handleCallback,
} from "../services/oauth/oauth.service.js";

/**
 * --------------------------------------------------------------------------
 * Start X OAuth
 * --------------------------------------------------------------------------
 */
export async function loginWithX(req, res) {
  try {
    const result = await createConnection({
      uid: req.user.uid,
      platform: "x",
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
 * X OAuth Callback
 * --------------------------------------------------------------------------
 */
export async function xCallback(req, res) {
  try {
    const result = await handleCallback({
      platform: "x",
      query: req.query,
    });

    return res.redirect(
      `askrae://profile/social/success?platform=x&account=${encodeURIComponent(
        result.account.username ??
        result.account.displayName ??
        ""
      )}`
    );

  } catch (error) {
    console.error("X callback failed:");
    console.error(error);

    return res.redirect(
      `askrae://profile/social/error?platform=x&message=${encodeURIComponent(
        error.message
      )}`
    );
  }
}