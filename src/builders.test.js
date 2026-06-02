import { buildBirdieResults } from './engine/scoringEngine';

// Test 1 Builder should return correct entries when match birdie enabled

test('birdie_builder_returns_entries_when_match_birdie_enabled', () => {
  const results = buildBirdieResults({
    matches: [
      {
        p1Id: 'A',
        p2Id: 'B',
        birdieEnabled: true,
        birdieBet: 5,
      },
    ],
    matchResults: [],
    teamGames: [],
    teamGameResults: [],
    scores: {
      1: {
        A: 3,
        B: 4,
      },
    },
    course: {
      pars: [4],
      hcp: [1],
    },
    getTeamGameSelection: () => null,
  });

  expect(results).toEqual([
    { playerId: 'A', amount: 5, holeNumber: 1, matchId: undefined, opponentId: 'B', source: 'match-birdie' },
    { playerId: 'B', amount: -5, holeNumber: 1, matchId: undefined, opponentId: 'A', source: 'match-birdie' },
  ]);
});

//Test 2 Builder should return empty array when no matches have birdie enabled

test('team_game_birdie_respects_toggle', () => {
  const enabledResults = buildBirdieResults({
    matches: [],
    matchResults: [],
    teamGames: [
      {
        birdieEnabled: true,
        birdieBet: 2,
      },
    ],
    teamGameResults: [
      {
        index: 0,
        start: 1,
        end: 1,
        matches: [
          {
            label: 'Team 1 vs Team 2',
          },
        ],
      },
    ],
    scores: {
      1: {
        A: 3, // birdie on par 4
        B: 4,
        C: 4,
        D: 5,
      },
    },
    course: {
      pars: [4],
      hcp: [1],
    },
    birdiesEnabled: true,
    getTeamGameSelection: () => ({
      team1: ['A', 'B'],
      team2: ['C', 'D'],
    }),
  });

  const disabledResults = buildBirdieResults({
    matches: [],
    matchResults: [],
    teamGames: [
      {
        birdieEnabled: false,
        birdieBet: 2,
      },
    ],
    teamGameResults: [
      {
        index: 0,
        start: 1,
        end: 1,
        matches: [
          {
            label: 'Team 1 vs Team 2',
          },
        ],
      },
    ],
    scores: {
      1: {
        A: 3,
        B: 4,
        C: 4,
        D: 5,
      },
    },
    course: {
      pars: [4],
      hcp: [1],
    },
    birdiesEnabled: false,
    getTeamGameSelection: () => ({
      team1: ['A', 'B'],
      team2: ['C', 'D'],
    }),
  });

  expect(enabledResults).toEqual([
    expect.objectContaining({ playerId: 'A', amount: 2 }),
    expect.objectContaining({ playerId: 'B', amount: 2 }),
    expect.objectContaining({ playerId: 'C', amount: -2 }),
    expect.objectContaining({ playerId: 'D', amount: -2 }),
  ]);

  expect(disabledResults).toEqual([]);
});

// Test 3 Builder should handle multiple matches with birdie enabled on same hole

test('nine_point_birdie_respects_game_toggle', () => {
  const enabledResults = buildBirdieResults({
    matches: [],
    matchResults: [
      {
        match: {
          gameType: 'ninePoint',
          p1Id: 'A',
          p2Id: 'B',
          p3Id: 'C',
          birdieEnabled: true,
          birdieBet: 3,
          startHole: 1,
          endHole: 1,
        },
      },
    ],
    teamGames: [],
    teamGameResults: [],
    scores: {
      1: {
        A: 3, // birdie on par 4
        B: 4,
        C: 5,
      },
    },
    course: {
      pars: [4],
      hcp: [1],
    },
    getTeamGameSelection: () => null,
  });

  const disabledResults = buildBirdieResults({
    matches: [],
    matchResults: [
      {
        match: {
          gameType: 'ninePoint',
          p1Id: 'A',
          p2Id: 'B',
          p3Id: 'C',
          birdieEnabled: false,
          birdieBet: 3,
          startHole: 1,
          endHole: 1,
        },
      },
    ],
    teamGames: [],
    teamGameResults: [],
    scores: {
      1: {
        A: 3,
        B: 4,
        C: 5,
      },
    },
    course: {
      pars: [4],
      hcp: [1],
    },
    getTeamGameSelection: () => null,
  });

  expect(enabledResults).toEqual([
    { playerId: 'A', amount: 3 },
    { playerId: 'B', amount: -3 },
    { playerId: 'A', amount: 3 },
    { playerId: 'C', amount: -3 },
  ]);

  expect(disabledResults).toEqual([]);
});

// Test 4 Builder should ignore players with no score on hole for team game birdie results

test('team_game_birdie_ignores_player_with_no_score_on_hole', () => {
  const results = buildBirdieResults({
    matches: [],
    matchResults: [],
    teamGames: [
      {
        birdieEnabled: true,
        birdieBet: 2,
      },
    ],
    teamGameResults: [
      {
        index: 0,
        start: 1,
        end: 1,
        matches: [
          {
            label: 'Team 1 vs Team 2',
          },
        ],
      },
    ],
    scores: {
      1: {
        A: 3, // birdie
        B: 4,
        C: 4,
        // D intentionally missing
      },
    },
    course: {
      pars: [4],
      hcp: [1],
    },
    birdiesEnabled: true,
    getTeamGameSelection: () => ({
      team1: ['A', 'B'],
      team2: ['C', 'D'],
    }),
  });

  expect(results).toEqual([
    expect.objectContaining({ playerId: 'A', amount: 2 }),
    expect.objectContaining({ playerId: 'B', amount: 2 }),
    expect.objectContaining({ playerId: 'C', amount: -2 }),
  ]);
});

// Test 5


test('nine_point_multiple_birdies_same_hole', () => {
  const results = buildBirdieResults({
    matches: [],
    matchResults: [
      {
        match: {
          gameType: 'ninePoint',
          p1Id: 'A',
          p2Id: 'B',
          p3Id: 'C',
          birdieEnabled: true,
          birdieBet: 3,
          startHole: 1,
          endHole: 1,
        },
      },
    ],
    teamGames: [],
    teamGameResults: [],
    scores: {
      1: {
        A: 3, // birdie
        B: 3, // birdie
        C: 4,
      },
    },
    course: {
      pars: [4],
      hcp: [1],
    },
    getTeamGameSelection: () => null,
  });

  expect(results).toEqual([
    { playerId: 'A', amount: 3 },
    { playerId: 'C', amount: -3 },
    { playerId: 'B', amount: 3 },
    { playerId: 'C', amount: -3 },
  ]);
});