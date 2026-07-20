/**
 * AuditTrail.netHoles.test.js
 *
 * Regression test for CRITICAL_GUARDS.md Guard #38 (Net Holes).
 *
 * Net Holes (match.type === "standard") is a continuous 18-hole game — every
 * hole counts toward the final tally, there is no "clinched" state. A player
 * can be 5 up with 4 to play and lose all 4, finishing 1 up. The engine still
 * stamps `decidedOn` on the "standard" match result (the same field match
 * play formats use for "X&Y" clinch notation), but the renderer must ignore
 * it completely for Net Holes — both in the Result row and the Running row
 * of OneVOneScorecard.
 *
 * This has regressed 3 times, always after AuditTrail was rebuilt from a
 * snapshot. Nothing in scoringEngine.test.js / scoreRound.test.js catches it
 * because those files never render OneVOneScorecard — they only test the
 * engine's math in isolation. This file renders the real component tree
 * (AuditTrail -> OneVOneAudit -> OneVOneScorecard) the way the app actually
 * does, using the real engine's playIndividualMatch() to produce the result
 * object, so it exercises the exact same decidedOn value the live app would.
 *
 * Run with: npm test -- --testPathPattern=netHoles
 */

import { render, screen, fireEvent } from "@testing-library/react";
import AuditTrail from "./AuditTrail";
import { playIndividualMatch } from "../engine/scoringEngine";

const PLAYERS = [
  { id: "A", name: "Alice", hcp: 0 },
  { id: "B", name: "Bob", hcp: 0 },
];

// hcp=0 for both players means zero strokes on every hole regardless of
// course hcp ranking, so gross === net and hole winners are simple to reason
// about from the raw scores below.
const COURSE = {
  pars: Array(18).fill(4),
  hcp: Array.from({ length: 18 }, (_, i) => i + 1),
};

function buildScores() {
  const scores = {};
  // Holes 1-5: Alice wins every hole (4 vs 5) -> running +5 after hole 5.
  for (let h = 1; h <= 5; h++) scores[h] = { A: 4, B: 5 };
  // Holes 6-14: ties -> running stays +5. This is the "5 up with 4 to play"
  // setup — decideMatchPlaySegment clinches at hole 14 (remaining=4, 5>4).
  for (let h = 6; h <= 14; h++) scores[h] = { A: 4, B: 4 };
  // Holes 15-18: Bob wins every remaining hole (5 vs 4) -> running drops
  // from +5 down to +1. Alice finishes 1 up despite being "decided" 5&4.
  for (let h = 15; h <= 18; h++) scores[h] = { A: 5, B: 4 };
  return scores;
}

function buildMatch() {
  return { id: "m1", p1Id: "A", p2Id: "B", type: "standard", bet: 5, birdieEnabled: false };
}

function renderNetHolesScorecard() {
  const scores = buildScores();
  const match = buildMatch();
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
      sessionKey="test-net-holes"
    />
  );

  // Both the outer "1v1 Matches" section and the per-match section default
  // closed (AuditSection defaultOpen=false) — expand both to reach the table.
  fireEvent.click(screen.getByText("1v1 Matches"));
  fireEvent.click(screen.getByText(/Alice vs Bob/));

  return { scores, match, result };
}

beforeEach(() => {
  // AuditSection persists open/closed state to localStorage keyed by
  // sessionKey + storageId — clear it between tests so one test's click
  // doesn't leak into the next test's initial render state.
  window.localStorage.clear();
});

test("sanity check: this scenario really does clinch at hole 14 (5&4) per the engine, while the real 18-hole payout still lands on 1 up", () => {
  const { result } = renderNetHolesScorecard();
  expect(result.type).toBe("standard");
  expect(result.decidedOn).toBe(14);
  expect(result.label).toBe("5&4");
  // units/total come from summing the FULL 18 holes, not from the
  // clinch-point segment score — this is the real money outcome.
  expect(result.units).toBe(1);
  expect(result.total).toBe(5); // 1 unit * $5 bet
});

test("Guard #38: Result row keeps showing real hole winners after hole 14, never \"-\"", () => {
  renderNetHolesScorecard();

  // "Result" row appears once for Front 9, once for Back 9 — holes 10-18
  // (including the clinch hole 14 and everything after it) live in Back 9.
  const resultRows = screen.getAllByText("Result").map((el) => el.closest("tr"));
  const backResultRow = resultRows[1];
  const dataCells = Array.from(backResultRow.querySelectorAll("td")).slice(1, -1); // drop label + trailing border cell
  const cells = dataCells.map((td) => td.textContent);
  // cells: [h10, h11, h12, h13, h14, h15, h16, h17, h18]
  const [h10, h11, h12, h13, h14, h15, h16, h17, h18] = cells;

  expect([h10, h11, h12, h13, h14]).toEqual(["Push", "Push", "Push", "Push", "Push"]);
  // The bug this test guards against: holes after the engine's decidedOn
  // (14) rendering as "-" instead of the real result.
  expect(h15).toBe("B");
  expect(h16).toBe("B");
  expect(h17).toBe("B");
  expect(h18).toBe("B");
  expect([h15, h16, h17, h18]).not.toContain("-");

  // Text content alone doesn't fully prove the guard held: `afterDecided`
  // also mutes the Result row to grey (#bbb) without touching the letter.
  // Dropping `!isNetHoles` from the guard leaves the letters correct but
  // greys out holes 15-18 as if the match were over — still wrong for a
  // continuous game. Check color, not just content.
  const lostHoleColors = dataCells.slice(5, 9).map((td) => td.style.color); // holes 15-18
  lostHoleColors.forEach((color) => {
    expect(color).toBe("rgb(179, 38, 30)"); // #b3261e — real "Bob won" red, not muted #bbb
  });
});

test("Guard #38: Running row keeps accumulating after hole 14, ending at +1 (not frozen at +5, not \"-\")", () => {
  renderNetHolesScorecard();

  // The running row's label cell reads "Net Holes" for both Front 9 and
  // Back 9 sections (never "Front 9"/"Back 9") — that label IS the
  // isNetHoles branch firing; grabbing rows by it also proves the label
  // requirement from Guard #38 in the same assertion.
  const netHolesRows = screen.getAllByText("Net Holes").map((el) => el.closest("tr"));
  expect(netHolesRows).toHaveLength(2);

  const backRunningRow = netHolesRows[1];
  const cells = Array.from(backRunningRow.querySelectorAll("td")).map((td) => td.textContent);
  const [, r10, r11, r12, r13, r14, r15, r16, r17, r18] = cells;

  expect([r10, r11, r12, r13, r14]).toEqual(["+5", "+5", "+5", "+5", "+5"]);
  // This is the exact assertion that fails when `!isNetHoles &&` is dropped
  // from the afterDecided check: holes 15-18 would render "-" instead of
  // the continuing differential.
  expect(r15).toBe("+4");
  expect(r16).toBe("+3");
  expect(r17).toBe("+2");
  expect(r18).toBe("+1");
});

test("Guard #38: match summary reflects the real 18-hole outcome (Alice +1), not the frozen 5&4 clinch", () => {
  renderNetHolesScorecard();
  expect(screen.getByText(/Alice won \+1 holes \(net\)/)).toBeInTheDocument();
  // The stale clinch label should not appear anywhere as the final word on
  // the match — it's a valid intermediate label but must not be the summary.
  expect(screen.queryByText("5&4")).not.toBeInTheDocument();
});
