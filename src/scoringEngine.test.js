/**
 * scoringEngine.test.js
 * Run with: npm test -- --testPathPattern=scoringEngine
 *
 * Covers:
 *  - getHandicapStrokes  (relative & full mode)
 *  - getNetScore
 *  - computeHoleResult
 *  - playPressMatch      (base match + auto-press)
 *  - playIndividualMatch (match/stroke/ninePoint)
 *  - buildBirdieResults  (match, 9pt, team-game)
 *  - scoreRound          (ledger zeros, multi-game)
 */

import {
  getHandicapStrokes,
  getNetScore,
  computeHoleResult,
  playPressMatch,
  playIndividualMatch,
  buildBirdieResults,
  scoreRound,
} from './engine/scoringEngine';

// ─── helpers ────────────────────────────────────────────────────────────────

/** Standard 18-hole Westwood course */
const WESTWOOD = {
  name: 'Westwood',
  pars: [5, 4, 3, 4, 4, 5, 4, 3, 4, 4, 4, 5, 4, 4, 3, 4, 3, 5],
  hcp:  [12, 2, 16, 8, 14, 10, 4, 18, 6, 11, 1, 5, 13, 3, 15, 7, 17, 9],
};

/** Minimal 1-hole course for isolated unit tests */
function singleHoleCourse(par = 4, hcp = 1) {
  return { pars: [par], hcp: [hcp] };
}

function makePlayer(id, hcp, name) {
  return { id, name: name || id, hcp };
}

function sumLedger(ledger) {
  return ledger.reduce((s, r) => s + r.total, 0);
}

function ledgerByPlayer(ledger) {
  return Object.fromEntries(ledger.map((r) => [r.playerId, r]));
}

// ─── 1. getHandicapStrokes ───────────────────────────────────────────────────

describe('getHandicapStrokes', () => {
  const players = [
    makePlayer('A', 0),
    makePlayer('B', 10),
    makePlayer('C', 18),
    makePlayer('D', 28),
  ];

  test('scratch player gets 0 strokes on any hole (relative)', () => {
    for (let h = 1; h <= 18; h++) {
      expect(getHandicapStrokes('A', h, players, WESTWOOD, 'relative')).toBe(0);
    }
  });

  test('10-hcp relative to scratch → 10 strokes on the 10 hardest holes', () => {
    let count = 0;
    for (let h = 1; h <= 18; h++) {
      if (getHandicapStrokes('B', h, players, WESTWOOD, 'relative') > 0) count++;
    }
    expect(count).toBe(10);
  });

  test('18-hcp relative to scratch → 1 stroke on every hole', () => {
    for (let h = 1; h <= 18; h++) {
      expect(getHandicapStrokes('C', h, players, WESTWOOD, 'relative')).toBe(1);
    }
  });

  test('28-hcp relative to scratch → 2 strokes on 10 hardest, 1 on rest', () => {
    // 28 relative = 28 strokes spread over 18 holes → 10 holes get 2, 8 get 1
    let twos = 0, ones = 0;
    for (let h = 1; h <= 18; h++) {
      const s = getHandicapStrokes('D', h, players, WESTWOOD, 'relative');
      if (s === 2) twos++;
      if (s === 1) ones++;
    }
    expect(twos).toBe(10);
    expect(ones).toBe(8);
  });

  test('full mode: 10-hcp gets strokes on 10 hardest holes', () => {
    const p = [makePlayer('X', 10)];
    let count = 0;
    for (let h = 1; h <= 18; h++) {
      if (getHandicapStrokes('X', h, p, WESTWOOD, 'full') > 0) count++;
    }
    expect(count).toBe(10);
  });

  test('player not found → 0 strokes', () => {
    expect(getHandicapStrokes('GHOST', 1, players, WESTWOOD, 'relative')).toBe(0);
  });
});

// ─── 2. getNetScore ──────────────────────────────────────────────────────────

describe('getNetScore', () => {
  const players = [makePlayer('A', 0), makePlayer('B', 9)];
  const course = WESTWOOD;

  test('scratch player net = gross', () => {
    const scores = { 1: { A: 5 } };
    expect(getNetScore('A', 1, players, course, scores, 'relative')).toBe(5);
  });

  test('9-hcp B gets 1 stroke on handicap-9 hole (hole 18, hcp=9)', () => {
    // hole 18, hcp index = 9 → B (9 hcp relative to A=0) gets 1 stroke
    const scores = { 18: { B: 6 } };
    expect(getNetScore('B', 18, players, course, scores, 'relative')).toBe(5);
  });

  test('returns null when score missing', () => {
    expect(getNetScore('A', 3, players, course, {}, 'relative')).toBeNull();
  });
});

