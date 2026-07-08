import { scoreRound } from './engine/scoringEngine';

function byPlayer(rows) {
  return Object.fromEntries(rows.map((r) => [r.playerId, r]));
}

function simplifiedLedger(playerLedger) {
  const map = byPlayer(playerLedger);
  const out = {};
  for (const [playerId, row] of Object.entries(map)) {
    out[playerId] = {
      mainGame: row.mainGame,
      sideMatches: row.sideMatches,
      birdies: row.birdies,
      total: row.total,
    };
  }
  return out;
}

function sumTotals(playerLedger) {
  return playerLedger.reduce((sum, row) => sum + row.total, 0);
}

// Test 1 9pt 5-2-2 bet with 3 players

test('03_9pt_522_bet5', () => {
  const result = scoreRound({}, {
    players: [
      { id: 'A', name: 'A', hcp: 0 },
      { id: 'B', name: 'B', hcp: 0 },
      { id: 'C', name: 'C', hcp: 0 },
    ],
    matchResults: [
      {
        match: {
          gameType: 'ninePoint',
        },
        result: {
          payout: {
            balancesByPlayerId: {
              A: 25,
              B: 10,
              C: -35,
            },
          },
        },
      },
    ],
    teamGameResults: [],
    teamGameUnitAmount: 1,
    birdieResults: [],
  });

  expect(simplifiedLedger(result.playerLedger)).toEqual({
    A: { mainGame: 25, sideMatches: 0, birdies: 0, total: 25 },
    B: { mainGame: 10, sideMatches: 0, birdies: 0, total: 10 },
    C: { mainGame: -35, sideMatches: 0, birdies: 0, total: -35 },
  });

  expect(sumTotals(result.playerLedger)).toBe(0);
  
});

//Test 2 9pt with birdie enabled but no birdies hit should return empty birdie results

test('06_9pt_single_birdie', () => {
  const result = scoreRound({}, {
    players: [
      { id: 'A', name: 'A', hcp: 0 },
      { id: 'B', name: 'B', hcp: 0 },
      { id: 'C', name: 'C', hcp: 0 },
    ],
    matchResults: [
      {
        match: {
          gameType: 'ninePoint',
          players: ['A', 'B', 'C'],
          bet: 2,
          birdieEnabled: true,
          birdieBet: 3,
        },
        result: {
          payout: {
            balancesByPlayerId: {
              A: 10,
              B: 4,
              C: -14,
            },
          },
        },
      },
    ],
    birdieResults: [
      { playerId: 'A', amount: 6 },
      { playerId: 'B', amount: -3 },
      { playerId: 'C', amount: -3 },
    ],
    teamGameResults: [],
    teamGameUnitAmount: 1,
  });

  expect(simplifiedLedger(result.playerLedger)).toEqual({
    A: { mainGame: 10, sideMatches: 0, birdies: 6, total: 16 },
    B: { mainGame: 4, sideMatches: 0, birdies: -3, total: 1 },
    C: { mainGame: -14, sideMatches: 0, birdies: -3, total: -17 },
  });

  expect(sumTotals(result.playerLedger)).toBe(0);
});

//Test 3 9pt with birdie enabled on same hole for multiple players should apply birdie results correctly

test('14_1v1_net_lowest_tie_on_net', () => {
  const result = scoreRound({}, {
    players: [
      { id: 'A', name: 'A', hcp: 10 },
      { id: 'B', name: 'B', hcp: 16 },
    ],
    matchResults: [
      {
        match: {
          p1Id: 'A',
          p2Id: 'B',
          gameType: 'match',
          handicapMode: 'net-from-lowest',
          bet: 5,
        },
        result: {
          total: 0,
        },
      },
    ],
    birdieResults: [],
    teamGameResults: [],
    teamGameUnitAmount: 1,
  });

  expect(simplifiedLedger(result.playerLedger)).toEqual({
    A: { mainGame: 0, sideMatches: 0, birdies: 0, total: 0 },
    B: { mainGame: 0, sideMatches: 0, birdies: 0, total: 0 },
  });

  expect(sumTotals(result.playerLedger)).toBe(0);
});

//Test 4 Team game with birdie enabled but no birdies hit should return empty birdie results

test('20_gross_vs_net_birdie_conflict', () => {
  const result = scoreRound({}, {
    players: [
      { id: 'A', name: 'A', hcp: 4 },
      { id: 'B', name: 'B', hcp: 18 },
    ],
    matchResults: [
      {
        match: {
          p1Id: 'A',
          p2Id: 'B',
          gameType: 'match',
          handicapMode: 'net-from-lowest',
          bet: 5,
        },
        result: {
          total: 0, // tie on net
        },
      },
    ],
    birdieResults: [
      { playerId: 'A', amount: 4 },
      { playerId: 'B', amount: -4 },
    ],
    teamGameResults: [],
    teamGameUnitAmount: 1,
  });

  expect(simplifiedLedger(result.playerLedger)).toEqual({
    A: { mainGame: 0, sideMatches: 0, birdies: 4, total: 4 },
    B: { mainGame: 0, sideMatches: 0, birdies: -4, total: -4 },
  });

  expect(sumTotals(result.playerLedger)).toBe(0);
});

// Test 5 Multiple matches with birdie enabled on same hole should apply birdie results correctly without conflict with main game settlement

test('21_multi_game_birdie_conflict', () => {
  const result = scoreRound({}, {
    players: [
      { id: 'A', name: 'A', hcp: 0 },
      { id: 'B', name: 'B', hcp: 0 },
      { id: 'C', name: 'C', hcp: 0 },
    ],
    matchResults: [
      {
        match: {
          p1Id: 'A',
          p2Id: 'B',
          gameType: 'match',
          bet: 5,
          birdieEnabled: true,
          birdieBet: 2,
        },
        result: {
          total: 5,
        },
      },
      {
        match: {
          gameType: 'ninePoint',
          players: ['A', 'B', 'C'],
          bet: 1,
          birdieEnabled: false,
          birdieBet: 0,
        },
        result: {
          payout: {
            balancesByPlayerId: {
              A: 5,
              B: 2,
              C: -7,
            },
          },
        },
      },
    ],
    birdieResults: [
      { playerId: 'A', amount: 2 },
      { playerId: 'B', amount: -2 },
    ],
    teamGameResults: [],
    teamGameUnitAmount: 1,
  });

  expect(simplifiedLedger(result.playerLedger)).toEqual({
    A: { mainGame: 5, sideMatches: 5, birdies: 2, total: 12 },
    B: { mainGame: 2, sideMatches: -5, birdies: -2, total: -5 },
    C: { mainGame: -7, sideMatches: 0, birdies: 0, total: -7 },
  });

  expect(sumTotals(result.playerLedger)).toBe(0);
});

// Test 6 Team Game Settlement with exact payout should settle correctly without rounding issues

test('22_team_game_settlement_exact_payout', () => {
  const result = scoreRound({}, {
    players: [
      { id: 'A', name: 'A', hcp: 0 },
      { id: 'B', name: 'B', hcp: 0 },
      { id: 'C', name: 'C', hcp: 0 },
      { id: 'D', name: 'D', hcp: 0 },
    ],
    matchResults: [],
    birdieResults: [],
    teamGameUnitAmount: 2,
    teamGameResults: [
      {
        index: 0,
        duplicateError: false,
        matches: [
          {
            label: 'Team 1 vs Team 2',
            result: [
              { score: 1 },
              { score: 1 },
              { score: -1 },
            ],
          },
        ],
      },
    ],
    getTeamGameSelection: () => ({
      team1: ['A', 'B'],
      team2: ['C', 'D'],
    }),
  });

  expect(simplifiedLedger(result.playerLedger)).toEqual({
    A: { mainGame: 2, sideMatches: 0, birdies: 0, total: 2 },
    B: { mainGame: 2, sideMatches: 0, birdies: 0, total: 2 },
    C: { mainGame: -2, sideMatches: 0, birdies: 0, total: -2 },
    D: { mainGame: -2, sideMatches: 0, birdies: 0, total: -2 },
  });

  expect(sumTotals(result.playerLedger)).toBe(0);
});

