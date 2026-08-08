const { playPressMatch, buildCustomSegmentStrokesFn } = require('./engine/scoringEngine');

const players = [
  { id: 'p1', name: 'Tim', hcp: 20 },
  { id: 'p2', name: 'Lou', hcp: 0 },
  { id: 'p3', name: 'Jon', hcp: 0 },
  { id: 'p4', name: 'Stan', hcp: 0 },
];
const course = {
  pars: Array(6).fill(4).concat(Array(12).fill(4)),
  // Hole 3 is the #1 handicap hole (hardest) in segment 1, hole 5 is #2.
  // p1's 2 custom strokes should land specifically on holes 3 and 5.
  hcp: [4, 5, 1, 3, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
};

test('CONFIRMED: Custom segment strokes actually change the real hole result computed by playPressMatch, not just what dots show', () => {
  // Hole 3: p1 (getting the custom stroke) scores 5, p2 scores 6 -> team
  // best gross is 5. Team B: p3 scores 4, p4 scores 5 -> best gross 4.
  // Without any stroke applied, Team B wins this hole outright (4 < 5).
  // With p1's real custom stroke on hole 3 (net 5-1=4), it should
  // become a genuine push (4 = 4) -- an actual, real change to who wins
  // the hole, not a cosmetic dot.
  // Every other hole in the segment (1,2,4,5,6) is a flat tie for all
  // four players, so the loop can process the full segment without
  // stopping on a missing score, and the only real signal is hole 3.
  const scores = {
    1: { p1: 4, p2: 4, p3: 4, p4: 4 },
    2: { p1: 4, p2: 4, p3: 4, p4: 4 },
    3: { p1: 5, p2: 6, p3: 4, p4: 5 },
    4: { p1: 4, p2: 4, p3: 4, p4: 4 },
    5: { p1: 4, p2: 4, p3: 4, p4: 4 },
    6: { p1: 4, p2: 4, p3: 4, p4: 4 },
  };

  const contextWithCustom = {
    players, course, scores, handicapMode: 'relative', noPar3TeamGame: false,
    getHandicapStrokesFn: buildCustomSegmentStrokesFn({ p1: 2, p2: 0, p3: 0, p4: 0 }),
  };

  const resultWithCustom = playPressMatch({ teamA: ['p1', 'p2'], teamB: ['p3', 'p4'], start: 1, end: 6, trigger: 99, context: contextWithCustom });
  const baseMatchWithCustom = resultWithCustom.find(b => b.label === 'Base Match');

  // history is indexed from startHole (1), so hole 3 is index 2
  expect(baseMatchWithCustom.history[2]).toBe(0); // push, not -1 (loss)
});

test('CONFIRMED CONTRAST: the exact same scenario with 0 custom strokes produces the real loss, proving the stroke genuinely caused the change above', () => {
  const scores = {
    1: { p1: 4, p2: 4, p3: 4, p4: 4 },
    2: { p1: 4, p2: 4, p3: 4, p4: 4 },
    3: { p1: 5, p2: 6, p3: 4, p4: 5 },
    4: { p1: 4, p2: 4, p3: 4, p4: 4 },
    5: { p1: 4, p2: 4, p3: 4, p4: 4 },
    6: { p1: 4, p2: 4, p3: 4, p4: 4 },
  };

  const contextNoStrokes = {
    players, course, scores, handicapMode: 'relative', noPar3TeamGame: false,
    getHandicapStrokesFn: buildCustomSegmentStrokesFn({ p1: 0, p2: 0, p3: 0, p4: 0 }),
  };

  const resultNoStrokes = playPressMatch({ teamA: ['p1', 'p2'], teamB: ['p3', 'p4'], start: 1, end: 6, trigger: 99, context: contextNoStrokes });
  const baseMatchNoStrokes = resultNoStrokes.find(b => b.label === 'Base Match');

  expect(baseMatchNoStrokes.history[2]).toBe(-1); // genuine loss, no stroke to offset it
});

test('CONFIRMED: with 2 custom strokes, BOTH land on the correct hardest-in-segment holes and BOTH correctly flip their own hole result - proving the full stroke count is applied correctly, not just one', () => {
  const scores = {
    1: { p1: 4, p2: 4, p3: 4, p4: 4 },
    2: { p1: 4, p2: 4, p3: 4, p4: 4 },
    3: { p1: 5, p2: 6, p3: 4, p4: 5 },
    4: { p1: 4, p2: 4, p3: 4, p4: 4 },
    5: { p1: 4, p2: 4, p3: 4, p4: 4 },
    6: { p1: 4, p2: 4, p3: 4, p4: 4 },
  };

  const withCustom = playPressMatch({
    teamA: ['p1', 'p2'], teamB: ['p3', 'p4'], start: 1, end: 6, trigger: 99,
    context: { players, course, scores, handicapMode: 'relative', noPar3TeamGame: false, getHandicapStrokesFn: buildCustomSegmentStrokesFn({ p1: 2 }) },
  });
  const withoutCustom = playPressMatch({
    teamA: ['p1', 'p2'], teamB: ['p3', 'p4'], start: 1, end: 6, trigger: 99,
    context: { players, course, scores, handicapMode: 'relative', noPar3TeamGame: false, getHandicapStrokesFn: buildCustomSegmentStrokesFn({}) },
  });

  const baseWith = withCustom.find(b => b.label === 'Base Match');
  const baseWithout = withoutCustom.find(b => b.label === 'Base Match');

  // Hole 3 (index 2): the harder of the two custom-stroke holes,
  // loss -> push. Hole 5 (index 4): the second custom-stroke hole,
  // everyone genuinely tied at gross 4, p1's second stroke correctly
  // drops their net to 3, flipping this hole to a real win too.
  expect(baseWithout.history).toEqual([0, 0, -1, 0, 0, 0]);
  expect(baseWith.history).toEqual([0, 0, 0, 0, 1, 0]);
  // Total swing: hole 3 (-1 -> 0, a +1 swing) plus hole 5 (0 -> 1, a
  // second +1 swing) = +2 overall, genuinely both strokes counted, not
  // just one of the two.
  expect(baseWith.score - baseWithout.score).toBe(2);
});
