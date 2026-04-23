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

//Test 2

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

//Test 3

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

//Test 4

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

// Test 5

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

// Test 6 Team Game Settlement

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

// Test 7 


// Test 8

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