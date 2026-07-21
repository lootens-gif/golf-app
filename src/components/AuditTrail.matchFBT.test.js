/**
 * AuditTrail.matchFBT.test.js
 *
 * Regression test for a Match Play F/B/T bug reported directly from a real
 * on-course test: a "T only" match (Front and Back segments both disabled
 * in Setup, only Total 18 tracked) decided 6&5 at hole 13, but the Back 9
 * table's running row kept rendering results for holes 14-18 as if the
 * match were still live.
 *
 * Root cause: `isFBT` in OneVOneScorecard required BOTH a `front` AND a
 * `back` segment to exist in `result.segments` before it would even look
 * at a decided-hole cutoff. Front/Back/Total are three independently
 * toggleable segments — "T only", "F only", "B only", "F+T", "B+T" are all
 * legal Setup configurations, not just "all three" or "F+B". Any config
 * that wasn't literally "front and back both present" fell through to the
 * Net-Holes-style continuous fallback with no cutoff logic whatsoever,
 * regardless of match.type actually being "match_fbt".
 *
 * The fix makes each half (Front 9 / Back 9) fall back to the Total
 * segment's own decidedOn when that half has no dedicated Front/Back
 * segment of its own — a "T only" or "F+T" config still has exactly one
 * real bet covering that half, it's just carried by Total.
 *
 * Per explicit instruction: the Result row's letter/content is unchanged
 * by this fix (still shows the real per-hole winner after the decided
 * hole) — only its color mutes to grey, which it already did via the same
 * `afterDecided` flag once that flag is computed correctly. The Running
 * row is the one that must stop (render "-") after the decided hole.
 *
 * Run with: npm test -- --testPathPattern=matchFBT
 */

import { render, screen, fireEvent } from "@testing-library/react";
import AuditTrail from "./AuditTrail";
import { playIndividualMatch } from "../engine/scoringEngine";

const PLAYERS = [
  { id: "A", name: "Alice", hcp: 0 },
  { id: "B", name: "Bob", hcp: 0 },
];
const COURSE = {
  pars: Array(18).fill(4),
  hcp: Array.from({ length: 18 }, (_, i) => i + 1),
};

// Alice wins holes 1-6 (running +6), ties 7-13 (running holds at +6 — this
// is what clinches at hole 13: remaining=18-13=5, 6>5), then Bob wins every
// remaining hole 14-18. Same "decided early, more holes get played anyway"
// shape as the real round this was reported from (6&5 at hole 13).
function buildScores() {
  const scores = {};
  for (let h = 1; h <= 6; h++) scores[h] = { A: 4, B: 5 };
  for (let h = 7; h <= 13; h++) scores[h] = { A: 4, B: 4 };
  for (let h = 14; h <= 18; h++) scores[h] = { A: 5, B: 4 };
  return scores;
}

