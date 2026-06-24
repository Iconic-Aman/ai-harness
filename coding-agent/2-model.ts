import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import dotenv from "dotenv";
import OpenAI from "openai";

// Load dotenv relative to the model config file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "./.env") });

// Initialize LLM client
export const client = new OpenAI({
  baseURL: process.env.GROQ_BASE_URL,
  apiKey: process.env.GROQ_API_KEY || "placeholder_key",
});

// Configure target model name
export const LLM_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
