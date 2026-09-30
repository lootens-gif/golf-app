/**
 * birdieTieSharePoints.test.js
 *
 * Regression test for the confirmed design (Tim, Sep 2026): a real GROSS
 * birdie/eagle used to lose its 2x/3x multiplier entirely the moment
 * someone else's handicap strokes brought them to the same net score — a
 * tie erased the bonus completely. birdieTieSharePoints (off by default)
 * keeps the multiplier alive in that case, splitting the doubled/tripled
 * pool across everyone tied for the net lead, not just the birdie-maker.
 * The trigger stays a real GROSS birdie/eagle — never a "net birdie"
 * concept. Only one multiplier is ever used (the best one found).
 * Applies identically to 9, 12, and 20-point since they share one
 * implementation, distinguished only by player count.
 *
 * Run with: npm test -- --testPathPattern=birdieTieSharePoints
 */

import { scoreNinePointHole } from "./engine/scoringEngine";

const players3 = [
  { id: "p1", hcp: 0 }, { id: "p2", hcp: 0 }, { id: "p3", hcp: 0 },
];
const players4 = [
  { id: "p1", hcp: 0 }, { id: "p2", hcp: 0 }, { id: "p3", hcp: 0 }, { id: "p4", hcp: 0 },
];
const players5 = [
  { id: "p1", hcp: 0 }, { id: "p2", hcp: 0 }, { id: "p3", hcp: 0 }, { id: "p4", hcp: 0 }, { id: "p5", hcp: 0 },
];
const course = { pars: [4], hcp: [10] };

describe("birdieTieSharePoints — off by default (today's behavior unchanged)", () => {
  test("a gross birdie that gets net-tied loses the multiplier entirely when the toggle is off", () => {
    const scores = { 1: { p1: 3, p2: 3, p3: 5 } }; // p1 and p2 both net 3 (birdie), tied for lead
    const result = scoreNinePointHole(["p1","p2","p3"], 1, players3, course, scores, "full", false, false, true, false, false);
    expect(result.mode).toBe("standard");
    expect(result.birdieMode).toBe(null);
    // Plain tie-split, no doubling: scale [5,3,1] → top two average (5+3)/2=4 each
    expect(result.pointsByPlayerId.p1).toBe(4);
    expect(result.pointsByPlayerId.p2).toBe(4);
  });

  test("a unique-winner gross birdie is completely unaffected by the toggle's value", () => {
    const scores = { 1: { p1: 3, p2: 5, p3: 5 } };
    const withToggleOff = scoreNinePointHole(["p1","p2","p3"], 1, players3, course, scores, "full", false, false, true, false, false);
    const withToggleOn = scoreNinePointHole(["p1","p2","p3"], 1, players3, course, scores, "full", false, false, true, false, true);
    expect(withToggleOff.pointsByPlayerId).toEqual(withToggleOn.pointsByPlayerId);
    expect(withToggleOff.mode).toBe("birdie-double-birdie");
  });
});

