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

// Helper function to handle both valid JSON and the 8b model's broken format
export function parseModelArgs(raw: string): Record<string, string> {
  try {
    return JSON.parse(raw);
  } catch {
    // 1. Check for JSON-like structure with unescaped raw newlines or trailing text
    const jsonLikeMatch = raw.match(/"code"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (jsonLikeMatch) {
      let code = jsonLikeMatch[1]
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, '\\')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t');
      return { code };
    }

    // 2. Check for key="value" or key = "value"
    const result: Record<string, string> = {};
    const matches = raw.matchAll(/(\w+)\s*=\s*"([\s\S]*?)(?="?\s*(?:,\s*\w+=|}\s*$))/g);
    for (const m of matches) {
      result[m[1]] = m[2];
    }
    if (Object.keys(result).length > 0) return result;

    // 3. Check for key: "value" or "key": "value" inside braces
    const braceMatches = raw.matchAll(/"?(\w+)"?\s*[:=]\s*"([\s\S]*?)(?="?\s*(?:,\s*"?\w+"?[:=]|}|\s*$))/g);
    for (const m of braceMatches) {
      result[m[1]] = m[2];
    }
    if (Object.keys(result).length > 0) return result;

    // 4. Fallback: match everything after code= or code: or "code": using word boundaries
    const fallback = raw.match(/(?:\bcode\b|\barguments\b)\s*[:=]\s*([\s\S]+)/s);
    if (fallback) {
      let code = fallback[1].replace(/^["']|["'}]+$/g, "").trim();
      return { code };
    }

    throw new Error("Could not parse model args: " + raw);
  }
}
