/**
 * wolfCarryover.test.js
 * Run with: npm test -- --testPathPattern=wolfCarryover
 *
 * Verifies applyWolfCarryover() against both worked examples in
 * "Wolf Golf Game — Program Requirements (Final)" Section 12/12A:
 *  - the 3-way mode (off / value only / value + hammers) on a single push
 *  - the max carryover limit across a run of 3 consecutive pushes
 */

import { applyWolfCarryover, WOLF_CARRYOVER_MODES } from '../engine/scoringEngine';

const START = { carriedAmount: 0, pushCount: 0 };

// ─── Section 12 worked example: hole 5 pushes at $20 base / 2x hammer,
//     hole 6's effective value depends on the mode ─────────────────────────

describe('applyWolfCarryover — 3-way mode (single push)', () => {
  test('OFF: hole 6 gets no carryover, starts fresh at $20', () => {
    const hole5 = applyWolfCarryover(START, { isPush: true, holeBaseValue: 20, holeHammerMultiplier: 2 }, { mode: WOLF_CARRYOVER_MODES.OFF });
    const hole6 = applyWolfCarryover(hole5.nextState, { isPush: false, holeBaseValue: 20 }, { mode: WOLF_CARRYOVER_MODES.OFF });
    expect(hole6.effectiveBaseValue).toBe(20);
  });

  test('VALUE_ONLY: hole 6 = $20 own base + $20 carried (hammer dropped) = $40', () => {
    const hole5 = applyWolfCarryover(START, { isPush: true, holeBaseValue: 20, holeHammerMultiplier: 2 }, { mode: WOLF_CARRYOVER_MODES.VALUE_ONLY });
    const hole6 = applyWolfCarryover(hole5.nextState, { isPush: false, holeBaseValue: 20 }, { mode: WOLF_CARRYOVER_MODES.VALUE_ONLY });
    expect(hole6.effectiveBaseValue).toBe(40);
  });

  test('VALUE_AND_HAMMERS: hole 6 = $20 own base + $40 carried (hammer included) = $60', () => {
    const hole5 = applyWolfCarryover(START, { isPush: true, holeBaseValue: 20, holeHammerMultiplier: 2 }, { mode: WOLF_CARRYOVER_MODES.VALUE_AND_HAMMERS });
    const hole6 = applyWolfCarryover(hole5.nextState, { isPush: false, holeBaseValue: 20 }, { mode: WOLF_CARRYOVER_MODES.VALUE_AND_HAMMERS });
    expect(hole6.effectiveBaseValue).toBe(60);
  });
});

// ─── Section 12A worked example: holes 1-3 all push, max carryover = 2 ────

describe('applyWolfCarryover — max carryover limit', () => {
  const config = { mode: WOLF_CARRYOVER_MODES.VALUE_ONLY, maxCarryover: 2 };

  test('holes 1-3 push, hole 4 wins → capped at base + 2, not base + 3', () => {
    let state = START;

    const hole1 = applyWolfCarryover(state, { isPush: true, holeBaseValue: 20 }, config);
    expect(hole1.effectiveBaseValue).toBe(20); // base, nothing carried in yet
    state = hole1.nextState;
    expect(state).toEqual({ carriedAmount: 20, pushCount: 1 });

    const hole2 = applyWolfCarryover(state, { isPush: true, holeBaseValue: 20 }, config);
    expect(hole2.effectiveBaseValue).toBe(40); // 20 own + 20 carried
    state = hole2.nextState;
    expect(state).toEqual({ carriedAmount: 40, pushCount: 2 }); // cap reached

    const hole3 = applyWolfCarryover(state, { isPush: true, holeBaseValue: 20 }, config);
    expect(hole3.effectiveBaseValue).toBe(60); // 20 own + 40 carried
    state = hole3.nextState;
    expect(state).toEqual({ carriedAmount: 40, pushCount: 2 }); // holds flat — cap already hit

    const hole4 = applyWolfCarryover(state, { isPush: false, holeBaseValue: 20 }, config);
    expect(hole4.effectiveBaseValue).toBe(60); // base ($20) + 2 capped carryovers ($40) — the doc's exact number
    expect(hole4.nextState).toEqual({ carriedAmount: 0, pushCount: 0 }); // resets after a won hole
  });

  test('same scenario with no limit at all → hole 4 would be base + 3 = $80', () => {
    const uncapped = { mode: WOLF_CARRYOVER_MODES.VALUE_ONLY, maxCarryover: null };
    let state = START;
    for (let i = 0; i < 3; i++) {
      state = applyWolfCarryover(state, { isPush: true, holeBaseValue: 20 }, uncapped).nextState;
    }
    const hole4 = applyWolfCarryover(state, { isPush: false, holeBaseValue: 20 }, uncapped);
    expect(hole4.effectiveBaseValue).toBe(80);
  });
});

// ─── Basic reset behavior ─────────────────────────────────────────────────

describe('applyWolfCarryover — reset behavior', () => {
  test('a won hole always resets state to zero, regardless of mode', () => {
    const midRun = { carriedAmount: 100, pushCount: 4 };
    const result = applyWolfCarryover(midRun, { isPush: false, holeBaseValue: 20 }, { mode: WOLF_CARRYOVER_MODES.VALUE_AND_HAMMERS, maxCarryover: 10 });
    expect(result.nextState).toEqual({ carriedAmount: 0, pushCount: 0 });
  });

  test('OFF mode resets immediately even on a push, no accumulation ever', () => {
    let state = START;
    for (let i = 0; i < 3; i++) {
      const r = applyWolfCarryover(state, { isPush: true, holeBaseValue: 20 }, { mode: WOLF_CARRYOVER_MODES.OFF });
      expect(r.effectiveBaseValue).toBe(20); // never grows
      state = r.nextState;
    }
  });
});
