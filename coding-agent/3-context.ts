import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// Initialize messages context history with the tougher parsing and conversion task
export function createContext(): ChatCompletionMessageParam[] {
  return [
    {
      role: "system",
      content: "You are a coding agent. Use run_python_code to execute your solution. If execution fails or is incorrect, modify your code and try again. Your goal is to write a script that downloads the weather data from the URL in the 'WEATHER_API_URL' environment variable, parses the current temperature and wind speed, converts the temperature to Fahrenheit and wind speed to mph, and saves these to a JSON file named 'weather_summary.json' with keys 'temp_f' and 'wind_mph'. Do not use any hardcoded URL."
    },
    {
      role: "user",
      content: "Write a Python script that downloads the weather data from the URL specified by the 'WEATHER_API_URL' environment variable. Parse the JSON to extract the current temperature and wind speed, convert the temperature to Fahrenheit and the wind speed to miles per hour, and save a JSON file named 'weather_summary.json' containing the keys 'temp_f' and 'wind_mph'."
    }
  ];
}
