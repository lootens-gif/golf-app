/**
 * scoreSymbol.test.js
 * Run with: npm test -- --testPathPattern=scoreSymbol
 *
 * getScoreSymbol previously had no albatross tier at all — anything 2+
 * under par was labeled "eagle," even a 3-under albatross. This matters
 * specifically for Wolf, whose birdie multiplier distinguishes eagle (3x)
 * from albatross (4x) — the visual needs to match the money.
 */

import { getScoreSymbol } from './components/AuditTrail';

describe('getScoreSymbol', () => {
  test('1 under par is a birdie', () => {
    expect(getScoreSymbol(3, 4)).toEqual({ type: 'birdie', color: '#137333' });
  });

  test('exactly 2 under par is an eagle, not albatross', () => {
    expect(getScoreSymbol(2, 4)).toEqual({ type: 'eagle', color: '#137333' });
  });

  test('3 under par is now albatross, distinct from eagle', () => {
    expect(getScoreSymbol(1, 4)).toEqual({ type: 'albatross', color: '#137333' });
  });

  test('a hole-in-one on a par 4 is an albatross (3 under)', () => {
    expect(getScoreSymbol(1, 4)).toEqual({ type: 'albatross', color: '#137333' });
  });

  test('a hole-in-one on a par 3 is an eagle (2 under), not albatross', () => {
    expect(getScoreSymbol(1, 3)).toEqual({ type: 'eagle', color: '#137333' });
  });

  test('4+ under par is still albatross — no further tier needed', () => {
    expect(getScoreSymbol(1, 5)).toEqual({ type: 'albatross', color: '#137333' });
  });

  test('par, bogey, and double bogey are unaffected by the albatross change', () => {
    expect(getScoreSymbol(4, 4)).toBeNull();
    expect(getScoreSymbol(5, 4)).toEqual({ type: 'bogey', color: '#b3261e' });
    expect(getScoreSymbol(6, 4)).toEqual({ type: 'double', color: '#b3261e' });
  });

  test('null/undefined gross returns null, not a crash', () => {
    expect(getScoreSymbol(null, 4)).toBeNull();
    expect(getScoreSymbol(undefined, 4)).toBeNull();
  });
});
