# mini-ai-harness

A minimal TypeScript implementation of two kinds of AI harness, built for a talk on **harness engineering** at AI Engineer World's Fair.

---

## What is an AI harness?

An AI harness is the infrastructure that gives an AI model tools and manages input/output behind the scenes, ensuring the model has the tools, context, and environment to do what's asked. It's the scaffolding that wraps around an LLM to make it useful for real-world tasks — not just answering one prompt, but doing actual work in a loop.

The clearest one-liner: **an AI harness is everything except the model weights.**

In practice that means: tool interfaces, context/memory handling, guardrails, verification steps, approval gates, logging, and recovery loops. Anthropic refers to their Claude Agent SDK as a "general-purpose agent harness" that provides built-in context management and tool use so Claude can function as a long-running assistant. OpenAI describes the same idea as orchestration. Anthropic calls the context layer context engineering.

---

## What is harness engineering?

The term crystallized in February 2026 when Mitchell Hashimoto — co-founder of HashiCorp, creator of Terraform — published a blog post giving the practice a name:

> Whenever an agent makes a mistake, you engineer the environment so it won't make that mistake again.

Days later, OpenAI used the same phrase describing how they built an internal beta product: roughly one million lines of code, written entirely by agents, shipped in five months, with no manually written source code. Their key insight:

> When something failed, the fix was almost never "try harder." Human engineers always stepped in and asked: what capability is missing, and how do we make it both legible and enforceable for the agent?

Harness engineering shifts the engineer's job from writing code to designing environments, specifying intent, and providing structured feedback. The harness is the moat. The model is rented.

According to Thoughtworks and OpenAI, a harness has three core components:

1. **Context engineering** — deciding what information to include or exclude at each model call: isolation (keep subtasks separate), reduction (drop stale data to avoid context rot), retrieval (inject fresh docs or search results at the right time).
2. **Architectural constraints** — enforced not just by the model, but by deterministic linters, structural tests, and guardrails the model cannot bypass.
3. **Verification and feedback loops** — the harness checks outputs, runs eval steps, and if something is wrong, surfaces it so the agent or the engineer can fix it.

---

## The two meanings of "harness" — and why both are in this repo

The word has two distinct usages and conflating them causes real confusion.

| | Eval harness | Agent harness |
|---|---|---|
| **Origin** | ML research, 2021 | Agentic engineering, 2026 |
| **Example** | EleutherAI's LM Evaluation Harness | Claude Agent SDK, this repo |
| **Purpose** | Measure model quality against known answers | Enable a model to act in the real world |
| **Input** | Fixed dataset | Open-ended task |
| **Output** | Scores and pass/fail | Answer + tool call log |
| **Loop** | One call per test case | Iterates until done or guardrail fires |
| **Tools** | None | Yes — the whole point |
| **Guardrails** | Not needed | Essential |
| **State** | Stateless | Conversation history across turns |

EleutherAI's LM Evaluation Harness (2021) described itself as "a framework for few-shot evaluation of autoregressive language models." That's the older meaning. The agent harness is newer and fundamentally different in purpose.

Both are in this repo so you can see them side by side.

---

## What's in this repo

```
coding-agent/       ← the agent harness implementation
```

### `coding-agent/` — give a model a task, an environment, and a verification loop

```
task → [tools + context + guardrails + loop + verification] → result
```

| File | Part | What it does |
|---|---|---|
| `1-tools.ts` | Tool registry | Defines `run_python_code` (runs python scripts in-memory via stdin) and `fetch_api_data` (retrieves raw JSON from the weather API). |
| `2-model.ts` | Model client | Configures the `OpenAI` client (pointing to Groq) and implements `parseModelArgs` to handle XML-style tool calls and unescaping. |
| `3-context.ts` | Context / state | Builds the initial system prompt and user task context. |
| `4-guardrails.ts` | Verification | `verifyOutput` fetches the weather API itself, calculates ground-truth values (temp in Fahrenheit and wind speed in mph), and compares them to the generated file. |
| `5-loop.ts` | Agent loop | Call model → execute tools (standard or XML-intercepted) → feed results/crashes back → repeat. Supports a togglable harness/non-harness execution mode. |
| `index.ts` | Entrypoint | Starts the context and triggers either `runLoop` (with harness) or `runWithoutHarness` (without harness). |

