
import {
  listConversations,
  getConversationMessages,
} from "../services/conversation.service.js";

export const getUserConversations = async (req, res) => {
  try {
    const { uid } = req.user;
    const conversations = await listConversations(uid, 50);

    return res.json({
      success: true,
      conversations,
    });
  } catch (error) {
    console.error("List conversations error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load conversation history.",
    });
  }
};

export const getUserConversationMessages = async (req, res) => {
  try {
    const { uid } = req.user;
    const { conversationId } = req.params;

    if (!conversationId || !conversationId.trim()) {
      return res.status(400).json({
        success: false,
        message: "Conversation ID is required.",
      });
    }

    const messages = await getConversationMessages(
      uid,
      conversationId,
      500
    );

    return res.json({
      success: true,
      conversationId,
      messages,
    });
  } catch (error) {
    if (error.message === "Conversation not found.") {
      return res.status(404).json({
        success: false,
        message: "Conversation not found.",
      });
    }

    console.error("Load conversation messages error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load conversation messages.",
    });
  }
};