import { db } from "../firebase/firebaseAdmin.js";
import { getUserPages } from "../services/facebook.service.js";

export const getFacebookPages = async (req, res) => {
  try {
    const { uid } = req.user;

    const socialDoc = await db
      .collection("users")
      .doc(uid)
      .collection("socialAccounts")
      .doc("facebook")
      .get();

    if (!socialDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Facebook account not connected.",
      });
    }

    const social = socialDoc.data();

    const pages = await getUserPages(social.accessToken);

    await socialDoc.ref.update({
      pages,
      lastSynced: new Date(),
    });

    return res.json({
      success: true,
      pages,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.response?.data || error.message,
    });
  }
};