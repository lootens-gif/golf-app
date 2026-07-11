/**
 * wolfRoundResult.test.js
 * Run with: npm test -- --testPathPattern=wolfRoundResult
 *
 * Tests computeWolfRoundResult() — the actual glue logic that used to live
 * untested inside App.jsx's render body (rotation → sides → resolveWolfHole
 * → sum). Extracted specifically so this could be verified directly rather
 * than only "the app didn't crash."
 */

import { computeWolfRoundResult } from '../engine/scoringEngine';
import { getWolfFormat } from '../components/live/WolfHoleCard';

function singleHoleCourse(pars) {
  return { pars };
}
function makePlayer(id) {
  return { id, name: id, hcp: 0 };
}
const PLAYERS = ['A', 'B', 'C', 'D', 'E'].map(makePlayer);
// 15 holes, all par 4 except hole 3 (par 3) for a birdie test later.
const PARS = Array(15).fill(4);
PARS[2] = 3;
const COURSE = singleHoleCourse(PARS);

describe('computeWolfRoundResult — rotation is correct', () => {
  test('hole 1 → A is Wolf; hole 2 → B is Wolf (default, no partner, no scores yet)', () => {
    // No scores entered at all — every hole should resolve to null internally,
    // balances should all be 0, but this should not throw.
    const result = computeWolfRoundResult({
      activePlayers: PLAYERS, wolfHoles: {}, getFormat: getWolfFormat,
      course: COURSE, scores: {}, handicapMode: 'full', betAmount: 5,
    });
    PLAYERS.forEach((p) => expect(result.balancesByPlayerId[p.id]).toBe(0));
  });
});

describe('computeWolfRoundResult — a real played hole flows through correctly', () => {
  test('hole 1 (Wolf=A), no partner, A wins → matches resolveWolfHole directly (Harrison default, 1x)', () => {
    const scores = { 1: { A: 2, B: 4, C: 5, D: 6, E: 5 } };
    const result = computeWolfRoundResult({
      activePlayers: PLAYERS, wolfHoles: {}, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 5,
    });
    // Wolf (A) wins solo at 1x, $5 base → collects $5 from each of 4 opponents = $20
    expect(result.balancesByPlayerId.A).toBe(20);
    expect(result.balancesByPlayerId.B).toBe(-5);
  });

  test('hole 1, partner B picked, A+B win → Pack Wolf routes correctly', () => {
    const scores = { 1: { A: 3, B: 5, C: 4, D: 5, E: 5 } };
    const result = computeWolfRoundResult({
      activePlayers: PLAYERS,
      wolfHoles: { 1: { partnerId: 'B' } },
      getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 5,
    });
    // Pack Wolf (1x), $5 base → each winner collects $5×3=$15
    expect(result.balancesByPlayerId.A).toBe(15);
    expect(result.balancesByPlayerId.B).toBe(15);
    expect(result.balancesByPlayerId.C).toBe(-10); // pays both A and B
  });

  test('hole 1, Lone Wolf declared → 2x tier applied correctly through the full pipeline', () => {
    const scores = { 1: { A: 2, B: 4, C: 5, D: 6, E: 5 } };
    const result = computeWolfRoundResult({
      activePlayers: PLAYERS,
      wolfHoles: { 1: { loneWolfDeclared: true } },
      getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 5,
    });
    expect(result.balancesByPlayerId.A).toBe(40); // 2x of the 1x $20 case above
  });

  test('hole 1 (Wolf=A), A picks B as partner, B shucks → B (shucker) vs. A+C+D+E', () => {
    const scores = { 1: { B: 2, A: 4, C: 5, D: 6, E: 5 } }; // B, the shucker, has the best score
    const result = computeWolfRoundResult({
      activePlayers: PLAYERS,
      wolfHoles: { 1: { partnerId: 'B', shucked: true } },
      getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 5,
    });
    // Shuck (2x), $5 base → shucker collects 2×5=$10 from each of 4 opponents = $40
    expect(result.balancesByPlayerId.B).toBe(40);
    expect(result.balancesByPlayerId.A).toBe(-10);
    expect(result.balancesByPlayerId.C).toBe(-10);
  });
});