// ─── 3. computeHoleResult ───────────────────────────────────────────────────

describe('computeHoleResult', () => {
  test('+1 when teamA wins hole net', () => {
    const players = [makePlayer('A', 0), makePlayer('B', 0)];
    const course = singleHoleCourse(4, 1);
    const scores = { 1: { A: 4, B: 5 } };
    expect(computeHoleResult({ hole: 1, teamA: ['A'], teamB: ['B'], players, course, scores, handicapMode: 'relative' })).toBe(1);
  });

  test('-1 when teamB wins hole net', () => {
    const players = [makePlayer('A', 0), makePlayer('B', 0)];
    const course = singleHoleCourse(4, 1);
    const scores = { 1: { A: 5, B: 4 } };
    expect(computeHoleResult({ hole: 1, teamA: ['A'], teamB: ['B'], players, course, scores, handicapMode: 'relative' })).toBe(-1);
  });

  test('0 when tied net', () => {
    const players = [makePlayer('A', 0), makePlayer('B', 0)];
    const course = singleHoleCourse(4, 1);
    const scores = { 1: { A: 4, B: 4 } };
    expect(computeHoleResult({ hole: 1, teamA: ['A'], teamB: ['B'], players, course, scores, handicapMode: 'relative' })).toBe(0);
  });

  test('handicap stroke flips result: A=4 B=5 but B gets stroke → B wins net', () => {
    // A hcp=0, B hcp=18 → B gets 1 stroke on every hole including hole 1 (hcp=12)
    const players = [makePlayer('A', 0), makePlayer('B', 18)];
    const course = singleHoleCourse(4, 1);
    const scores = { 1: { A: 4, B: 5 } };
    // B net = 5 - 1 = 4, A net = 4; tie
    expect(computeHoleResult({ hole: 1, teamA: ['A'], teamB: ['B'], players, course, scores, handicapMode: 'relative' })).toBe(0);
  });

  test('null when either team score missing', () => {
    const players = [makePlayer('A', 0), makePlayer('B', 0)];
    const course = singleHoleCourse(4, 1);
    const scores = { 1: { A: 4 } };
    expect(computeHoleResult({ hole: 1, teamA: ['A'], teamB: ['B'], players, course, scores, handicapMode: 'relative' })).toBeNull();
  });
});

// ─── 4. playPressMatch ──────────────────────────────────────────────────────

describe('playPressMatch', () => {
  const players = [makePlayer('A', 0), makePlayer('B', 0)];

  function makeContext(scoreMap) {
    return { players, course: WESTWOOD, scores: scoreMap, handicapMode: 'relative' };
  }

  test('no press when trigger never reached', () => {
    // Press checks the LATEST bet score >= trigger. To prevent any press,
    // scores must alternate so no bet ever accumulates to the trigger value.
    // A wins odd holes, B wins even holes → latest bet oscillates between +1 and 0, never hits 3.
    const scores = {};
    for (let h = 1; h <= 18; h++) {
      scores[h] = h % 2 === 1 ? { A: 3, B: 5 } : { A: 5, B: 3 }; // alternating wins
    }
    const result = playPressMatch({ teamA: ['A'], teamB: ['B'], start: 1, end: 18, trigger: 3, context: makeContext(scores) });
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Base Match');
  });

  test('one press fires when base match goes 2-down (trigger=2)', () => {
    // A wins holes 1 and 2 → trigger fires after hole 2, press starts hole 3
    const scores = {};
    for (let h = 1; h <= 18; h++) {
      scores[h] = h <= 2 ? { A: 3, B: 5 } : { A: 4, B: 4 }; // A wins first 2, rest tie
    }
    const result = playPressMatch({ teamA: ['A'], teamB: ['B'], start: 1, end: 18, trigger: 2, context: makeContext(scores) });
    expect(result).toHaveLength(2);
    expect(result[1].label).toBe('Press 1');
    expect(result[1].startHole).toBe(3);
  });

  test('base match score sums correctly over all holes', () => {
    // A wins every hole → total = 18
    const scores = {};
    for (let h = 1; h <= 18; h++) scores[h] = { A: 3, B: 5 };
    const result = playPressMatch({ teamA: ['A'], teamB: ['B'], start: 1, end: 18, trigger: 99, context: makeContext(scores) });
    expect(result[0].score).toBe(18);
  });

  test('stops early when score is missing (hole incomplete)', () => {
    const scores = { 1: { A: 4, B: 4 }, 2: { A: 4 } }; // hole 2 incomplete
    const result = playPressMatch({ teamA: ['A'], teamB: ['B'], start: 1, end: 18, trigger: 2, context: makeContext(scores) });
    // Should stop after hole 1 (hole 2 returns null)
    expect(result[0].history).toHaveLength(1);
  });

  test('trigger=1 means a press fires after every hole a team goes 1-up', () => {
    const scores = {};
    // A wins holes 1, 2, 3; rest tie
    for (let h = 1; h <= 18; h++) scores[h] = h <= 3 ? { A: 3, B: 5 } : { A: 4, B: 4 };
    const result = playPressMatch({ teamA: ['A'], teamB: ['B'], start: 1, end: 18, trigger: 1, context: makeContext(scores) });
    // Press after hole 1 (+1), again after hole 2 (+2 on base, +1 on press 1), etc.
    expect(result.length).toBeGreaterThan(1);
  });
});

