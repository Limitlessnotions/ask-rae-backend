
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

import {
  createConversation,
  getConversationMessages,
  saveConversationMessage,
} from "../services/conversation.service.js";

const LIFE_HUB_PROMPT_MARKER =
  "You are Rae, the AI assistant inside Ask Rae Life Hub.";

export const chat = async (req, res) => {
  try {
    const { uid } = req.user;

    const {
      message,
      hydration = {},
      conversationId: requestedConversationId,
    } = req.body;

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

    if (
      requestedConversationId !== undefined &&
      requestedConversationId !== null &&
      (typeof requestedConversationId !== "string" ||
        !requestedConversationId.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID.",
      });
    }

    const cleanMessage = message.trim();

    const isLifeHubRequest =
      cleanMessage.includes(LIFE_HUB_PROMPT_MARKER);

    /*
     * Load the existing conversation context for ordinary
     * Rae chats. Conversation references are always scoped
     * to the authenticated user's own Firestore path.
     *
     * Life Hub requests remain outside ordinary chat history.
     */
    let conversation = null;
    let conversationHistory = [];

    if (!isLifeHubRequest) {
      if (requestedConversationId) {
        const conversationRef = db
          .collection("users")
          .doc(uid)
          .collection("conversations")
          .doc(requestedConversationId);

        const conversationDoc = await conversationRef.get();

        if (!conversationDoc.exists) {
          return res.status(404).json({
            success: false,
            message: "Conversation not found.",
          });
        }

        conversation = {
          id: conversationDoc.id,
          ...conversationDoc.data(),
        };
      } else {
        conversation = await createConversation(
          uid,
          cleanMessage
        );
      }

      conversationHistory = await getConversationMessages(
        uid,
        conversation.id,
        30
      );
    }

    /*
     * Load the user's existing profile.
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
      businessName: rawProfile.businessName || "",
      businessType: rawProfile.industry || "",
      audience: rawProfile.targetAudience || "",
      tone: rawProfile.preferredTone || "",
      goals: rawProfile.socialMediaGoals
        ? [rawProfile.socialMediaGoals]
        : [],
      platforms: Array.isArray(rawProfile.platforms)
        ? rawProfile.platforms
        : [],
    };

    const memories = await getMemories(uid);

    const wellness = await getWellnessContext(uid);

    const accountabilityGoals = await getActiveGoals(uid);

    const goal = isLifeHubRequest
      ? null
      : await extractGoal(cleanMessage);

    /*
     * Generate Rae's response using both existing
     * personalization context and this conversation's
     * previous messages.
     */
    const reply = await generateResponse({
      message: cleanMessage,
      profile,
      memories,
      wellness,
      accountabilityGoals,
      hydration,
      conversationHistory,
    });

    /*
     * Persist the exchange for ordinary Rae chats.
     * Use Firestore-generated document IDs to avoid
     * collisions between independently generated messages.
     */
    if (conversation) {
      await saveConversationMessage(
        uid,
        conversation.id,
        {
          id: db
            .collection("_generated_message_ids")
            .doc().id,
          role: "user",
          content: cleanMessage,
        }
      );

      await saveConversationMessage(
        uid,
        conversation.id,
        {
          id: db
            .collection("_generated_message_ids")
            .doc().id,
          role: "assistant",
          content: reply,
        }
      );
    }

    /*
     * Keep the existing API response fields and add
     * conversationId for the frontend integration.
     */
    res.json({
      success: true,
      reply,
      goal: goal || null,
      conversationId: conversation?.id || null,
    });

    /*
     * Preserve existing background memory extraction.
     */
    if (!isLifeHubRequest) {
      extractMemories(cleanMessage)
        .then(async (newMemories) => {
          if (!newMemories.length) {
            return;
          }

          await saveMemories(uid, newMemories);

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
    }

    /*
     * Preserve existing accountability goal creation.
     */
    if (!isLifeHubRequest && goal) {
      createExtractedGoal(uid, goal)
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
    console.error("Chat Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to process message.",
    });
  }
};
