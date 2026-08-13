import {
  getWellnessProfile,
  updateWellnessProfile,
} from "../services/wellness.service.js";

/**
 * Get current user's wellness profile.
 */
export async function getMyWellness(
  req,
  res
) {
  try {
    const { uid } = req.user;

    const profile =
      await getWellnessProfile(uid);

    return res.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error(
      "Get wellness profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve wellness profile.",
    });
  }
}

/**
 * Update current user's wellness profile.
 */
export async function updateMyWellness(
  req,
  res
) {
  try {
    const { uid } = req.user;

    const {
      heightCm,
      weightKg,
      goalWeightKg,
      wellnessGoal,
      dietaryPreferences,
      foodRestrictions,
    } = req.body;

    const profile =
      await updateWellnessProfile(
        uid,
        {
          heightCm,
          weightKg,
          goalWeightKg,
          wellnessGoal,
          dietaryPreferences,
          foodRestrictions,
        }
      );

    return res.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error(
      "Update wellness profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update wellness profile.",
    });
  }
}