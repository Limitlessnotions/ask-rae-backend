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
}) {
  const {
    name = "",
    businessName = "",
    businessType = "",
    goals = [],
  } = profile;

  const memoryText = memories.length
    ? memories
        .map((memory) => `- ${memory.content}`)
        .join("\n")
    : "No saved memories.";

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

RULES

- Make it feel personal.
- Keep it concise.
- Do not sound generic or robotic.
- Do not mention AI.
- Do not mention the memory system.
- Do not use quotation marks.
- Return ONLY the affirmation.
`;

  const response = await ai.responses.create({
    model: "gpt-5-mini",
    input: prompt,
  });

  return response.output_text?.trim() || "";
}