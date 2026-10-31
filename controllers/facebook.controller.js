
import {
  createConnection,
  handleCallback,
} from "../services/oauth/oauth.service.js";

/**
 * --------------------------------------------------------------------------
 * Shared Facebook OAuth Starter
 * --------------------------------------------------------------------------
 */
async function startFacebookOAuth(req, res, { reconnect = false } = {}) {
  try {
    const result = await createConnection({
      uid: req.user.uid,
      platform: "facebook",
      replaceExisting: reconnect,
    });

    return res.status(200).json({
      success: true,
      authorizationUrl: result.authorizationUrl,
    });
  } catch (error) {
    console.error("Facebook OAuth Start Error:", error.message);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Unable to start Facebook authorization.",
    });
  }
}

/**
 * --------------------------------------------------------------------------
 * Start Facebook OAuth
 * POST /auth/facebook/start
 * --------------------------------------------------------------------------
 */
export async function loginWithFacebook(req, res) {
  return startFacebookOAuth(req, res);
}

/**
 * --------------------------------------------------------------------------
 * Reconnect Facebook
 * POST /auth/facebook/reconnect
 * --------------------------------------------------------------------------
 */
export async function reconnectFacebook(req, res) {
  return startFacebookOAuth(req, res, {
    reconnect: true,
  });
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

    const accountName =
      result.account?.name ||
      result.account?.displayName ||
      result.account?.username ||
      "";

    const callbackUrl = new URL("askrae://socials");

    callbackUrl.searchParams.set("status", "success");
    callbackUrl.searchParams.set("platform", "facebook");
    callbackUrl.searchParams.set("account", accountName);

    return res.redirect(callbackUrl.toString());
  } catch (error) {
    console.error("Facebook OAuth Callback Error:", error.message);

    const callbackUrl = new URL("askrae://socials");

    callbackUrl.searchParams.set("status", "error");
    callbackUrl.searchParams.set("platform", "facebook");
    callbackUrl.searchParams.set(
      "message",
      error.message || "Facebook connection failed."
    );

    return res.redirect(callbackUrl.toString());
  }
}