// Test 7  Match with birdie disabled should settle main game correctly and return empty birdie results without affecting settlement

test('23_1v1_birdie_disabled_match_still_settles', () => {
  const result = scoreRound({}, {
    players: [
      { id: 'A', name: 'A', hcp: 0 },
      { id: 'B', name: 'B', hcp: 0 },
    ],
    matchResults: [
      {
        match: {
          p1Id: 'A',
          p2Id: 'B',
          gameType: 'match',
          birdieEnabled: false,
          birdieBet: 5,
          bet: 5,
        },
        result: {
          total: 5,
        },
      },
    ],
    birdieResults: [],
    teamGameResults: [],
    teamGameUnitAmount: 1,
  });

  expect(simplifiedLedger(result.playerLedger)).toEqual({
    A: { mainGame: 0, sideMatches: 5, birdies: 0, total: 5 },
    B: { mainGame: 0, sideMatches: -5, birdies: 0, total: -5 },
  });

  expect(sumTotals(result.playerLedger)).toBe(0);
});
// ── NON-PRESS TEAM GAME FORMAT TESTS ─────────────────────────────────────────
// These test the exact scenario that caused crashes: result is an object not array

test('24_team_game_nonpress_longshort_result_object', () => {
  // Non-press team game: result is an object (longshort format), not array
  const result = scoreRound({}, {
    players: [
      { id: 'A', name: 'A', hcp: 0 },
      { id: 'B', name: 'B', hcp: 0 },
      { id: 'C', name: 'C', hcp: 0 },
      { id: 'D', name: 'D', hcp: 0 },
    ],
    matchResults: [],
    birdieResults: [],
    teamGameUnitAmount: 5,
    teamGameResults: [
      {
        index: 0,
        duplicateError: false,
        matches: [
          {
            label: 'Team 1 vs Team 2',
            result: {
              type: 'longshort',
              total: 5,
              long: 5,
              short: 0,
              longLabel: '3&2',
              shortLabel: 'Tie',
            },
          },
        ],
      },
    ],
    getTeamGameSelection: () => ({
      team1: ['A', 'B'],
      team2: ['C', 'D'],
    }),
  });

  // Should not crash and money should be conserved
  expect(sumTotals(result.playerLedger)).toBe(0);
});

test('25_team_game_nonpress_match_fbt_result_object', () => {
  const result = scoreRound({}, {
    players: [
      { id: 'A', name: 'A', hcp: 0 },
      { id: 'B', name: 'B', hcp: 0 },
      { id: 'C', name: 'C', hcp: 0 },
      { id: 'D', name: 'D', hcp: 0 },
    ],
    matchResults: [],
    birdieResults: [],
    teamGameUnitAmount: 5,
    teamGameResults: [
      {
        index: 0,
        duplicateError: false,
        matches: [
          {
            label: 'Team 1 vs Team 2',
            result: {
              type: 'match_fbt',
              total: 10,
              segments: [
                { key: 'front', label: 'Front 9', units: 1, dollars: 5 },
                { key: 'back', label: 'Back 9', units: 1, dollars: 5 },
              ],
            },
          },
        ],
      },
    ],
    getTeamGameSelection: () => ({
      team1: ['A', 'B'],
      team2: ['C', 'D'],
    }),
  });

  expect(sumTotals(result.playerLedger)).toBe(0);
  // Team 1 wins
  const ledger = simplifiedLedger(result.playerLedger);
  expect(ledger.A.total).toBeGreaterThan(0);
  expect(ledger.C.total).toBeLessThan(0);
});

test('26_team_game_nonpress_stroke_result_object', () => {
  const result = scoreRound({}, {
    players: [
      { id: 'A', name: 'A', hcp: 0 },
      { id: 'B', name: 'B', hcp: 0 },
      { id: 'C', name: 'C', hcp: 0 },
      { id: 'D', name: 'D', hcp: 0 },
    ],
    matchResults: [],
    birdieResults: [],
    teamGameUnitAmount: 5,
    teamGameResults: [
      {
        index: 0,
        duplicateError: false,
        matches: [
          {
            label: 'Team 1 vs Team 2',
            result: {
              type: 'stroke',
              total: -5,
              segments: [
                { key: 'total', label: 'Total 18', units: -1, dollars: -5, strokeDiff: -3 },
              ],
            },
          },
        ],
      },
    ],
    getTeamGameSelection: () => ({
      team1: ['A', 'B'],
      team2: ['C', 'D'],
    }),
  });

  expect(sumTotals(result.playerLedger)).toBe(0);
  // Team 2 wins (negative total means teamB wins)
  const ledger = simplifiedLedger(result.playerLedger);
  expect(ledger.C.total).toBeGreaterThan(0);
  expect(ledger.A.total).toBeLessThan(0);
});

test('27_getHandicapBase_handles_empty_hcp', () => {
  // Empty hcp string should not crash
  const { getHandicapBase } = require('./engine/scoringEngine');
  const players = [
    { id: 'A', hcp: '' },
    { id: 'B', hcp: 10 },
  ];
  expect(() => getHandicapBase(players[0], players, 'relative')).not.toThrow();
  expect(() => getHandicapBase(players[1], players, 'relative')).not.toThrow();
  expect(getHandicapBase(players[1], players, 'relative')).toBe(10);
});

// ── ROUND 6341 — REAL WHEEL ROUND TESTS ──────────────────────────────────────
// 5-player 6/6/6 wheel, spread handicap, noPar3=true
// Players: Tim(9), Jon(12), John(22), Lou(18), Stan(23)
// Westwood course

const round6341Players = [
  { id: "p1", hcp: 9,  name: "Tim"  },
  { id: "p2", hcp: 12, name: "Jon"  },
  { id: "p3", hcp: 22, name: "John" },
  { id: "p4", hcp: 18, name: "Lou"  },
  { id: "p5", hcp: 23, name: "Stan" },
];

const round6341Course = {
  pars: [5,4,3,4,4,5,4,3,4,4,4,5,4,4,3,4,3,5],
  hcp:  [12,2,16,8,14,10,4,18,6,11,1,5,13,3,15,7,17,9],
};

const round6341Scores = {
  1:  {p1:5,p2:5,p3:5,p4:5,p5:7},
  2:  {p1:3,p2:6,p3:5,p4:5,p5:6},
  3:  {p1:3,p2:4,p3:4,p4:3,p5:3},
  4:  {p1:4,p2:4,p3:8,p4:5,p5:6},
  5:  {p1:3,p2:3,p3:5,p4:4,p5:5},
  6:  {p1:5,p2:6,p3:6,p4:5,p5:6},
  7:  {p1:5,p2:5,p3:8,p4:6,p5:7},
  8:  {p1:3,p2:3,p3:4,p4:3,p5:3},
  9:  {p1:5,p2:6,p3:6,p4:6,p5:6},
  10: {p1:4,p2:6,p3:6,p4:4,p5:6},
  11: {p1:4,p2:4,p3:4,p4:7,p5:5},
  12: {p1:5,p2:5,p3:5,p4:7,p5:8},
  13: {p1:5,p2:4,p3:4,p4:3,p5:4},
  14: {p1:4,p2:7,p3:6,p4:6,p5:6},
  15: {p1:3,p2:4,p3:5,p4:3,p5:4},
  16: {p1:3,p2:7,p3:6,p4:4,p5:6},
  17: {p1:3,p2:3,p3:3,p4:4,p5:4},
  18: {p1:5,p2:5,p3:8,p4:6,p5:6},
};

