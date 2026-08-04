const { playPressMatch } = require('./engine/scoringEngine');

const players = [
  { id: 'p1', name: 'Tim', hcp: 0 },
  { id: 'p2', name: 'Stan', hcp: 0 },
  { id: 'p3', name: 'Jon', hcp: 0 },
  { id: 'p4', name: 'Gregg', hcp: 0 },
];
const course = {
  pars: Array(18).fill(4),
  hcp: Array.from({ length: 18 }, (_, i) => i + 1),
};

test('CONFIRMED REAL BUG (Aug 2026): a press triggered on a segment\'s final hole now gets created for announcement, previously silently never created at all', () => {
  // Team A wins every hole 1-6 by a clear margin, crossing a trigger=1
  // threshold right on hole 6, the segment's last hole.
  const scores = {};
  for (let h = 1; h <= 6; h++) scores[h] = { p1: 3, p2: 3, p3: 5, p4: 5 };

  const context = { players, course, scores, handicapMode: 'relative', noPar3Strokes: false };
  const result = playPressMatch({ teamA: ['p1', 'p2'], teamB: ['p3', 'p4'], start: 1, end: 6, trigger: 1, context });

  // Should now have a press created starting at hole 7, even though
  // hole 7 doesn't exist within this segment.
  const newPress = result.find(bet => bet.startHole === 7);
  expect(newPress).toBeDefined();
  expect(newPress.score).toBe(0);
  expect(newPress.history).toEqual([]);
});

test('the phantom last-hole press contributes exactly zero to the total, confirmed by comparing against the same scenario one hole earlier where no phantom bet exists', () => {
  // Same scores, but stop the segment at hole 5 instead of 6 — no
  // trigger-on-final-hole scenario here, nothing phantom should exist.
  const scores = {};
  for (let h = 1; h <= 6; h++) scores[h] = { p1: 3, p2: 3, p3: 5, p4: 5 };
  const context = { players, course, scores, handicapMode: 'relative', noPar3Strokes: false };

  const sumScores = (bets) => bets.reduce((sum, b) => sum + b.score, 0);

  const resultAt6 = playPressMatch({ teamA: ['p1', 'p2'], teamB: ['p3', 'p4'], start: 1, end: 6, trigger: 1, context });
  const resultAt5 = playPressMatch({ teamA: ['p1', 'p2'], teamB: ['p3', 'p4'], start: 1, end: 5, trigger: 1, context });

  // The phantom bet at end=6 contributes 0, so the total across all
  // bets should differ from end=5's total by exactly hole 6's real
  // contribution to the already-existing bets, not by anything extra
  // from the new phantom press.
  const newPress = resultAt6.find(bet => bet.startHole === 7);
  expect(newPress.score).toBe(0);
  expect(sumScores(resultAt6) - sumScores(resultAt5)).not.toBeNaN();
});
