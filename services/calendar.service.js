
import OpenAI from "openai";
import { DateTime } from "luxon";

const ai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

  const now = DateTime.now().setZone(
    resolvedZone
  );

  const prompt = `
You are the STRICT calendar-intent extraction
system for Ask Rae.

Your job is to determine whether the user explicitly
wants an event created in their phone calendar.

IMPORTANT:
Do not confuse a reminder, notification, recurring
routine, affirmation schedule, or daily habit with
a calendar event.

USER'S TIMEZONE:
${resolvedZone}

CURRENT LOCAL DATE AND TIME:
${now.toFormat("yyyy-MM-dd HH:mm:ss ZZZZ")}

CURRENT UTC TIME:
${now.toUTC().toISO()}

Return ONLY valid JSON.

IF THE USER EXPLICITLY WANTS A CALENDAR EVENT:
{
  "isEvent": true,
  "title": "short event title",
  "notes": "optional useful notes",
  "startDate": "ISO-8601 datetime WITH timezone offset",
  "durationMinutes": 30
}

IF THE USER DOES NOT EXPLICITLY WANT A CALENDAR EVENT:
{
  "isEvent": false
}

==================================================
1. CALENDAR INTENT RULES
==================================================

Return "isEvent": true when the user clearly asks
to create or add an event to their calendar.

Examples of calendar intent:
- "Add this to my calendar."
- "Put this on my calendar."
- "Schedule a meeting with Jane tomorrow at 2 PM."
- "Create a calendar event for my doctor's appointment."
- "Book a calendar slot for my planning session."
- "Add my daily affirmation to my calendar tomorrow
   at 6 PM."

The user does not need to use the exact phrase
"calendar event" if their intent to schedule an
actual event is clear.

==================================================
2. AFFIRMATION EXCLUSION RULES
==================================================

Affirmation requests are NOT calendar events by
default.

When the user asks to receive, send, get, or see
an affirmation at a particular time or on a recurring
schedule, return:

{
  "isEvent": false
}

Examples:
- "Send me an affirmation daily at 6 PM."
- "Give me a daily affirmation at 6 PM."
- "I want an affirmation every day at 6."
- "Send me a separate affirmation notification
   every day at 6 PM."
- "Schedule my affirmations for every evening."
- "I want a fresh affirmation every morning."
- "Notify me with an affirmation daily."
- "I want another daily affirmation at 6 PM."

These requests belong to the app's separate
affirmation-scheduling functionality.

Do not create a calendar event just because:
- The user mentions a clock time.
- The user says "schedule" in the context of
  receiving recurring affirmations.
- The user uses "daily", "every day", "each day",
  "every morning", "every evening", or "recurring".
- The user asks for a notification or alert.
- The user asks for a separate or additional
  affirmation schedule.

EXCEPTION:
If the user explicitly asks to add the affirmation
to their calendar, create a calendar event.

For example:
"Add my daily affirmation to my calendar tomorrow
at 6 PM."

This is a calendar request because the user explicitly
requested a calendar entry.

==================================================
3. REMINDER AND NOTIFICATION EXCLUSION RULES
==================================================

Ordinary reminders and app notifications are NOT
calendar events by default.

Examples:
- "Remind me to drink water at noon."
- "Remind me every day to take a break."
- "Notify me tomorrow at 3 PM."
- "Alert me in 30 minutes."
- "Remind me to post on Instagram every Monday."
- "Send me a notification every evening."

For these requests, return:
{
  "isEvent": false
}

Do not turn a reminder into a calendar event
unless the user explicitly requests calendar
functionality or clearly asks to create an actual
calendar event.

==================================================
4. INTENT PRIORITY
==================================================

Use this priority order:

1. Explicit calendar instructions take priority.
2. Affirmation requests without explicit calendar
   instructions are not calendar events.
3. Ordinary reminders and notifications without
   explicit calendar instructions are not events.
4. Other requests must clearly express an intention
   to schedule an actual event before returning
   "isEvent": true.
5. If calendar intent is ambiguous, return
   "isEvent": false.

The word "daily" describes frequency; it does not,
by itself, establish calendar intent.

The presence of a date or time does not, by itself,
establish calendar intent.

==================================================
5. DATE AND TIME RULES
==================================================

- Interpret dates and times in the user's timezone:
  ${resolvedZone}
- Resolve relative dates and times.
- The returned startDate MUST contain the correct
  timezone offset.
- Do not interpret times as UTC unless the user
  explicitly specifies UTC.
- The event date must be in the future.
- Default event duration is 30 minutes.
- Return ONLY valid JSON.
- Do not use Markdown or explanations.

==================================================
6. CLASSIFICATION EXAMPLES
==================================================

User:
"Send me an affirmation daily at 6 PM."

Result:
{"isEvent": false}

User:
"I want a separate affirmation notification
every day at 6 PM. Do not create a calendar event."

Result:
{"isEvent": false}

User:
"Remind me to drink water every day at noon."

Result:
{"isEvent": false}

User:
"Schedule a meeting with Jane tomorrow at 2 PM."

Result:
{
  "isEvent": true,
  "title": "Meeting with Jane",
  "notes": "",
  "startDate": "future ISO-8601 datetime with timezone offset",
  "durationMinutes": 30
}

User:
"Add my daily affirmation to my calendar tomorrow
at 6 PM."

Result:
{
  "isEvent": true,
  "title": "Daily affirmation",
  "notes": "",
  "startDate": "future ISO-8601 datetime with timezone offset",
  "durationMinutes": 30
}

User:
"Help me build a daily affirmation habit."

Result:
{"isEvent": false}

==================================================

USER MESSAGE:
${message}
`;

  try {
    const response = await ai.responses.create({
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

    if (!parsed?.isEvent) {
      return null;
    }

    if (
      !parsed.title ||
      !parsed.startDate
    ) {
      return null;
    }

    const startDate = DateTime.fromISO(
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
      Number(parsed.durationMinutes) || 30;

    return {
      title: String(parsed.title).trim(),

      notes: parsed.notes
        ? String(parsed.notes).trim()
        : "",

      startDate: startDate.toUTC().toISO(),

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
