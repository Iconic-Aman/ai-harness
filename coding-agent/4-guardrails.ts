import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

export type VerificationResult = {
  passed: boolean;
  reason?: string;
};

// Verification logic: fetches the ground truth API data and compares it against the agent's file
export async function verifyOutput(output: string, workingDir: string): Promise<VerificationResult> {
  const jsonPath = resolve(workingDir, "./weather_summary.json");
  if (!existsSync(jsonPath)) {
    return { passed: false, reason: "weather_summary.json was not created." };
  }

  const url = process.env.WEATHER_API_URL;
  if (!url) {
    return { passed: false, reason: "WEATHER_API_URL environment variable is not set." };
  }

  try {
    // 1. Read the agent's output file
    const content = readFileSync(jsonPath, "utf8");
    const data = JSON.parse(content);

    if (typeof data.temp_f !== "number" || typeof data.wind_mph !== "number") {
      return { passed: false, reason: "weather_summary.json must contain numeric 'temp_f' and 'wind_mph' keys." };
    }

    // 2. Fetch the ground truth data
    const response = await fetch(url);
    if (!response.ok) {
      return { passed: false, reason: "Harness failed to fetch ground-truth weather data for verification." };
    }
    const truth = await response.json();
    const current = truth.current;
    if (!current || current.temperature_2m === undefined || current.wind_speed_10m === undefined) {
      return { passed: false, reason: "Harness failed to parse ground-truth weather data structure." };
    }

    // 3. Compute expected values
    const expectedTempF = current.temperature_2m * 9/5 + 32;
    const expectedWindMph = current.wind_speed_10m * 0.621371;

    // 4. Compare with a small tolerance (0.5) to account for rounding differences
    const tempDiff = Math.abs(data.temp_f - expectedTempF);
    const windDiff = Math.abs(data.wind_mph - expectedWindMph);

    if (tempDiff > 0.5 || windDiff > 0.5) {
      return {
        passed: false,
        reason: `Values in weather_summary.json are incorrect. Expected temp_f ≈ ${expectedTempF.toFixed(2)} and wind_mph ≈ ${expectedWindMph.toFixed(2)}, but got temp_f = ${data.temp_f} and wind_mph = ${data.wind_mph}. Please check the JSON keys you are extracting from.`
      };
    }

    return { passed: true };
  } catch (err: any) {
    return { passed: false, reason: `Failed to verify output: ${err.message}` };
  }
}
