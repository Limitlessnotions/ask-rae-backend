import { generateResponse } from "../services/ai.service.js";

export const chat = async (req, res) => {
  try {
    const { profile } = req.user;
    const { message } = req.body;

    const reply = await generateResponse({
      message,
      profile,
    });

    return res.json({
      success: true,
      reply,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};