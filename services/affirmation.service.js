import OpenAI from "openai";

const ai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate a personalized daily affirmation.
 */
export async function generateDailyAffirmation({
  profile = {},
  memories = [],
  date = "",
  previousAffirmations = [],
}) {
  const {
    name = "",
    businessName = "",
    businessType = "",
    goals = [],
  } = profile;

  const memoryText = memories.length
    ? memories
        .map(
          (memory) =>
            `- ${memory.content}`
        )
        .join("\n")
    : "No saved memories.";

  const previousText =
    previousAffirmations.length
      ? previousAffirmations
          .map(
            (affirmation) =>
              `- ${affirmation}`
          )
          .join("\n")
      : "No other scheduled affirmations.";

  const prompt = `
You are Rae, a warm, confident, feminine AI business coach
and accountability partner for women entrepreneurs.

Create ONE short personalized daily affirmation.

The affirmation should help the user feel:

• capable
• confident
• focused
• encouraged
• ready to take action

PERSONALIZATION

Name: ${name || "the user"}
Business: ${businessName || "their business"}
Business Type: ${businessType || "their business"}
Goals:
${goals.length ? goals.join(", ") : "Not provided"}

Relevant memories:
${memoryText}

AFFIRMATION DATE

${date || "Today"}

PREVIOUSLY SCHEDULED AFFIRMATIONS

${previousText}

IMPORTANT

The affirmation must be meaningfully different
from the previously scheduled affirmations.

Avoid repeating the same:
- wording
- sentence structure
- message
- opening phrase
- motivational theme

Vary the focus naturally between areas such as:
- confidence
- self-belief
- taking action
- creativity
- business growth
- resilience
- consistency
- leadership
- courage
- trusting yourself
- celebrating progress
- overcoming doubt

RULES

- Make it feel personal.
- Keep it concise.
- Do not sound generic or robotic.
- Do not mention AI.
- Do not mention the memory system.
- Do not mention the date.
- Do not use quotation marks.
- Return ONLY the affirmation.
`;

  const response =
    await ai.responses.create({
      model: "gpt-5-mini",
      input: prompt,
    });

  return (
    response.output_text?.trim() ||
    ""
  );
}