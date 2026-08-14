import {
  extractReminder,
} from "../services/reminder.service.js";

/**
 * POST /api/reminders/parse
 *
 * Extract a reminder from natural language.
 *
 * Example:
 *
 * "Remind me to post tomorrow at 7pm."
 *
 * Returns:
 *
 * {
 *   success: true,
 *   reminder: {
 *     title,
 *     body,
 *     date
 *   }
 * }
 *
 * Returns reminder: null when the
 * message is not a reminder request.
 */
export async function parseReminder(
  req,
  res
) {
  try {
    const {
      message,
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

    const reminder =
      await extractReminder(
        message.trim()
      );

    return res.json({
      success: true,
      reminder,
    });
  } catch (error) {
    console.error(
      "Parse reminder error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to parse reminder request.",
    });
  }
}