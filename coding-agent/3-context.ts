import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// Initialize messages context history with the weather API instructions and task prompt
export function createContext(): ChatCompletionMessageParam[] {
  return [
    {
      role: "system",
      content: "You are a coding agent. Use run_python_code to execute your solution. If execution fails or is incorrect, modify your code and try again. Your goal is to write a script that generates a beautiful 'weather.html' file using the data downloaded from the API. The API URL is provided in the environment variable 'WEATHER_API_URL'. Do not hardcode any URL."
    },
    {
      role: "user",
      content: "Write a Python script that downloads weather data from the URL specified by the 'WEATHER_API_URL' environment variable, extracts the temperature and wind speed, and creates a beautifully styled HTML file named 'weather.html' to present this info."
    }
  ];
}
