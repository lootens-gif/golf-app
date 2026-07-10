/**
 * wolfSuperWolf.test.js
 * Run with: npm test -- --testPathPattern=wolfSuperWolf
 *
 * Verifies getWolfHoleSplit() and getSuperWolfAssignment() against
 * Sections 9A and 9D of "Wolf Golf Game — Program Requirements (Final)".
 *
 * Scope note: assignment and hole-count math only — the Super Wolf PAYOUT
 * formula (Section 9B) is still pending confirmation from Harrison and is
 * intentionally not built or tested here.
 */

import { getWolfHoleSplit, getSuperWolfAssignment } from './engine/scoringEngine';

describe('getWolfHoleSplit', () => {
  test('5 players / 18 holes → 15 regular + 3 Super Wolf (the v1 case)', () => {
    expect(getWolfHoleSplit(18, 5)).toEqual({
      regularHoles: 15,
      superWolfHoles: 3,
      turnsPerPlayer: 3,
    });
  });

  test('4 players / 18 holes → 16 regular + 2 Super Wolf (backlogged case, but formula should still hold)', () => {
    expect(getWolfHoleSplit(18, 4)).toEqual({
      regularHoles: 16,
      superWolfHoles: 2,
      turnsPerPlayer: 4,
    });
  });

  test('evenly divisible: 20 holes / 5 players → 0 Super Wolf holes, not an error', () => {
    expect(getWolfHoleSplit(20, 5)).toEqual({
      regularHoles: 20,
      superWolfHoles: 0,
      turnsPerPlayer: 4,
    });
  });
});

describe('getSuperWolfAssignment', () => {
  const rotationOrder = ['A', 'B', 'C', 'D', 'E'];

  test('doc\'s worked example: A is furthest down, becomes Super Wolf, ranked worst to best', () => {
    const standings = { A: -40, B: -10, C: 5, D: 20, E: 25 };
    const result = getSuperWolfAssignment(standings, rotationOrder);
    expect(result.superWolf).toBe('A');
    expect(result.ranked.map((r) => r.playerId)).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  test('tie in standing → earlier rotation position wins', () => {
    const standings = { A: -40, B: -40, C: 5, D: 20, E: 25 };
    const result = getSuperWolfAssignment(standings, rotationOrder);
    expect(result.superWolf).toBe('A'); // A comes before B in rotationOrder
  });

  test('tie in standing, reversed rotation order → later-listed-but-earlier-in-rotation still wins', () => {
    const standings = { B: -40, A: -40, C: 5, D: 20, E: 25 }; // object key order shouldn't matter
    const result = getSuperWolfAssignment(standings, rotationOrder);
    expect(result.superWolf).toBe('A');
  });

  test('a different player can be Super Wolf on a re-run with different standings (fresh recalculation)', () => {
    const hole16 = getSuperWolfAssignment({ A: -40, B: -10, C: 5, D: 20, E: 25 }, rotationOrder);
    const hole17 = getSuperWolfAssignment({ A: 20, B: -60, C: 5, D: 20, E: 15 }, rotationOrder);
    expect(hole16.superWolf).toBe('A');
    expect(hole17.superWolf).toBe('B');
  });

  test('empty standings → superWolf is null, no crash', () => {
    const result = getSuperWolfAssignment({}, rotationOrder);
    expect(result.superWolf).toBeNull();
    expect(result.ranked).toEqual([]);
  });
});
