import { GoogleGenAI } from "@google/genai";
import { DateTime } from "luxon";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * Extract a reminder request from natural language.
 *
 * The user's timezone is supplied by the client.
 * All returned dates are normalized to UTC ISO strings.
 */
export async function extractReminder(
  message,
  timezone
) {
  const userZone =
    DateTime.local().zoneName;

  const resolvedZone =
    timezone &&
    DateTime.now().setZone(timezone).isValid
      ? timezone
      : userZone;

  const now =
    DateTime.now().setZone(
      resolvedZone
    );

  const prompt = `
You are a reminder extraction system for Ask Rae.

The user is in this IANA timezone:

${resolvedZone}

Current local date and time for this user:

${now.toFormat(
  "yyyy-MM-dd HH:mm:ss ZZZZ"
)}

Current UTC time:

${now.toUTC().toISO()}

Read the user's message and determine whether they are asking
Rae to create a reminder.

Return ONLY valid JSON.

If the user IS asking for a reminder:

{
  "isReminder": true,
  "title": "short reminder title",
  "body": "friendly reminder message",
  "date": "ISO-8601 datetime WITH timezone offset"
}

If the user is NOT asking for a reminder:

{
  "isReminder": false
}

Rules:

- Interpret all dates and times in the user's timezone:
  ${resolvedZone}
- Resolve relative dates using the user's current local date and time.
- Resolve phrases such as:
  "tomorrow"
  "tonight"
  "this evening"
  "next Monday"
  "in two hours"
  "in 30 minutes"
  "at 7 PM tomorrow"
- The returned date MUST contain the correct timezone offset.
- Do not interpret the time as UTC unless the user explicitly says UTC.
- Do not invent a reminder if the user did not ask for one.
- The date must be in the future.
- Keep title concise.
- Keep body friendly and natural.
- Return ONLY JSON.
- Do not use markdown.
- Do not explain your answer.

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

    if (!parsed?.isReminder) {
      return null;
    }

    if (
      !parsed.title ||
      !parsed.body ||
      !parsed.date
    ) {
      return null;
    }

    /**
     * Parse the AI-generated datetime.
     *
     * setZone: true preserves the timezone
     * supplied by the AI instead of converting
     * it immediately.
     */
    const date =
      DateTime.fromISO(
        String(parsed.date),
        {
          setZone: true,
        }
      );

    if (
      !date.isValid ||
      date.toMillis() <= DateTime.now().toMillis()
    ) {
      return null;
    }

    /**
     * Normalize to UTC before returning.
     *
     * This makes the backend representation
     * consistent regardless of where the user is.
     */
    return {
      title:
        String(parsed.title).trim(),

      body:
        String(parsed.body).trim(),

      date:
        date.toUTC().toISO(),
    };
  } catch (error) {
    console.error(
      "Reminder extraction error:",
      error
    );

    return null;
  }
}