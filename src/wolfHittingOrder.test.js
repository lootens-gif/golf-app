/**
 * wolfHittingOrder.test.js
 * Run with: npm test -- --testPathPattern=wolfHittingOrder
 *
 * Verifies getSuperWolfHittingOrder() against Section 9C of
 * "Wolf Golf Game — Program Requirements (Final)".
 * Super Wolf itself always hits first (separate rule) — this only covers
 * ordering the other 4 players.
 */

import { getSuperWolfHittingOrder, SUPER_WOLF_ORDER_MODES } from './engine/scoringEngine';

const ROTATION = ['A', 'B', 'C', 'D', 'E'];

describe('getSuperWolfHittingOrder — STANDARD mode', () => {
  test('orders the other 4 by their normal rotation position, regardless of input order', () => {
    const otherFour = ['E', 'C', 'B', 'D']; // deliberately scrambled input
    const result = getSuperWolfHittingOrder(SUPER_WOLF_ORDER_MODES.STANDARD, otherFour, { rotationOrder: ROTATION });
    expect(result).toEqual(['B', 'C', 'D', 'E']);
  });
});

describe('getSuperWolfHittingOrder — RANK_BY_DEFICIT mode', () => {
  test('most-down player hits first, closest-to-even hits last', () => {
    const otherFour = ['B', 'C', 'D', 'E'];
    const wolfStandings = { B: -10, C: 5, D: 20, E: -25 };
    const result = getSuperWolfHittingOrder(SUPER_WOLF_ORDER_MODES.RANK_BY_DEFICIT, otherFour, { rotationOrder: ROTATION, wolfStandings });
    expect(result).toEqual(['E', 'B', 'C', 'D']); // -25, -10, 5, 20
  });

  test('tie in standing → earlier rotation position hits first', () => {
    const otherFour = ['B', 'C', 'D', 'E'];
    const wolfStandings = { B: -10, C: -10, D: 20, E: 20 }; // two ties
    const result = getSuperWolfHittingOrder(SUPER_WOLF_ORDER_MODES.RANK_BY_DEFICIT, otherFour, { rotationOrder: ROTATION, wolfStandings });
    expect(result).toEqual(['B', 'C', 'D', 'E']); // B before C, D before E, per rotation
  });
});

describe('getSuperWolfHittingOrder — WOLF_CONTROLS mode', () => {
  test('returns exactly the manual order Super Wolf called out', () => {
    const otherFour = ['B', 'C', 'D', 'E'];
    const manualOrder = ['D', 'B', 'E', 'C'];
    const result = getSuperWolfHittingOrder(SUPER_WOLF_ORDER_MODES.WOLF_CONTROLS, otherFour, { manualOrder });
    expect(result).toEqual(['D', 'B', 'E', 'C']);
  });

  test('returns null when no manual order has been entered yet — signals the UI still needs tee-box input', () => {
    const otherFour = ['B', 'C', 'D', 'E'];
    const result = getSuperWolfHittingOrder(SUPER_WOLF_ORDER_MODES.WOLF_CONTROLS, otherFour, {});
    expect(result).toBeNull();
  });

  test('returns null if manual order is the wrong length (safety check against a bad tap-in)', () => {
    const otherFour = ['B', 'C', 'D', 'E'];
    const manualOrder = ['D', 'B', 'E']; // only 3, missing one
    const result = getSuperWolfHittingOrder(SUPER_WOLF_ORDER_MODES.WOLF_CONTROLS, otherFour, { manualOrder });
    expect(result).toBeNull();
  });
});
