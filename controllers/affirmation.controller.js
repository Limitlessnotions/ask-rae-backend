import { DateTime } from "luxon";

import { db } from "../firebase/firebaseAdmin.js";

import { getMemories } from "../services/memory.service.js";

import { generateDailyAffirmation } from "../services/affirmation.service.js";

/**
 * Build the user's profile context used
 * by the affirmation service.
 */
async function getAffirmationContext(uid) {
  /**
   * Load the user's profile.
   */
  const profileDoc = await db
    .collection("users")
    .doc(uid)
    .get();

  const rawProfile = profileDoc.exists
    ? profileDoc.data()
    : {};

  /**
   * Build the profile context.
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

  return {
    profile,
    memories,
  };
}

/**
 * Generate and save an affirmation
 * for a specific date.
 *
 * previousAffirmations contains affirmations
 * that have already been generated for the
 * current scheduling batch.
 */
async function getOrCreateAffirmation(
  uid,
  date,
  context,
  previousAffirmations = []
) {
  const affirmationRef = db
    .collection("users")
    .doc(uid)
    .collection("dailyAffirmations")
    .doc(date);

  /**
   * Check whether an affirmation already
   * exists for this date.
   */
  const affirmationDoc =
    await affirmationRef.get();

  if (affirmationDoc.exists) {
    const data =
      affirmationDoc.data();

    return {
      date,
      affirmation:
        data?.affirmation || "",
    };
  }

  /**
   * Generate a new personalized
   * affirmation.
   *
   * Pass the target date and all
   * previously generated affirmations
   * so the AI can avoid repetition.
   */
  const affirmation =
    await generateDailyAffirmation({
      ...context,
      date,
      previousAffirmations,
    });

  /**
   * Make sure the AI returned content.
   */
  if (!affirmation) {
    throw new Error(
      `AI returned an empty affirmation for ${date}.`
    );
  }

  /**
   * Save the affirmation using the
   * requested date as the document ID.
   */
  await affirmationRef.set({
    affirmation,
    date,
    createdAt: new Date(),
  });

  return {
    date,
    affirmation,
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
 *
 * Query parameters:
 *
 * timezone
 *   IANA timezone, e.g.:
 *   America/New_York
 *   Africa/Lagos
 *   Europe/London
 *
 * If today's affirmation doesn't exist,
 * generate it and save it to Firestore.
 */
export async function getDailyAffirmation(
  req,
  res
) {
  try {
    const { uid } = req.user;

    /**
     * Get the user's timezone.
     */
    const timezone =
      getRequestTimezone(req);

    /**
     * Reject invalid timezones.
     */
    if (!timezone) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid timezone.",
      });
    }

    /**
     * Determine today's calendar date
     * in the user's timezone.
     *
     * This is important because the
     * backend server may be running in UTC
     * while the user is in another timezone.
     */
    const today =
      DateTime.now()
        .setZone(timezone)
        .toFormat("yyyy-MM-dd");

    /**
     * Load the user's profile and memories.
     */
    const context =
      await getAffirmationContext(uid);

    /**
     * Get today's affirmation or create it
     * if it does not already exist.
     */
    const result =
      await getOrCreateAffirmation(
        uid,
        today,
        context
      );

    return res.json({
      success: true,
      affirmation:
        result.affirmation,
      date: result.date,
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
 * Generate/retrieve personalized affirmations
 * for upcoming calendar days.
 *
 * Query parameters:
 *
 * days
 *   Number of days to prepare.
 *
 * timezone
 *   IANA timezone, e.g.:
 *   America/New_York
 *   Africa/Lagos
 *   Europe/London
 */
export async function getUpcomingDailyAffirmations(
  req,
  res
) {
  try {
    const { uid } = req.user;

    /**
     * Read and validate the requested
     * number of days.
     */
    const requestedDays =
      Number(req.query.days) || 7;

    /**
     * Prevent excessive AI generation.
     *
     * The frontend currently requests
     * 7 days, but we cap the endpoint
     * at 7 as an additional safeguard.
     */
    const days = Math.min(
      Math.max(
        requestedDays,
        1
      ),
      7
    );

    /**
     * Get and validate the user's timezone.
     */
    const timezone =
      getRequestTimezone(req);

    if (!timezone) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid timezone.",
      });
    }

    /**
     * Get the current date in the
     * user's timezone.
     */
    const startDate =
      DateTime.now().setZone(
        timezone
      );

    /**
     * Load the profile and memories
     * once rather than once per day.
     */
    const context =
      await getAffirmationContext(uid);

    const affirmations = [];

    /**
     * Keep track of affirmations already
     * generated/retrieved during this batch.
     *
     * These are passed to the AI when creating
     * the next day's affirmation so it can avoid
     * repeating the same wording, structure,
     * message, opening phrase, or theme.
     */
    const previousAffirmations = [];

    /**
     * Generate/retrieve each upcoming
     * calendar day's affirmation.
     *
     * Starting with today means that if
     * today's notification hasn't already
     * been scheduled, it can still be used.
     */
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
          previousAffirmations
        );

      affirmations.push(
        result
      );

      /**
       * Add this affirmation to the list
       * before generating the next day.
       */
      if (result.affirmation) {
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