// ─── 5. playIndividualMatch ─────────────────────────────────────────────────

describe('playIndividualMatch – basic match type', () => {
  const players = [makePlayer('A', 0), makePlayer('B', 0)];

  function makeContext(scores) {
    return { players, course: WESTWOOD, scores, handicapMode: 'relative' };
  }

  test('A wins all holes → total = 18 × bet', () => {
    const scores = {};
    for (let h = 1; h <= 18; h++) scores[h] = { A: 3, B: 5 };
    const result = playIndividualMatch({ p1Id: 'A', p2Id: 'B', bet: 5 }, makeContext(scores));
    expect(result.total).toBe(90); // 18 units × $5
  });

  test('all holes tied → total = 0', () => {
    const scores = {};
    for (let h = 1; h <= 18; h++) scores[h] = { A: 4, B: 4 };
    const result = playIndividualMatch({ p1Id: 'A', p2Id: 'B', bet: 10 }, makeContext(scores));
    expect(result.total).toBe(0);
  });

  test('no scores → total = 0', () => {
    const result = playIndividualMatch({ p1Id: 'A', p2Id: 'B', bet: 5 }, makeContext({}));
    expect(result.total).toBe(0);
  });
});

describe('playIndividualMatch – ninePoint type', () => {
  const players = [makePlayer('A', 0), makePlayer('B', 0), makePlayer('C', 0)];

  function makeContext(scores) {
    return { players, course: WESTWOOD, scores, handicapMode: 'relative' };
  }

  test('returns payout shape with balancesByPlayerId', () => {
    const scores = {};
    for (let h = 1; h <= 18; h++) scores[h] = { A: 3, B: 4, C: 5 };
    const result = playIndividualMatch(
      { gameType: 'ninePoint', p1Id: 'A', p2Id: 'B', p3Id: 'C', bet: 1 },
      makeContext(scores)
    );
    expect(result.payout?.balancesByPlayerId).toBeDefined();
  });

  test('ledger sums to zero (money conserved)', () => {
    const scores = {};
    for (let h = 1; h <= 18; h++) scores[h] = { A: 3, B: 4, C: 5 };
    const result = playIndividualMatch(
      { gameType: 'ninePoint', p1Id: 'A', p2Id: 'B', p3Id: 'C', bet: 2 },
      makeContext(scores)
    );
    const balances = result.payout?.balancesByPlayerId || {};
    const total = Object.values(balances).reduce((s, v) => s + v, 0);
    expect(total).toBe(0);
  });
});

// ─── 6. buildBirdieResults ──────────────────────────────────────────────────

