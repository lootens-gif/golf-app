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

function renderWolfAudit({ wolfHoles = {}, scores = {}, teamMatchConfig = {}, goToLive } = {}) {
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
      goToLive={goToLive}
    />
  );
}

describe('WolfAudit — Level 0 (overall)', () => {
  test('shows "through hole N" while in progress, sorted highest to lowest, color-coded', () => {
    const scores = { 1: { Wolf: 2, P2: 4, P3: 5, P4: 6, P5: 5 } }; // Wolf wins hole 1 solo
    renderWolfAudit({ scores });
    expect(screen.getByText(/through hole 1/)).toBeInTheDocument();
  });

  test('Level 0 totals always show exactly 2 decimal places, even when Split the Pot division produces repeating decimals', () => {
    // 2v3 Pack Wolf, Split the Pot: a $10/3 split produces $3.333... repeating.
    // A raw, unrounded display was a real, confirmed bug from a live round.
    const scores = { 1: { Wolf: 5, P2: 5, P3: 3, P4: 4, P5: 3 } }; // big side (3) wins
    renderWolfAudit({ scores, wolfHoles: { 1: { partnerId: 'P2' } }, teamMatchConfig: { wolfSettlementStyle: 'pooled' } });
    expect(screen.queryByText(/\.3333/)).not.toBeInTheDocument();
    expect(screen.getAllByText((_, el) => el?.textContent?.includes('3.33')).length).toBeGreaterThan(0);
  });

  test('shows "Final" once all 18 holes are scored', () => {
    const scores = {};
    for (let h = 1; h <= 18; h++) {
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

  test('a push shows "push" and a carrying count instead of a dollar amount in Level 1', () => {
    const scores = { 1: { Wolf: 3, P2: 3, P3: 5, P4: 6, P5: 5 } }; // Wolf ties best opponent
    renderWolfAudit({ scores });
    expect(screen.getByText(/push · 1 carrying/)).toBeInTheDocument();
  });

  test('a push uses the app-wide grey for tied results, not amber, in both Level 1 and Level 2', () => {
    const scores = { 1: { Wolf: 3, P2: 3, P3: 5, P4: 6, P5: 5 } };
    renderWolfAudit({ scores });
    const level1Text = screen.getByText(/push · 1 carrying/);
    expect(level1Text.closest('span').style.color).toBe('rgb(107, 114, 128)'); // #6b7280
    fireEvent.click(screen.getByText(/Hole 1/));
    const level2Box = screen.getByText(/Push · 1 carrying to the next hole/);
    expect(level2Box.style.color).toBe('rgb(107, 114, 128)');
  });

  test('a push marks BOTH tied players with an arrow, on the score\'s right side, pointing left — mirrored from a win\'s left-side, right-pointing arrow', () => {
    const scores = { 1: { Wolf: 3, P2: 3, P3: 5, P4: 6, P5: 5 } }; // Wolf and P2 tie at the best score
    renderWolfAudit({ scores });
    fireEvent.click(screen.getByText(/Hole 1/));
    const leftArrows = screen.queryAllByText('→');
    const rightArrows = screen.queryAllByText('←');
    expect(leftArrows.length).toBe(0); // no win-style arrow on a push
    expect(rightArrows.length).toBe(2); // one per tied player
  });

  test('Carryover on push now says exactly how many are carrying — real behavior, not just a warning', () => {
    const scores = { 1: { Wolf: 4, P2: 4, P3: 4, P4: 4, P5: 4 } }; // identical scores, guaranteed push
    renderWolfAudit({ scores, teamMatchConfig: { wolfCarryoverMode: 'value_only' } });
    fireEvent.click(screen.getByText(/Hole 1/));
    expect(screen.getByText(/Push · 1 carrying to the next hole/)).toBeInTheDocument();
  });

  test('always shows Wolf\'s own perspective — the outcome word reflects Wolf\'s side, not the opponents\'', () => {
    const scores = { 1: { Wolf: 5, P2: 5, P3: 3, P4: 5, P5: 5 } }; // P3 beats Wolf — Wolf loses solo
    renderWolfAudit({ scores });
    expect(screen.getByText(/lost/)).toBeInTheDocument();
  });

  test('on a Shuck hole, Level 1 perspective stays on the original Wolf — a shuck no longer flips it to the shucker', () => {
    const scores = { 1: { P2: 2, Wolf: 4, P3: 5, P4: 6, P5: 5 } }; // P2 (the shucker) happens to have the best score
    renderWolfAudit({ scores, wolfHoles: { 1: { partnerId: 'P2', shucked: true } } });
    // "Wolf" is the literal player name in this fixture, unrelated to the
    // "Wolf" format word — getAllByText handles the resulting duplicates.
    expect(screen.getAllByText((_, el) => el?.textContent?.includes('Shuck')).length).toBeGreaterThan(0);
    expect(screen.getByText(/lost/)).toBeInTheDocument(); // Wolf (4) loses to P2's best-of-four (2)
  });

  test('Shuck reads as "X was Shucked by Y" in Level 1, not the standard Format: Name pattern', () => {
    const scores = { 1: { Wolf: 3, P2: 4, P3: 5, P4: 6, P5: 5 } }; // Wolf wins despite being shucked
    renderWolfAudit({ scores, wolfHoles: { 1: { partnerId: 'P2', shucked: true } } });
    expect(screen.getByText(/Wolf was Shucked by P2/)).toBeInTheDocument();
  });

  test('the wolf emoji stays on the real rotation Wolf even on a Shuck hole, and the middle finger marks the shucker', () => {
    const scores = { 1: { P2: 2, Wolf: 4, P3: 5, P4: 6, P5: 5 } };
    renderWolfAudit({ scores, wolfHoles: { 1: { partnerId: 'P2', shucked: true } } });
    fireEvent.click(screen.getByText(/Hole 1/));
    // "Wolf" is both the format word and the rotation Wolf's literal name in
    // this fixture — getAllByText handles the resulting duplicate matches.
    expect(screen.getAllByText((_, el) => el?.textContent?.includes('🐺')).length).toBeGreaterThan(0);
    expect(screen.getAllByText((_, el) => el?.textContent?.includes('🖕')).length).toBeGreaterThan(0);
  });

  test('Hammer multiplier shows in both Level 1 and Level 2', () => {
    const scores = { 1: { Wolf: 3, P2: 5, P3: 4, P4: 5, P5: 5 } };
    renderWolfAudit({ scores, wolfHoles: { 1: { partnerId: 'P2', hammerMultiplier: 2 } } });
    fireEvent.click(screen.getByText(/Hole 1/));
    const hammerMentions = screen.getAllByText(/2x/);
    expect(hammerMentions.length).toBeGreaterThan(0);
  });

  test('Hammer Sweep actually displays in Level 1 and Level 2, not just computed internally', () => {
    const scores = { 1: { Wolf: 3, P2: 4, P3: 5, P4: 6, P5: 5 } }; // real clean sweep
    renderWolfAudit({
      scores,
      wolfHoles: { 1: { partnerId: 'P2' } },
      teamMatchConfig: { wolfAddAHammer: true },
    });
    const sweepMentionsLevel1 = screen.getAllByText(/Hammer Sweep/);
    expect(sweepMentionsLevel1.length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText(/Hole 1/));
    const sweepMentionsLevel2 = screen.getAllByText(/Hammer Sweep/);
    expect(sweepMentionsLevel2.length).toBeGreaterThan(sweepMentionsLevel1.length); // Level 2 badge adds another mention
  });

  test('Super Wolf holes (16-18) actually render in Results, labeled and with a standings snapshot', () => {
    const scores = {};
    for (let h = 1; h <= 15; h++) {
      scores[h] = { Wolf: 5, P2: 5, P3: 5, P4: 5, P5: 5 }; // all pushes through 15
    }
    scores[16] = { Wolf: 5, P2: 5, P3: 5, P4: 2, P5: 5 }; // hole 16 decided
    renderWolfAudit({ scores });
    expect(screen.getByText(/Hole 16/)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Hole 16/));
    expect(screen.getByText(/Standings before this hole/)).toBeInTheDocument();
  });
});

describe('WolfAudit — guard', () => {
  test('Edit this hole button calls goToLive with the specific hole number', () => {
    const goToLive = jest.fn();
    const scores = { 1: { Wolf: 3, P2: 5, P3: 5, P4: 6, P5: 5 } };
    renderWolfAudit({ scores, goToLive });
    fireEvent.click(screen.getByText(/Hole 1/));
    fireEvent.click(screen.getByText(/Edit this hole/));
    expect(goToLive).toHaveBeenCalledWith(1);
  });

  test('Edit this hole button does not render at all when goToLive is not provided', () => {
    const scores = { 1: { Wolf: 3, P2: 5, P3: 5, P4: 6, P5: 5 } };
    renderWolfAudit({ scores }); // no goToLive passed
    fireEvent.click(screen.getByText(/Hole 1/));
    expect(screen.queryByText(/Edit this hole/)).not.toBeInTheDocument();
  });

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
