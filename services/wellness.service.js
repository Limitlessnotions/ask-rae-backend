import { db } from "../firebase/firebaseAdmin.js";

/**
 * Get wellness information for a user.
 */
export async function getWellnessProfile(uid) {
  const ref = db
    .collection("users")
    .doc(uid);

  const snapshot = await ref.get();

  if (!snapshot.exists) {
    return {
      heightCm: null,
      weightKg: null,
      goalWeightKg: null,
      wellnessGoal: "",
      dietaryPreferences: [],
      foodRestrictions: [],
    };
  }

  const data = snapshot.data();

  return {
    heightCm:
      data.heightCm ?? null,

    weightKg:
      data.weightKg ?? null,

    goalWeightKg:
      data.goalWeightKg ?? null,

    wellnessGoal:
      data.wellnessGoal ?? "",

    dietaryPreferences:
      Array.isArray(
        data.dietaryPreferences
      )
        ? data.dietaryPreferences
        : [],

    foodRestrictions:
      Array.isArray(
        data.foodRestrictions
      )
        ? data.foodRestrictions
        : [],
  };
}

/**
 * Calculate BMI.
 *
 * BMI is used only as a general
 * screening measure.
 */
export function calculateBMI(
  heightCm,
  weightKg
) {
  if (
    !Number.isFinite(heightCm) ||
    !Number.isFinite(weightKg) ||
    heightCm <= 0 ||
    weightKg <= 0
  ) {
    return {
      bmi: null,
      category: "unknown",
    };
  }

  const heightMeters =
    heightCm / 100;

  const bmi =
    weightKg /
    (heightMeters * heightMeters);

  let category;

  if (bmi < 18.5) {
    category = "underweight";
  } else if (bmi < 25) {
    category = "healthy";
  } else if (bmi < 30) {
    category = "overweight";
  } else {
    category = "obesity";
  }

  return {
    bmi: Number(bmi.toFixed(1)),
    category,
  };
}

/**
 * Build the wellness context that
 * Rae receives.
 */
export async function getWellnessContext(
  uid
) {
  const wellness =
    await getWellnessProfile(uid);

  const bmi =
    calculateBMI(
      wellness.heightCm,
      wellness.weightKg
    );

  return {
    ...wellness,

    bmi: bmi.bmi,

    bmiCategory:
      bmi.category,
  };
}

/**
 * Update wellness information.
 */
export async function updateWellnessProfile(
  uid,
  profile
) {
  const ref = db
    .collection("users")
    .doc(uid);

  const data = {
    heightCm:
      profile.heightCm ?? null,

    weightKg:
      profile.weightKg ?? null,

    goalWeightKg:
      profile.goalWeightKg ?? null,

    wellnessGoal:
      profile.wellnessGoal ?? "",

    dietaryPreferences:
      Array.isArray(
        profile.dietaryPreferences
      )
        ? profile.dietaryPreferences
        : [],

    foodRestrictions:
      Array.isArray(
        profile.foodRestrictions
      )
        ? profile.foodRestrictions
        : [],

    wellnessUpdatedAt:
      new Date(),
  };

  await ref.set(
    data,
    {
      merge: true,
    }
  );

  return getWellnessProfile(uid);
}