describe("birdieTieSharePoints — on: the bonus survives a net tie, shared across the tied group", () => {
  test("a gross birdie that gets net-tied keeps the multiplier, split between both tied players", () => {
    const scores = { 1: { p1: 3, p2: 3, p3: 5 } }; // both make a real gross birdie, tied
    const result = scoreNinePointHole(["p1","p2","p3"], 1, players3, course, scores, "full", false, false, true, false, true);
    expect(result.birdieMode).toBe("birdie");
    // Scale [5,3,1]: tied top two average (5+3)/2=4, doubled=8 each.
    // p3 alone in 3rd gets 1, also doubled to 2 — the multiplier applies
    // uniformly to every position, same as the pre-existing unique-winner
    // case always has (confirmed unchanged behavior, not new here).
    expect(result.pointsByPlayerId.p1).toBe(8);
    expect(result.pointsByPlayerId.p2).toBe(8);
    expect(result.pointsByPlayerId.p3).toBe(2);
  });

  test("only ONE of the tied players needs to have made the gross birdie for the bonus to apply to the whole tied group", () => {
    // p1 makes a real gross birdie (3); p2 only gets to net 3 via a stroke
    // (gross 4, not a birdie) — still ties p1's net score.
    const scores = { 1: { p1: 3, p2: 4, p3: 6 } };
    const playersWithStroke = [
      { id: "p1", hcp: 0 }, { id: "p2", hcp: 18 }, { id: "p3", hcp: 0 },
    ];
    const result = scoreNinePointHole(["p1","p2","p3"], 1, playersWithStroke, course, scores, "full", false, false, true, false, true);
    expect(result.birdieMode).toBe("birdie");
    expect(result.pointsByPlayerId.p1).toBe(8);
    expect(result.pointsByPlayerId.p2).toBe(8); // shares the bonus despite not personally birdieing
  });

  test("eagle beats birdie when both are present in the tied group — only one multiplier, never stacked", () => {
    // p1 shoots a gross eagle (2), p2 shoots a gross birdie (3) but a
    // stroke brings p2's net down to tie p1's net at 2.
    const scores = { 1: { p1: 2, p2: 3, p3: 6 } };
    const playersWithStroke = [
      { id: "p1", hcp: 0 }, { id: "p2", hcp: 18 }, { id: "p3", hcp: 0 },
    ];
    const result = scoreNinePointHole(["p1","p2","p3"], 1, playersWithStroke, course, scores, "full", false, false, true, true, true);
    expect(result.birdieMode).toBe("eagle");
    // (5+3)/2=4 each, tripled (eagleTriplePoints on) = 12 each — not 8+ some birdie amount
    expect(result.pointsByPlayerId.p1).toBe(12);
    expect(result.pointsByPlayerId.p2).toBe(12);
  });

  test("a net tie with no gross birdie anywhere in the group still gets no bonus (no false positive)", () => {
    const scores = { 1: { p1: 4, p2: 4, p3: 6 } }; // both tie at par, no birdie
    const result = scoreNinePointHole(["p1","p2","p3"], 1, players3, course, scores, "full", false, false, true, false, true);
    expect(result.birdieMode).toBe(null);
    expect(result.mode).toBe("standard");
  });

  test("works identically for 12-point (4 players)", () => {
    const scores = { 1: { p1: 3, p2: 3, p3: 5, p4: 5 } };
    const result = scoreNinePointHole(["p1","p2","p3","p4"], 1, players4, course, scores, "full", false, false, true, false, true);
    expect(result.birdieMode).toBe("birdie");
    // Scale [6,4,2,0]: top two tied average (6+4)/2=5, doubled = 10 each
    expect(result.pointsByPlayerId.p1).toBe(10);
    expect(result.pointsByPlayerId.p2).toBe(10);
  });

  test("works identically for 20-point (5 players)", () => {
    const scores = { 1: { p1: 3, p2: 3, p3: 5, p4: 5, p5: 6 } };
    const result = scoreNinePointHole(["p1","p2","p3","p4","p5"], 1, players5, course, scores, "full", false, false, true, false, true);
    expect(result.birdieMode).toBe("birdie");
    expect(result.pointsByPlayerId.p1).toBe(result.pointsByPlayerId.p2);
    expect(result.pointsByPlayerId.p1).toBeGreaterThan(0);
  });

  test("a three-way tie for the net lead splits the bonus across all three, not just two", () => {
    const scores = { 1: { p1: 3, p2: 3, p3: 3, p4: 6 } };
    const result = scoreNinePointHole(["p1","p2","p3","p4"], 1, players4, course, scores, "full", false, false, true, false, true);
    expect(result.birdieMode).toBe("birdie");
    expect(result.pointsByPlayerId.p1).toBe(result.pointsByPlayerId.p2);
    expect(result.pointsByPlayerId.p2).toBe(result.pointsByPlayerId.p3);
    expect(result.pointsByPlayerId.p4).toBe(0);
  });
});
