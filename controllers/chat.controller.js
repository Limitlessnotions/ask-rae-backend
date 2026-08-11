import { db } from "../firebase/firebaseAdmin.js";

import {
  generateResponse,
  extractMemories,
} from "../services/ai.service.js";

import {
  getMemories,
  saveMemories,
} from "../services/memory.service.js";

export const chat = async (req, res) => {
  try {
    const { uid } = req.user;
    const { message } = req.body;

    if (
      !message ||
      typeof message !== "string" ||
      !message.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Message is required.",
      });
    }

    /**
     * Load user profile.
     */
    const profileDoc = await db
      .collection("users")
      .doc(uid)
      .get();

    const rawProfile = profileDoc.exists
      ? profileDoc.data()
      : {};

    const profile = {
      name: rawProfile.fullName || "",
      businessName:
        rawProfile.businessName || "",
      businessType:
        rawProfile.industry || "",
      audience:
        rawProfile.targetAudience || "",
      tone:
        rawProfile.preferredTone || "",
      goals: rawProfile.socialMediaGoals
        ? [rawProfile.socialMediaGoals]
        : [],
      platforms:
        rawProfile.platforms || [],
    };

    /**
     * Load Rae's memories for this user.
     */
    const memories =
      await getMemories(uid);

    /**
     * Generate the response using
     * profile + memories.
     */
    const reply =
      await generateResponse({
        message: message.trim(),
        profile,
        memories,
      });

    /**
     * Return the response immediately.
     *
     * Memory extraction happens after
     * the response has been generated so
     * it doesn't interfere with the user's
     * actual conversation.
     */
    res.json({
      success: true,
      reply,
    });

    /**
     * Extract and save useful memories.
     *
     * This is intentionally not awaited.
     */
    extractMemories(message.trim())
      .then(async (newMemories) => {
        if (!newMemories.length) {
          return;
        }

        await saveMemories(
          uid,
          newMemories
        );

        console.log(
          `Saved ${newMemories.length} Rae memory/memories for ${uid}`
        );
      })
      .catch((error) => {
        console.error(
          "Background memory save error:",
          error
        );
      });
  } catch (error) {
    console.error(
      "Chat Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to process message.",
    });
  }
};