import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { client, LLM_MODEL } from "./2-model.js";
import { tools, runPythonCode } from "./1-tools.js";
import { verifyOutput } from "./4-guardrails.js";

// Helper function to handle both valid JSON and the 8b model's broken format
function parseModelArgs(raw: string): Record<string, string> {
  try {
    return JSON.parse(raw);
  } catch {
    // 1. Check for JSON-like structure with unescaped raw newlines (e.g. {"code": "..."})
    const jsonLikeMatch = raw.match(/"code"\s*:\s*"([\s\S]*?)"\s*}\s*$/);
    if (jsonLikeMatch) {
      let code = jsonLikeMatch[1]
        .replace(/\\"/g, '"')
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

    // 4. Fallback: match everything after code= or code: or "code":
    const fallback = raw.match(/(?:code|arguments)\s*[:=]\s*([\s\S]+)/s);
    if (fallback) {
      let code = fallback[1].replace(/^["']|["'}]+$/g, "").trim();
      return { code };
    }

    throw new Error("Could not parse model args: " + raw);
  }
}

// Orchestrate loop iterations
export async function runLoop(
  messages: ChatCompletionMessageParam[],
  workingDir: string
): Promise<void> {
  let iterations = 0;
  while (iterations < 5) {
    iterations++;
    console.log(`\n[Iteration ${iterations}] Calling model...`);

    try {
      const response = await client.chat.completions.create({
        model: LLM_MODEL,
        messages,
        tools,
      });

      const choice = response.choices[0];
      messages.push(choice.message as ChatCompletionMessageParam);

      // Handle standard tool calls
      if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
        for (const toolCall of choice.message.tool_calls) {
          if (toolCall.function.name === "run_python_code") {
            const args = parseModelArgs(toolCall.function.arguments);
            console.log(`Executing generated Python code...`);
            let result = runPythonCode(args.code, workingDir);
            console.log(`Result: ${result.slice(0, 150)}`);

            if (verifyOutput(result, workingDir)) {
              console.log("\nSuccess: Weather file created!");
              return;
            } else if (!result.startsWith("Error:")) {
              result = "Error: The script executed successfully, but 'weather.html' was either not created or did not contain valid HTML/weather data. Please ensure you write the data to 'weather.html' and complete the task.";
            }

            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: result,
            });
          }
        }
      } else {
        console.log(`Model Response: ${choice.message.content}`);
        if (verifyOutput("", workingDir)) {
          console.log("\nSuccess: Weather file created!");
          return;
        }
        messages.push({
          role: "user",
          content: "You must run the code to verify your answer. Use the run_python_code tool.",
        });
      }
    } catch (error: any) {
      const failedGen = error.failed_generation || error.error?.failed_generation;
      // Handle non-standard tag-based tool calls from the 8b model
      if (error.code === "tool_use_failed" && failedGen) {
        console.log("Harness intercepted a failed tool generation format...");
        const match = failedGen.match(/<function=(\w+)>(.*?)<\/function>/s);
        if (match) {
          const funcName = match[1];
          const funcArgsStr = match[2];
          try {
            const args = parseModelArgs(funcArgsStr);
            if (funcName === "run_python_code") {
              console.log("Executing intercepted Python code...");
              let result = runPythonCode(args.code, workingDir);
              console.log(`Result: ${result.slice(0, 150)}`);

              if (verifyOutput(result, workingDir)) {
                console.log("\nSuccess: Weather file created via intercepted tool call!");
                return;
              } else if (!result.startsWith("Error:")) {
                result = "Error: The script executed successfully, but 'weather.html' was either not created or did not contain valid HTML/weather data. Please ensure you write the data to 'weather.html' and complete the task.";
              }

              const toolCallId = "call_" + Math.random().toString(36).substring(2, 9);
              messages.push({
                role: "assistant",
                content: null,
                tool_calls: [{
                  id: toolCallId,
                  type: "function",
                  function: {
                    name: funcName,
                    arguments: funcArgsStr,
                  },
                }],
              });

              messages.push({
                role: "tool",
                tool_call_id: toolCallId,
                content: result,
              });
              continue;
            }
          } catch (e) {
            console.error("Failed to parse intercepted function args:", e);
          }
        }
      }
      console.error("Error in loop:", error);
      break;
    }
  }
  console.log("\nFailed to solve the puzzle within iteration limit.");
}
