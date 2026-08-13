import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * Extract a calendar event from
 * natural language.
 */
export async function extractCalendarEvent(
  message
) {
  const now = new Date();

  const prompt = `
You are the calendar extraction system
for Ask Rae.

Current date and time:
${now.toISOString()}

Determine whether the user's message
is asking Rae to add something to their
calendar.

Return ONLY valid JSON.

If the user wants a calendar event:

{
  "isEvent": true,
  "title": "short event title",
  "notes": "optional useful notes",
  "startDate": "ISO-8601 datetime",
  "durationMinutes": 30
}

If the user does NOT want a calendar event:

{
  "isEvent": false
}

RULES:

- Resolve relative dates.
- Resolve relative times.
- Understand natural language.
- "Put this on my calendar" means calendar event.
- "Add this to my calendar" means calendar event.
- "Schedule a meeting" means calendar event.
- "Remind me" alone does NOT necessarily mean calendar event.
- Do not create calendar events unless the user actually requests
  scheduling/calendar functionality.
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
      new Date(parsed.startDate);

    if (
      Number.isNaN(
        startDate.getTime()
      ) ||
      startDate.getTime() <= Date.now()
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
        startDate.toISOString(),

      durationMinutes: duration,
    };
  } catch (error) {
    console.error(
      "Calendar extraction error:",
      error
    );

    return null;
  }
}