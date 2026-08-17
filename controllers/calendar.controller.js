import {
  extractCalendarEvent,
} from "../services/calendar.service.js";

/**
 * POST /api/calendar/parse
 *
 * Extract a calendar event from natural
 * language using the user's timezone.
 */
export async function parseCalendarEvent(
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

    const event =
      await extractCalendarEvent(
        message.trim(),
        timezone
      );

    return res.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error(
      "Parse calendar event error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to process calendar request.",
    });
  }
}