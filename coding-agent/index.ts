import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { writeFileSync } from "fs";
import { execSync } from "child_process";
import dotenv from "dotenv";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "./.env") });

const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) {
  console.warn("WARNING: GROQ_API_KEY is not defined in process.env or .env file.");
}

const client = new OpenAI({
  baseURL: process.env.GROQ_BASE_URL,
  apiKey: apiKey || "placeholder_key",
});

const LLM_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

async function main() {
  console.log(`Sending a simple prompt to model "${LLM_MODEL}" via Groq...`);
  
  try {
    const response = await client.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        {
          role: "user",
          content: "Write a Python script to find and print the 10-digit self-describing number (where the 1st digit is the count of 0s, the 2nd is the count of 1s, etc.). Output ONLY valid Python code inside a ```python ``` block."
        }
      ],
    });
    
    const content = response.choices[0].message.content || "";
    console.log("\nResponse from model:\n", content);

    const pythonCodeMatch = content.match(/```python\n([\s\S]*?)\n```/);
    const pythonCode = pythonCodeMatch ? pythonCodeMatch[1] : content;

    const outputPath = resolve(__dirname, "./puzzle.py");
    writeFileSync(outputPath, pythonCode);
    console.log(`\nSaved generated code to ${outputPath}`);

    console.log("\nExecuting the python script...");
    execSync("python puzzle.py", { cwd: __dirname, stdio: "inherit", timeout: 5000 });
  } catch (error) {
    console.error("Error making API call or executing code:", error);
  }
}

main();
