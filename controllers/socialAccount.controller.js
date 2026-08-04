import { getSocialAccount } from "../services/socialAccount.service.js";

/**
 * Get all connected social accounts
 */
export async function getAccounts(req, res) {
  try {
    const uid = req.user.uid;

    const facebook = await getSocialAccount(
      uid,
      "facebook"
    );

    const instagram = await getSocialAccount(
      uid,
      "instagram"
    );

    const tiktok = await getSocialAccount(
      uid,
      "tiktok"
    );

    const x = await getSocialAccount(
      uid,
      "x"
    );

    return res.status(200).json({
      success: true,

      data: {
        facebook,
        instagram,
        tiktok,
        x,
      },
    });

  } catch (error) {
    console.error(
      "Get Social Accounts Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}