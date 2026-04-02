// ─────────────────────────────────────────────
// PART 1: The dataset
//
// A fixed set of test cases.
// Each one has an input we send to the model
// and an expected output we judge it against.
//
// These cases are designed to trigger common
// hallucinations — the "obvious" answer is often
// wrong, which exposes weaker models quickly.
// ─────────────────────────────────────────────

export type TestCase = {
  id: string;
  input: string;
  expected: string;      // the correct answer
  trap?: string;         // the wrong answer most models give
  tags?: string[];
};

export const dataset: TestCase[] = [
  {
    id: "geo-australia-capital",
    input: "What is the capital of Australia?",
    expected: "Canberra",
    trap: "Sydney",       // most models confidently say Sydney
    tags: ["geography"],
  },
  {
    id: "geo-brazil-capital",
    input: "What is the capital of Brazil?",
    expected: "Brasília",
    trap: "Rio de Janeiro", // or São Paulo
    tags: ["geography"],
  },
  {
    id: "geo-most-lakes",
    input: "Which country has the most natural lakes in the world?",
    expected: "Canada",
    trap: "Russia",       // or USA — both common wrong answers
    tags: ["geography"],
  },
  {
    id: "bio-octopus-hearts",
    input: "How many hearts does an octopus have?",
    expected: "3",
    trap: "1",            // models assume one heart like most animals
    tags: ["biology"],
  },
  {
    id: "bio-spider-legs",
    input: "How many legs does a spider have?",
    expected: "8",
    trap: "6",            // models sometimes confuse spiders with insects
    tags: ["biology"],
  },
  {
    id: "astro-mars-moons",
    input: "How many moons does Mars have?",
    expected: "2",
    trap: "1",            // or 0 — models often guess wrong
    tags: ["astronomy"],
  },
  {
    id: "geo-populous-2024",
    input: "What is the most populous country in the world as of 2024?",
    expected: "India",
    trap: "China",        // India surpassed China in 2023 — tests recency
    tags: ["geography", "recency"],
  },
  {
    id: "sci-salt-boiling",
    input: "Does adding salt to water raise or lower its boiling point?",
    expected: "raise",
    trap: "lower",        // counterintuitive — boiling point elevation
    tags: ["science"],
  },
];
