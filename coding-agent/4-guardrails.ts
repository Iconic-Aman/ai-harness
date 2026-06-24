import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

// Verification logic: check if weather.html was created and contains valid html/weather keywords
export function verifyOutput(output: string, workingDir: string): boolean {
  const htmlPath = resolve(workingDir, "./weather.html");
  if (!existsSync(htmlPath)) {
    return false;
  }
  const content = readFileSync(htmlPath, "utf8");
  return content.includes("<html") && (content.toLowerCase().includes("temp") || content.toLowerCase().includes("wind"));
}
