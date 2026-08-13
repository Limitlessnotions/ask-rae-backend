import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * Extract a reminder request from natural language.
 *
 * Returns null when the message is not a reminder request.
 */
export async function extractReminder(
  message
) {
  const now = new Date();

  const prompt = `
You are a reminder extraction system for Ask Rae.

Current date and time:
${now.toISOString()}

Read the user's message and determine whether they are asking
Rae to create a reminder.

Return ONLY valid JSON.

If the user IS asking for a reminder:

{
  "isReminder": true,
  "title": "short reminder title",
  "body": "friendly reminder message",
  "date": "ISO-8601 datetime"
}

If the user is NOT asking for a reminder:

{
  "isReminder": false
}

Rules:

- Resolve relative dates using the current date/time.
- Resolve phrases such as:
  "tomorrow"
  "tonight"
  "this evening"
  "next Monday"
  "in two hours"
  "in 30 minutes"
  "at 7 PM tomorrow"
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

    const parsed = JSON.parse(cleaned);

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

    const date = new Date(
      parsed.date
    );

    if (
      Number.isNaN(date.getTime()) ||
      date.getTime() <= Date.now()
    ) {
      return null;
    }

    return {
      title: String(parsed.title).trim(),
      body: String(parsed.body).trim(),
      date: date.toISOString(),
    };
  } catch (error) {
    console.error(
      "Reminder extraction error:",
      error
    );

    return null;
  }
}