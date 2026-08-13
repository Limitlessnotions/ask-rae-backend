import { db } from "../firebase/firebaseAdmin.js";

import {
  generateResponse,
  extractMemories,
  extractGoal,
} from "../services/ai.service.js";

import {
  getMemories,
  saveMemories,
} from "../services/memory.service.js";

import {
  getWellnessContext,
} from "../services/wellness.service.js";

import {
  getActiveGoals,
  createExtractedGoal,
} from "../services/accountability.service.js";

export const chat = async (
  req,
  res
) => {
  try {
    const { uid } = req.user;

    const {
      message,
      hydration = {},
    } = req.body;

    if (
      !message ||
      typeof message !== "string" ||
      !message.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Message is required.",
      });
    }

    const cleanMessage =
      message.trim();

    /**
     * Load user profile.
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

      audience:
        rawProfile.targetAudience ||
        "",

      tone:
        rawProfile.preferredTone ||
        "",

      goals:
        rawProfile.socialMediaGoals
          ? [
              rawProfile.socialMediaGoals,
            ]
          : [],

      platforms:
        Array.isArray(
          rawProfile.platforms
        )
          ? rawProfile.platforms
          : [],
    };

    /**
     * Load Rae's memories.
     */
    const memories =
      await getMemories(uid);

    /**
     * Load structured wellness
     * context.
     */
    const wellness =
      await getWellnessContext(uid);

    /**
     * Load active accountability
     * goals.
     *
     * These goals become part of Rae's
     * context so she can naturally
     * support the user's current
     * priorities.
     */
    const accountabilityGoals =
      await getActiveGoals(uid);

    /**
     * Determine whether this message
     * contains an actionable goal.
     *
     * This is deliberately conservative.
     */
    const goal =
      await extractGoal(
        cleanMessage
      );

    /**
     * Generate Rae's response using:
     *
     * - onboarding profile
     * - memories
     * - wellness profile
     * - active accountability goals
     * - current hydration context
     */
    const reply =
      await generateResponse({
        message:
          cleanMessage,

        profile,

        memories,

        wellness,

        accountabilityGoals,

        hydration,
      });

    /**
     * Return both Rae's response and
     * the detected accountability goal.
     *
     * askRae() expects this structure:
     *
     * {
     *   reply: string,
     *   goal: RaeGoal | null
     * }
     */
    res.json({
      success: true,

      reply,

      goal:
        goal || null,
    });

    /**
     * Extract and save useful memories
     * in the background.
     */
    extractMemories(
      cleanMessage
    )
      .then(
        async (newMemories) => {
          if (
            !newMemories.length
          ) {
            return;
          }

          await saveMemories(
            uid,
            newMemories
          );

          console.log(
            `Saved ${newMemories.length} Rae memory/memories for ${uid}`
          );
        }
      )
      .catch((error) => {
        console.error(
          "Background memory save error:",
          error
        );
      });

    /**
     * Save a clearly expressed
     * accountability goal.
     *
     * This happens after the response
     * has been sent so goal persistence
     * does not delay Rae's response.
     *
     * createExtractedGoal() is expected
     * to handle duplicate protection.
     */
    if (goal) {
      createExtractedGoal(
        uid,
        goal
      )
        .then((savedGoal) => {
          if (!savedGoal) {
            return;
          }

          console.log(
            `Saved Rae accountability goal ${savedGoal.id} for ${uid}`
          );
        })
        .catch((error) => {
          console.error(
            "Background accountability goal save error:",
            error
          );
        });
    }
  } catch (error) {
    console.error(
      "Chat Error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        error?.message ||
        "Unable to process message.",
    });
  }
};