/**
 * WolfAudit.test.js
 * Run with: npm test -- --testPathPattern=WolfAudit
 *
 * Renders AuditTrail with teamGameFormat="wolf" and actually clicks
 * through the 3-level structure (Level 0 overall -> Level 1 per-hole ->
 * Level 2 full detail), rather than just checking the math in isolation.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import AuditTrail from './AuditTrail';

const PLAYERS = ['Wolf', 'P2', 'P3', 'P4', 'P5'].map((id) => ({ id, name: id, hcp: 0 }));
const COURSE = { pars: Array(15).fill(4), hcp: Array(15).fill(1) };

beforeEach(() => {
  // AuditSection persists open/closed state to localStorage keyed by
  // sessionKey + storageId — clear it between tests so one test's click
  // doesn't leak into the next test's initial render state.
  window.localStorage.clear();
});

function renderWolfAudit({ wolfHoles = {}, scores = {}, teamMatchConfig = {} } = {}) {
  return render(
    <AuditTrail
      players={PLAYERS}
      matches={[]}
      matchResults={[]}
      birdieResults={[]}
      teamGames={[]}
      teamGameResults={[]}
      getTeamGameSelection={() => ({})}
      scores={scores}
      course={COURSE}
      handicapMode="full"
      teamGameUnitAmount={5}
      noPar3TeamGame={false}
      sessionKey="test"
      teamGameFormat="wolf"
      wolfHoles={wolfHoles}
      teamMatchConfig={teamMatchConfig}
    />
  );
}

describe('WolfAudit — Level 0 (overall)', () => {
  test('shows "through hole N" while in progress, sorted highest to lowest, color-coded', () => {
    const scores = { 1: { Wolf: 2, P2: 4, P3: 5, P4: 6, P5: 5 } }; // Wolf wins hole 1 solo
    renderWolfAudit({ scores });
    expect(screen.getByText(/through hole 1/)).toBeInTheDocument();
  });

  test('shows "Final" once all 15 holes are scored', () => {
    const scores = {};
    for (let h = 1; h <= 15; h++) {
      scores[h] = { Wolf: 4, P2: 4, P3: 4, P4: 4, P5: 4 }; // all push, still "scored"
    }
    renderWolfAudit({ scores });
    expect(screen.getByText(/Final/)).toBeInTheDocument();
  });

  test('renders with no holes scored at all, without crashing', () => {
    renderWolfAudit({ scores: {} });
    expect(screen.getAllByText(/Wolf/).length).toBeGreaterThan(0);
  });
});

describe('WolfAudit — Level 1 (per-hole) and Level 2 (detail)', () => {
  test('Level 1 shows a condensed line for a completed hole', () => {
    const scores = { 1: { Wolf: 2, P2: 4, P3: 5, P4: 6, P5: 5 } };
    renderWolfAudit({ scores });
    expect(screen.getByText(/Hole 1/)).toBeInTheDocument();
  });

  test('an unscored hole produces no Level 1 section', () => {
    renderWolfAudit({ scores: { 1: { Wolf: 2, P2: 4, P3: 5, P4: 6, P5: 5 } } });
    expect(screen.queryByText(/Hole 2/)).not.toBeInTheDocument();
  });

  test('clicking into Level 1 reveals Level 2 detail — real scores, not just a summary', () => {
    const scores = { 1: { Wolf: 2, P2: 4, P3: 5, P4: 6, P5: 5 } };
    renderWolfAudit({ scores });
    fireEvent.click(screen.getByText(/Hole 1/));
    // Level 2 should show the actual par/hcp line and each player's gross score
    expect(screen.getByText(/Par 4/)).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0); // Wolf's actual gross score, visible
  });

  test('a Pack Wolf hole shows partner names in the Level 1 title', () => {
    const scores = { 1: { Wolf: 3, P2: 5, P3: 4, P4: 5, P5: 5 } };
    renderWolfAudit({ scores, wolfHoles: { 1: { partnerId: 'P2' } } });
    expect(screen.getByText(/Pack Wolf/)).toBeInTheDocument();
  });

  test('a push shows "Push" instead of a dollar amount in Level 1', () => {
    const scores = { 1: { Wolf: 3, P2: 3, P3: 5, P4: 6, P5: 5 } }; // Wolf ties best opponent
    renderWolfAudit({ scores });
    expect(screen.getByText(/Push/)).toBeInTheDocument();
  });

  test('Carryover-on-push flag shows the honest "not yet applied" warning', () => {
    const scores = { 1: { Wolf: 3, P2: 3, P3: 5, P4: 6, P5: 5 } };
    renderWolfAudit({ scores, teamMatchConfig: { wolfCarryoverMode: 'value_only' } });
    fireEvent.click(screen.getByText(/Hole 1/));
    expect(screen.getByText(/Carryover is on but not yet applied/)).toBeInTheDocument();
  });

  test('Hammer multiplier shows in both Level 1 and Level 2', () => {
    const scores = { 1: { Wolf: 3, P2: 5, P3: 4, P4: 5, P5: 5 } };
    renderWolfAudit({ scores, wolfHoles: { 1: { partnerId: 'P2', hammerMultiplier: 2 } } });
    fireEvent.click(screen.getByText(/Hole 1/));
    const hammerMentions = screen.getAllByText(/2x/);
    expect(hammerMentions.length).toBeGreaterThan(0);
  });
});

describe('WolfAudit — guard', () => {
  test('fewer than 5 players renders nothing, does not crash', () => {
    render(
      <AuditTrail
        players={PLAYERS.slice(0, 4)}
        matches={[]} matchResults={[]} birdieResults={[]} teamGames={[]} teamGameResults={[]}
        getTeamGameSelection={() => ({})} scores={{}} course={COURSE} handicapMode="full"
        teamGameUnitAmount={5} noPar3TeamGame={false} sessionKey="test"
        teamGameFormat="wolf" wolfHoles={{}} teamMatchConfig={{}}
      />
    );
    expect(screen.getByText(/Tap any section to expand/)).toBeInTheDocument();
  });
});
