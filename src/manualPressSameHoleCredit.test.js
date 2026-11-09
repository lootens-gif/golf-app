// Updated Nov 2026. Tim's rule: the press is tapped during score entry for the
// hole being played, so the called hole counts (same as the August rule).
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

test('press tapped while entering hole 6 starts on hole 6 and counts it', () => {
  // Team A is 2 down after hole 5 (A lost 4 and 5), so Team A presses.
  const scores = {};
  for (let h = 1; h <= 3; h++) scores[h] = { p1: 4, p2: 4, p3: 4, p4: 4 };
  scores[4] = { p1: 5, p2: 5, p3: 3, p4: 3 }; // B wins
  scores[5] = { p1: 5, p2: 5, p3: 3, p4: 3 }; // B wins
  scores[6] = { p1: 3, p2: 3, p3: 5, p4: 5 }; // A wins hole 6

  const context = { players, course, scores, handicapMode: 'relative', noPar3Strokes: false };
  const result = playPressMatch({
    teamA: ['p1', 'p2'], teamB: ['p3', 'p4'], start: 1, end: 6,
    trigger: 99, manualPressHoles: [6], context,
  });
  const press = result.find((b) => b.manual === true);
  expect(press.startHole).toBe(6);
  expect(press.history).toEqual([1]); // hole 6 counts
  expect(press.score).toBe(1);
  const base = result.find((b) => b.label === 'Base Match');
  expect(base.score).toBe(-2 + 1); // -2 after hole 5, then hole 6 won by A
});

test('a press called mid-segment covers the called hole and every hole after it', () => {
  const scores = {};
  scores[1] = { p1: 4, p2: 4, p3: 4, p4: 4 };
  scores[2] = { p1: 3, p2: 3, p3: 5, p4: 5 }; // A wins (press called after this)
  scores[3] = { p1: 5, p2: 5, p3: 3, p4: 3 }; // B wins
  scores[4] = { p1: 3, p2: 3, p3: 5, p4: 5 }; // A wins

  const context = { players, course, scores, handicapMode: 'relative', noPar3Strokes: false };
  const result = playPressMatch({
    teamA: ['p1', 'p2'], teamB: ['p3', 'p4'], start: 1, end: 4,
    trigger: 99, manualPressHoles: [2], context,
  });
  const press = result.find((b) => b.manual === true);
  expect(press.startHole).toBe(2);
  expect(press.history).toEqual([1, -1, 1]); // holes 2-4
  expect(press.score).toBe(1);
});

test('a press called on the final hole covers that hole', () => {
  const scores = {};
  for (let h = 1; h <= 6; h++) scores[h] = { p1: 4, p2: 4, p3: 4, p4: 4 };
  const context = { players, course, scores, handicapMode: 'relative', noPar3Strokes: false };
  const result = playPressMatch({
    teamA: ['p1', 'p2'], teamB: ['p3', 'p4'], start: 1, end: 6,
    trigger: 99, manualPressHoles: [6], context,
  });
  expect(result.find((b) => b.manual === true).history).toEqual([0]);
});
