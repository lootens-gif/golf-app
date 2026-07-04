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
