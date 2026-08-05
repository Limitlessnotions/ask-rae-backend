import {
  createConnection,
  handleCallback,
} from "../services/oauth/oauth.service.js";

/**
 * --------------------------------------------------------------------------
 * Start TikTok OAuth
 * --------------------------------------------------------------------------
 */
export async function loginWithTikTok(req, res) {
  try {
    const result = await createConnection({
      uid: req.user.uid,
      platform: "tiktok",
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
 * TikTok OAuth Callback
 * --------------------------------------------------------------------------
 */
export async function tiktokCallback(req, res) {
  try {
    const result = await handleCallback({
      platform: "tiktok",
      query: req.query,
    });

    return res.redirect(
      `askrae://profile/social?status/success&platform=tiktok&account=${encodeURIComponent(
        result.account.username ??
        result.account.displayName ??
        ""
      )}`
    );

  } catch (error) {
    console.error("TikTok callback failed:");
    console.error(error);

    return res.redirect(
      `askrae://profile/social?status/error&platform=tiktok&message=${encodeURIComponent(
        error.message
      )}`
    );
  }
}