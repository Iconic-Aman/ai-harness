import { writeFileSync } from "fs";
import { execSync } from "child_process";
import { resolve } from "path";

// Define the tools available to the LLM
export const tools = [
  {
    type: "function" as const,
    function: {
      name: "run_python_code",
      description: "Executes Python code in-memory, returning stdout, stderr, or execution errors.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "The complete Python code to run." }
        },
        required: ["code"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "fetch_api_data",
      description: "Fetches the raw JSON data from the weather API URL. Use this to inspect the JSON structure and keys before writing your code.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  }
];

// Environment execution tool: runs Python code via stdin
export function runPythonCode(code: string, workingDir: string): string {
  try {
    const stdout = execSync("python", { cwd: workingDir, timeout: 5000, encoding: "utf8", input: code });
    return stdout.trim() ? stdout : "Error: Script executed successfully but returned no output (stdout is empty).";
  } catch (err: any) {
    if (err.code === "ETIMEDOUT") {
      return "Error: Execution timed out after 5000ms. Your algorithm is too slow/brute-force. Optimize it using backtracking or heuristics.";
    }
    let errMsg = `Error: ${err.stderr || err.message}`;
    // Harness Step Extension: Inject a hint if the model hits a KeyError or parsing error
    if (errMsg.includes("KeyError") || errMsg.includes("TypeError") || errMsg.includes("AttributeError")) {
      errMsg += "\nHint: You are encountering a KeyError or parsing error. Please call the 'fetch_api_data' tool to inspect the raw JSON structure and find the correct keys.";
    }
    return errMsg;
  }
}

// Fetch tool: retrieves the API response from WEATHER_API_URL
export async function fetchApiData(): Promise<string> {
  const url = process.env.WEATHER_API_URL;
  if (!url) {
    return "Error: WEATHER_API_URL environment variable is not set.";
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return `Error: Failed to fetch API. Status: ${response.status}`;
    }
    const data = await response.json();
    return JSON.stringify(data, null, 2);
  } catch (err: any) {
    return `Error: ${err.message}`;
  }
}