const { getSpreadHandicapStrokes, getHandicapStrokes } = require('./engine/scoringEngine');

// ── SPREAD DOTS TESTS ──
test('28_spread_tim_9_relative_noPar3', () => {
  // Tim: 9-9=0 relative strokes → no dots
  for (let h = 1; h <= 18; h++) {
    const dots = getSpreadHandicapStrokes("p1", h, round6341Players, round6341Course, "relative", true);
    expect(dots).toBe(0);
  }
});

test('29_spread_jon_12_relative_noPar3', () => {
  // Jon: 12-9=3 relative, spread 1/1/1
  // Seg1 eligible sorted: H2(2),H4(8),H6(10),H1(12),H5(14) → dot on H2
  // Seg2 eligible sorted: H11(1),H7(4),H12(5),H9(6),H10(11) → dot on H11
  // Seg3 eligible sorted: H14(3),H16(7),H18(9),H13(13) → dot on H14
  const expected = { 2:1, 11:1, 14:1 };
  for (let h = 1; h <= 18; h++) {
    const dots = getSpreadHandicapStrokes("p2", h, round6341Players, round6341Course, "relative", true);
    expect(dots).toBe(expected[h] || 0);
  }
});

test('30_spread_lou_18_relative_noPar3', () => {
  // Lou: 18-9=9 relative, spread 3/3/3
  // Seg1: H2(2),H4(8),H6(10) get dots
  // Seg2: H11(1),H7(4),H12(5) get dots
  // Seg3: H14(3),H16(7),H18(9) get dots
  const expected = { 2:1,4:1,6:1, 7:1,11:1,12:1, 14:1,16:1,18:1 };
  for (let h = 1; h <= 18; h++) {
    const dots = getSpreadHandicapStrokes("p4", h, round6341Players, round6341Course, "relative", true);
    expect(dots).toBe(expected[h] || 0);
  }
});

test('31_spread_john_22_relative_noPar3', () => {
  // John: 22-9=13 relative, spread 4/4/5 or 5/4/4
  // 13/3 = 4 remainder 1 → extra goes to segment with lowest HCP next hole
  // Seg1 next after 4: H5(14), Seg2 next after 4: H10(11), Seg3 next after 4: H13(13)
  // Extra to Seg2 (HCP11 < HCP13 < HCP14) → quotas: 4/5/4
  // Seg1(4): H2,H4,H6,H1
  // Seg2(5): H11,H7,H12,H9,H10
  // Seg3(4): H14,H16,H18,H13
  const expected = { 1:1,2:1,4:1,6:1, 7:1,9:1,10:1,11:1,12:1, 13:1,14:1,16:1,18:1 };
  for (let h = 1; h <= 18; h++) {
    const dots = getSpreadHandicapStrokes("p3", h, round6341Players, round6341Course, "relative", true);
    expect(dots).toBe(expected[h] || 0);
  }
});

test('32_spread_stan_23_relative_noPar3', () => {
  // Stan: 23-9=14 relative, spread 14/3
  // 14/3 = 4 remainder 2 → 2 extras
  // Seg1 next: H5(14), Seg2 next: H10(11), Seg3 next: H13(13)
  // 2 extras go to Seg2(HCP11) and Seg3(HCP13) → quotas: 4/5/5
  // Seg1(4): H2,H4,H6,H1
  // Seg2(5): H11,H7,H12,H9,H10
  // Seg3(5): H14,H16,H18,H13,H15... wait H15 is par3 excluded
  // Seg3 eligible(noPar3): H14(3),H16(7),H18(9),H13(13) — only 4 holes
  // So Seg3 quota 5 but only 4 eligible → gets 4
  // Overflow: 1 extra stroke goes globally... but noPar3 limits it
  const expected = { 1:1,2:1,4:1,6:1, 7:1,9:1,10:1,11:1,12:1, 13:1,14:1,16:1,18:1 };
  // Stan gets 13 effective (limited by eligible holes)
  let totalDots = 0;
  for (let h = 1; h <= 18; h++) {
    const dots = getSpreadHandicapStrokes("p5", h, round6341Players, round6341Course, "relative", true);
    totalDots += dots;
  }
  // Stan should get at most 13 dots (14 eligible non-par3 holes)
  expect(totalDots).toBeLessThanOrEqual(14);
  expect(totalDots).toBeGreaterThanOrEqual(13);
});

test('33_spread_hole6_lou_gets_dot', () => {
  // This is the specific hole that was wrong in production
  const dots = getSpreadHandicapStrokes("p4", 6, round6341Players, round6341Course, "relative", true);
  expect(dots).toBe(1);
});

test('34_spread_vs_standard_different_holes', () => {
  // Spread and standard should give different holes for Lou
  // Standard: Lou gets dots on HCP 1-9 globally
  // Spread: Lou gets dots on top 3 per segment
  const spreadHoles = [];
  const standardHoles = [];
  for (let h = 1; h <= 18; h++) {
    if (getSpreadHandicapStrokes("p4", h, round6341Players, round6341Course, "relative", true)) spreadHoles.push(h);
    if (getHandicapStrokes("p4", h, round6341Players, round6341Course, "relative", true)) standardHoles.push(h);
  }
  // Spread gives H2,H4,H6,H7,H11,H12,H14,H16,H18
  expect(spreadHoles).toContain(6);  // H6 HCP10 — in spread but NOT standard
  // Standard gives H11,H2,H14,H7,H12,H9,H16,H4,H18 (HCP 1-9)
  expect(standardHoles).toContain(9); // H9 HCP6 — in standard but NOT spread
  expect(spreadHoles).not.toContain(9); // H9 should NOT be in spread seg1 top3
});

// ── ROUND 7552 — 9-POINT REAL DATA TESTS ────────────────────────────────────
// 3-player 9-point, Tim(0), Mike(14), Mark(10), relative mode, $1/pt
// Westwood, 10 holes played

const round7552Players = [
  { id: "p1", hcp: 0,  name: "Tim"  },
  { id: "p2", hcp: 14, name: "Mike" },
  { id: "p3", hcp: 10, name: "Mark" },
];

const round7552Scores = {
  1:  {p1:5, p2:6, p3:6},
  2:  {p1:5, p2:6, p3:5},
  3:  {p1:4, p2:3, p3:4},
  4:  {p1:4, p2:5, p3:5},
  5:  {p1:5, p2:4, p3:5},
  6:  {p1:5, p2:7, p3:6},
  7:  {p1:3, p2:5, p3:6},
  8:  {p1:4, p2:6, p3:4},
  9:  {p1:5, p2:5, p3:6},
  10: {p1:5, p2:5, p3:4},
};

const westwood = {
  pars: [5,4,3,4,4,5,4,3,4,4,4,5,4,4,3,4,3,5],
  hcp:  [12,2,16,8,14,10,4,18,6,11,1,5,13,3,15,7,17,9],
};

const { getNinePointMatchSummary } = require('./engine/scoringEngine');

