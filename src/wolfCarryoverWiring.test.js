/**
 * wolfCarryoverWiring.test.js
 * Run with: npm test -- --testPathPattern=wolfCarryoverWiring
 *
 * Carryover was previously display-only — the app correctly warned "not
 * yet applied" but never actually moved money. This tests the real fix:
 * computeWolfCarryoverSchedule() and its wiring into computeWolfRoundResult
 * and getWolfHoleNarrative.
 */

import {
  computeWolfCarryoverSchedule,
  computeWolfRoundResult,
  getWolfHoleNarrative,
  WOLF_CARRYOVER_MODES,
} from './engine/scoringEngine';
import { getWolfFormat } from './components/live/WolfHoleCard';

function makePlayer(id) { return { id, name: id, hcp: 0 }; }
const PLAYERS = ['A', 'B', 'C', 'D', 'E'].map(makePlayer);
const COURSE = { pars: Array(15).fill(4) };

describe('computeWolfCarryoverSchedule', () => {
  test('no pushes, mode off → every hole gets the flat base amount', () => {
    const scores = { 1: { A: 2, B: 4, C: 5, D: 6, E: 5 } }; // A wins outright, no push
    const schedule = computeWolfCarryoverSchedule({
      activePlayers: PLAYERS, wolfHoles: {}, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 20,
      carryoverMode: WOLF_CARRYOVER_MODES.VALUE_ONLY,
    });
    expect(schedule[1].effectiveBetAmount).toBe(20);
    expect(schedule[2].effectiveBetAmount).toBe(20); // nothing carried, hole 1 wasn't a push
  });

  test('holes 1-3 push, hole 4 decided → matches the doc\'s exact worked example (base + 3 = $80)', () => {
    const scores = {
      1: { A: 4, B: 4, C: 4, D: 4, E: 4 }, // identical scores = guaranteed push, regardless of rotation
      2: { A: 4, B: 4, C: 4, D: 4, E: 4 },
      3: { A: 4, B: 4, C: 4, D: 4, E: 4 },
      4: { A: 5, B: 5, C: 5, D: 2, E: 5 }, // hole 4's Wolf is D (rotation index 3) — D wins decisively
    };
    const schedule = computeWolfCarryoverSchedule({
      activePlayers: PLAYERS, wolfHoles: {}, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 20,
      carryoverMode: WOLF_CARRYOVER_MODES.VALUE_ONLY,
    });
    expect(schedule[4].effectiveBetAmount).toBe(80); // base(20) + 3 carryovers(60)
    expect(schedule[4].carriedInCount).toBe(3);
  });

  test('a max carryover limit holds the value flat once reached', () => {
    const scores = {
      1: { A: 4, B: 4, C: 4, D: 4, E: 4 },
      2: { A: 4, B: 4, C: 4, D: 4, E: 4 },
      3: { A: 4, B: 4, C: 4, D: 4, E: 4 },
      4: { A: 5, B: 5, C: 5, D: 2, E: 5 },
    };
    const schedule = computeWolfCarryoverSchedule({
      activePlayers: PLAYERS, wolfHoles: {}, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 20,
      carryoverMode: WOLF_CARRYOVER_MODES.VALUE_ONLY, maxCarryover: 2,
    });
    expect(schedule[4].effectiveBetAmount).toBe(60); // base(20) + capped at 2 carryovers(40), not 3
  });

  test('mode OFF never accumulates, even across multiple pushes', () => {
    const scores = {
      1: { A: 4, B: 4, C: 4, D: 4, E: 4 },
      2: { A: 4, B: 4, C: 4, D: 4, E: 4 },
      3: { A: 5, B: 5, C: 2, D: 5, E: 5 }, // hole 3's Wolf is C — C wins
    };
    const schedule = computeWolfCarryoverSchedule({
      activePlayers: PLAYERS, wolfHoles: {}, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 20,
      carryoverMode: WOLF_CARRYOVER_MODES.OFF,
    });
    expect(schedule[3].effectiveBetAmount).toBe(20);
  });

  test('a hole not yet scored does not advance state for later holes', () => {
    const scores = {
      1: { A: 4, B: 4, C: 4, D: 4, E: 4 }, // push
      // hole 2 not scored at all
      3: { A: 5, B: 5, C: 2, D: 5, E: 5 }, // hole 3's Wolf is C — decided
    };
    const schedule = computeWolfCarryoverSchedule({
      activePlayers: PLAYERS, wolfHoles: {}, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 20,
      carryoverMode: WOLF_CARRYOVER_MODES.VALUE_ONLY,
    });
    expect(schedule[2].isPush).toBeNull();
    // hole 3 still correctly carries the $20 from hole 1's push, unaffected by hole 2 being unscored
    expect(schedule[3].effectiveBetAmount).toBe(40);
  });

  test('VALUE_AND_HAMMERS includes the hammer multiplier in what carries forward', () => {
    const scores = {
      1: { A: 4, B: 4, C: 4, D: 4, E: 4 }, // push, with a 2x hammer that hole
      2: { A: 5, B: 2, C: 5, D: 5, E: 5 }, // hole 2's Wolf is B — decided
    };
    const schedule = computeWolfCarryoverSchedule({
      activePlayers: PLAYERS, wolfHoles: { 1: { hammerMultiplier: 2 } }, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 20,
      carryoverMode: WOLF_CARRYOVER_MODES.VALUE_AND_HAMMERS,
    });
    expect(schedule[2].effectiveBetAmount).toBe(60); // 20 own + 40 carried (20 base x 2 hammer)
  });
});

