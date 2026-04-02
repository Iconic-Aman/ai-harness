import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const SYSTEM_PROMPT = `
You are a helpful assistant with access to tools.
Use tools whenever they help you give a more accurate answer.
When you have enough information, respond directly and concisely.
`.trim();

// Build the initial context for a new task
export function createContext(task: string): ChatCompletionMessageParam[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: task },
  ];
}