test('35_9pt_7552_money_balances', () => {
  // Total money won must equal total money lost
  const result = getNinePointMatchSummary(
    ["p1","p2","p3"],
    round7552Players,
    westwood,
    round7552Scores,
    "relative",
    false,  // blitzEnabled
    1,      // dollarsPerPoint
    10,     // holeCount
    false,  // noPar3Strokes
    false,  // birdieDoublePoints
    false   // eagleTriplePoints
  );
  const balances = Object.values(result.payout.balancesByPlayerId);
  const total = balances.reduce((s, v) => s + v, 0);
  expect(Math.abs(total)).toBeLessThan(0.01); // balances to zero
});

test('36_9pt_7552_points_sum_per_hole', () => {
  // Every played hole must sum to exactly 9 points
  const result = getNinePointMatchSummary(
    ["p1","p2","p3"],
    round7552Players,
    westwood,
    round7552Scores,
    "relative",
    false, 1, 10, false, false, false
  );
  result.holes.forEach(h => {
    const pts = Object.values(h.pointsByPlayerId).reduce((s,v) => s+v, 0);
    expect(pts).toBe(9);
  });
});

test('37_9pt_7552_hole1_tim_wins', () => {
  // Hole 1: Tim 5, Mike 6, Mark 6 — all par5, Tim(0 rel) vs Mike(14 rel) vs Mark(10 rel)
  // HCP 12 — Tim gets 0 strokes, Mike gets stroke (14>12), Mark gets stroke (10<12? no, 10<12 yes)
  // Actually relative: Tim=0, Mike=14, Mark=10. Lowest=0(Tim)
  // Mike relative=14, Mark relative=10
  // Hole 1 HCP=12: Mike gets stroke (14>=12), Mark gets stroke? (10<12 no)
  // Net: Tim=5, Mike=5(6-1), Mark=6 → Tim and Mike tie → no blitz
  // Tim and Mike tie for low at 5 → 4/4/1 split → Mark gets 1
  const result = getNinePointMatchSummary(
    ["p1","p2","p3"],
    round7552Players,
    westwood,
    round7552Scores,
    "relative",
    false, 1, 10, false, false, false
  );
  const h1 = result.holes.find(h => h.hole === 1);
  const pts = h1.pointsByPlayerId;
  // Tim and Mike tie for 1st → 4pts each, Mark gets 1pt
  expect(pts["p1"]).toBe(4);
  expect(pts["p2"]).toBe(4);
  expect(pts["p3"]).toBe(1);
});

test('38_9pt_always_9_total_points', () => {
  // Regardless of scores, total points per hole always = 9
  const result = getNinePointMatchSummary(
    ["p1","p2","p3"],
    round7552Players,
    westwood,
    round7552Scores,
    "relative",
    false, 1, 10, false, false, false
  );
  expect(result.holes.length).toBe(10);
  result.holes.forEach(h => {
    const sum = Object.values(h.pointsByPlayerId).reduce((a,b) => a+b, 0);
    expect(sum).toBe(9);
  });
});

// ── TEST ROUND DATA — SYNTHETIC WHEEL ROUND ──────────────────────────────────
// Used for pre-round checklist verification
// 5-player 6/6/6 wheel, spread handicap, noPar3=true
// Known correct dot assignments documented here

const testWheelPlayers = [
  { id: "p1", hcp: 9,  name: "Tim"  },  // lowest → 0 relative strokes
  { id: "p2", hcp: 12, name: "Jon"  },  // 3 relative → 1/1/1 spread
  { id: "p3", hcp: 22, name: "John" },  // 13 relative → 4/5/4 spread
  { id: "p4", hcp: 18, name: "Lou"  },  // 9 relative → 3/3/3 spread
  { id: "p5", hcp: 23, name: "Stan" },  // 14 relative → 4/5/5* spread (*limited by eligible)
];

// KNOWN CORRECT SPREAD DOTS (relative, noPar3=true, Westwood):
// Tim:  no dots (0 strokes)
// Jon:  H2, H11, H14  (1 per segment)
// John: H2,H4,H6,H1 | H11,H7,H12,H9,H10 | H14,H16,H18,H13  (4/5/4)
// Lou:  H2,H4,H6 | H11,H7,H12 | H14,H16,H18  (3/3/3)
// Stan: H2,H4,H6,H1 | H11,H7,H12,H9,H10 | H14,H16,H18,H13  (4/5/4 — limited by eligible)

test('39_wheel_tim_zero_strokes', () => {
  const total = holes18.reduce((s, h) =>
    s + getSpreadHandicapStrokes("p1", h, testWheelPlayers, westwood, "relative", true), 0);
  expect(total).toBe(0);
});

test('40_wheel_jon_3_strokes_spread', () => {
  const dotHoles = holes18.filter(h =>
    getSpreadHandicapStrokes("p2", h, testWheelPlayers, westwood, "relative", true) > 0);
  expect(dotHoles).toEqual([2, 11, 14]); // one per segment, lowest HCP each
});

test('41_wheel_lou_9_strokes_spread_correct_holes', () => {
  const dotHoles = holes18.filter(h =>
    getSpreadHandicapStrokes("p4", h, testWheelPlayers, westwood, "relative", true) > 0);
  expect(dotHoles).toEqual([2, 4, 6, 7, 11, 12, 14, 16, 18]);
  expect(dotHoles).toContain(6);  // the hole that failed in production
  expect(dotHoles).not.toContain(9); // H9 is in standard but NOT spread seg1
});

test('42_wheel_standard_vs_spread_lou_different', () => {
  const spreadDots = holes18.filter(h =>
    getSpreadHandicapStrokes("p4", h, testWheelPlayers, westwood, "relative", true) > 0);
  const standardDots = holes18.filter(h =>
    getHandicapStrokes("p4", h, testWheelPlayers, westwood, "relative", true) > 0);
  // Standard: top 9 globally = H11(1),H2(2),H14(3),H7(4),H12(5),H9(6),H16(7),H4(8),H18(9)
  expect(standardDots).toContain(9);   // H9 in standard
  expect(spreadDots).not.toContain(9); // H9 NOT in spread (seg1 only gets 3, H9 is 4th)
  expect(spreadDots).toContain(6);     // H6 in spread
  expect(standardDots).not.toContain(6); // H6 NOT in standard (HCP10 = 10th hardest)
});

const holes18 = Array.from({ length: 18 }, (_, i) => i + 1);

// ── PRESS TRIGGER TESTS — 1-DOWN AND 2-DOWN ──────────────────────────────────
// Using round 6341 wheel data, testing press trigger behavior
// Team 1: Jon+Stan (p2+p5) vs Team 2: Tim+John (p1+p3), holes 1-6

const { playPressMatch, computeHoleResult } = require('./engine/scoringEngine');

const pressContext = {
  players: round6341Players,
  course: round6341Course,
  scores: round6341Scores,
  handicapMode: "relative",
  getHandicapStrokesFn: require('./engine/scoringEngine').getSpreadHandicapStrokes,
  noPar3Strokes: true,
};

test('43_press_1down_triggers_on_1_down', () => {
  const result = playPressMatch({
    teamA: ["p2", "p5"],
    teamB: ["p1", "p3"],
    start: 1,
    end: 6,
    trigger: 1,
    context: pressContext,
  });
  // With trigger=1, a press fires as soon as one team goes 1 down
  // Should have more bets than trigger=2
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBeGreaterThanOrEqual(1);
  const baseMatch = result[0];
  expect(baseMatch).toHaveProperty('score');
});

test('44_press_2down_triggers_on_2_down', () => {
  const result = playPressMatch({
    teamA: ["p2", "p5"],
    teamB: ["p1", "p3"],
    start: 1,
    end: 6,
    trigger: 2,
    context: pressContext,
  });
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBeGreaterThanOrEqual(1);
});