function renderMatch(matchOverrides) {
  const scores = buildScores();
  const match = { id: "m1", p1Id: "A", p2Id: "B", type: "match_fbt", bet: 5, birdieEnabled: false, ...matchOverrides };
  const result = playIndividualMatch(match, {
    players: PLAYERS,
    course: COURSE,
    scores,
    handicapMode: "full",
  });

  render(
    <AuditTrail
      players={PLAYERS}
      matches={[match]}
      matchResults={[{ match, result }]}
      birdieResults={[]}
      scores={scores}
      course={COURSE}
      handicapMode="full"
      sessionKey={`test-${match.id}-${JSON.stringify(matchOverrides)}`}
    />
  );

  fireEvent.click(screen.getByText("1v1 Matches"));
  fireEvent.click(screen.getByText(/Alice vs Bob/));

  return { scores, match, result };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("T only (Front and Back both disabled — the exact reported config)", () => {
  const tOnly = { matchPlayFront: false, matchPlayBack: false, matchPlayTotal: true };

  test("sanity check: engine clinches at hole 13 (6&5) on the Total segment, the only segment that exists", () => {
    const { result } = renderMatch(tOnly);
    expect(result.type).toBe("match_fbt");
    expect(result.segments.map((s) => s.key)).toEqual(["total"]);
    expect(result.segments[0].decidedOn).toBe(13);
    expect(result.segments[0].resultLabel).toBe("6&5");
  });

  test("Back 9 running row stops at the deciding hole instead of continuing through 14-18", () => {
    renderMatch(tOnly);
    const backRunningRow = screen.getAllByText("Back 9").map((el) => el.closest("tr"))[1]; // [0]=label row wrapper isn't a row; getAllByText("Back 9") hits the section header div too
    // The section header div also contains the text "Back 9" — find the
    // actual table row whose first cell is the row label "Back 9".
    const runningRow = Array.from(document.querySelectorAll("tr")).find(
      (tr) => tr.querySelector("td")?.textContent === "Back 9"
    );
    const cells = Array.from(runningRow.querySelectorAll("td")).slice(1, -1).map((td) => td.textContent);
    const [h10, h11, h12, h13, h14, h15, h16, h17, h18] = cells;

    // Match play notation ("N up"/"N dn"), not Net Holes' "+N" — this row
    // is a match_fbt result, isNetHoles is false here.
    expect([h10, h11, h12]).toEqual(["6 up", "6 up", "6 up"]);
    // Deciding hole shows the real conclusion label from the engine, not a
    // running number.
    expect(h13).toBe("6&5");
    // This is the exact bug: holes after the clinch kept showing running
    // numbers (or worse, nothing at all) instead of stopping.
    expect([h14, h15, h16, h17, h18]).toEqual(["-", "-", "-", "-", "-"]);
  });

  test("Result row keeps the real per-hole winner after hole 13 but mutes the color (per explicit instruction: leave content alone, mute color)", () => {
    renderMatch(tOnly);
    const resultRow = Array.from(document.querySelectorAll("tr")).filter(
      (tr) => tr.querySelector("td")?.textContent === "Result"
    )[1]; // Back 9's Result row
    const dataCells = Array.from(resultRow.querySelectorAll("td")).slice(1, -1);
    const texts = dataCells.map((td) => td.textContent);
    const colors = dataCells.map((td) => td.style.color);
    // holes 10-18 order; 14-18 (indices 4-8) are the post-decision holes
    expect(texts.slice(4)).toEqual(["B", "B", "B", "B", "B"]);
    colors.slice(4).forEach((c) => expect(c).toBe("rgb(187, 187, 187)")); // #bbb muted, not the real win color
  });

  test("Front 9 is unaffected — the match didn't decide until hole 13, which is outside Front 9's range", () => {
    renderMatch(tOnly);
    const frontRunningRow = Array.from(document.querySelectorAll("tr")).find(
      (tr) => tr.querySelector("td")?.textContent === "Front 9"
    );
    const cells = Array.from(frontRunningRow.querySelectorAll("td")).slice(1, -1).map((td) => td.textContent);
    expect(cells).toEqual(["1 up", "2 up", "3 up", "4 up", "5 up", "6 up", "6 up", "6 up", "6 up"]);
    expect(cells).not.toContain("-");
  });
});

describe("Front + Total enabled, Back disabled (a mixed combo — Front owns its segment, Back falls back to Total)", () => {
  const frontPlusTotal = { matchPlayFront: true, matchPlayBack: false, matchPlayTotal: true };

  // Front's OWN segment only looks at holes 1-9, so it clinches earlier
  // than Total does (which looks at all 18): remaining = 9 - hole, and
  // running hits 5 at hole 5 with only 4 holes left in the front-9 window
  // (5 > 4) — one hole before Total's own clinch point of 13 wins vs 5
  // remaining out of 18.
  test("sanity check: Front clinches on its own segment at hole 5 (5&4); Total clinches at hole 13 (6&5)", () => {
    const { result } = renderMatch(frontPlusTotal);
    expect(result.segments.map((s) => s.key).sort()).toEqual(["front", "total"]);
    const front = result.segments.find((s) => s.key === "front");
    const total = result.segments.find((s) => s.key === "total");
    expect(front.decidedOn).toBe(5);
    expect(front.resultLabel).toBe("5&4");
    expect(total.decidedOn).toBe(13);
    expect(total.resultLabel).toBe("6&5");
  });

  test("Front 9 running row stops at its own deciding hole (5), using its own segment — not Total's", () => {
    renderMatch(frontPlusTotal);
    const frontRunningRow = Array.from(document.querySelectorAll("tr")).find(
      (tr) => tr.querySelector("td")?.textContent === "Front 9"
    );
    const cells = Array.from(frontRunningRow.querySelectorAll("td")).slice(1, -1).map((td) => td.textContent);
    const [h1, h2, h3, h4, h5, h6, h7, h8, h9] = cells;
    expect([h1, h2, h3, h4]).toEqual(["1 up", "2 up", "3 up", "4 up"]);
    expect(h5).toBe("5&4");
    expect([h6, h7, h8, h9]).toEqual(["-", "-", "-", "-"]);
  });

  test("Back 9 running row has no dedicated segment, so it falls back to Total's decidedOn (hole 13)", () => {
    renderMatch(frontPlusTotal);
    const backRunningRow = Array.from(document.querySelectorAll("tr")).find(
      (tr) => tr.querySelector("td")?.textContent === "Back 9"
    );
    const cells = Array.from(backRunningRow.querySelectorAll("td")).slice(1, -1).map((td) => td.textContent);
    const [h10, h11, h12, h13, h14, h15, h16, h17, h18] = cells;
    expect([h10, h11, h12]).toEqual(["6 up", "6 up", "6 up"]);
    expect(h13).toBe("6&5");
    expect([h14, h15, h16, h17, h18]).toEqual(["-", "-", "-", "-", "-"]);
  });
});
