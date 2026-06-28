import { fileURLToPath } from "url";
import { dirname } from "path";
import { createContext } from "./3-context.js";
import { runLoop, runWithoutHarness } from "./5-loop.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Entrypoint to initiate context and run the agent
async function main() {
  const messages = createContext();

  // TOGGLE HARNESS MODE: Comment/uncomment the lines below to switch modes
  await runLoop(messages, __dirname); // Mode A: Run WITH harness
  // await runWithoutHarness(messages, __dirname); // Mode B: Run WITHOUT harness
}

main();
