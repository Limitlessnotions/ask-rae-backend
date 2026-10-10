
import { DateTime } from "luxon";

import { db } from "../firebase/firebaseAdmin.js";

import { getMemories } from "../services/memory.service.js";

import { generateDailyAffirmation } from "../services/affirmation.service.js";

const DEFAULT_TIMEZONE = "UTC";
const DEFAULT_HOUR = 12;
const DEFAULT_MINUTE = 0;
const MAX_DAYS = 7;

/**
 * Get the authenticated user's Firestore document.
 */
function getUserRef(uid) {
  return db.collection("users").doc(uid);
}

/**
 * Store the user's recurring affirmation schedule
 * separately from the built-in daily affirmation.
 */
function getScheduleRef(uid) {
  return getUserRef(uid)
    .collection("userAffirmationSchedule")
    .doc("current");
}

/**
 * Store user-created daily affirmations in their own
 * collection, separate from the built-in daily series.
 */
function getDailyRef(uid, date) {
  return getUserRef(uid)
    .collection("userDailyAffirmations")
    .doc(date);
}

/**
 * Validate an IANA timezone.
 */
function isValidTimezone(timezone) {
  return (
    typeof timezone === "string" &&
    timezone.trim().length > 0 &&
    DateTime.now().setZone(timezone).isValid
  );
}

/**
 * Read and normalize the active accountability goals
 * supplied by the authenticated frontend.
 */
function getActiveGoals(req) {
  try {
    const raw = req.get("X-Active-Goals");

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (goal) =>
          goal &&
          typeof goal === "object"
      )
      .map((goal) => ({
        id:
          typeof goal.id === "string"
            ? goal.id
            : "",
        title:
          typeof goal.title === "string"
            ? goal.title.trim()
            : "",
        description:
          typeof goal.description === "string"
            ? goal.description.trim()
            : "",
        completed: goal.completed === true,
        createdAt:
          typeof goal.createdAt === "string"
            ? goal.createdAt
            : "",
        dueDate:
          typeof goal.dueDate === "string"
            ? goal.dueDate
            : "",
      }))
      .filter(
        (goal) =>
          !goal.completed &&
          (goal.title || goal.description)
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
 * Load the user's profile and saved memories.
 *
 * The property names match the profile structure
 * expected by generateDailyAffirmation().
 */
async function getUserContext(uid) {
  const snapshot = await getUserRef(uid).get();

  const user = snapshot.exists
    ? snapshot.data()
    : {};

  const memories = await getMemories(uid);

  const socialMediaGoals =
    user.socialMediaGoals ??
    user.goals ??
    [];

  return {
    profile: {
      name:
        user.fullName ??
        user.name ??
        "",
      businessName:
        user.businessName ??
        "",
      businessType:
        user.industry ??
        user.businessType ??
        user.businessType ??
        "",
      goals: Array.isArray(socialMediaGoals)
        ? socialMediaGoals
        : socialMediaGoals
          ? [socialMediaGoals]
          : [],
    },
    memories: Array.isArray(memories)
      ? memories
      : [],
  };
}

/**
 * Generate or retrieve the user's affirmation for
 * a specific local calendar date.
 *
 * This collection is independent of the built-in
 * dailyAffirmations collection.
 */
async function getOrCreateUserAffirmation({
  uid,
  date,
  context,
  activeGoals,
  timezone,
}) {
  const affirmationRef = getDailyRef(uid, date);

  const existing = await affirmationRef.get();

  if (
    existing.exists &&
    existing.data()?.affirmation
  ) {
    return {
      date,
      affirmation: existing.data().affirmation,
    };
  }

  const previousSnapshot = await getUserRef(uid)
    .collection("userDailyAffirmations")
    .orderBy("date", "desc")
    .limit(7)
    .get();

  const previousAffirmations = previousSnapshot.docs
    .filter((doc) => doc.id !== date)
    .map((doc) => doc.data()?.affirmation)
    .filter(Boolean);

  const affirmation = await generateDailyAffirmation({
    ...context,
    activeGoals,
    date,
    previousAffirmations,
  });

  if (!affirmation) {
    throw new Error(
      `AI returned an empty user affirmation for ${date}.`
    );
  }

  await affirmationRef.set({
    date,
    affirmation,
    timezone,
    source: "user_created",
    activeGoals: activeGoals.map((goal) => ({
      id: goal.id,
      title: goal.title,
      description: goal.description,
      dueDate: goal.dueDate,
    })),
    createdAt: new Date(),
  });

  return {
    date,
    affirmation,
  };
}

/**
 * POST /api/affirmation/user-schedule
 *
 * Create or update the user's separate recurring
 * affirmation schedule.
 *
 * Body:
 * {
 *   "hour": 18,
 *   "minute": 0,
 *   "timezone": "Africa/Lagos"
 * }
 *
 * If hour and minute are omitted, default to noon.
 */
export async function saveUserAffirmationSchedule(
  req,
  res
) {
  try {
    const uid = req.user.uid;

    const {
      hour = DEFAULT_HOUR,
      minute = DEFAULT_MINUTE,
      timezone,
    } = req.body ?? {};

    if (
      !Number.isInteger(hour) ||
      hour < 0 ||
      hour > 23 ||
      !Number.isInteger(minute) ||
      minute < 0 ||
      minute > 59
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Provide a valid hour (0–23) and minute (0–59).",
      });
    }

    if (!isValidTimezone(timezone)) {
      return res.status(400).json({
        success: false,
        message:
          "Provide a valid IANA timezone, such as Africa/Lagos.",
      });
    }

    const scheduleRef = getScheduleRef(uid);
    const existing = await scheduleRef.get();

    const schedule = {
      active: true,
      hour,
      minute,
      timezone,
      updatedAt: new Date(),
      ...(
        existing.exists
          ? {}
          : { createdAt: new Date() }
      ),
    };

    await scheduleRef.set(
      schedule,
      { merge: true }
    );

    return res.json({
      success: true,
      schedule,
      message:
        "Your recurring affirmation schedule has been saved.",
    });
  } catch (error) {
    console.error(
      "Save user affirmation schedule error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to save your affirmation schedule.",
    });
  }
}

