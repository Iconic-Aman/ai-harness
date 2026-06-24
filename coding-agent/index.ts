import { fileURLToPath } from "url";
import { dirname } from "path";
import { createContext } from "./3-context.js";
import { runLoop } from "./5-loop.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Entrypoint to initiate context and run the agent loop
async function main() {
  const messages = createContext();
  await runLoop(messages, __dirname);
}

main();
