/**
 * roundCompletionDataIntegrity.test.js
 *
 * Regression test for a confirmed real incident: rounds 1902 and 8466 both
 * reached lastHoleSaved: 18 (round marked complete, completion email fired)
 * while holes 17-18 were entirely null in the actual scores data. The root
 * cause of that specific incident (Admin-join force-write) was found and
 * removed entirely — see App.jsx onJoinAsAdmin. This test covers the
 * separate, permanent safety net added at the completion trigger itself:
 * getMissingScoreHoles(), which App.jsx now checks before firing the
 * "completed" notification, regardless of how an incomplete-but-marked-
 * complete state might arise in the future.
 *
 * Run with: npm test -- --testPathPattern=roundCompletionDataIntegrity
 */

import { getMissingScoreHoles } from "./engine/scoringEngine";

const players = [
  { id: "p1", name: "Tim" },
  { id: "p2", name: "Biro" },
  { id: "p3", name: "Moose" },
];

function buildFullScores(totalHoles = 18) {
  const scores = {};
  for (let h = 1; h <= totalHoles; h++) {
    scores[h] = { p1: 4, p2: 5, p3: 4 };
  }
  return scores;
}

describe("getMissingScoreHoles", () => {
  test("returns empty array when every active player has a score on every hole", () => {
    const scores = buildFullScores();
    expect(getMissingScoreHoles(players, scores, 18)).toEqual([]);
  });

  test("reproduces the confirmed 1902/8466 signature: holes 17-18 entirely null", () => {
    const scores = buildFullScores();
    delete scores[17];
    delete scores[18];
    expect(getMissingScoreHoles(players, scores, 18)).toEqual([17, 18]);
  });

  test("flags a hole missing just one player's score, not only fully-empty holes", () => {
    const scores = buildFullScores();
    delete scores[9].p3; // Moose's hole 9 score never saved
    expect(getMissingScoreHoles(players, scores, 18)).toEqual([9]);
  });

  test("does not flag holes beyond totalHoles for a partial round", () => {
    const scores = buildFullScores(9); // 9-hole partial round, holes 10-18 legitimately don't exist
    expect(getMissingScoreHoles(players, scores, 9)).toEqual([]);
  });

  test("treats a score of 0 as present, not missing (only null/undefined count as missing)", () => {
    const scores = buildFullScores();
    scores[5].p2 = 0; // a legitimate (if unusual) recorded score of 0
    expect(getMissingScoreHoles(players, scores, 18)).toEqual([]);
  });

  test("handles a totally empty scores object without throwing", () => {
    expect(getMissingScoreHoles(players, {}, 18)).toEqual(
      Array.from({ length: 18 }, (_, i) => i + 1)
    );
  });

  test("handles an empty players list without throwing (nothing to be missing)", () => {
    expect(getMissingScoreHoles([], buildFullScores(), 18)).toEqual([]);
  });
});
