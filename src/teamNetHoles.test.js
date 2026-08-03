const { playTeamMatch } = require('./engine/scoringEngine');

// Zero-handicap players for full, direct control over gross=net scores.
const players = [
  { id: 'p1', name: 'Tim', hcp: 0 },
  { id: 'p2', name: 'Lou', hcp: 0 },
  { id: 'p3', name: 'Jon', hcp: 0 },
  { id: 'p4', name: 'Stan', hcp: 0 },
];
const course = {
  pars: Array(18).fill(4),
  hcp: Array.from({ length: 18 }, (_, i) => i + 1),
};

test('CONFIRMED REAL BUG (Aug 2026): team Net Holes now pays per hole won, not a flat amount regardless of margin', () => {
  // Team A (p1/p2 best ball) wins holes 1-3 clearly, everything else tied
  // — a genuine 3-hole net margin, not just "won."
  const scores = {};
  for (let h = 1; h <= 3; h++) scores[h] = { p1: 3, p2: 5, p3: 5, p4: 5 }; // team A wins these
  for (let h = 4; h <= 18; h++) scores[h] = { p1: 4, p2: 4, p3: 4, p4: 4 }; // tied the rest

  const match = { type: 'standard', bet: 5, teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] };
  const context = { players, course, scores, handicapMode: 'relative', noPar3TeamGame: false };

  const result = playTeamMatch(match, context);

  // Real margin is 3 holes at $5/hole = $15 — NOT a flat $5 regardless
  // of margin, which was the actual bug.
  expect(result.total).toBe(15);
});

test('confirms this scales correctly with a genuinely different margin, not a coincidence of the first test', () => {
  const scores = {};
  for (let h = 1; h <= 5; h++) scores[h] = { p1: 3, p2: 5, p3: 5, p4: 5 }; // team A wins 5 holes this time
  for (let h = 6; h <= 18; h++) scores[h] = { p1: 4, p2: 4, p3: 4, p4: 4 };

  const match = { type: 'standard', bet: 5, teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] };
  const context = { players, course, scores, handicapMode: 'relative', noPar3TeamGame: false };

  const result = playTeamMatch(match, context);
  expect(result.total).toBe(25); // 5 holes x $5, genuinely different from the first test's 15
});

test('team A losing produces a correctly negative, magnitude-scaled total, not just a flat -bet', () => {
  const scores = {};
  for (let h = 1; h <= 2; h++) scores[h] = { p1: 5, p2: 5, p3: 3, p4: 5 }; // team B wins these 2
  for (let h = 3; h <= 18; h++) scores[h] = { p1: 4, p2: 4, p3: 4, p4: 4 };

  const match = { type: 'standard', bet: 5, teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] };
  const context = { players, course, scores, handicapMode: 'relative', noPar3TeamGame: false };

  const result = playTeamMatch(match, context);
  expect(result.total).toBe(-10); // 2 holes x $5, negative since team A lost
});