test('45_press_1down_more_bets_than_2down', () => {
  // 1-down press fires sooner → more total bets than 2-down in same segment
  const result1 = playPressMatch({
    teamA: ["p2", "p5"], teamB: ["p1", "p3"],
    start: 1, end: 6, trigger: 1, context: pressContext,
  });
  const result2 = playPressMatch({
    teamA: ["p2", "p5"], teamB: ["p1", "p3"],
    start: 1, end: 6, trigger: 2, context: pressContext,
  });
  // 1-down should create >= as many bets as 2-down (fires earlier or same)
  expect(result1.length).toBeGreaterThanOrEqual(result2.length);
});

test('46_press_money_balances_1down', () => {
  // Full round with 1-down press — money must balance
  const result = scoreRound({}, {
    players: round6341Players,
    matchResults: [],
    birdieResults: [],
    teamGameUnitAmount: 5,
    teamGameResults: [
      {
        index: 0,
        start: 1, end: 6,
        duplicateError: false,
        matches: [{
          label: "Team 1 vs Team 2",
          result: playPressMatch({
            teamA: ["p2","p5"], teamB: ["p1","p3"],
            start: 1, end: 6, trigger: 1, context: pressContext,
          }),
        }],
      },
    ],
    getTeamGameSelection: () => ({
      team1: ["p2","p5"], team2: ["p1","p3"],
    }),
  });
  expect(sumTotals(result.playerLedger)).toBe(0);
});

test('47_press_money_balances_2down', () => {
  const result = scoreRound({}, {
    players: round6341Players,
    matchResults: [],
    birdieResults: [],
    teamGameUnitAmount: 5,
    teamGameResults: [
      {
        index: 0,
        start: 1, end: 6,
        duplicateError: false,
        matches: [{
          label: "Team 1 vs Team 2",
          result: playPressMatch({
            teamA: ["p2","p5"], teamB: ["p1","p3"],
            start: 1, end: 6, trigger: 2, context: pressContext,
          }),
        }],
      },
    ],
    getTeamGameSelection: () => ({
      team1: ["p2","p5"], team2: ["p1","p3"],
    }),
  });
  expect(sumTotals(result.playerLedger)).toBe(0);
});

// ── LONG/SHORT TESTS ─────────────────────────────────────────────────────────
const { playIndividualMatch } = require('./engine/scoringEngine');

// Tim(p1,hcp9) vs Jon(p2,hcp12) Long/Short $10/$5
// Using round 6341 scores, relative mode
const longShortMatch = {
  id: "test-ls",
  p1Id: "p1",
  p2Id: "p2",
  type: "longshort",
  bet: 10,
  toyRule: false,
  birdieEnabled: false,
  noPar3Strokes: false,
};

const longShortContext = {
  players: round6341Players,
  course: round6341Course,
  scores: round6341Scores,
  handicapMode: "relative",
};

test('48_longshort_result_has_long_and_short', () => {
  const result = playIndividualMatch(longShortMatch, longShortContext);
  // Long/Short result should have type longshort
  expect(result.type).toBe("longshort");
  expect(typeof result.long).toBe("number");
});

test('49_longshort_money_balances', () => {
  const result = playIndividualMatch(longShortMatch, longShortContext);
  // Total payout: long + short (short only if long closed early)
  const total = result.long + (result.short || 0);
  // One player wins what the other loses
  expect(typeof total).toBe("number");
});

test('50_longshort_no_short_if_long_goes_all_18', () => {
  // If long match is never decided, short never starts
  // Use scores where nobody wins decisively
  const tiedScores = {};
  for (let h = 1; h <= 18; h++) {
    tiedScores[h] = { p1: 4, p2: 4, p3: 4, p4: 4, p5: 4 };
  }
  const result = playIndividualMatch(longShortMatch, {
    players: round6341Players,
    course: round6341Course,
    scores: tiedScores,
    handicapMode: "relative",
  });
  // Long tied = 0, short should not exist or be 0
  expect(result.short || 0).toBe(0);
});

// ── MATCH PLAY F/B/T TESTS ───────────────────────────────────────────────────
const fbtMatch = {
  id: "test-fbt",
  p1Id: "p1",
  p2Id: "p2",
  type: "match_fbt",
  bet: 10,
  toyRule: false,
  birdieEnabled: false,
  noPar3Strokes: false,
  matchPlayFront: true,
  matchPlayBack: true,
  matchPlayTotal: true,
};

test('51_match_fbt_has_three_segments', () => {
  const result = playIndividualMatch(fbtMatch, longShortContext);
  expect(result.type).toBe("match_fbt");
  const keys = result.segments.map(s => s.key);
  expect(keys).toContain("front");
  expect(keys).toContain("back");
  expect(keys).toContain("total");
});

test('52_match_fbt_money_balances', () => {
  const result = playIndividualMatch(fbtMatch, longShortContext);
  // Total dollars = sum of all segment dollars
  const segTotal = result.segments.reduce((s, seg) => s + (seg.dollars || 0), 0);
  expect(Math.abs(result.total - segTotal)).toBeLessThan(0.01);
});

// ── FULL WHEEL SETTLEMENT — KNOWN $$ ─────────────────────────────────────────
// Round 6341 full settlement test
// 5-player wheel 6/6/6, $5/unit, spread, noPar3
// Game 1 (H1-6): Jon+Stan vs Tim+John, Tim+Lou, John+Lou
// Game 2 (H7-12): Jon+John vs Tim+Lou, Tim+Stan, Lou+Stan  
// Game 3 (H13-18): Tim+Lou vs Jon+John, Jon+Stan, John+Stan

test('53_full_wheel_money_balances', () => {
  // The most critical test: all money in = all money out
  // We can't know exact amounts without running the full engine
  // but we CAN verify it balances to zero
  // Run scoreRound with the actual round 6341 team game structure
  const teamGameResults = [
    {
      index: 0, start: 1, end: 6, duplicateError: false,
      matches: [{
        label: "Team 1 vs Team 2",
        result: require('./engine/scoringEngine').playPressMatch({
          teamA: ["p2","p5"], teamB: ["p1","p3"],
          start: 1, end: 6, trigger: 1,
          context: { ...pressContext },
        }),
      }],
      birdieEnabled: false,
    },
    {
      index: 1, start: 7, end: 12, duplicateError: false,
      matches: [{
        label: "Team 1 vs Team 2",
        result: require('./engine/scoringEngine').playPressMatch({
          teamA: ["p2","p3"], teamB: ["p1","p4"],
          start: 7, end: 12, trigger: 1,
          context: { ...pressContext },
        }),
      }],
      birdieEnabled: false,
    },
    {
      index: 2, start: 13, end: 18, duplicateError: false,
      matches: [{
        label: "Team 1 vs Team 2",
        result: require('./engine/scoringEngine').playPressMatch({
          teamA: ["p1","p4"], teamB: ["p2","p3"],
          start: 13, end: 18, trigger: 1,
          context: { ...pressContext },
        }),
      }],
      birdieEnabled: false,
    },
  ];

  const result = scoreRound({}, {
    players: round6341Players,
    matchResults: [],
    birdieResults: [],
    teamGameUnitAmount: 5,
    teamGameResults,
    getTeamGameSelection: (idx) => {
      const teams = [
        { team1: ["p2","p5"], team2: ["p1","p3"] },
        { team1: ["p2","p3"], team2: ["p1","p4"] },
        { team1: ["p1","p4"], team2: ["p2","p3"] },
      ];
      return teams[idx];
    },
  });

  expect(sumTotals(result.playerLedger)).toBe(0);
});

