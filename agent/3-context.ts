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

// Drop old tool messages if context grows too large.
// Always keep: the system prompt and the original user task.
export function trimContext(
  messages: ChatCompletionMessageParam[],
  maxMessages: number
): ChatCompletionMessageParam[] {
  if (messages.length <= maxMessages) return messages;

  const [system, user] = messages;
  const rest = messages.slice(2);
  const trimmed = rest.slice(rest.length - (maxMessages - 2));
  return [system, user, ...trimmed];
}
