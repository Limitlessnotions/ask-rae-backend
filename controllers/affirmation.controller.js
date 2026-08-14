import { db } from "../firebase/firebaseAdmin.js";

import { getMemories } from "../services/memory.service.js";

import { generateDailyAffirmation } from "../services/affirmation.service.js";

/**
 * GET /api/affirmation/daily
 *
 * Generate a personalized daily affirmation
 * for the authenticated user.
 */
export async function getDailyAffirmation(
  req,
  res
) {
  try {
    const { uid } = req.user;

    /**
     * Load the user's profile.
     */
    const profileDoc =
      await db
        .collection("users")
        .doc(uid)
        .get();

    const rawProfile =
      profileDoc.exists
        ? profileDoc.data()
        : {};

    /**
     * Build the profile context
     * used by the affirmation service.
     */
    const profile = {
      name:
        rawProfile.fullName ||
        "",

      businessName:
        rawProfile.businessName ||
        "",

      businessType:
        rawProfile.industry ||
        "",

      goals:
        rawProfile.socialMediaGoals
          ? [
              rawProfile.socialMediaGoals,
            ]
          : [],
    };

    /**
     * Load relevant user memories.
     */
    const memories =
      await getMemories(uid);

    /**
     * Generate the personalized
     * affirmation.
     */
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