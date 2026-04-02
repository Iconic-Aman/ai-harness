// ─────────────────────────────────────────────
// PART 4: The runner
//
// Loops over every test case, calls the model,
// scores the result, and collects the numbers.
//
// The model and scorer are passed in as args —
// swap either one without touching this file.
// ─────────────────────────────────────────────

import type { TestCase } from "./1-dataset.js";
import type { ScorerFn } from "./3-scorers.js";
import { callModel } from "./2-model.js";

export type RunResult = {
  id: string;
  expected: string;
  actual: string;
  trap: string | undefined;   // the wrong answer we expected it to give
  felForTrap: boolean;        // true if it said the trap answer instead
  score: number;
  passed: boolean;
  latencyMs: number;
};

export type EvalRun = {
  model: string;
  results: RunResult[];
  passed: number;
  total: number;
  avgScore: number;
  avgLatencyMs: number;
};

export async function runEval(
  cases: TestCase[],
  model: string,
  scorer: ScorerFn
): Promise<EvalRun> {
  const results: RunResult[] = [];

  for (const testCase of cases) {
    const start = Date.now();
    const actual = await callModel(model, testCase.input);
    const latencyMs = Date.now() - start;
    const score = scorer(actual, testCase.expected);

    const felForTrap =
      testCase.trap !== undefined &&
      actual.toLowerCase().includes(testCase.trap.toLowerCase());

    results.push({
      id: testCase.id,
      expected: testCase.expected,
      actual,
      trap: testCase.trap,
      felForTrap,
      score,
      passed: score >= 1,
      latencyMs,
    });
  }

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / total;
  const avgLatencyMs = results.reduce((sum, r) => sum + r.latencyMs, 0) / total;

  return { model, results, passed, total, avgScore, avgLatencyMs };
}
