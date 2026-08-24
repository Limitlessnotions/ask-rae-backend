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
    console.error("TikTok login failed:");
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
    console.log("=================================");
    console.log("TIKTOK OAUTH CALLBACK");
    console.log("=================================");
    console.log("Query:", req.query);

    const result = await handleCallback({
      platform: "tiktok",
      query: req.query,
    });

    console.log("TikTok OAuth completed successfully.");
    console.log("Account:", result.account);

    /**
     * Build the account value safely.
     *
     * Depending on the normalized TikTok account structure,
     * username or displayName may be available.
     */
    const account =
      result.account?.username ??
      result.account?.displayName ??
      "";

    /**
     * IMPORTANT:
     *
     * Query parameters must use "=".
     *
     * WRONG:
     * askrae://profile/social?status/success&platform=tiktok
     *
     * CORRECT:
     * askrae://profile/social?status=success&platform=tiktok
     */
    const deepLink =
      `askrae://profile/social` +
      `?status=success` +
      `&platform=tiktok` +
      `&account=${encodeURIComponent(account)}`;

    console.log("=================================");
    console.log("TIKTOK SUCCESS DEEP LINK");
    console.log("=================================");
    console.log(deepLink);
    console.log("=================================");

    return res.redirect(deepLink);

  } catch (error) {
    console.error("=================================");
    console.error("TikTok callback failed:");
    console.error("=================================");
    console.error(error);

    const errorMessage =
      error?.message || "TikTok connection failed.";

    /**
     * IMPORTANT:
     * Use status=error, NOT status/error.
     */
    const deepLink =
      `askrae://profile/social` +
      `?status=error` +
      `&platform=tiktok` +
      `&message=${encodeURIComponent(errorMessage)}`;

    console.log("=================================");
    console.log("TIKTOK ERROR DEEP LINK");
    console.log("=================================");
    console.log(deepLink);
    console.log("=================================");

    return res.redirect(deepLink);
  }
}