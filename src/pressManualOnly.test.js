const { playPressMatch, PRESS_MANUAL_ONLY } = require('./engine/scoringEngine');

const players = [
  { id: 'tim', name: 'Tim', hcp: 0 },
  { id: 'steve', name: 'Steve', hcp: 0 },
  { id: 'doug', name: 'Doug', hcp: 0 },
  { id: 'marc', name: 'Marc', hcp: 0 },
];
const course = { pars: Array(18).fill(4), hcp: Array.from({ length: 18 }, (_, i) => i + 1) };
// Team A (tim/steve) wins holes 1-3 outright, everything else tied.
const scores = {};
for (let h = 1; h <= 3; h++) scores[h] = { tim: 3, steve: 3, doug: 5, marc: 5 };
for (let h = 4; h <= 6; h++) scores[h] = { tim: 4, steve: 4, doug: 4, marc: 4 };
const ctx = { players, course, scores, handicapMode: 'relative', noPar3TeamGame: false };
const teamA = ['tim', 'steve'];
const teamB = ['doug', 'marc'];

test('Manual only: a 2-down swing never auto-presses', () => {
  const bets = playPressMatch({ teamA, teamB, start: 1, end: 6, trigger: PRESS_MANUAL_ONLY, context: ctx, manualPressHoles: [] });
  expect(bets.length).toBe(1); // just the base match
  expect(bets[0].label).toBe('Base Match');
});

test('Manual only: a press called on hole 3 starts on hole 3 and counts it', () => {
  const bets = playPressMatch({ teamA, teamB, start: 1, end: 6, trigger: PRESS_MANUAL_ONLY, context: ctx, manualPressHoles: [3] });
  expect(bets.length).toBe(2);
  expect(bets[1]).toMatchObject({ label: 'Press 1', startHole: 3, manual: true });
  expect(bets[1].history).toEqual([1, 0, 0, 0]); // holes 3-6 scored
});

test('Manual press called on the final hole still covers that hole', () => {
  const bets = playPressMatch({ teamA, teamB, start: 1, end: 6, trigger: PRESS_MANUAL_ONLY, context: ctx, manualPressHoles: [6] });
  expect(bets.length).toBe(2);
  expect(bets[1].history).toEqual([0]);
});

test('2 Down still auto-presses when not manual only', () => {
  const bets = playPressMatch({ teamA, teamB, start: 1, end: 6, trigger: 2, context: ctx, manualPressHoles: [] });
  expect(bets.some((b) => b.label === 'Press 1' && b.startHole === 3)).toBe(true);
});

test('Manual call and auto press stack when both fire after the same hole', () => {
  // Team A is 2 up after hole 2, so the auto-press starts hole 3; calling a press on hole 3 does too.
  const bets = playPressMatch({ teamA, teamB, start: 1, end: 6, trigger: 2, context: ctx, manualPressHoles: [3] });
  expect(bets.filter((b) => b.startHole === 3 && b.label.startsWith('Press')).length).toBe(2);
});
