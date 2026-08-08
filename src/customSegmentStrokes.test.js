const { buildCustomSegmentStrokesFn } = require('./engine/scoringEngine');

const players = [
  { id: 'p1', name: 'Tim', hcp: 7 },
  { id: 'p2', name: 'Steve', hcp: 12 },
];
const course = {
  pars: Array(18).fill(4),
  // HCP ranking 1 = hardest. Segment 1 (holes 1-6): hole 3 is hardest
  // (hcp 1), hole 6 easiest (hcp 6). Segment 2 (holes 7-12): hole 10
  // hardest (hcp 1). This layout is deliberately not in simple 1-18
  // order, so the test genuinely proves per-segment ranking, not just
  // "first N holes happen to be hardest."
  hcp: [4, 5, 1, 3, 2, 6, 7, 8, 10, 1, 9, 12, 13, 14, 15, 16, 17, 18],
};

test('CONFIRMED: player with a flat 2-per-segment gets strokes on the 2 hardest holes within EACH segment, not just the first', () => {
  const strokesFn = buildCustomSegmentStrokesFn({ p1: 2, p2: 0 });

  // Segment 1 (1-6): hardest are hole 3 (hcp 1), hole 5 (hcp 2)
  expect(strokesFn('p1', 3, players, course, 'relative')).toBe(1);
  expect(strokesFn('p1', 5, players, course, 'relative')).toBe(1);
  // Not the other 4 holes in this segment
  expect(strokesFn('p1', 1, players, course, 'relative')).toBe(0);
  expect(strokesFn('p1', 2, players, course, 'relative')).toBe(0);
  expect(strokesFn('p1', 4, players, course, 'relative')).toBe(0);
  expect(strokesFn('p1', 6, players, course, 'relative')).toBe(0);

  // Segment 2 (7-12): hardest are hole 10 (hcp 1), hole 7 (hcp 7)
  expect(strokesFn('p1', 10, players, course, 'relative')).toBe(1);
  expect(strokesFn('p1', 7, players, course, 'relative')).toBe(1);
  expect(strokesFn('p1', 8, players, course, 'relative')).toBe(0);
  expect(strokesFn('p1', 9, players, course, 'relative')).toBe(0);
  expect(strokesFn('p1', 11, players, course, 'relative')).toBe(0);
  expect(strokesFn('p1', 12, players, course, 'relative')).toBe(0);
});

test('a different player with a different flat number genuinely gets a different count, not the same holes reused', () => {
  const strokesFn = buildCustomSegmentStrokesFn({ p1: 0, p2: 3 });

  // p1 has 0 - no strokes anywhere
  for (let h = 1; h <= 6; h++) {
    expect(strokesFn('p1', h, players, course, 'relative')).toBe(0);
  }

  // p2 has 3 - top 3 hardest in segment 1 (holes 3, 5, 4 by hcp 1,2,3)
  expect(strokesFn('p2', 3, players, course, 'relative')).toBe(1);
  expect(strokesFn('p2', 5, players, course, 'relative')).toBe(1);
  expect(strokesFn('p2', 4, players, course, 'relative')).toBe(1);
  expect(strokesFn('p2', 1, players, course, 'relative')).toBe(0);
  expect(strokesFn('p2', 2, players, course, 'relative')).toBe(0);
  expect(strokesFn('p2', 6, players, course, 'relative')).toBe(0);
});

test('exactly 6 per segment gives a stroke on every single hole in that segment, no more no less', () => {
  const strokesFn = buildCustomSegmentStrokesFn({ p1: 6 });
  for (let h = 1; h <= 6; h++) {
    expect(strokesFn('p1', h, players, course, 'relative')).toBe(1);
  }
});
