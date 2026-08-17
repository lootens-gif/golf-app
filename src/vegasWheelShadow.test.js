const { resolveVegasHole, playVegasMatchup, computeVegasWheelShadow, buildVegasMatchupSpecs } = require('./engine/scoringEngine');

const course = { pars: Array(18).fill(4), hcp: Array.from({ length: 18 }, (_, i) => i + 1) };
const players = [
  { id: 'a', name: 'A', hcp: 0 }, { id: 'b', name: 'B', hcp: 0 },
  { id: 'c', name: 'C', hcp: 0 }, { id: 'd', name: 'D', hcp: 0 }, { id: 'e', name: 'E', hcp: 0 },
];

describe('resolveVegasHole — core combine + flip logic', () => {
  test('normal case: low digit leads for both teams, no flip', () => {
    const scores = { 1: { a: 4, b: 6, c: 3, d: 7 } };
    const r = resolveVegasHole({ hole: 1, teamA: ['a', 'b'], teamB: ['c', 'd'], players, course, scores, handicapMode: 'relative' });
    expect(r.vegasA).toBe(46); // 4,6 -> low first
    expect(r.vegasB).toBe(37); // 3,7 -> low first
    expect(r.diff).toBe(37 - 46); // negative = teamA (Wheel) wins
    expect(r.flippedA).toBe(false);
    expect(r.flippedB).toBe(false);
  });

  test('10+ protective flip: high digit forced first, always on', () => {
    const scores = { 1: { a: 4, b: 11, c: 5, d: 6 } };
    const r = resolveVegasHole({ hole: 1, teamA: ['a', 'b'], teamB: ['c', 'd'], players, course, scores, handicapMode: 'relative' });
    expect(r.vegasA).toBe(114); // 11,4 -> high(11) first even without flip toggle: "11"+"4"="114"
  });

  test('Flip the Bird: opponent birdie flips this team high-first', () => {
    // par 4, c makes 3 = gross birdie
    const scores = { 1: { a: 4, b: 6, c: 3, d: 6 } };
    const r = resolveVegasHole({ hole: 1, teamA: ['a', 'b'], teamB: ['c', 'd'], players, course, scores, handicapMode: 'relative', flipTheBirdEnabled: true });
    // team A gets flipped because team B (opponent) birdied
    expect(r.flippedA).toBe(true);
    expect(r.vegasA).toBe(64); // normally 46, flipped to 64
    expect(r.flippedB).toBe(false);
    expect(r.vegasB).toBe(36); // c=3,d=6 -> low first, no flip on the birdie-maker's own team
    expect(r.birdieBy).toBe('B'); // tracks which side actually made the birdie, for display
    expect(r.grossA).toEqual([4, 6]);
    expect(r.grossB).toEqual([3, 6]);
    expect(r.netA).toEqual([4, 6]); // hcp 0 for all test players - net equals gross here
  });

  test('Flip the Bird: both teams birdie same hole -> cancels, no flip either way', () => {
    const scores = { 1: { a: 3, b: 6, c: 3, d: 6 } }; // both teams have a birdie
    const r = resolveVegasHole({ hole: 1, teamA: ['a', 'b'], teamB: ['c', 'd'], players, course, scores, handicapMode: 'relative', flipTheBirdEnabled: true });
    expect(r.flippedA).toBe(false);
    expect(r.flippedB).toBe(false);
  });

  test('Flip the Bird toggle off: no flip even with a birdie present', () => {
    const scores = { 1: { a: 4, b: 6, c: 3, d: 6 } };
    const r = resolveVegasHole({ hole: 1, teamA: ['a', 'b'], teamB: ['c', 'd'], players, course, scores, handicapMode: 'relative', flipTheBirdEnabled: false });
    expect(r.flippedA).toBe(false);
    expect(r.vegasA).toBe(46);
  });

  test('returns null if any player has not entered a score for the hole', () => {
    const scores = { 1: { a: 4, b: 6, c: 3 } }; // d missing
    const r = resolveVegasHole({ hole: 1, teamA: ['a', 'b'], teamB: ['c', 'd'], players, course, scores, handicapMode: 'relative' });
    expect(r).toBeNull();
  });
});

