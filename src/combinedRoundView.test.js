/**
 * combinedRoundView.test.js
 *
 * Regression test for mergeRoundsIntoCombinedView — the foundation of
 * Scorecard Game / Combined Round matches. Confirms the design decisions
 * made explicitly during scoping:
 *   - Player IDs are namespaced by round code (no name-matching — these
 *     are genuinely different people in different groups)
 *   - Course data (pars + handicap/stroke index) must match exactly or
 *     the combine is blocked with a clear error, never a silent guess
 *   - Works with 2+ round codes, not just exactly 2 (NCAA-style team
 *     formats may combine many round codes)
 *
 * Run with: npm test -- --testPathPattern=combinedRoundView
 */

import { mergeRoundsIntoCombinedView } from "./engine/scoringEngine";

const kemperCourse = {
  name: "Kemper Lakes",
  pars: [4,4,3,5,4,4,3,5,4, 4,4,3,5,4,4,3,5,4],
  hcp:  [7,3,15,1,11,5,17,9,13, 8,4,16,2,12,6,18,10,14],
};

const roundA = {
  code: "4471",
  data: {
    allPlayers: [
      { id: "p1", name: "Tim", hcp: 8 },
      { id: "p2", name: "Jon", hcp: 5 },
    ],
    course: kemperCourse,
    scores: {
      1: { p1: 4, p2: 5 },
      2: { p1: 5, p2: 4 },
    },
  },
};

const roundB = {
  code: "9028",
  data: {
    allPlayers: [
      { id: "p1", name: "Steve", hcp: 12 },
      { id: "p2", name: "Bishale", hcp: 9 },
    ],
    course: kemperCourse,
    scores: {
      1: { p1: 6, p2: 5 },
      2: { p1: 4, p2: 4 },
    },
  },
};

describe("mergeRoundsIntoCombinedView", () => {
  test("combines two rounds' players with round-code-namespaced ids", () => {
    const result = mergeRoundsIntoCombinedView([roundA, roundB]);
    expect(result.ok).toBe(true);
    const ids = result.players.map(p => p.id);
    expect(ids).toEqual(["4471:p1", "4471:p2", "9028:p1", "9028:p2"]);
  });

  test("does not collide two different people who both had local id p1", () => {
    const result = mergeRoundsIntoCombinedView([roundA, roundB]);
    const tim = result.players.find(p => p.id === "4471:p1");
    const steve = result.players.find(p => p.id === "9028:p1");
    expect(tim.name).toBe("Tim");
    expect(steve.name).toBe("Steve");
    expect(tim.id).not.toBe(steve.id);
  });

  test("merges scores under namespaced ids for every hole present", () => {
    const result = mergeRoundsIntoCombinedView([roundA, roundB]);
    expect(result.scores["1"]["4471:p1"]).toBe(4);
    expect(result.scores["1"]["9028:p1"]).toBe(6);
    expect(result.scores["2"]["4471:p2"]).toBe(4);
  });

  test("preserves each player's original hcp and tags their source round code", () => {
    const result = mergeRoundsIntoCombinedView([roundA, roundB]);
    const tim = result.players.find(p => p.id === "4471:p1");
    expect(tim.hcp).toBe(8);
    expect(tim.sourceRoundCode).toBe("4471");
    expect(tim.originalId).toBe("p1");
  });

  test("supports combining more than 2 round codes (NCAA-style team formats)", () => {
    const roundC = { code: "5501", data: { allPlayers: [{ id: "p1", name: "John", hcp: 10 }], course: kemperCourse, scores: { 1: { p1: 5 } } } };
    const result = mergeRoundsIntoCombinedView([roundA, roundB, roundC]);
    expect(result.ok).toBe(true);
    expect(result.players.length).toBe(5);
    expect(result.players.some(p => p.id === "5501:p1")).toBe(true);
  });

  test("blocks the combine when courses have genuinely different names", () => {
    const roundThunderhawk = { ...roundB, data: { ...roundB.data, course: { ...kemperCourse, name: "Thunderhawk" } } };
    const result = mergeRoundsIntoCombinedView([roundA, roundThunderhawk]);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Kemper Lakes/);
    expect(result.error).toMatch(/Thunderhawk/);
  });

  test("blocks the combine when course names match but pars/hcp data doesn't (data-entry drift)", () => {
    const driftedCourse = { ...kemperCourse, pars: [5, ...kemperCourse.pars.slice(1)] }; // hole 1 entered as a par 5 in this round
    const roundDrifted = { ...roundB, data: { ...roundB.data, course: driftedCourse } };
    const result = mergeRoundsIntoCombinedView([roundA, roundDrifted]);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/doesn't match exactly/);
  });

  test("allows combining when course data matches exactly, even with different round codes", () => {
    const result = mergeRoundsIntoCombinedView([roundA, roundB]);
    expect(result.ok).toBe(true);
    expect(result.course.name).toBe("Kemper Lakes");
  });

  test("rejects fewer than 2 valid rounds", () => {
    expect(mergeRoundsIntoCombinedView([roundA]).ok).toBe(false);
    expect(mergeRoundsIntoCombinedView([]).ok).toBe(false);
  });

  test("ignores entries with no data (e.g. a round code that doesn't exist yet)", () => {
    const result = mergeRoundsIntoCombinedView([roundA, roundB, { code: "0000", data: null }]);
    expect(result.ok).toBe(true);
    expect(result.players.length).toBe(4);
  });

  test("does not attempt any name-matching between combined players (unlike Trip)", () => {
    // Two different people could coincidentally share a first name across
    // groups — they must remain fully distinct, not merged, since combine
    // mode is identity-agnostic by design.
    const roundWithSameName = { code: "3310", data: { allPlayers: [{ id: "p1", name: "Tim", hcp: 20 }], course: kemperCourse, scores: { 1: { p1: 7 } } } };
    const result = mergeRoundsIntoCombinedView([roundA, roundWithSameName]);
    const tims = result.players.filter(p => p.name === "Tim");
    expect(tims.length).toBe(2);
    expect(tims[0].id).not.toBe(tims[1].id);
  });
});
