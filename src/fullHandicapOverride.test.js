/**
 * fullHandicapOverride.test.js
 *
 * Regression test for the confirmed gap (Tim, Sep 2026): 1v1 matches had
 * no way to force Full Handicap while the global Team-game handicapMode
 * stayed Net/relative. buildMatchHandicapOverrideFn already had Play Even
 * and Custom Strokes as per-match overrides — this adds Full Handicap as
 * the third, and confirms the three are mutually exclusive at the
 * resolver level (whichever is set wins; only one should ever be set at
 * once per the new UI, but the resolver stays defensive regardless).
 *
 * Run with: npm test -- --testPathPattern=fullHandicapOverride
 */

import { playIndividualMatch } from "./engine/scoringEngine";

const players = [
  { id: "p1", name: "Tim", hcp: 0 },
  { id: "p2", name: "Jon", hcp: 12 },
];

const course = {
  name: "Test Course",
  pars: [4,4,3,5,4,4,3,5,4, 4,4,3,5,4,4,3,5,4],
  hcp:  [7,3,15,1,11,5,17,9,13, 8,4,16,2,12,6,18,10,14],
};

// Jon (12 hcp) beats Tim (0 hcp) by 1 gross stroke on every hole — a
// scenario where relative/Net strokes and Full strokes clearly diverge,
// since Jon's actual stroke count under Full (12, matching his full
// index) differs from under Net/relative (12 - 0 = 12, same here since
// Tim is scratch — so use a non-zero low handicap instead to force a
// real difference between relative and full).
const scores = {};
for (let h = 1; h <= 18; h++) {
  scores[h] = { p1: 4, p2: 5 };
}

const matchBase = {
  id: "m1", p1Id: "p1", p2Id: "p2", type: "standard", bet: 5,
  toyRule: false, birdieEnabled: false, noPar3Strokes: false,
  matchPlayFront: false, matchPlayBack: false, matchPlayTotal: false,
};

// Tim(3) vs Jon(12): relative gives Jon 9 strokes (12-3); full gives Jon
// his full 12 — genuinely different stroke counts, so results must differ.
const divergentPlayers = [
  { id: "p1", name: "Tim", hcp: 3 },
  { id: "p2", name: "Jon", hcp: 12 },
];

describe("Full Handicap per-match override", () => {
  test("fullHandicap changes stroke allocation even when global handicapMode is relative", () => {
    // Note: the resulting dollar total can coincidentally tie between
    // relative and full for some fixtures (verified: in Full mode every
    // player gets their OWN raw handicap's strokes, not just the
    // differential — so the low-handicap player can pick up strokes on
    // holes that happen to also be one of the high-handicap player's
    // stroke holes, cancelling back to the original gross-score gap on
    // that specific hole). The allocation itself — which holes actually
    // carry a stroke — is the real, reliable signal that the override
    // took effect, so that's what this test checks.
    const relativeResult = playIndividualMatch(
      { ...matchBase, fullHandicap: false },
      { players: divergentPlayers, course, scores, handicapMode: "relative" }
    );
    const fullOverrideResult = playIndividualMatch(
      { ...matchBase, fullHandicap: true },
      { players: divergentPlayers, course, scores, handicapMode: "relative" }
    );
    expect(relativeResult.holes).not.toEqual(fullOverrideResult.holes);
  });

  test("fullHandicap override matches calling with handicapMode: full directly", () => {
    const directFull = playIndividualMatch(
      { ...matchBase, fullHandicap: false },
      { players: divergentPlayers, course, scores, handicapMode: "full" }
    );
    const overrideFull = playIndividualMatch(
      { ...matchBase, fullHandicap: true },
      { players: divergentPlayers, course, scores, handicapMode: "relative" }
    );
    expect(directFull.total).toBe(overrideFull.total);
    expect(directFull.holes).toEqual(overrideFull.holes);
  });

  test("fullHandicap has no effect when global handicapMode is already full", () => {
    const plainFull = playIndividualMatch(
      { ...matchBase, fullHandicap: false },
      { players: divergentPlayers, course, scores, handicapMode: "full" }
    );
    const overrideOnFull = playIndividualMatch(
      { ...matchBase, fullHandicap: true },
      { players: divergentPlayers, course, scores, handicapMode: "full" }
    );
    expect(plainFull.total).toBe(overrideOnFull.total);
  });

  test("playEven still wins over fullHandicap if both are ever set (defensive resolver order)", () => {
    const bothSet = playIndividualMatch(
      { ...matchBase, playEven: true, fullHandicap: true },
      { players: divergentPlayers, course, scores, handicapMode: "relative" }
    );
    const evenOnly = playIndividualMatch(
      { ...matchBase, playEven: true, fullHandicap: false },
      { players: divergentPlayers, course, scores, handicapMode: "relative" }
    );
    expect(bothSet.total).toBe(evenOnly.total);
  });

  test("customStrokes still wins over fullHandicap if both are ever set (defensive resolver order)", () => {
    const bothSet = playIndividualMatch(
      { ...matchBase, customStrokes: 3, fullHandicap: true },
      { players: divergentPlayers, course, scores, handicapMode: "relative" }
    );
    const customOnly = playIndividualMatch(
      { ...matchBase, customStrokes: 3, fullHandicap: false },
      { players: divergentPlayers, course, scores, handicapMode: "relative" }
    );
    expect(bothSet.total).toBe(customOnly.total);
  });

  test("fullHandicap still respects the separate noPar3Strokes toggle", () => {
    // Deliberately constructed so hole 3 (a par 3) sits at stroke index 8
    // — within Jon's 12-stroke full-handicap range, but above Tim's
    // 3-stroke range, so only Jon receives a stroke there. This avoids
    // the cancellation effect discovered above: if both players get a
    // stroke on the same hole, they offset each other and the win/loss
    // outcome doesn't change even though the toggle correctly suppressed
    // both strokes (confirmed directly via getHandicapStrokes). With
    // only one player affected, suppressing the stroke must flip that
    // hole's outcome.
    const par3StrokeCourse = {
      ...course,
      hcp: [7,3,8,1,11,5,17,9,13, 8,4,16,2,12,6,18,10,14],
    };
    const withPar3Strokes = playIndividualMatch(
      { ...matchBase, fullHandicap: true, noPar3Strokes: false },
      { players: divergentPlayers, course: par3StrokeCourse, scores, handicapMode: "relative" }
    );
    const withoutPar3Strokes = playIndividualMatch(
      { ...matchBase, fullHandicap: true, noPar3Strokes: true },
      { players: divergentPlayers, course: par3StrokeCourse, scores, handicapMode: "relative" }
    );
    expect(withPar3Strokes.holes).not.toEqual(withoutPar3Strokes.holes);
    expect(withPar3Strokes.holes[2]).toBe(0);  // hole 3 (index 2): Jon's stroke ties the hole
    expect(withoutPar3Strokes.holes[2]).toBe(1); // suppressed: Tim's gross-score edge wins outright
  });
});