describe('playVegasMatchup — accumulates raw point differential, not dollars', () => {
  test('accumulates diff across holes, stops at first unscored hole', () => {
    const scores = {
      1: { a: 4, b: 6, c: 3, d: 7 }, // A=46 B=37, diff = -9
      2: { a: 5, b: 5, c: 4, d: 4 }, // A=55 B=44, diff = -11
    };
    const context = { players, course, scores, handicapMode: 'relative' };
    const r = playVegasMatchup({ teamA: ['a', 'b'], teamB: ['c', 'd'], start: 1, end: 6, context });
    expect(r.holes.length).toBe(2); // stops at hole 3, no scores entered
    expect(r.totalDiff).toBe(-9 + -11);
  });
});

describe('computeVegasWheelShadow — full round aggregator, reuses real teamGames', () => {
  test('5-player: 3 overlapping pairs per segment, zero-sum per matchup', () => {
    const teamGames = [
      {
        holes: 6,
        startHole: 1,
        teams: { team1: ['a', 'b'], team2: ['c', 'd'], team3: ['c', 'e'], team4: ['d', 'e'] },
      },
    ];
    const scores = {};
    for (let h = 1; h <= 6; h++) {
      scores[h] = { a: 4, b: 5, c: 4, d: 5, e: 4 };
    }
    const players5 = players;
    const specs = buildVegasMatchupSpecs({ enableTeamGame: true, teamGameFormat: 'press', teamGames });
    const result = computeVegasWheelShadow({
      matchupSpecs: specs, players: players5, course, scores, handicapMode: 'relative',
      dollarsPerPoint: 1, flipTheBirdEnabled: false,
    });
    expect(result.matchupDetails.length).toBe(3); // 3 overlapping-pair matchups
    const sum = Object.values(result.balancesByPlayerId).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(0); // zero-sum across the whole shadow round
  });

  test('4-player: single 2v2 matchup only, no team3/team4', () => {
    const teamGames = [
      { holes: 6, startHole: 1, teams: { team1: ['a', 'b'], team2: ['c', 'd'] } },
    ];
    const specs = buildVegasMatchupSpecs({ enableTeamGame: true, teamGameFormat: 'press', teamGames });
    const scores = {};
    for (let h = 1; h <= 6; h++) {
      scores[h] = { a: 4, b: 6, c: 5, d: 5 };
    }
    const result = computeVegasWheelShadow({
      matchupSpecs: specs, players, course, scores, handicapMode: 'relative',
      dollarsPerPoint: 0.25, flipTheBirdEnabled: false,
    });
    expect(result.matchupDetails.length).toBe(1); // only Team1 vs Team2
    const sum = Object.values(result.balancesByPlayerId).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(0);
  });

  test('Flip the Bird toggle changes the total swing size (comparison use case)', () => {
    const teamGames = [
      { holes: 3, startHole: 1, teams: { team1: ['a', 'b'], team2: ['c', 'd'] } },
    ];
    const specs = buildVegasMatchupSpecs({ enableTeamGame: true, teamGameFormat: 'press', teamGames });
    // par 4 course; a makes a birdie on hole 1. Team B's scores (5,4) are
    // deliberately asymmetric so the flip actually changes their number
    // (5,5 would flip to itself - not a real test of the toggle).
    const scores = {
      1: { a: 3, b: 6, c: 5, d: 4 },
      2: { a: 4, b: 5, c: 4, d: 5 },
      3: { a: 5, b: 4, c: 5, d: 4 },
    };
    const withoutFlip = computeVegasWheelShadow({
      matchupSpecs: specs, players, course, scores, handicapMode: 'relative',
      dollarsPerPoint: 1, flipTheBirdEnabled: false,
    });
    const withFlip = computeVegasWheelShadow({
      matchupSpecs: specs, players, course, scores, handicapMode: 'relative',
      dollarsPerPoint: 1, flipTheBirdEnabled: true,
    });
    // the two toggles should produce genuinely different totals - that's
    // the whole point of exposing this as a comparison toggle
    expect(withFlip.balancesByPlayerId.a).not.toBe(withoutFlip.balancesByPlayerId.a);
  });

  test('decimal dollarsPerPoint (0.25) settles cleanly, matching real per-point stakes convention', () => {
    const teamGames = [
      { holes: 2, startHole: 1, teams: { team1: ['a', 'b'], team2: ['c', 'd'] } },
    ];
    const specs = buildVegasMatchupSpecs({ enableTeamGame: true, teamGameFormat: 'press', teamGames });
    const scores = {
      1: { a: 4, b: 6, c: 3, d: 7 },
      2: { a: 5, b: 5, c: 4, d: 4 },
    };
    const result = computeVegasWheelShadow({
      matchupSpecs: specs, players, course, scores, handicapMode: 'relative',
      dollarsPerPoint: 0.25, flipTheBirdEnabled: false,
    });
    const sum = Object.values(result.balancesByPlayerId).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(0);
    expect(Number.isFinite(result.balancesByPlayerId.a)).toBe(true);
  });
});

