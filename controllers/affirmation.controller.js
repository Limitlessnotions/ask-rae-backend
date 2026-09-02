import { createHash } from "crypto";

import { DateTime } from "luxon";

import { db } from "../firebase/firebaseAdmin.js";

import { getMemories } from "../services/memory.service.js";

import { generateDailyAffirmation } from "../services/affirmation.service.js";

/**
 * Build the user's profile context used
 * by the affirmation service.
 */
async function getAffirmationContext(uid) {
  const profileDoc = await db
    .collection("users")
    .doc(uid)
    .get();

  const rawProfile = profileDoc.exists
    ? profileDoc.data()
    : {};

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

  const memories =
    await getMemories(uid);

  return {
    profile,
    memories,
  };
}

/**
 * Read the active accountability goals
 * supplied by the authenticated frontend.
 *
 * The frontend obtains these from the
 * user's existing getActiveGoals() flow.
 */
function getRequestActiveGoals(req) {
  const rawGoals =
    req.get(
      "X-Active-Goals"
    );

  if (!rawGoals) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(rawGoals);

    if (
      !Array.isArray(parsed)
    ) {
      return [];
    }

    return parsed
      .filter(
        (goal) =>
          goal &&
          typeof goal ===
            "object"
      )
      .map((goal) => ({
        id:
          typeof goal.id ===
          "string"
            ? goal.id
            : "",

        title:
          typeof goal.title ===
          "string"
            ? goal.title.trim()
            : "",

        description:
          typeof goal.description ===
          "string"
            ? goal.description.trim()
            : "",

        completed:
          goal.completed === true,

        createdAt:
          typeof goal.createdAt ===
          "string"
            ? goal.createdAt
            : "",

        dueDate:
          typeof goal.dueDate ===
          "string"
            ? goal.dueDate
            : "",
      }))
      .filter(
        (goal) =>
          !goal.completed &&
          (
            goal.title ||
            goal.description
          )
      );
  } catch (error) {
    console.error(
      "Invalid active accountability goals header:",
      error
    );

    return [];
  }
}

/**
 * Create a stable fingerprint for the
 * current active accountability goals.
 *
 * This allows future cached affirmations
 * to be regenerated automatically when
 * the user's active goals change.
 */
function createGoalFingerprint(
  activeGoals = []
) {
  const normalizedGoals =
    activeGoals
      .map((goal) => ({
        id:
          goal.id || "",

        title:
          goal.title || "",

        description:
          goal.description || "",

        dueDate:
          goal.dueDate || "",
      }))
      .sort((a, b) =>
        `${a.id}${a.title}`.localeCompare(
          `${b.id}${b.title}`
        )
      );

  return createHash("sha256")
    .update(
      JSON.stringify(
        normalizedGoals
      )
    )
    .digest("hex");
}

/**
 * Generate and save an affirmation
 * for a specific date.
 *
 * If the user's active accountability
 * goals have changed since an affirmation
 * was generated, the old affirmation is
 * regenerated using the new current goals.
 */
async function getOrCreateAffirmation(
  uid,
  date,
  context,
  activeGoals = [],
  previousAffirmations = []
) {
  const affirmationRef =
    db
      .collection("users")
      .doc(uid)
      .collection(
        "dailyAffirmations"
      )
      .doc(date);

  const affirmationDoc =
    await affirmationRef.get();

  const goalFingerprint =
    createGoalFingerprint(
      activeGoals
    );

  if (
    affirmationDoc.exists
  ) {
    const data =
      affirmationDoc.data();

    const storedFingerprint =
      data?.goalFingerprint ||
      "";

    /**
     * Reuse the existing affirmation
     * only when it was generated against
     * the same current accountability
     * goal context.
     */
    if (
      storedFingerprint ===
        goalFingerprint &&
      data?.affirmation
    ) {
      return {
        date,
        affirmation:
          data.affirmation,
        created: false,
      };
    }
  }

  const affirmation =
    await generateDailyAffirmation({
      ...context,

      activeGoals,

      date,

      previousAffirmations,
    });

  if (!affirmation) {
    throw new Error(
      `AI returned an empty affirmation for ${date}.`
    );
  }

  await affirmationRef.set({
    affirmation,

    date,

    goalFingerprint,

    activeGoals:
      activeGoals.map(
        (goal) => ({
          id:
            goal.id || "",

          title:
            goal.title || "",

          description:
            goal.description || "",

          dueDate:
            goal.dueDate || "",
        })
      ),

    createdAt:
      new Date(),
  });

  return {
    date,

    affirmation,

    created: true,
  };
}

/**
 * Get and validate the timezone
 * supplied by the frontend.
 *
 * Defaults to UTC if no timezone
 * is provided.
 */
function getRequestTimezone(req) {
  const timezone =
    typeof req.query.timezone ===
    "string"
      ? req.query.timezone
      : "UTC";

  const dateTime =
    DateTime.now().setZone(
      timezone
    );

  if (!dateTime.isValid) {
    return null;
  }

  return timezone;
}

/**
 * GET /api/affirmation/daily
 *
 * Get today's personalized affirmation
 * for the authenticated user.
 */
export async function getDailyAffirmation(
  req,
  res
) {
  try {
    const { uid } =
      req.user;

    const timezone =
      getRequestTimezone(req);

    if (!timezone) {
      return res.status(400).json({
        success: false,

        message:
          "Invalid timezone.",
      });
    }

    const today =
      DateTime.now()
        .setZone(timezone)
        .toFormat(
          "yyyy-MM-dd"
        );

    const context =
      await getAffirmationContext(
        uid
      );

    const activeGoals =
      getRequestActiveGoals(
        req
      );

    const result =
      await getOrCreateAffirmation(
        uid,

        today,

        context,

        activeGoals
      );

    return res.json({
      success: true,

      affirmation:
        result.affirmation,

      date:
        result.date,
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

/**
 * GET /api/affirmation/upcoming
 *
 * Generate/retrieve personalized
 * affirmations for upcoming calendar days.
 */
export async function getUpcomingDailyAffirmations(
  req,
  res
) {
  try {
    const { uid } =
      req.user;

    const requestedDays =
      Number(req.query.days) ||
      7;

    const days =
      Math.min(
        Math.max(
          requestedDays,
          1
        ),
        7
      );

    const timezone =
      getRequestTimezone(req);

    if (!timezone) {
      return res.status(400).json({
        success: false,

        message:
          "Invalid timezone.",
      });
    }

    const startDate =
      DateTime.now().setZone(
        timezone
      );

    const context =
      await getAffirmationContext(
        uid
      );

    /**
     * Get the user's current active
     * accountability goals.
     */
    const activeGoals =
      getRequestActiveGoals(
        req
      );

    const affirmations = [];

    const previousAffirmations =
      [];

    for (
      let index = 0;
      index < days;
      index++
    ) {
      const date =
        startDate
          .plus({
            days: index,
          })
          .toFormat(
            "yyyy-MM-dd"
          );

      const result =
        await getOrCreateAffirmation(
          uid,

          date,

          context,

          activeGoals,

          previousAffirmations
        );

      affirmations.push({
        date:
          result.date,

        affirmation:
          result.affirmation,
      });

      if (
        result.affirmation
      ) {
        previousAffirmations.push(
          result.affirmation
        );
      }
    }

    return res.json({
      success: true,

      affirmations,
    });
  } catch (error) {
    console.error(
      "Upcoming affirmations error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to generate upcoming affirmations.",
    });
  }
}