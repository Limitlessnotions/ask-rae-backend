import { db } from "../firebase/firebaseAdmin.js";
import { generateResponse } from "../services/ai.service.js";

export const chat = async (req, res) => {
  try {
    const { uid } = req.user;
    const { message } = req.body;

    const profileDoc = await db
      .collection("users")
      .doc(uid)
      .get();

    const rawProfile = profileDoc.exists
      ? profileDoc.data()
      : {};

    const profile = {
      name: rawProfile.fullName || "",
      businessName: rawProfile.businessName || "",
      businessType: rawProfile.industry || "",
      audience: rawProfile.targetAudience || "",
      tone: rawProfile.preferredTone || "",
      goals: rawProfile.socialMediaGoals
        ? [rawProfile.socialMediaGoals]
        : [],
      platforms: rawProfile.platforms || [],
    };

    const reply = await generateResponse({
      message,
      profile,
    });

    return res.json({
      success: true,
      reply,
    });

  } catch (error) {
    console.error("Chat Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};