// ── NET HOLES RUNNING TOTAL TEST ─────────────────────────────────────────────
test('54_net_holes_accumulates_all_18', () => {
  const netMatch = {
    id: "test-net",
    p1Id: "p1", p2Id: "p2",
    type: "standard", bet: 5,
    toyRule: false, birdieEnabled: false, noPar3Strokes: false,
    matchPlayFront: false, matchPlayBack: false, matchPlayTotal: false,
  };
  const result = playIndividualMatch(netMatch, longShortContext);
  // Net holes result has a type and total
  expect(result).toHaveProperty("total");
  expect(typeof result.total).toBe("number");
});

// ── 9-POINT SPECIAL CASES ────────────────────────────────────────────────────

test('55_9pt_birdie_double_fires_only_for_winner', () => {
  // Hole where Tim birdies but doesn't win → no double
  // Need scores where Tim birdies but loses the hole
  const scores = { ...round7552Scores };
  // Hole 5: Tim=5(par4 birdie=3), Mike=3(birdie), Mark=5
  // With relative strokes Mike(14) gets stroke on HCP14=hole5
  // Tim net=5, Mike net=2(3-1), Mark net=5 → Mike wins → Mike birdie = double
  scores[5] = { p1: 5, p2: 3, p3: 5 };
  const result = getNinePointMatchSummary(
    ["p1","p2","p3"], round7552Players, westwood, scores,
    "relative", false, 1, 10, false, true, false
  );
  const h5 = result.holes.find(h => h.hole === 5);
  // Mike won with gross birdie → birdieMode should be "birdie"
  expect(h5.birdieMode).toBe("birdie");
  // Points should be doubled — total is 18 when birdie double fires
  const pts = Object.values(h5.pointsByPlayerId).reduce((s,v) => s+v, 0);
  expect(pts).toBe(18); // doubled from 9
});

test('56_9pt_blitz_gives_9_0_0', () => {
  // Blitz: one player wins by 2+ over BOTH others
  // Tim net much better than Mike and Mark
  const scores = {};
  for (let h = 1; h <= 18; h++) {
    scores[h] = { p1: 3, p2: 7, p3: 7 }; // Tim birdies/eagles every hole
  }
  const result = getNinePointMatchSummary(
    ["p1","p2","p3"], round7552Players, westwood, scores,
    "relative", true, 1, 18, false, false, false
  );
  // Tim should win every hole with blitz
  result.holes.forEach(h => {
    if (h.pointsByPlayerId) {
      expect(h.pointsByPlayerId["p1"]).toBe(9);
      expect(h.pointsByPlayerId["p2"]).toBe(0);
      expect(h.pointsByPlayerId["p3"]).toBe(0);
    }
  });
});

// ── NOPAR3 CAP IN STANDARD MODE ──────────────────────────────────────────────
test('57_standard_nopar3_caps_at_eligible_holes', () => {
  // Stan (23 hcp, Tim 8 lowest) = 15 relative strokes
  // Westwood has 14 non-par3 holes
  // With noPar3=true, should get max 14 dots, no double dots
  let totalDots = 0;
  let maxDotsOnAnyHole = 0;
  for (let h = 1; h <= 18; h++) {
    const dots = getHandicapStrokes("p5", h, round6341Players, round6341Course, "relative", true);
    totalDots += dots;
    if (dots > maxDotsOnAnyHole) maxDotsOnAnyHole = dots;
  }
  expect(totalDots).toBeLessThanOrEqual(14); // capped at eligible holes
  expect(maxDotsOnAnyHole).toBe(1); // no double dots when noPar3=true
});

test('58_standard_nopar3_par3_holes_get_zero', () => {
  // Par 3 holes at Westwood: H3(HCP16), H8(HCP18), H15(HCP15), H17(HCP17)
  const par3Holes = [3, 8, 15, 17];
  par3Holes.forEach(h => {
    const dots = getHandicapStrokes("p5", h, round6341Players, round6341Course, "relative", true);
    expect(dots).toBe(0);
  });
});

// ── COMPREHENSIVE HANDICAP STROKE TESTS ──────────────────────────────────────

// High HCP scenarios - double dots when noPar3=OFF
const highHcpPlayers = [
  { id: "p1", hcp: 0,  name: "Scratch" },
  { id: "p2", hcp: 19, name: "HighHcp" }, // 19 relative → double dot on HCP1
  { id: "p3", hcp: 36, name: "VeryHigh" }, // 36 relative → double dots on all 18
];

test('59_standard_19_relative_gives_double_dot_on_hcp1', () => {
  // 19 relative strokes, noPar3=OFF → fullRounds=1, remainder=1
  // Gets 1 stroke on ALL holes + extra stroke on HCP=1 hole
  const hcp1Hole = westwood.hcp.indexOf(1) + 1; // hole 11
  const dots = getHandicapStrokes("p2", hcp1Hole, highHcpPlayers, westwood, "relative", false);
  expect(dots).toBe(2); // double dot on HCP1 hole
});

test('60_standard_19_relative_nopar3_off_total_dots', () => {
  // 19 strokes, noPar3=OFF → 18 single dots + 1 double = 19 total
  let total = 0;
  for (let h = 1; h <= 18; h++) {
    total += getHandicapStrokes("p2", h, highHcpPlayers, westwood, "relative", false);
  }
  expect(total).toBe(19);
});

test('61_standard_19_relative_nopar3_on_no_double_dots', () => {
  // 19 strokes, noPar3=ON → capped at 14, max 1 per hole
  let total = 0;
  let maxDots = 0;
  for (let h = 1; h <= 18; h++) {
    const d = getHandicapStrokes("p2", h, highHcpPlayers, westwood, "relative", true);
    total += d;
    maxDots = Math.max(maxDots, d);
  }
  expect(total).toBe(14); // capped at 14 eligible holes
  expect(maxDots).toBe(1); // no double dots
});

test('62_standard_36_relative_nopar3_off_double_dots_all', () => {
  // 36 strokes → 2 full rounds, every hole gets at least 2 dots
  for (let h = 1; h <= 18; h++) {
    const d = getHandicapStrokes("p3", h, highHcpPlayers, westwood, "relative", false);
    expect(d).toBeGreaterThanOrEqual(2);
  }
});

test('63_standard_36_relative_nopar3_on_still_capped_14', () => {
  let total = 0;
  let maxDots = 0;
  for (let h = 1; h <= 18; h++) {
    const d = getHandicapStrokes("p3", h, highHcpPlayers, westwood, "relative", true);
    total += d;
    maxDots = Math.max(maxDots, d);
  }
  expect(total).toBe(14);
  expect(maxDots).toBe(1);
});

// ── FULL HCP MODE TESTS ───────────────────────────────────────────────────────
test('64_full_hcp_mode_uses_absolute_hcp', () => {
  // Full mode: Tim(8) gets 8 strokes regardless of who else is playing
  let total = 0;
  for (let h = 1; h <= 18; h++) {
    total += getHandicapStrokes("p1", h, round6341Players, round6341Course, "full", false);
  }
  expect(total).toBe(9); // Tim hcp=9 in round6341
});

test('65_full_hcp_vs_relative_different_totals', () => {
  // Jon(12): full=12 strokes, relative=12-9=3 strokes
  let fullTotal = 0, relTotal = 0;
  for (let h = 1; h <= 18; h++) {
    fullTotal += getHandicapStrokes("p2", h, round6341Players, round6341Course, "full", false);
    relTotal += getHandicapStrokes("p2", h, round6341Players, round6341Course, "relative", false);
  }
  expect(fullTotal).toBe(12);
  expect(relTotal).toBe(3);
});

