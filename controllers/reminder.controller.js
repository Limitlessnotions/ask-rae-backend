import {
  extractReminder,
} from "../services/reminder.service.js";

/**
 * POST /api/reminders/parse
 *
 * Extract a reminder from natural language.
 *
 * The client supplies the user's IANA
 * timezone so relative times such as
 * "tomorrow at 9 AM" are interpreted
 * correctly for that user.
 */
export async function parseReminder(
  req,
  res
) {
  try {
    const {
      message,
      timezone,
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
        message.trim(),
        timezone
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