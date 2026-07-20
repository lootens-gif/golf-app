/**
 * AuditTrail.sectionPersistence.test.js
 *
 * Regression test for CRITICAL_GUARDS.md Guard #28 (AuditSection open/close
 * persistence).
 *
 * Guard: outer, top-level sections ("1v1 Matches", "Team Game", Wolf
 * overall, 9-Point, Total Scorecard) persist their open/closed state to
 * localStorage across remounts. Inner leaf rows — an individual 1v1 match,
 * a Wolf per-hole drill-in, a team-game matchup — must NOT persist. If they
 * do, every row a user has ever tapped open stays open forever (the
 * "everything auto-expands" bug), because leaf rows accumulate over a round
 * (up to 18 Wolf holes, N 1v1 matches, N team matchups) while the outer
 * containers do not.
 *
 * Found during a Guard #38 audit: this snapshot's `AuditSection` had no
 * `noStorage` mechanism at all (grep for "noStorage" in AuditTrail.jsx
 * returned zero hits) — every section, inner or outer, was persisting.
 * Fixed by restoring a `noStorage` prop on `AuditSection` and applying it
 * to the three leaf-level call sites: the 1v1 per-match section, the Wolf
 * per-hole (Level 1) section, and the team-game per-matchup section.
 *
 * This file only exercises the 1v1 case end-to-end (in keeping with the
 * "1v1 scorecard rendering" scope of this session) — the Wolf and team-game
 * call sites got the identical `noStorage` fix but aren't independently
 * regression-tested here.
 *
 * Run with: npm test -- --testPathPattern=sectionPersistence
 */

import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import AuditTrail from "./AuditTrail";

const PLAYERS = [
  { id: "A", name: "Alice", hcp: 0 },
  { id: "B", name: "Bob", hcp: 0 },
];
const COURSE = {
  pars: Array(18).fill(4),
  hcp: Array.from({ length: 18 }, (_, i) => i + 1),
};

function buildScores() {
  const scores = {};
  for (let h = 1; h <= 18; h++) scores[h] = { A: 4, B: 4 };
  return scores;
}

function buildMatch() {
  return { id: "m1", p1Id: "A", p2Id: "B", type: "standard", bet: 5, birdieEnabled: false };
}

function renderTrail(sessionKey) {
  const scores = buildScores();
  const match = buildMatch();
  const result = { type: "standard", holes: Array(18).fill(0), units: 0, total: 0, label: "AS", decidedOn: null };

  return render(
    <AuditTrail
      players={PLAYERS}
      matches={[match]}
      matchResults={[{ match, result }]}
      birdieResults={[]}
      scores={scores}
      course={COURSE}
      handicapMode="full"
      sessionKey={sessionKey}
    />
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

test("Guard #28: the outer \"1v1 Matches\" section stays open across a remount (persists, as intended)", () => {
  const sessionKey = "round-outer-persist";
  renderTrail(sessionKey);

  // Closed by default — the match title isn't visible yet.
  expect(screen.queryByText(/Alice vs Bob/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("1v1 Matches"));
  expect(screen.getByText(/Alice vs Bob/)).toBeInTheDocument();

  cleanup(); // simulate leaving the Results screen
  renderTrail(sessionKey); // and coming back — same sessionKey, fresh mount

  // Outer section remembered it was open: the match row title is visible
  // immediately, with no click required.
  expect(screen.getByText(/Alice vs Bob/)).toBeInTheDocument();
});

test("Guard #28: the inner per-match section does NOT stay open across a remount (leaf rows must reset)", () => {
  const sessionKey = "round-inner-no-persist";
  renderTrail(sessionKey);

  fireEvent.click(screen.getByText("1v1 Matches")); // open outer
  fireEvent.click(screen.getByText(/Alice vs Bob/)); // open inner match row
  // Inner content (the actual scorecard table) is now visible. "Result"
  // appears twice — once for the Front 9 table, once for Back 9.
  expect(screen.getAllByText("Result")).toHaveLength(2);

  cleanup();
  renderTrail(sessionKey);

  // Outer persisted, so the match title is visible again without a click...
  expect(screen.getByText(/Alice vs Bob/)).toBeInTheDocument();
  // ...but the inner scorecard body must NOT auto-expand. This is the exact
  // assertion that fails if `noStorage` is missing from the per-match
  // AuditSection — every match ever opened would stay open forever.
  expect(screen.queryAllByText("Result")).toHaveLength(0);
});