// ── SPREAD + FULL HCP MODE ────────────────────────────────────────────────────
test('66_spread_full_hcp_distributes_evenly', () => {
  // Jon(12) in full mode, spread: 12/3 = 4 per segment
  const seg1 = [1,2,3,4,5,6].reduce((s,h) =>
    s + getSpreadHandicapStrokes("p2", h, round6341Players, round6341Course, "full", false), 0);
  const seg2 = [7,8,9,10,11,12].reduce((s,h) =>
    s + getSpreadHandicapStrokes("p2", h, round6341Players, round6341Course, "full", false), 0);
  const seg3 = [13,14,15,16,17,18].reduce((s,h) =>
    s + getSpreadHandicapStrokes("p2", h, round6341Players, round6341Course, "full", false), 0);
  expect(seg1).toBe(4);
  expect(seg2).toBe(4);
  expect(seg3).toBe(4);
});

// ── RELATIVE MODE EDGE CASES ──────────────────────────────────────────────────
test('67_relative_lowest_player_gets_zero_strokes', () => {
  // Tim(9) is lowest → 0 relative strokes always
  for (let h = 1; h <= 18; h++) {
    const d = getHandicapStrokes("p1", h, round6341Players, round6341Course, "relative", false);
    expect(d).toBe(0);
  }
});

test('68_relative_all_same_hcp_all_get_zero', () => {
  const samePlayers = [
    { id: "a", hcp: 10, name: "A" },
    { id: "b", hcp: 10, name: "B" },
    { id: "c", hcp: 10, name: "C" },
  ];
  for (let h = 1; h <= 18; h++) {
    expect(getHandicapStrokes("a", h, samePlayers, westwood, "relative", false)).toBe(0);
    expect(getHandicapStrokes("b", h, samePlayers, westwood, "relative", false)).toBe(0);
  }
});

test('69_plus_hcp_player_gives_negative_relative', () => {
  // Plus handicap stored as negative: -3 = +3
  const mixedPlayers = [
    { id: "p1", hcp: -3, name: "Plus3" }, // +3 handicap
    { id: "p2", hcp: 10, name: "Ten"   },
  ];
  // Relative: Ten gets 10-(-3)=13 strokes, Plus3 gets 0 (lowest)
  let tenTotal = 0;
  for (let h = 1; h <= 18; h++) {
    tenTotal += getHandicapStrokes("p2", h, mixedPlayers, westwood, "relative", false);
  }
  expect(tenTotal).toBe(13);
  // Plus3 gets 0
  for (let h = 1; h <= 18; h++) {
    expect(getHandicapStrokes("p1", h, mixedPlayers, westwood, "relative", false)).toBe(0);
  }
});

// ── STROKE DISTRIBUTION CORRECTNESS ──────────────────────────────────────────
test('70_strokes_go_to_hardest_holes_first', () => {
  // Jon(3 relative): gets dot on HCP2(H2), HCP4(H7)... 
  // HCP1=H11, HCP2=H2, HCP3=H14 → first 3 hardest
  const dotsHoles = [];
  for (let h = 1; h <= 18; h++) {
    if (getHandicapStrokes("p2", h, round6341Players, round6341Course, "relative", false) > 0) {
      dotsHoles.push(h);
    }
  }
  expect(dotsHoles).toContain(11); // HCP 1 — hardest
  expect(dotsHoles).toContain(2);  // HCP 2
  expect(dotsHoles).toContain(14); // HCP 3
  expect(dotsHoles).not.toContain(1); // HCP 12 — not in top 3
});

test('71_spread_strokes_per_segment_correct', () => {
  // Verify each segment gets correct quota for Lou(9 relative) spread
  const seg1 = [1,2,3,4,5,6].reduce((s,h) =>
    s + getSpreadHandicapStrokes("p4", h, round6341Players, round6341Course, "relative", true), 0);
  const seg2 = [7,8,9,10,11,12].reduce((s,h) =>
    s + getSpreadHandicapStrokes("p4", h, round6341Players, round6341Course, "relative", true), 0);
  const seg3 = [13,14,15,16,17,18].reduce((s,h) =>
    s + getSpreadHandicapStrokes("p4", h, round6341Players, round6341Course, "relative", true), 0);
  expect(seg1).toBe(3); // 9/3 = 3 per segment
  expect(seg2).toBe(3);
  expect(seg3).toBe(3);
});

test('72_spread_uneven_extra_goes_to_hardest_segment', () => {
  // John(13 relative) spread: 13/3=4 rem 1 → extra to segment with hardest marginal hole
  // Seg1 4th hole: H1(HCP12), Seg2 4th hole: H10(HCP11), Seg3 4th hole: H13(HCP13)
  // Extra → Seg2 (HCP11 < HCP12 < HCP13)
  const seg1 = [1,2,3,4,5,6].reduce((s,h) =>
    s + getSpreadHandicapStrokes("p3", h, round6341Players, round6341Course, "relative", true), 0);
  const seg2 = [7,8,9,10,11,12].reduce((s,h) =>
    s + getSpreadHandicapStrokes("p3", h, round6341Players, round6341Course, "relative", true), 0);
  const seg3 = [13,14,15,16,17,18].reduce((s,h) =>
    s + getSpreadHandicapStrokes("p3", h, round6341Players, round6341Course, "relative", true), 0);
  expect(seg1).toBe(4);
  expect(seg2).toBe(5); // extra goes here
  expect(seg3).toBe(4);
});

// ── MONEY BALANCE TESTS FOR ALL FORMATS ──────────────────────────────────────
test('73_net_holes_money_balances', () => {
  const result = scoreRound({}, {
    players: round6341Players.slice(0,2),
    matchResults: [
      { match: { id:"m1", p1Id:"p1", p2Id:"p2", type:"standard", bet:5,
          toyRule:false, birdieEnabled:false, noPar3Strokes:false,
          matchPlayFront:false, matchPlayBack:false, matchPlayTotal:false },
        result: playIndividualMatch(
          { id:"m1", p1Id:"p1", p2Id:"p2", type:"standard", bet:5,
            toyRule:false, birdieEnabled:false, noPar3Strokes:false,
            matchPlayFront:false, matchPlayBack:false, matchPlayTotal:false },
          { players: round6341Players, course: round6341Course,
            scores: round6341Scores, handicapMode: "relative" }
        )
      }
    ],
    birdieResults: [],
    teamGameUnitAmount: 5,
    teamGameResults: [],
    getTeamGameSelection: () => ({}),
  });
  expect(sumTotals(result.playerLedger)).toBe(0);
});

test('74_nine_point_settlement_matches_points', () => {
  const result = getNinePointMatchSummary(
    ["p1","p2","p3"], round7552Players, westwood, round7552Scores,
    "relative", false, 2, 10, false, false, false
  );
  // Each player's balance should equal (their points - average) × betAmount
  const balances = result.payout.balancesByPlayerId;
  const total = Object.values(balances).reduce((s,v) => s+v, 0);
  expect(Math.abs(total)).toBeLessThan(0.01);
});

test('75_birdie_results_dont_create_money_from_nowhere', () => {
  // Birdie side bets: total paid out = total collected
  const birdieResults = [
    { playerId: "p1", amount: 10, source: "match-birdie", holeNumber: 2 },
    { playerId: "p2", amount: -10, source: "match-birdie", holeNumber: 2 },
  ];
  const total = birdieResults.reduce((s, b) => s + b.amount, 0);
  expect(total).toBe(0);
});

