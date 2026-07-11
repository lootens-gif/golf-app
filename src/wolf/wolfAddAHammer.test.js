/**
 * wolfAddAHammer.test.js
 * Run with: npm test -- --testPathPattern=wolfAddAHammer
 *
 * Add-A-Hammer had a Setup toggle since Chunk 6 but was NEVER actually
 * wired into the engine — confirmed by Tim seeing no $ change when it was
 * enabled. This tests the fix: checkWolfCleanSweep() and its wiring
 * through resolveWolfHoleFromConfig / computeWolfRoundResult /
 * getWolfHoleNarrative.
 */

import { checkWolfCleanSweep, resolveWolfHoleFromConfig, computeWolfRoundResult, getWolfHoleNarrative } from '../engine/scoringEngine';
import { getWolfFormat } from '../components/live/WolfHoleCard';

function makePlayer(id) { return { id, name: id, hcp: 0 }; }
const PLAYERS = ['A', 'B', 'C', 'D', 'E'].map(makePlayer);
const COURSE = { pars: Array(15).fill(4) };

describe('checkWolfCleanSweep', () => {
  test('true when every winner individually beats every loser', () => {
    const scores = { 1: { A: 3, B: 4, C: 5, D: 6, E: 5 } }; // A,B (3,4) both beat C,D,E (5,6,5)
    const result = checkWolfCleanSweep(['A', 'B'], ['C', 'D', 'E'], 1, PLAYERS, COURSE, scores, 'full', false);
    expect(result).toBe(true);
  });

  test('false when the winning team won on best-ball but one member did NOT individually beat everyone', () => {
    // A=3 (great), B=7 (worse than C's 5) — team wins via best-ball (3 < 5)
    // but B did not individually beat C. This is exactly the scenario the
    // spec doc describes as the reason this check has to be real, not automatic.
    const scores = { 1: { A: 3, B: 7, C: 5, D: 6, E: 5 } };
    const result = checkWolfCleanSweep(['A', 'B'], ['C', 'D', 'E'], 1, PLAYERS, COURSE, scores, 'full', false);
    expect(result).toBe(false);
  });

  test('false when the winning side has only 1 player — never evaluates per the confirmed rule', () => {
    const scores = { 1: { A: 2, B: 4, C: 5, D: 6, E: 5 } }; // A obviously beats everyone
    const result = checkWolfCleanSweep(['A'], ['B', 'C', 'D', 'E'], 1, PLAYERS, COURSE, scores, 'full', false);
    expect(result).toBe(false);
  });

  test('false if any score is missing', () => {
    const scores = { 1: { A: 3, B: 4, C: 5, D: 6 } }; // E never scored
    const result = checkWolfCleanSweep(['A', 'B'], ['C', 'D', 'E'], 1, PLAYERS, COURSE, scores, 'full', false);
    expect(result).toBe(false);
  });
});

