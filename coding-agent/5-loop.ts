import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { writeFileSync } from "fs";
import { execSync } from "child_process";
import { resolve } from "path";
import { client, LLM_MODEL, parseModelArgs } from "./2-model.js";
import { tools, runPythonCode, fetchApiData } from "./1-tools.js";
import { verifyOutput } from "./4-guardrails.js";

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

            const verification = await verifyOutput(result, workingDir);
            if (verification.passed) {
              console.log("\nSuccess: Weather summary JSON file created!");
              return;
            } else {
              if (result.startsWith("Error: Traceback") || result.startsWith("Error: SyntaxError") || result.includes("SyntaxWarning")) {
                // Keep the traceback/syntax error
              } else {
                result = `Error: Verification failed. Reason: ${verification.reason || "Invalid data"}`;
              }
            }

            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: result,
            });
          } else if (toolCall.function.name === "fetch_api_data") {
            console.log("Fetching API data...");
            const result = await fetchApiData();
            console.log(`Result: ${result.slice(0, 150)}...`);

            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: result,
            });
          }
        }
      } else {
        console.log(`Model Response: ${choice.message.content}`);
        const verification = await verifyOutput("", workingDir);
        if (verification.passed) {
          console.log("\nSuccess: Weather summary JSON file created!");
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

              const verification = await verifyOutput(result, workingDir);
              if (verification.passed) {
                console.log("\nSuccess: Weather summary JSON file created via intercepted tool call!");
                return;
              } else {
                if (result.startsWith("Error: Traceback") || result.startsWith("Error: SyntaxError") || result.includes("SyntaxWarning")) {
                  // Keep the traceback/syntax error
                } else {
                  result = `Error: Verification failed. Reason: ${verification.reason || "Invalid data"}`;
                }
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
            } else if (funcName === "fetch_api_data") {
              console.log("Fetching API data (intercepted)...");
              const result = await fetchApiData();
              console.log(`Result: ${result.slice(0, 150)}...`);

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
  console.log("\nFailed to complete the task within iteration limit.");
}

// Direct execution mode: runs the model once, extracts code, and executes it directly without harness loop/verification
export async function runWithoutHarness(
  messages: ChatCompletionMessageParam[],
  workingDir: string
): Promise<void> {
  console.log(`\n[Running WITHOUT Harness] Calling model...`);
  try {
    const response = await client.chat.completions.create({
      model: LLM_MODEL,
      messages,
    });
    const content = response.choices[0].message.content || "";
    console.log("\nResponse from model:\n", content);

    const pythonCodeMatch = content.match(/```python\n([\s\S]*?)\n```/);
    const pythonCode = pythonCodeMatch ? pythonCodeMatch[1] : content;

    console.log("\nExecuting the python script directly in-memory...");
    execSync("python", { cwd: workingDir, stdio: "inherit", input: pythonCode, encoding: "utf8" });
  } catch (error) {
    console.error("Error running without harness:", error);
  }
}
