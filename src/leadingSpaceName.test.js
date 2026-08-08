const { getBestBallDisplay } = require('./engine/scoringEngine');

const players = [
  { id: 'p1', name: ' Tim L', hcp: 6 }, // exact real data from round 9683
  { id: 'p2', name: 'Matt D', hcp: 9 },
];
const course = {
  pars: Array(6).fill(4),
  hcp: [4, 5, 1, 3, 2, 6],
};

test('CONFIRMED REAL BUG (Aug 2026): a player name with a leading space no longer produces an empty first name', () => {
  const scores = { 1: { p1: 4, p2: 5 } }; // p1 (Tim) has the better score
  const display = getBestBallDisplay(['p1', 'p2'], 1, players, course, scores, 'relative', null, false);
  // Before the fix, this would show " 4" (empty name, leading space
  // visible) instead of "Tim 4" - confirmed directly against real data
  // from round 9683, where " Tim L" was the actual stored name.
  expect(display).toMatch(/^Tim /);
  expect(display).not.toMatch(/^ /);
});