/**
 * GET /api/affirmation/user-schedule
 *
 * Retrieve the user's recurring affirmation schedule.
 */
export async function getUserAffirmationSchedule(
  req,
  res
) {
  try {
    const snapshot = await getScheduleRef(
      req.user.uid
    ).get();

    return res.json({
      success: true,
      schedule: snapshot.exists
        ? snapshot.data()
        : null,
    });
  } catch (error) {
    console.error(
      "Get user affirmation schedule error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve your affirmation schedule.",
    });
  }
}

/**
 * GET /api/affirmation/user-upcoming?days=7
 *
 * Generate or retrieve up to seven daily affirmations
 * for the user's separate recurring series.
 */
export async function getUpcomingUserAffirmations(
  req,
  res
) {
  try {
    const uid = req.user.uid;

    const scheduleSnapshot =
      await getScheduleRef(uid).get();

    if (
      !scheduleSnapshot.exists ||
      scheduleSnapshot.data()?.active !== true
    ) {
      return res.status(404).json({
        success: false,
        message:
          "No active recurring affirmation schedule was found.",
      });
    }

    const schedule = scheduleSnapshot.data();

    const timezone =
      schedule.timezone ||
      DEFAULT_TIMEZONE;

    if (!isValidTimezone(timezone)) {
      return res.status(400).json({
        success: false,
        message:
          "The saved schedule has an invalid timezone.",
      });
    }

    const requestedDays =
      Number.parseInt(req.query.days, 10);

    const days = Number.isInteger(requestedDays)
      ? Math.max(1, Math.min(MAX_DAYS, requestedDays))
      : MAX_DAYS;

    const today = DateTime.now()
      .setZone(timezone)
      .startOf("day");

    const context = await getUserContext(uid);
    const activeGoals = getActiveGoals(req);

    const affirmations = [];
    const previousAffirmations = [];

    for (
      let offset = 0;
      offset < days;
      offset += 1
    ) {
      const date = today
        .plus({ days: offset })
        .toISODate();

      if (!date) {
        continue;
      }

      const result = await getOrCreateUserAffirmation({
        uid,
        date,
        context,
        activeGoals,
        timezone,
      });

      affirmations.push(result);

      if (result.affirmation) {
        previousAffirmations.push(
          result.affirmation
        );
      }
    }

    return res.json({
      success: true,
      timezone,
      schedule: {
        hour: schedule.hour,
        minute: schedule.minute,
      },
      affirmations,
    });
  } catch (error) {
    console.error(
      "Get upcoming user affirmations error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to generate your upcoming affirmations.",
    });
  }
}

/**
 * DELETE /api/affirmation/user-schedule
 *
 * Deactivate only the user-created affirmation series.
 * The built-in 8:00 AM affirmation remains untouched.
 */
export async function cancelUserAffirmationSchedule(
  req,
  res
) {
  try {
    const scheduleRef = getScheduleRef(
      req.user.uid
    );

    const snapshot = await scheduleRef.get();

    if (snapshot.exists) {
      await scheduleRef.set(
        {
          active: false,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    }

    return res.json({
      success: true,
      message:
        "Your recurring affirmation schedule has been cancelled.",
    });
  } catch (error) {
    console.error(
      "Cancel user affirmation schedule error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to cancel your affirmation schedule.",
    });
  }
}
