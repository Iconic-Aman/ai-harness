// ─────────────────────────────────────────────
// PART 3: The scorers
//
// A scorer takes the model's output and the
// expected output, and returns 0 (wrong) or 1
// (correct). Partial credit is also fine.
//
// Pick the scorer that fits your task.
// Exact match is too strict for most real output.
// ─────────────────────────────────────────────

export type ScorerFn = (actual: string, expected: string) => number;

// Map number words to digits so "Three" and "3" are treated as equal.
// Models answer the same question differently — this shouldn't count as wrong.
const NUMBER_WORDS: Record<string, string> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4",
  five: "5", six: "6", seven: "7", eight: "8", nine: "9",
  ten: "10", eleven: "11", twelve: "12",
};

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/g,
      (word) => NUMBER_WORDS[word]!);
}

// Pass only if output exactly equals expected
export function scoreExactMatch(actual: string, expected: string): number {
  return normalize(actual) === normalize(expected) ? 1 : 0;
}

// Pass if output contains expected anywhere — more forgiving
export function scoreContains(actual: string, expected: string): number {
  return normalize(actual).includes(normalize(expected)) ? 1 : 0;
}

// Partial credit: what fraction of keywords appear in the output?
export function scoreKeywords(actual: string, keywords: string[]): number {
  if (keywords.length === 0) return 0;
  const text = normalize(actual);
  const hits = keywords.filter((k) => text.includes(normalize(k))).length;
  return hits / keywords.length;
}