describe('buildVegasMatchupSpecs — expanded (Aug 2026) to any team format, not just Press', () => {
  test('non-press format (e.g. Match Play) with a genuine 2v2: one whole-round matchup', () => {
    const specs = buildVegasMatchupSpecs({
      enableTeamGame: true,
      teamGameFormat: 'match_fbt',
      teamGames: [],
      nonPressTeamSelection: { team1: ['a', 'b'], team2: ['c', 'd'] },
    });
    expect(specs.length).toBe(1);
    expect(specs[0]).toMatchObject({ label: 'Team 1 vs Team 2', start: 1, end: 18, team1: ['a', 'b'], team2: ['c', 'd'] });
  });

  test('3-player non-press (2v1) is correctly excluded - no second player to combine', () => {
    const specs = buildVegasMatchupSpecs({
      enableTeamGame: true,
      teamGameFormat: 'standard',
      teamGames: [],
      nonPressTeamSelection: { team1: ['a', 'b'], team2: ['c'] }, // 2v1
    });
    expect(specs.length).toBe(0);
  });

  test('non-press format with no team selection yet: no specs, no crash', () => {
    const specs = buildVegasMatchupSpecs({
      enableTeamGame: true,
      teamGameFormat: 'longshort',
      teamGames: [],
      nonPressTeamSelection: null,
    });
    expect(specs).toEqual([]);
  });

  test('team game disabled entirely: no specs regardless of format', () => {
    const specs = buildVegasMatchupSpecs({
      enableTeamGame: false,
      teamGameFormat: 'press',
      teamGames: [{ holes: 6, startHole: 1, teams: { team1: ['a', 'b'], team2: ['c', 'd'] } }],
    });
    expect(specs).toEqual([]);
  });

  test('non-press 2v2 matchup actually settles correctly end to end', () => {
    const specs = buildVegasMatchupSpecs({
      enableTeamGame: true,
      teamGameFormat: 'stroke',
      teamGames: [],
      nonPressTeamSelection: { team1: ['a', 'b'], team2: ['c', 'd'] },
    });
    const scores = {
      1: { a: 4, b: 6, c: 3, d: 7 }, // A=46, B=37 - B is lower, so team2 (c/d) wins this hole
    };
    const result = computeVegasWheelShadow({
      matchupSpecs: specs, players, course, scores, handicapMode: 'relative',
      dollarsPerPoint: 1, flipTheBirdEnabled: false,
    });
    expect(result.balancesByPlayerId.a).toBeCloseTo(-9);
    expect(result.balancesByPlayerId.b).toBeCloseTo(-9);
    expect(result.balancesByPlayerId.c).toBeCloseTo(9);
    expect(result.balancesByPlayerId.d).toBeCloseTo(9);
  });
});