describe('computeWolfRoundResult — carryover flows into real money', () => {
  test('the doc\'s exact worked example produces the correct final balance', () => {
    const scores = {
      1: { A: 4, B: 4, C: 4, D: 4, E: 4 },
      2: { A: 4, B: 4, C: 4, D: 4, E: 4 },
      3: { A: 4, B: 4, C: 4, D: 4, E: 4 },
      4: { A: 5, B: 5, C: 5, D: 2, E: 5 }, // hole 4's Wolf is D — D wins solo at the $80 carried value
    };
    const result = computeWolfRoundResult({
      activePlayers: PLAYERS, wolfHoles: {}, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 20,
      carryoverMode: WOLF_CARRYOVER_MODES.VALUE_ONLY,
    });
    // Wolf (1x) wins hole 4 at $80 base → collects $80 from each of 4 opponents = $320
    expect(result.balancesByPlayerId.D).toBe(320);
  });

  test('with carryover OFF, the same scenario produces the normal $80 total instead', () => {
    const scores = {
      1: { A: 4, B: 4, C: 4, D: 4, E: 4 },
      2: { A: 4, B: 4, C: 4, D: 4, E: 4 },
      3: { A: 4, B: 4, C: 4, D: 4, E: 4 },
      4: { A: 5, B: 5, C: 5, D: 2, E: 5 },
    };
    const result = computeWolfRoundResult({
      activePlayers: PLAYERS, wolfHoles: {}, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 20,
      carryoverMode: WOLF_CARRYOVER_MODES.OFF,
    });
    expect(result.balancesByPlayerId.D).toBe(80); // 4 opponents x $20 base, no carryover
  });
});

describe('getWolfHoleNarrative — carryover messaging', () => {
  test('a push with carryover on mentions it carries forward', () => {
    const scores = { 1: { A: 4, B: 4, C: 4, D: 4, E: 4 } };
    const { lines } = getWolfHoleNarrative({
      hole: 1, activePlayers: PLAYERS, wolfHoles: {}, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 20,
      carryoverMode: WOLF_CARRYOVER_MODES.VALUE_ONLY,
    });
    expect(lines).toContain('Carries forward to the next hole.');
  });

  test('the hole that finally wins the carryover says exactly how many and how much', () => {
    const scores = {
      1: { A: 4, B: 4, C: 4, D: 4, E: 4 },
      2: { A: 4, B: 4, C: 4, D: 4, E: 4 },
      3: { A: 4, B: 4, C: 4, D: 4, E: 4 },
      4: { A: 5, B: 5, C: 5, D: 2, E: 5 },
    };
    const { lines } = getWolfHoleNarrative({
      hole: 4, activePlayers: PLAYERS, wolfHoles: {}, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 20,
      carryoverMode: WOLF_CARRYOVER_MODES.VALUE_ONLY,
    });
    expect(lines).toContain('3 carryovers won — worth $60.00 extra this hole.');
  });

  test('Hammer Sweep tag replaces the old "Add-A-Hammer" wording', () => {
    const scores = { 1: { A: 3, B: 4, C: 5, D: 6, E: 5 } }; // real clean sweep
    const { lines } = getWolfHoleNarrative({
      hole: 1, activePlayers: PLAYERS, wolfHoles: { 1: { partnerId: 'B' } }, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 5, addAHammerEnabled: true,
    });
    expect(lines[0]).toContain('Hammer Sweep 2x');
    expect(lines[0]).not.toContain('Add-A-Hammer');
  });
});