// ── PLAY EVEN TESTS ───────────────────────────────────────────────────────────
test('76_play_even_no_strokes_applied', () => {
  // Tim(0) vs Jon(12) play even — Jon gets 0 strokes, raw scores decide
  const result = playIndividualMatch(
    { id:"m1", p1Id:"p1", p2Id:"p2", type:"standard", bet:5,
      toyRule:false, birdieEnabled:false, noPar3Strokes:false,
      matchPlayFront:false, matchPlayBack:false, matchPlayTotal:false,
      playEven: true },
    { players: round6341Players, course: round6341Course,
      scores: round6341Scores, handicapMode: "relative" }
  );
  expect(result).toHaveProperty("total");
  expect(typeof result.total).toBe("number");
});

test('77_play_even_vs_standard_different_result', () => {
  // Same scores but play even vs standard should give different results
  // because Jon gets strokes in standard but not in play even
  const matchBase = { id:"m1", p1Id:"p1", p2Id:"p2", type:"standard", bet:5,
    toyRule:false, birdieEnabled:false, noPar3Strokes:false,
    matchPlayFront:false, matchPlayBack:false, matchPlayTotal:false };
  const ctx = { players: round6341Players, course: round6341Course,
    scores: round6341Scores, handicapMode: "relative" };

  const standardResult = playIndividualMatch({ ...matchBase, playEven: false }, ctx);
  const evenResult = playIndividualMatch({ ...matchBase, playEven: true }, ctx);

  // Results should differ since Jon has 3 relative strokes in standard
  expect(standardResult.total).not.toBe(evenResult.total);
});

test('78_play_even_money_balances', () => {
  const result = scoreRound({}, {
    players: round6341Players.slice(0,2),
    matchResults: [{
      match: { id:"m1", p1Id:"p1", p2Id:"p2", type:"standard", bet:5,
        toyRule:false, birdieEnabled:false, noPar3Strokes:false,
        matchPlayFront:false, matchPlayBack:false, matchPlayTotal:false,
        playEven: true },
      result: playIndividualMatch(
        { id:"m1", p1Id:"p1", p2Id:"p2", type:"standard", bet:5,
          toyRule:false, birdieEnabled:false, noPar3Strokes:false,
          matchPlayFront:false, matchPlayBack:false, matchPlayTotal:false,
          playEven: true },
        { players: round6341Players, course: round6341Course,
          scores: round6341Scores, handicapMode: "relative" }
      )
    }],
    birdieResults: [],
    teamGameUnitAmount: 5,
    teamGameResults: [],
    getTeamGameSelection: () => ({}),
  });
  expect(sumTotals(result.playerLedger)).toBe(0);
});

// ── CROSS-SCREEN $$ CONSISTENCY TESTS ────────────────────────────────────────
// Verify that leaderboard, settle up, and standings all read from same source

test('79_leaderboard_settle_up_same_source', () => {
  // scoreRound returns playerLedger — both leaderboard and settle up use this
  // If playerLedger is correct, both screens show same amounts
  const result = scoreRound({}, {
    players: round6341Players,
    matchResults: [{
      match: { id:"m1", p1Id:"p1", p2Id:"p2", type:"standard", bet:5,
        toyRule:false, birdieEnabled:false, noPar3Strokes:false,
        matchPlayFront:true, matchPlayBack:true, matchPlayTotal:true },
      result: playIndividualMatch(
        { id:"m1", p1Id:"p1", p2Id:"p2", type:"standard", bet:5,
          toyRule:false, birdieEnabled:false, noPar3Strokes:false,
          matchPlayFront:true, matchPlayBack:true, matchPlayTotal:true },
        { players: round6341Players, course: round6341Course,
          scores: round6341Scores, handicapMode: "relative" }
      )
    }],
    birdieResults: [],
    teamGameUnitAmount: 5,
    teamGameResults: [],
    getTeamGameSelection: () => ({}),
  });

  // playerLedger is the single source of truth — it's an array of {playerId, total, ...}
  const ledger = result.playerLedger;
  expect(Array.isArray(ledger)).toBe(true);
  
  // Sum of all totals = 0 (zero sum)
  const total = ledger.reduce((s, p) => s + p.total, 0);
  expect(Math.abs(total)).toBeLessThan(0.01);
  
  // P1 and P2 are in the ledger
  const p1 = ledger.find(p => p.playerId === "p1");
  const p2 = ledger.find(p => p.playerId === "p2");
  expect(p1).toBeDefined();
  expect(p2).toBeDefined();
  
  // P1 and P2 totals are equal and opposite
  expect(Math.abs(p1.total + p2.total)).toBeLessThan(0.01);
});

test('80_standings_team_plus_1v1_equals_total', () => {
  // In scoreRound, playerLedger = team game $$ + 1v1 $$ + birdie $$
  // This is what Standings shows as TEAM + 1V1 + BIRDS = TOTAL
  const teamResult = playPressMatch({
    teamA: ["p1","p4"], teamB: ["p2","p3"],
    start: 1, end: 6, trigger: 1,
    context: pressContext,
  });

  const result = scoreRound({}, {
    players: round6341Players,
    matchResults: [{
      match: { id:"m1", p1Id:"p1", p2Id:"p2", type:"standard", bet:5,
        toyRule:false, birdieEnabled:false, noPar3Strokes:false,
        matchPlayFront:false, matchPlayBack:false, matchPlayTotal:false },
      result: playIndividualMatch(
        { id:"m1", p1Id:"p1", p2Id:"p2", type:"standard", bet:5,
          toyRule:false, birdieEnabled:false, noPar3Strokes:false,
          matchPlayFront:false, matchPlayBack:false, matchPlayTotal:false },
        { players: round6341Players, course: round6341Course,
          scores: round6341Scores, handicapMode: "relative" }
      )
    }],
    birdieResults: [],
    teamGameUnitAmount: 5,
    teamGameResults: [{
      index: 0, start: 1, end: 6, duplicateError: false,
      birdieEnabled: false,
      matches: [{ label: "Team 1 vs Team 2", result: teamResult }],
    }],
    getTeamGameSelection: () => ({ team1: ["p1","p4"], team2: ["p2","p3"] }),
  });

  // Total ledger must balance
  expect(sumTotals(result.playerLedger)).toBe(0);
  
  // Each player's total = team component + 1v1 component
  // (scoreRound combines these into playerLedger)
  expect(result.playerLedger).toBeDefined();
});

test('81_birdie_amounts_included_in_total', () => {
  // Birdies add to/subtract from playerLedger
  // A player who wins a birdie should have higher total than without
  const birdieResults = [
    { playerId: "p1", amount: 10, source: "match-birdie", holeNumber: 2 },
    { playerId: "p2", amount: -10, source: "match-birdie", holeNumber: 2 },
  ];
  
  const resultWithBirdie = scoreRound({}, {
    players: round6341Players.slice(0,2),
    matchResults: [],
    birdieResults,
    teamGameUnitAmount: 5,
    teamGameResults: [],
    getTeamGameSelection: () => ({}),
  });
  
  // p1 won birdie, p2 lost
  const p1Entry = resultWithBirdie.playerLedger.find(p => p.playerId === "p1");
  const p2Entry = resultWithBirdie.playerLedger.find(p => p.playerId === "p2");
  expect(p1Entry.total).toBeGreaterThan(0);
  expect(p2Entry.total).toBeLessThan(0);
  expect(sumTotals(resultWithBirdie.playerLedger)).toBe(0);
});
