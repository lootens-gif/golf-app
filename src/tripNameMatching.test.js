/**
 * tripNameMatching.test.js
 *
 * Regression test for StoppedCounting_Decisions_and_Rules.md open item #8:
 * "TripScreen Low Net leaderboard player matching. Matches by name,
 * case-insensitive. Could fail on real-world name variants."
 *
 * Confirmed by code trace: the original matching was raw
 * `a.toLowerCase() === b.toLowerCase()`, no whitespace normalization.
 *
 * Deliberately narrow scope: normalizeNameForMatching/namesMatch fix
 * trivial variance (case, leading/trailing/collapsed whitespace) only.
 * They do NOT attempt nickname equivalence ("Josh" vs "Fryback, Joshua")
 * — that's a genuine data mismatch, not a formatting bug, and guessing
 * wrong in a betting app (crediting the wrong person's scores) is worse
 * than a visible miss. TripScreen.jsx now surfaces unmatched names
 * instead of silently dropping their data — see unmatchedRoundPlayerNames.
 *
 * Run with: npm test -- --testPathPattern=tripNameMatching
 */

import { normalizeNameForMatching, namesMatch } from "./engine/scoringEngine";

describe("normalizeNameForMatching", () => {
  test("lowercases", () => {
    expect(normalizeNameForMatching("Josh")).toBe("josh");
  });

  test("trims leading and trailing whitespace", () => {
    expect(normalizeNameForMatching("  Josh  ")).toBe("josh");
  });

  test("collapses internal double spaces", () => {
    expect(normalizeNameForMatching("Josh  Fryback")).toBe("josh fryback");
  });

  test("handles null/undefined without throwing", () => {
    expect(normalizeNameForMatching(null)).toBe("");
    expect(normalizeNameForMatching(undefined)).toBe("");
  });
});

describe("namesMatch", () => {
  test("matches identical names", () => {
    expect(namesMatch("Josh Fryback", "Josh Fryback")).toBe(true);
  });

  test("matches case-insensitively", () => {
    expect(namesMatch("josh fryback", "JOSH FRYBACK")).toBe(true);
  });

  test("matches despite stray whitespace (the real-world entry-error case)", () => {
    expect(namesMatch(" Josh Fryback", "Josh  Fryback ")).toBe(true);
  });

  test("does not match genuinely different names", () => {
    expect(namesMatch("Josh Fryback", "Jon Biro")).toBe(false);
  });

  test("does not silently match a full name against a nickname (the confirmed open case)", () => {
    // This is the exact case flagged in the docs. It's a real mismatch,
    // not a bug — no auto-guess should be made here. The fix is that
    // TripScreen now surfaces this as a visible unmatched name instead
    // of silently dropping the round data, not that it "matches" anyway.
    expect(namesMatch("Fryback, Joshua", "Josh")).toBe(false);
  });

  test("does not match two empty/missing names against each other", () => {
    expect(namesMatch("", "")).toBe(false);
    expect(namesMatch(null, null)).toBe(false);
    expect(namesMatch(undefined, undefined)).toBe(false);
  });
});
