import OpenAI from "openai";
import { DateTime } from "luxon";

const ai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
You are a STRICT reminder extraction system for Ask Rae.

The user's IANA timezone is:

${resolvedZone}

Current local date and time:

${now.toFormat(
  "yyyy-MM-dd HH:mm:ss ZZZZ"
)}

Current UTC time:

${now.toUTC().toISO()}

Your job is ONLY to determine whether the user explicitly wants
Rae to create a reminder or notification.

Return ONLY valid JSON.

If the user IS explicitly asking for a reminder:

{
  "isReminder": true,
  "title": "short reminder title",
  "body": "friendly reminder message",
  "date": "ISO-8601 datetime WITH timezone offset"
}

If the user is NOT explicitly asking for a reminder:

{
  "isReminder": false
}

IMPORTANT INTENT RULES:

- Only return "isReminder": true when the user explicitly wants
  Rae to remind, notify, alert, prompt, or remind them about
  something at a future time.
- A goal is NOT automatically a reminder.
- A deadline is NOT automatically a reminder.
- An intention is NOT automatically a reminder.
- A target date is NOT automatically a reminder.
- A milestone is NOT automatically a reminder.
- Never convert a goal deadline into a reminder unless the user
  explicitly asks for a reminder.
- "by Friday" does NOT mean "remind me on Friday".
- "by September 30" does NOT mean "remind me on September 30".
- "next month" does NOT mean "remind me next month".
- "tomorrow" by itself does NOT mean reminder intent.
- "I want to..."
- "My goal is..."
- "I need to..."
- "I plan to..."
- "I hope to..."
- "I am going to..."
  are NOT reminder requests unless the user also explicitly
  asks Rae to remind or notify them.

Examples that MUST be treated as NOT reminders:

"I want to reach 1,000 LinkedIn followers by September 30."

{
  "isReminder": false
}

"My goal is to launch my coaching program next month."

{
  "isReminder": false
}

"I need to finish my website by Friday."

{
  "isReminder": false
}

"I want to post three times this week."

{
  "isReminder": false
}

"I plan to send the proposal tomorrow."

{
  "isReminder": false
}

Examples that MUST be treated as reminders:

"Remind me to check my LinkedIn followers on September 30."

"Remind me tomorrow at 9 AM to post on LinkedIn."

"Set a reminder for 4 PM to call Sarah."

"Alert me in 30 minutes to check my messages."

"Don't let me forget to send the proposal tomorrow at 10 AM."

"Remind me tonight to take the clothes out of the washing machine."

For explicit reminder requests:

- Interpret all dates and times in the user's timezone:
  ${resolvedZone}
- Resolve relative dates using the user's current local date
  and time.
- Resolve:
  "tomorrow"
  "tonight"
  "this evening"
  "next Monday"
  "in two hours"
  "in 30 minutes"
  "at 7 PM tomorrow"
- The returned date MUST contain the correct timezone offset.
- Do not interpret the time as UTC unless the user explicitly
  says UTC.
- The date must be in the future.
- Keep the title concise.
- Keep the body friendly and natural.

Do NOT create a reminder if the user's message is primarily:

- an accountability goal
- a business goal
- a personal goal
- a project deadline
- a milestone
- a plan
- an intention
- a task they want to accomplish
- a statement about something they need to do

unless they explicitly ask Rae to remind, notify, alert,
or prompt them.

Return ONLY JSON.
Do not use markdown.
Do not explain your answer.

User message:

${message}
`;

  try {
    const response =
      await ai.responses.create({
        model: "gpt-5-mini",
        input: prompt,
      });

    const text =
      response.output_text?.trim() || "";

    const cleaned = text
      .replace(
        /^```json\s*/i,
        ""
      )
      .replace(
        /^```\s*/i,
        ""
      )
      .replace(
        /\s*```$/i,
        ""
      )
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
      date.toMillis() <=
        DateTime.now().toMillis()
    ) {
      return null;
    }

    /**
     * Normalize to UTC before returning.
     *
     * This keeps backend dates consistent
     * regardless of the user's location.
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