```sh
npx tsx coding-agent/index.ts
```

---

## How the agent demo works

The task requires downloading weather data from an API, parsing it, converting values, and saving the results:

> "Write a Python script that downloads the weather data from the URL specified by the 'WEATHER_API_URL' environment variable. Parse the JSON to extract the current temperature and wind speed, convert the temperature to Fahrenheit and the wind speed to miles per hour, and save a JSON file named 'weather_summary.json' containing the keys 'temp_f' and 'wind_mph'."

*(Note: The actual weather API URL used for this demo is: `https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m,wind_speed_10m`)*

### Without the Harness (Mode B)
The model tries to write the Python script in one shot. It guesses the API's JSON keys (e.g. trying `['temp_c']` or `['current']['temp']`). Because it doesn't know the exact structure, the script either crashes or saves incorrect dummy data (`0` or `None`), and the execution stops.

### With the Harness (Mode A)
1. **Iteration 1**: The model attempts to parse the weather JSON using guessed keys (like `['main']['temp']`), which fails with a `KeyError`.
2. **Harness Intervention**: The harness catches the `KeyError` traceback, appends it to the history, and injects a hint: *"Hint: Please call the 'fetch_api_data' tool to inspect the raw JSON structure."*
3. **Iteration 2**: The model reads the hint, calls `fetch_api_data` to inspect the API's actual keys (`temperature_2m`, `wind_speed_10m`), and gets the correct structure.
4. **Iteration 3**: The model writes the correct parsing code. The harness runs it in-memory, verifies the generated `weather_summary.json` against the live API values, and terminates with **Success**.

---

## The harness owns the environment

The architectural decision that makes this a real harness:

```
main()
  ├── messages = createContext()       ← fresh context for this task
  ├── runLoop(messages, workingDir)    ← loop runs inside the environment
       ├── fetchApiData()              ← harness retrieves the raw API JSON
       ├── runPythonCode(code)         ← harness executes python in-memory via stdin
       └── verifyOutput(result)        ← harness performs ground-truth validation
```

Tools do not manage the execution lifecycle. The harness executes the code, captures stderr, feeds it back, and validates the output against the ground truth.

---

## Setup

1. Configure your `.env` file inside `coding-agent/`:
```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant
GROQ_BASE_URL=https://api.groq.com/openai/v1
WEATHER_API_URL=https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m,wind_speed_10m
```

2. Run the script:
```sh
npm install
npx tsx coding-agent/index.ts
```

3. **Toggle Harness Mode**: Open [coding-agent/index.ts](file:///d:/working-place/agent-harness/ai-harness/coding-agent/index.ts) and comment/uncomment the lines to switch modes:
```typescript
// Mode A: Run WITH harness
// await runLoop(messages, __dirname);

// Mode B: Run WITHOUT harness
await runWithoutHarness(messages, __dirname);
```

---

## Sources

- Mitchell Hashimoto, [My AI Adoption Journey](https://mitchellh.com/writing/my-ai-adoption-journey) (February 2026) — coined "harness engineering" in its current agentic meaning
- Anthropic, [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — context engineering as a core harness component
- EleutherAI, [lm-evaluation-harness](https://github.com/EleutherAI/lm-evaluation-harness) — the older eval harness meaning (2021)
- Tejas Kumar, [Harnesses in AI: A Deep Dive — Tejas Kumar, IBM](https://www.youtube.com/watch?v=C_GG5g38vLU) — explanation of agent harness structures and concepts