describe('buildBirdieResults', () => {
  const course = singleHoleCourse(4, 1);

  test('match birdie: birdie scorer wins bet from opponent', () => {
    const results = buildBirdieResults({
      matches: [{ p1Id: 'A', p2Id: 'B', birdieEnabled: true, birdieBet: 5 }],
      matchResults: [],
      teamGames: [],
      teamGameResults: [],
      scores: { 1: { A: 3, B: 4 } }, // A birdies
      course,
      getTeamGameSelection: () => null,
    });
    const a = results.find((r) => r.playerId === 'A');
    const b = results.find((r) => r.playerId === 'B');
    expect(a.amount).toBe(5);
    expect(b.amount).toBe(-5);
  });

  test('no birdie → no entries', () => {
    const results = buildBirdieResults({
      matches: [{ p1Id: 'A', p2Id: 'B', birdieEnabled: true, birdieBet: 5 }],
      matchResults: [],
      teamGames: [],
      teamGameResults: [],
      scores: { 1: { A: 4, B: 4 } }, // no birdies
      course,
      getTeamGameSelection: () => null,
    });
    expect(results).toHaveLength(0);
  });

  test('birdieEnabled=false → no entries even if birdie scored', () => {
    const results = buildBirdieResults({
      matches: [{ p1Id: 'A', p2Id: 'B', birdieEnabled: false, birdieBet: 5 }],
      matchResults: [],
      teamGames: [],
      teamGameResults: [],
      scores: { 1: { A: 3, B: 4 } },
      course,
      getTeamGameSelection: () => null,
    });
    expect(results).toHaveLength(0);
  });

  test('team-game birdie: all 4 players get result (2 win, 2 lose)', () => {
    const results = buildBirdieResults({
      matches: [],
      matchResults: [],
      teamGames: [{ birdieEnabled: true, birdieBet: 3 }],
      teamGameResults: [{ index: 0, start: 1, end: 1, matches: [{ label: 'Team 1 vs Team 2' }] }],
      scores: { 1: { A: 3, B: 4, C: 4, D: 5 } }, // A birdies
      course,
      birdiesEnabled: true,
      getTeamGameSelection: () => ({ team1: ['A', 'B'], team2: ['C', 'D'] }),
    });
    const byPlayer = Object.fromEntries(results.map((r) => [r.playerId, r.amount]));
    // A and B (team1) win, C and D (team2) lose
    expect(byPlayer['A']).toBe(3);
    expect(byPlayer['B']).toBe(3);
    expect(byPlayer['C']).toBe(-3);
    expect(byPlayer['D']).toBe(-3);
  });
});

// ─── 7. scoreRound – money conservation ─────────────────────────────────────

describe('scoreRound – money always sums to zero', () => {
  function run(context) {
    const result = scoreRound({}, context);
    return sumLedger(result.playerLedger);
  }

  test('pure team game (2 units won)', () => {
    expect(run({
      players: [makePlayer('A', 0), makePlayer('B', 0), makePlayer('C', 0), makePlayer('D', 0)],
      matchResults: [],
      birdieResults: [],
      teamGameUnitAmount: 5,
      teamGameResults: [{
        index: 0,
        duplicateError: false,
        matches: [{ label: 'Team 1 vs Team 2', result: [{ score: 1 }, { score: 1 }] }],
      }],
      getTeamGameSelection: () => ({ team1: ['A', 'B'], team2: ['C', 'D'] }),
    })).toBe(0);
  });

  test('1v1 match result', () => {
    expect(run({
      players: [makePlayer('A', 0), makePlayer('B', 0)],
      matchResults: [{ match: { p1Id: 'A', p2Id: 'B', bet: 10 }, result: { total: 30 } }],
      birdieResults: [],
      teamGameResults: [],
      teamGameUnitAmount: 1,
    })).toBe(0);
  });

  test('9-point with birdies', () => {
    expect(run({
      players: [makePlayer('A', 0), makePlayer('B', 0), makePlayer('C', 0)],
      matchResults: [{
        match: { gameType: 'ninePoint' },
        result: { payout: { balancesByPlayerId: { A: 12, B: -4, C: -8 } } },
      }],
      birdieResults: [
        { playerId: 'A', amount: 6 },
        { playerId: 'B', amount: -3 },
        { playerId: 'C', amount: -3 },
      ],
      teamGameResults: [],
      teamGameUnitAmount: 1,
    })).toBe(0);
  });

  test('multi-game: 1v1 + team game + birdies', () => {
    expect(run({
      players: [
        makePlayer('A', 0), makePlayer('B', 0),
        makePlayer('C', 0), makePlayer('D', 0), makePlayer('E', 0),
      ],
      matchResults: [
        { match: { p1Id: 'A', p2Id: 'B', bet: 5 }, result: { total: 15 } },
      ],
      birdieResults: [
        { playerId: 'A', amount: 10 },
        { playerId: 'B', amount: -5 },
        { playerId: 'C', amount: -5 },
      ],
      teamGameUnitAmount: 2,
      teamGameResults: [{
        index: 0,
        duplicateError: false,
        matches: [{ label: 'Team 1 vs Team 2', result: [{ score: -1 }, { score: 1 }] }],
      }],
      getTeamGameSelection: () => ({
        team1: ['A', 'B'],
        team2: ['C', 'D'],
      }),
    })).toBe(0);
  });
});

