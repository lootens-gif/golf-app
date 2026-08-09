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

// CONFIRMED REAL BUG, caught by Tim (Aug 2026): a manual press call is a
// real-time decision ("I'm calling a press right now") made during the
// hole, not after it's already known — so the hole it's called on should
// count toward it, unlike the auto-trigger (which can only fire after a
// hole completes, since the down-2 condition isn't knowable until then).
// Before this fix, a manual call on hole 6 of a 1-6 segment got
// startHole: 7 — zero holes left in that segment, a permanent $0 stub no
// matter what happened on hole 6.

test('manual press called on hole 6 (last hole of a 1-6 segment) wins/loses based on hole 6 itself, not a $0 stub', () => {
  // Team A wins hole 6 by a clear margin. A manual press is called ON
  // hole 6 — it should include hole 6's own result.
  const scores = {};
  for (let h = 1; h <= 5; h++) scores[h] = { p1: 4, p2: 4, p3: 4, p4: 4 }; // even holes 1-5
  scores[6] = { p1: 3, p2: 3, p3: 5, p4: 5 }; // Team A wins hole 6 clearly

  const context = { players, course, scores, handicapMode: 'relative', noPar3Strokes: false };
  const result = playPressMatch({
    teamA: ['p1', 'p2'],
    teamB: ['p3', 'p4'],
    start: 1,
    end: 6,
    trigger: 2, // high enough that the auto-trigger doesn't also fire here
    manualPressHoles: [6],
    context,
  });

  const manualPress = result.find(bet => bet.manual === true);
  expect(manualPress).toBeDefined();
  // Must start AT hole 6, not hole 7 — this is the actual fix.
  expect(manualPress.startHole).toBe(6);
  // Team A won hole 6, so this press should be +1 for Team A, not $0.
  expect(manualPress.score).toBe(1);
  expect(manualPress.history).toEqual([1]);
});

test('manual press called on a hole in the middle of a segment plays out every remaining hole, not just the one it was called on', () => {
  const scores = {};
  scores[1] = { p1: 4, p2: 4, p3: 4, p4: 4 }; // even
  scores[2] = { p1: 3, p2: 3, p3: 5, p4: 5 }; // Team A wins (press called here)
  scores[3] = { p1: 5, p2: 5, p3: 3, p4: 3 }; // Team B wins
  scores[4] = { p1: 3, p2: 3, p3: 5, p4: 5 }; // Team A wins

  const context = { players, course, scores, handicapMode: 'relative', noPar3Strokes: false };
  const result = playPressMatch({
    teamA: ['p1', 'p2'],
    teamB: ['p3', 'p4'],
    start: 1,
    end: 4,
    trigger: 5, // won't auto-fire
    manualPressHoles: [2],
    context,
  });

  const manualPress = result.find(bet => bet.manual === true);
  expect(manualPress.startHole).toBe(2);
  // Hole 2 (+1 A), hole 3 (-1 A), hole 4 (+1 A) = net +1 for Team A
  expect(manualPress.history).toEqual([1, -1, 1]);
  expect(manualPress.score).toBe(1);
});

test('a hole with BOTH a manual call and an auto-trigger produces two independent new bets, not deduped (confirmed design)', () => {
  const scores = {};
  scores[1] = { p1: 3, p2: 3, p3: 5, p4: 5 }; // Team A wins hole 1 → Base Match hits trigger=1

  const context = { players, course, scores, handicapMode: 'relative', noPar3Strokes: false };
  const result = playPressMatch({
    teamA: ['p1', 'p2'],
    teamB: ['p3', 'p4'],
    start: 1,
    end: 1,
    trigger: 1,
    manualPressHoles: [1],
    context,
  });

  // Base Match + the manual press (both existing when hole 1 is scored,
  // both get credited hole 1) + the auto-triggered press (starts hole 2,
  // outside this 1-hole segment, so it's a $0 stub) = 3 bets total.
  expect(result.length).toBe(3);
  const manualPress = result.find(b => b.manual === true);
  expect(manualPress.startHole).toBe(1);
  expect(manualPress.score).toBe(1); // credited hole 1's result
});
