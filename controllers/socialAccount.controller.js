
import {
  getSocialAccount,
  deleteSocialAccount,
} from "../services/socialAccount.service.js";

const SUPPORTED_PLATFORMS = [
  "facebook",
  "instagram",
  "tiktok",
];

/**
 * Return only fields required by the frontend.
 * Never expose OAuth tokens, raw provider responses,
 * refresh tokens, or other stored credentials.
 */
function sanitizeSocialAccount(account) {
  if (!account) {
    return null;
  }

  return {
    platformUserId: account.platformUserId ?? null,
    displayName: account.displayName ?? null,
    name: account.name ?? null,
    username: account.username ?? null,
    avatar: account.avatar ?? null,
    email: account.email ?? null,
    defaultTargetId: account.defaultTargetId ?? null,
    defaultTargetName: account.defaultTargetName ?? null,

    // Facebook pages are safe to expose only without their tokens.
    pages: Array.isArray(account.pages)
      ? account.pages.map((page) => ({
          id: page.id ?? null,
          name: page.name ?? null,
          category: page.category ?? null,
          tasks: page.tasks ?? [],
          picture: page.picture ?? null,
        }))
      : [],
  };
}

/**
 * Get all connected social accounts.
 */
export async function getAccounts(req, res) {
  try {
    const uid = req.user.uid;

    const [facebook, instagram, tiktok] = await Promise.all([
      getSocialAccount(uid, "facebook"),
      getSocialAccount(uid, "instagram"),
      getSocialAccount(uid, "tiktok"),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        facebook: sanitizeSocialAccount(facebook),
        instagram: sanitizeSocialAccount(instagram),
        tiktok: sanitizeSocialAccount(tiktok),
      },
    });
  } catch (error) {
    console.error("Get Social Accounts Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve connected social accounts.",
    });
  }
}

/**
 * Disconnect a social media account.
 *
 * DELETE /api/social/accounts/:platform
 */
export async function disconnectSocialAccount(req, res) {
  try {
    const uid = req.user.uid;
    const platform = req.params.platform?.toLowerCase();

    if (!SUPPORTED_PLATFORMS.includes(platform)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported social media platform.",
      });
    }

    await deleteSocialAccount(uid, platform);

    return res.status(200).json({
      success: true,
      message: `${platform} disconnected successfully.`,
      platform,
    });
  } catch (error) {
    console.error("Disconnect Social Account Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to disconnect this social account.",
    });
  }
}
