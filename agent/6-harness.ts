import { BrowserSession } from "./browser.js";
import { createTools } from "./1-tools.js";
import { createContext } from "./3-context.js";
import { combineGuardrails, defaultGuardrails, stopAfterUpvote } from "./4-guardrails.js";
import { runLoop } from "./5-loop.js";
import type { LoopResult, ToolEvent } from "./5-loop.js";

export type VerifyResult = {
  passed: boolean;
  reason: string;
};

export type HarnessExecutionResult = LoopResult & {
  task: string;
  model: string;
};

export type HarnessOptions = {
  verify?: (result: HarnessExecutionResult) => VerifyResult;
  maxAttempts?: number;
};

export type HarnessResult = HarnessExecutionResult & {
  attempts: number;
  verification: VerifyResult | null;
};

export async function runHarness(
  task: string,
  model: string,
  options: HarnessOptions = {}
): Promise<HarnessResult> {
  const maxAttempts = options.maxAttempts ?? 1;
  let latestResult: HarnessResult | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await runHarnessAttempt(task, model);
    const verification = options.verify ? options.verify(result) : null;

    latestResult = { ...result, attempts: attempt, verification };

    if (verification?.passed || attempt === maxAttempts) {
      return latestResult;
    }

    console.log(`\nAttempt ${attempt} failed — retrying (${attempt + 1}/${maxAttempts})...\n`);
  }

  throw new Error("Harness finished without producing a result");
}

export function verifySuccessfulUpvote(result: HarnessExecutionResult): VerifyResult {
  const successfulUpvote = result.trace
    .flatMap((iter) => iter.toolEvents)
    .find(
      (e) =>
        e.tool === "browser_click" &&
        /up_/.test(JSON.stringify(e.args)) &&
        /news\.ycombinator\.com\/(news)?$/.test(e.result.split("now at ")[1]?.trim() ?? "")
    );

  return {
    passed: !!successfulUpvote,
    reason: successfulUpvote
      ? `Upvote click confirmed — landed on ${successfulUpvote.result.split("now at ")[1]}`
      : "No successful upvote click found in trace (all arrows may be hidden, or login failed)",
  };
}

export function printHarnessResult(result: HarnessResult): void {
  console.log("\n─── Agent trace ───────────────────────────\n");

  for (const iteration of result.trace) {
    const trimNote = iteration.contextTrimmed ? " ✂ context trimmed" : "";
    const ctx = `[ctx: ${iteration.contextSize} msgs${trimNote}]`;

    if (iteration.outcome === "tool_calls") {
      console.log(`[iter ${iteration.index}] ${iteration.toolEvents.length} tool call(s)  ${ctx}`);
      for (const event of iteration.toolEvents) {
        console.log(`           → ${event.tool}(${JSON.stringify(event.args)})`);
        console.log(`             ${event.result.slice(0, 120)}${event.result.length > 120 ? "…" : ""}`);
      }
    } else {
      console.log(`[iter ${iteration.index}] answered  ${ctx}`);
    }
    console.log();
  }

  console.log("─── Result ────────────────────────────────\n");
  console.log(result.answer);
  console.log(`\nStopped by: ${result.stoppedBy} after ${result.iterations} iteration(s)`);
  console.log(`Attempts:   ${result.attempts}`);

  if (result.verification) {
    const { passed, reason } = result.verification;
    console.log(`Verify:     ${passed ? "✓ PASS" : "✗ FAIL"} — ${reason}`);
  }
}

async function runHarnessAttempt(
  task: string,
  model: string
): Promise<HarnessExecutionResult> {
  // Open the environment — each run gets its own isolated browser page
  const session = new BrowserSession();
  await session.open();

  try {
    const messages = createContext(task);         // fresh context for this task

    // Track upvoted story
    let upvotedStory: { id: string; title?: string; rank?: number } | null = null;
    let storiesData: any[] = [];

    // Create tools with hooks to track upvote success and story data
    const tools = createTools(session, {
      onUpvoteSuccess: (storyId) => {
        const story = storiesData.find(s => s.id === storyId);
        upvotedStory = story
          ? { id: storyId, title: story.title, rank: story.rank }
          : { id: storyId };
        console.log(`\n[harness] Upvote successful for story ID ${storyId} — forcing completion\n`);
      },
      onStoriesLoaded: (stories) => {
        storiesData = stories;
      },
    });

    // Login handler checks for redirects after each tool execution
    const loginHandler = async (): Promise<ToolEvent | null> => {
      const currentUrl = await session.getUrl();
      const isLoginPage = currentUrl.includes("login") || currentUrl.includes("vote");

      if (!isLoginPage) return null;

      console.log("\n[harness] Login redirect detected — handling automatically...");

      try {
        await session.fill("input[name='acct']", "tejasthrowaway");
        await session.fill("input[name='pw']", "tejasthrowaway");
        await session.click("input[type='submit']");

        console.log("[harness] Login completed — agent can continue\n");

        return {
          tool: "harness_auto_login",
          args: {},
          result: `Harness automatically handled login at ${currentUrl}. You are now authenticated and back at ${await session.getUrl()}.`,
        };
      } catch (err) {
        console.log(`[harness] Login failed: ${err instanceof Error ? err.message : String(err)}\n`);
        return null;
      }
    };

    // Combine default guardrails with upvote completion check
    const guardrails = combineGuardrails(
      stopAfterUpvote(() => upvotedStory),
      defaultGuardrails
    );

    const result = await runLoop(model, messages, guardrails, tools, loginHandler);

    return { task, model, ...result };
  } finally {
    // Always close the environment — even if the loop threw
    await session.close();
  }
}
