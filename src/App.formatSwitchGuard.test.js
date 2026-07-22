/**
 * App.formatSwitchGuard.test.js
 *
 * Regression test for CRITICAL_GUARDS.md Guard #42 (stale round data
 * leaking across a format switch).
 *
 * Reported directly: a Team Game Press 6/6/6 round was played to full
 * completion. Setup was then reopened and Team Game Mode switched to
 * Wolf — nothing else changed. Hitting Start landed on Live with the
 * entire Wolf game looking pre-filled in (scores, and wolf-hole
 * selections from an earlier session), which is impossible to produce
 * honestly since Wolf requires an explicit per-hole selection on every
 * hole that was never made this session.
 *
 * Root cause: startRound()'s "round already complete, go back to Live"
 * shortcut fired purely on `lastHoleSaved >= 18` — local React state that
 * is NOT cleared by changing the format dropdown in Setup (confirmed:
 * SetupScreen's onChange just calls setTeamGameFormat directly, no side
 * effects). So finishing a Press round, reopening Setup, and switching to
 * Wolf without an explicit reset left `scores`/`wolfHoles`/`lastHoleSaved`
 * from the OLD round sitting in state, and the shortcut silently routed
 * straight to Live with all of it still there — now rendering under the
 * NEW format as if it had actually been played.
 *
 * Confirmed this is a real risk, not just a testing artifact: the normal
 * way a next round gets configured is by opening Setup and editing
 * straight from wherever the app last left off — there's no requirement
 * or reminder to hit an explicit "New Round"/Reset first, and the people
 * actually using this in the field won't reliably do that unprompted.
 *
 * The fix: `isSameRoundFormat()` compares the persisted AUTO_ROUND_KEY
 * snapshot's format against what's currently configured in Setup.
 * startRound() only takes the "already complete, view it" shortcut when
 * they match; otherwise it treats this as a genuinely new round and
 * clears the stale scores/wolfHoles/lastHoleSaved/roundCode first. This
 * file tests that pure comparison function directly — the same
 * lower-context approach used for Guard #41, since App.jsx still has no
 * real render-level test harness (App.test.js is a placeholder).
 *
 * Run with: npm test -- --testPathPattern=formatSwitchGuard
 */

import { isSameRoundFormat } from "./App";

describe("isSameRoundFormat", () => {
  test("the exact reported scenario: Press round completed, then Setup switched to Wolf — NOT the same format", () => {
    const savedSnapshot = { teamGameFormat: "press", enableTeamGame: true };
    expect(isSameRoundFormat(savedSnapshot, "wolf", true)).toBe(false);
  });

  test("returns true when format and enableTeamGame both still match — the legitimate 'still viewing my own finished round' case", () => {
    const savedSnapshot = { teamGameFormat: "wolf", enableTeamGame: true };
    expect(isSameRoundFormat(savedSnapshot, "wolf", true)).toBe(true);
  });

  test("returns false when enableTeamGame was toggled off, even if teamGameFormat string is unchanged", () => {
    const savedSnapshot = { teamGameFormat: "press", enableTeamGame: true };
    expect(isSameRoundFormat(savedSnapshot, "press", false)).toBe(false);
  });

  test("returns false when there's no saved snapshot at all (never guess — treat as a new round)", () => {
    expect(isSameRoundFormat(null, "wolf", true)).toBe(false);
    expect(isSameRoundFormat(undefined, "wolf", true)).toBe(false);
  });

  test("treats enableTeamGame truthiness loosely (undefined vs false) so legacy snapshots without the field don't false-positive as changed", () => {
    const savedSnapshot = { teamGameFormat: "press" }; // enableTeamGame never set
    expect(isSameRoundFormat(savedSnapshot, "press", false)).toBe(true);
    expect(isSameRoundFormat(savedSnapshot, "press", true)).toBe(false);
  });

  test("switching between two other formats (not just Press->Wolf) is caught the same way", () => {
    const savedSnapshot = { teamGameFormat: "bestball", enableTeamGame: true };
    expect(isSameRoundFormat(savedSnapshot, "scramble", true)).toBe(false);
  });
});
