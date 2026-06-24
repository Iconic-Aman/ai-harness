import { writeFileSync } from "fs";
import { execSync } from "child_process";
import { resolve } from "path";

// Define the run_python_code tool schema
export const tools = [{
  type: "function" as const,
  function: {
    name: "run_python_code",
    description: "Executes Python code. Saves it to puzzle.py and runs it, returning stdout, stderr, or execution errors.",
    parameters: {
      type: "object",
      properties: {
        code: { type: "string", description: "The complete Python code to write and run." }
      },
      required: ["code"]
    }
  }
}];

// Environment execution tool: writes code to disk and runs it with a timeout
export function runPythonCode(code: string, workingDir: string): string {
  const outputPath = resolve(workingDir, "./puzzle.py");
  writeFileSync(outputPath, code);
  try {
    const stdout = execSync("python puzzle.py", { cwd: workingDir, timeout: 5000, encoding: "utf8" });
    return stdout.trim() ? stdout : "Error: Script executed successfully but returned no output (stdout is empty).";
  } catch (err: any) {
    if (err.code === "ETIMEDOUT") {
      return "Error: Execution timed out after 5000ms. Your algorithm is too slow/brute-force. Optimize it using backtracking or heuristics.";
    }
    return `Error: ${err.stderr || err.message}`;
  }
}
