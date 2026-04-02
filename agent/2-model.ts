import OpenAI from "openai";
import "dotenv/config";

// OpenRouter is OpenAI-compatible. We just swap the baseURL.
export const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});