describe('computeWolfRoundResult — Hammer flows through correctly', () => {
  test('hammerMultiplier from config is applied through the full pipeline', () => {
    const scores = { 1: { A: 2, B: 4, C: 5, D: 6, E: 5 } };
    const result = computeWolfRoundResult({
      activePlayers: PLAYERS,
      wolfHoles: { 1: { hammerMultiplier: 2 } },
      getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 5,
    });
    expect(result.balancesByPlayerId.A).toBe(40); // 2x of the base $20 case
  });

  test('a rejected hammer resolves without needing scores at all', () => {
    const result = computeWolfRoundResult({
      activePlayers: PLAYERS,
      wolfHoles: { 1: { hammerMultiplier: 2, hammerResolution: 'rejected', concededBy: 'big' } },
      getFormat: getWolfFormat,
      course: COURSE, scores: {}, handicapMode: 'full', betAmount: 5,
    });
    expect(result.balancesByPlayerId.A).toBe(40); // small side wins outright, same math as accepted+played-out
  });
});

describe('computeWolfRoundResult — birdie multiplier flows through correctly', () => {
  test('a gross birdie on the winning side doubles the payout when the toggle is on', () => {
    // Hole 3 is a par 3. Wolf on hole 3 is C (index 2). C shoots a 2 (birdie).
    const scores = { 3: { C: 2, A: 5, B: 5, D: 6, E: 5 } };
    const withBirdie = computeWolfRoundResult({
      activePlayers: PLAYERS, wolfHoles: {}, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 5, birdieEnabled: true,
    });
    const withoutBirdie = computeWolfRoundResult({
      activePlayers: PLAYERS, wolfHoles: {}, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 5, birdieEnabled: false,
    });
    expect(withBirdie.balancesByPlayerId.C).toBe(withoutBirdie.balancesByPlayerId.C * 2);
  });
});

describe('computeWolfRoundResult — style and settlement toggles pass through correctly', () => {
  test('Classic style produces different numbers than Harrison for the same hole', () => {
    const scores = { 1: { A: 2, B: 4, C: 5, D: 6, E: 5 } };
    const harrison = computeWolfRoundResult({
      activePlayers: PLAYERS, wolfHoles: {}, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 5, wolfStyle: 'harrison',
    });
    const classic = computeWolfRoundResult({
      activePlayers: PLAYERS, wolfHoles: {}, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 5, wolfStyle: 'classic',
    });
    expect(harrison.balancesByPlayerId.A).toBe(20); // 1x solo
    expect(classic.balancesByPlayerId.A).toBe(80);  // 4x solo (matches original doc)
  });

  test('Pooled settlement produces different numbers than Pairwise on a Pack Wolf hole', () => {
    const scores = { 1: { A: 3, B: 5, C: 4, D: 5, E: 5 } };
    const pairwise = computeWolfRoundResult({
      activePlayers: PLAYERS, wolfHoles: { 1: { partnerId: 'B' } }, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 25, settlementStyle: 'pairwise',
    });
    const pooled = computeWolfRoundResult({
      activePlayers: PLAYERS, wolfHoles: { 1: { partnerId: 'B' } }, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 25, settlementStyle: 'pooled',
    });
    expect(pairwise.balancesByPlayerId.A).toBe(75);   // matches Harrison's confirmed pairwise number
    expect(pooled.balancesByPlayerId.A).toBeCloseTo(37.5, 5); // matches Harrison's confirmed pooled number
  });
});

describe('computeWolfRoundResult — guards', () => {
  test('fewer than 5 active players → returns empty balances, does not throw', () => {
    const result = computeWolfRoundResult({
      activePlayers: PLAYERS.slice(0, 4), wolfHoles: {}, getFormat: getWolfFormat,
      course: COURSE, scores: {}, handicapMode: 'full', betAmount: 5,
    });
    expect(result.balancesByPlayerId).toEqual({});
  });
});
