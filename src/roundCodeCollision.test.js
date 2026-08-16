const { sameRoundIdentity } = require('./lib/roundSync');

test('CONFIRMED REAL BUG (Aug 2026): two rounds with completely different real players are correctly identified as different rounds, not the same round on a stale device', () => {
  // Exact real data shape from the round 8348 collision
  const myRound = { allPlayers: [
    { id: 'p1', name: 'Tim Lootens' },
    { id: 'p2', name: 'Jon Biro' },
    { id: 'p3', name: 'John Cahill' },
  ] };
  const otherRound = { allPlayers: [
    { id: 'p1', name: 'HB' },
    { id: 'p2', name: 'RF' },
    { id: 'p3', name: 'GS' },
  ] };
  expect(sameRoundIdentity(myRound, otherRound)).toBe(false);
});

test('the same round on a second device, with genuinely overlapping real players, is correctly recognized as the same round', () => {
  const deviceA = { allPlayers: [
    { id: 'p1', name: 'Tim Lootens' },
    { id: 'p2', name: 'Jon Biro' },
  ] };
  const deviceB = { allPlayers: [
    { id: 'p1', name: 'Tim Lootens' },
    { id: 'p2', name: 'Jon Biro' },
    { id: 'p3', name: 'Stan Toy' },
  ] };
  expect(sameRoundIdentity(deviceA, deviceB)).toBe(true);
});

test('placeholder names (P1, P2) never falsely count as a real match or a real mismatch - both sides need at least one genuinely named player', () => {
  const noRealNamesYet = { allPlayers: [{ id: 'p1', name: 'P1' }, { id: 'p2', name: 'P2' }] };
  const realRound = { allPlayers: [{ id: 'p1', name: 'Tim Lootens' }] };
  // Can't reliably compare when one side has no real names yet - should
  // not claim a mismatch off placeholder data alone.
  expect(sameRoundIdentity(noRealNamesYet, realRound)).toBe(true);
  expect(sameRoundIdentity(realRound, noRealNamesYet)).toBe(true);
});