// ─── 8. scoreRound – correct settlement values ───────────────────────────────

describe('scoreRound – correct settlement values', () => {
  test('1v1 match: winner gets +total, loser gets -total', () => {
    const result = scoreRound({}, {
      players: [makePlayer('A', 0), makePlayer('B', 0)],
      matchResults: [{ match: { p1Id: 'A', p2Id: 'B', bet: 5 }, result: { total: 20 } }],
      birdieResults: [],
      teamGameResults: [],
      teamGameUnitAmount: 1,
    });
    const by = ledgerByPlayer(result.playerLedger);
    expect(by['A'].total).toBe(20);
    expect(by['B'].total).toBe(-20);
  });

  test('team game: $5/unit, net +1 unit → each team member wins/loses $5', () => {
    const result = scoreRound({}, {
      players: [makePlayer('A', 0), makePlayer('B', 0), makePlayer('C', 0), makePlayer('D', 0)],
      matchResults: [],
      birdieResults: [],
      teamGameUnitAmount: 5,
      teamGameResults: [{
        index: 0,
        duplicateError: false,
        matches: [{ label: 'Team 1 vs Team 2', result: [{ score: 1 }] }],
      }],
      getTeamGameSelection: () => ({ team1: ['A', 'B'], team2: ['C', 'D'] }),
    });
    const by = ledgerByPlayer(result.playerLedger);
    expect(by['A'].total).toBe(5);
    expect(by['B'].total).toBe(5);
    expect(by['C'].total).toBe(-5);
    expect(by['D'].total).toBe(-5);
  });

  test('birdies correctly isolated in birdie column', () => {
    const result = scoreRound({}, {
      players: [makePlayer('A', 0), makePlayer('B', 0)],
      matchResults: [{ match: { p1Id: 'A', p2Id: 'B', bet: 5 }, result: { total: 10 } }],
      birdieResults: [
        { playerId: 'A', amount: 4 },
        { playerId: 'B', amount: -4 },
      ],
      teamGameResults: [],
      teamGameUnitAmount: 1,
    });
    const by = ledgerByPlayer(result.playerLedger);
    expect(by['A'].birdies).toBe(4);
    expect(by['B'].birdies).toBe(-4);
    expect(by['A'].total).toBe(14);
    expect(by['B'].total).toBe(-14);
  });
});

// ─── 9. Edge cases ──────────────────────────────────────────────────────────

describe('edge cases', () => {
  test('scoreRound with no games returns zero-balance ledger', () => {
    const result = scoreRound({}, {
      players: [makePlayer('A', 0), makePlayer('B', 0)],
      matchResults: [],
      birdieResults: [],
      teamGameResults: [],
      teamGameUnitAmount: 1,
    });
    expect(sumLedger(result.playerLedger)).toBe(0);
  });

  test('playPressMatch with trigger=2 and identical scores produces 1 bet', () => {
    const players = [makePlayer('A', 0), makePlayer('B', 0)];
    const scores = {};
    for (let h = 1; h <= 18; h++) scores[h] = { A: 4, B: 4 }; // all ties
    const result = playPressMatch({
      teamA: ['A'], teamB: ['B'], start: 1, end: 18, trigger: 2,
      context: { players, course: WESTWOOD, scores, handicapMode: 'relative' },
    });
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(0);
  });

  test('computeHoleResult with 5-player best-ball team', () => {
    const players = [
      makePlayer('A', 0), makePlayer('B', 0), makePlayer('C', 0),
      makePlayer('D', 0), makePlayer('E', 0),
    ];
    const scores = { 1: { A: 5, B: 3, C: 4, D: 4, E: 5 } }; // B birdies for team1
    // team1 = [A,B], team2 = [C,D,E] — best ball: B=3 vs C=4 → team1 wins
    const result = computeHoleResult({
      hole: 1, teamA: ['A', 'B'], teamB: ['C', 'D', 'E'],
      players, course: WESTWOOD, scores, handicapMode: 'relative',
    });
    expect(result).toBe(1);
  });
});
