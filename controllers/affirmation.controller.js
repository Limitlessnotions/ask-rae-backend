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
 * already generated for earlier dates in the
 * current scheduling batch.
 *
 * This allows the AI to avoid producing
 * repetitive affirmations.
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
      created: false,
    };
  }

  /**
   * Generate a new personalized
   * affirmation.
   *
   * The date and previously generated
   * affirmations are explicitly passed
   * to the AI so that each day can have
   * different content.
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
     * Determine today's calendar date
     * in the user's timezone.
     */
    const today =
      DateTime.now()
        .setZone(timezone)
        .toFormat("yyyy-MM-dd");

    /**
     * Load the user's profile
     * and memories.
     */
    const context =
      await getAffirmationContext(uid);

    /**
     * Get today's affirmation or create
     * it if it does not already exist.
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
     * Minimum: 1 day
     * Maximum: 7 days
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
     * Load the user's profile and memories
     * once rather than once per day.
     */
    const context =
      await getAffirmationContext(uid);

    const affirmations = [];

    /**
     * Keep track of affirmations that have
     * already been generated/retrieved in
     * this batch.
     *
     * These are passed to the AI when creating
     * the next affirmation so the AI can avoid
     * repeating the same wording, structure,
     * message, or motivational theme.
     */
    const previousAffirmations = [];

    /**
     * Generate/retrieve each upcoming
     * calendar day's affirmation.
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

      affirmations.push({
        date:
          result.date,
        affirmation:
          result.affirmation,
      });

      /**
       * Add the result to the list that
       * will be supplied to the AI for
       * the next day.
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