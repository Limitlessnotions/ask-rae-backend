import { GoogleGenAI } from "@google/genai";
import { DateTime } from "luxon";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * Extract a calendar event from natural language.
 *
 * The user's timezone is supplied by the client.
 * Returned startDate is normalized to UTC.
 */
export async function extractCalendarEvent(
  message,
  timezone
) {
  const fallbackZone =
    DateTime.local().zoneName;

  const resolvedZone =
    timezone &&
    DateTime.now().setZone(timezone).isValid
      ? timezone
      : fallbackZone;

  const now =
    DateTime.now().setZone(
      resolvedZone
    );

  const prompt = `
You are the calendar extraction system for Ask Rae.

The user is in this IANA timezone:

${resolvedZone}

Current local date and time for this user:

${now.toFormat(
  "yyyy-MM-dd HH:mm:ss ZZZZ"
)}

Current UTC time:

${now.toUTC().toISO()}

Determine whether the user's message is asking Rae
to add something to their calendar.

Return ONLY valid JSON.

If the user wants a calendar event:

{
  "isEvent": true,
  "title": "short event title",
  "notes": "optional useful notes",
  "startDate": "ISO-8601 datetime WITH timezone offset",
  "durationMinutes": 30
}

If the user does NOT want a calendar event:

{
  "isEvent": false
}

RULES:

- Interpret all dates and times in the user's timezone:
  ${resolvedZone}
- Resolve relative dates.
- Resolve relative times.
- Understand natural language.
- "Put this on my calendar" means calendar event.
- "Add this to my calendar" means calendar event.
- "Schedule a meeting" means calendar event.
- "Remind me" alone does NOT necessarily mean calendar event.
- Do not create calendar events unless the user actually requests
  scheduling/calendar functionality.
- The returned startDate MUST contain the correct timezone offset.
- Do not interpret times as UTC unless the user explicitly says UTC.
- The date must be in the future.
- Default duration is 30 minutes.
- Return ONLY JSON.
- Do not use markdown.

User message:

${message}
`;

  try {
    const response =
      await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
      });

    const text =
      response.text?.trim() || "";

    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed =
      JSON.parse(cleaned);

    if (!parsed?.isEvent) {
      return null;
    }

    if (
      !parsed.title ||
      !parsed.startDate
    ) {
      return null;
    }

    const startDate =
      DateTime.fromISO(
        String(parsed.startDate),
        {
          setZone: true,
        }
      );

    if (
      !startDate.isValid ||
      startDate.toMillis() <=
        DateTime.now().toMillis()
    ) {
      return null;
    }

    const duration =
      Number(
        parsed.durationMinutes
      ) || 30;

    return {
      title:
        String(parsed.title).trim(),

      notes:
        parsed.notes
          ? String(parsed.notes).trim()
          : "",

      startDate:
        startDate.toUTC().toISO(),

      durationMinutes:
        duration,
    };
  } catch (error) {
    console.error(
      "Calendar extraction error:",
      error
    );

    return null;
  }
}