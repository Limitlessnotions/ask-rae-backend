
import OpenAI from "openai";
import { DateTime } from "luxon";

const ai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Detect whether the user gave a clock time,
 * a relative duration, or a part of the day.
 *
 * A relative duration such as "in 30 minutes"
 * must never be replaced with noon.
 */
function hasSpecifiedTime(message) {
  const text = message.toLowerCase();

  const hasClockTime =
    /\b(?:\d{1,2}:\d{2}\s*(?:a\.?m\.?|p\.?m\.?)?|\d{1,2}\s*(?:a\.?m\.?|p\.?m\.?)|noon|midnight)\b/i.test(
      text
    ) ||
    /\bat\s+\d{1,2}\b/i.test(text);

  const hasRelativeDuration =
    /\bin\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|half|a)\s+(?:seconds?|minutes?|hours?|days?)\b/i.test(
      text
    ) ||
    /\bin\s+half\s+an?\s+hour\b/i.test(text);

  const hasDayPart =
    /\b(morning|afternoon|evening|tonight|tonight|midday|at night|before dawn|early morning|late afternoon)\b/i.test(
      text
    );

  return (
    hasClockTime ||
    hasRelativeDuration ||
    hasDayPart
  );
}

/**
 * Extract an explicit reminder request.
 *
 * All dates are interpreted in the user's
 * timezone and returned as UTC ISO strings.
 *
 * When the user gives no time information,
 * the default is 12:00 PM local time.
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
    DateTime.now().setZone(resolvedZone);

  const prompt = `
You are a STRICT reminder extraction system for Ask Rae.

User's IANA timezone:
${resolvedZone}

Current local date and time:
${now.toFormat("yyyy-MM-dd HH:mm:ss ZZZZ")}

Current UTC time:
${now.toUTC().toISO()}

Determine whether the user explicitly wants Rae
to create a future reminder or notification.

Return ONLY valid JSON.

If this is an explicit reminder request:
{
  "isReminder": true,
  "title": "short reminder title",
  "body": "friendly reminder message",
  "date": "ISO-8601 datetime with timezone offset"
}

Otherwise:
{
  "isReminder": false
}

INTENT RULES:
- Only create a reminder when the user explicitly asks Rae
  to remind, notify, alert, prompt, or not let them forget.
- A goal, deadline, intention, plan, milestone, or task
  is not automatically a reminder.
- "by Friday" does not mean "remind me on Friday".
- "tomorrow" by itself does not mean reminder intent.
- Do not create reminders for goals unless the user
  explicitly asks for a reminder.

TIME RULES:
- Resolve all dates and times in ${resolvedZone}.
- Resolve relative dates from the current local date and time.
- Preserve explicitly requested clock times.
- For relative durations such as "in 30 minutes" or
  "in two hours", calculate the exact future datetime.
- For "tomorrow morning", "tonight", and similar dayparts,
  choose a reasonable time within that period.
- If the user gives no clock time, relative duration,
  or daypart, use 12:00 PM (noon) on the requested date.
- Return a datetime with the correct timezone offset.
- The resolved datetime must be in the future.
- Keep titles concise and reminder messages friendly.

Examples:
"Remind me tomorrow to post on Instagram"
→ tomorrow at 12:00 PM local time.

"Remind me tomorrow at 6 PM to post on Instagram"
→ tomorrow at 6:00 PM local time.

"Alert me in 30 minutes to check my messages"
→ exactly 30 minutes from now.

"I want to finish my website by Friday"
→ not a reminder.

Return only JSON. Do not use Markdown or explanations.

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

    const rawDate = String(parsed.date);

    // Honor the offset if the AI supplies one.
    // If no offset is present, interpret the date
    // in the user's timezone, not the server's.
    const hasOffset =
      /(?:Z|[+-]\d{2}:\d{2})$/i.test(rawDate);

    let date = DateTime.fromISO(rawDate, {
      setZone: hasOffset,
      zone: resolvedZone,
    });

    if (!date.isValid) {
      console.error(
        "Invalid reminder date:",
        date.invalidExplanation
      );
      return null;
    }

    // Convert the resolved date to the user's zone
    // before applying the default local time.
    date = date.setZone(resolvedZone);

    if (!hasSpecifiedTime(message)) {
      date = date.set({
        hour: 12,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
    }

    // Reject past dates instead of silently moving
    // the reminder to a different day.
    if (date.toMillis() <= now.toMillis()) {
      return null;
    }

    return {
      title: String(parsed.title).trim(),
      body: String(parsed.body).trim(),
      date: date.toUTC().toISO(),
    };
  } catch (error) {
    console.error(
      "Reminder extraction error:",
      error
    );

    return null;
  }
}
