import { db } from "../firebase/firebaseAdmin.js";
import { getMemories } from "../services/memory.service.js";
import { generateDailyAffirmation } from "../services/affirmation.service.js";

export async function getDailyAffirmation(req, res) {
  try {
    const { uid } = req.user;

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
      goals: rawProfile.socialMediaGoals
        ? [rawProfile.socialMediaGoals]
        : [],
    };

    const memories = await getMemories(uid);

    const affirmation =
      await generateDailyAffirmation({
        profile,
        memories,
      });

    return res.json({
      success: true,
      affirmation,
    });
  } catch (error) {
    console.error(
      "Daily affirmation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to generate today's affirmation.",
    });
  }
}import { db } from "../firebase/firebaseAdmin.js";
import { getMemories } from "../services/memory.service.js";
import { generateDailyAffirmation } from "../services/affirmation.service.js";

export async function getDailyAffirmation(req, res) {
  try {
    const { uid } = req.user;

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
      goals: rawProfile.socialMediaGoals
        ? [rawProfile.socialMediaGoals]
        : [],
    };

    const memories = await getMemories(uid);

    const affirmation =
      await generateDailyAffirmation({
        profile,
        memories,
      });

    return res.json({
      success: true,
      affirmation,
    });
  } catch (error) {
    console.error(
      "Daily affirmation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to generate today's affirmation.",
    });
  }
}