import {
  extractCalendarEvent,
} from "../services/calendar.service.js";

export async function parseCalendarEvent(
  req,
  res
) {
  try {
    const { message } = req.body;

    if (
      !message ||
      typeof message !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Message is required.",
      });
    }

    const event =
      await extractCalendarEvent(
        message.trim()
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
        "Unable to process calendar request.",
    });
  }
}