describe('resolveWolfHoleFromConfig — Add-A-Hammer wiring', () => {
  test('a genuine clean sweep doubles the payout when the toggle is on', () => {
    const scores = { 1: { A: 3, B: 4, C: 5, D: 6, E: 5 } }; // real clean sweep
    const withoutAddAHammer = resolveWolfHoleFromConfig({
      hole: 1, activePlayers: PLAYERS, wolfHoles: { 1: { partnerId: 'B' } }, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 5, addAHammerEnabled: false,
    });
    const withAddAHammer = resolveWolfHoleFromConfig({
      hole: 1, activePlayers: PLAYERS, wolfHoles: { 1: { partnerId: 'B' } }, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 5, addAHammerEnabled: true,
    });
    expect(withAddAHammer.addAHammerTriggered).toBe(true);
    expect(withAddAHammer.resolved.deltas.A).toBe(withoutAddAHammer.resolved.deltas.A * 2);
  });

  test('does NOT trigger when the win was best-ball only, not a real clean sweep', () => {
    const scores = { 1: { A: 3, B: 7, C: 5, D: 6, E: 5 } }; // B lost to C individually
    const result = resolveWolfHoleFromConfig({
      hole: 1, activePlayers: PLAYERS, wolfHoles: { 1: { partnerId: 'B' } }, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 5, addAHammerEnabled: true,
    });
    expect(result.addAHammerTriggered).toBe(false);
  });

  test('"Apply to Hammer Holes Only" — does not trigger without a hammer when that sub-toggle is on', () => {
    const scores = { 1: { A: 3, B: 4, C: 5, D: 6, E: 5 } }; // real clean sweep, but no hammer thrown
    const result = resolveWolfHoleFromConfig({
      hole: 1, activePlayers: PLAYERS, wolfHoles: { 1: { partnerId: 'B' } }, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 5,
      addAHammerEnabled: true, addAHammerHammerHolesOnly: true,
    });
    expect(result.addAHammerTriggered).toBe(false);
  });

  test('"Apply to Hammer Holes Only" — DOES trigger when a hammer was thrown that hole', () => {
    const scores = { 1: { A: 3, B: 4, C: 5, D: 6, E: 5 } };
    const result = resolveWolfHoleFromConfig({
      hole: 1, activePlayers: PLAYERS, wolfHoles: { 1: { partnerId: 'B', hammerMultiplier: 2 } }, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 5,
      addAHammerEnabled: true, addAHammerHammerHolesOnly: true,
    });
    expect(result.addAHammerTriggered).toBe(true);
  });

  test('never triggers on a hole that ended by Hammer rejection — no scores to compare', () => {
    const result = resolveWolfHoleFromConfig({
      hole: 1, activePlayers: PLAYERS,
      wolfHoles: { 1: { partnerId: 'B', hammerMultiplier: 2, hammerResolution: 'rejected', concededBy: 'big' } },
      getFormat: getWolfFormat, course: COURSE, scores: {}, handicapMode: 'full', betAmount: 5,
      addAHammerEnabled: true,
    });
    expect(result.addAHammerTriggered).toBe(false);
  });

  test('stacks correctly on top of an actual Hammer multiplier (not just Add-A-Hammer alone)', () => {
    const scores = { 1: { A: 3, B: 4, C: 5, D: 6, E: 5 } };
    const result = resolveWolfHoleFromConfig({
      hole: 1, activePlayers: PLAYERS, wolfHoles: { 1: { partnerId: 'B', hammerMultiplier: 2 } }, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 5, addAHammerEnabled: true,
    });
    // Pack(1x) x hammer(2x) x addAHammer(2x) x $5 = $20 per pairing
    expect(result.resolved.dollarsPerPairing).toBe(20);
  });
});

describe('computeWolfRoundResult — Add-A-Hammer flows through the full round', () => {
  test('a clean sweep hole doubles that hole\'s contribution to the final balances', () => {
    const scores = { 1: { A: 3, B: 4, C: 5, D: 6, E: 5 } };
    const withoutAddAHammer = computeWolfRoundResult({
      activePlayers: PLAYERS, wolfHoles: { 1: { partnerId: 'B' } }, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 5, addAHammerEnabled: false,
    });
    const withAddAHammer = computeWolfRoundResult({
      activePlayers: PLAYERS, wolfHoles: { 1: { partnerId: 'B' } }, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 5, addAHammerEnabled: true,
    });
    expect(withAddAHammer.balancesByPlayerId.A).toBe(withoutAddAHammer.balancesByPlayerId.A * 2);
  });
});

describe('getWolfHoleNarrative — Hammer Sweep shows up in the narrative tags', () => {
  test('a triggered clean sweep is mentioned in the format label', () => {
    const scores = { 1: { A: 3, B: 4, C: 5, D: 6, E: 5 } };
    const { lines } = getWolfHoleNarrative({
      hole: 1, activePlayers: PLAYERS, wolfHoles: { 1: { partnerId: 'B' } }, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 5, addAHammerEnabled: true,
    });
    expect(lines[0]).toContain('Hammer Sweep 2x');
  });
});
