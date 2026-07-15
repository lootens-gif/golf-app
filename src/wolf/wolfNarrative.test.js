/**
 * wolfNarrative.test.js
 * Run with: npm test -- --testPathPattern=wolfNarrative
 *
 * Tests getWolfHoleSides() and getWolfHoleNarrative() — the shared logic
 * powering both the Live screen's Hole Result card and the Results
 * screen's Match Detail view, so there's exactly one tested source for
 * "what happened on this Wolf hole, in words."
 */

import { getWolfHoleSides, getWolfHoleNarrative, resolveWolfHoleFromConfig } from '../engine/scoringEngine';
import { getWolfFormat } from '../components/live/WolfHoleCard';

function makePlayer(id) { return { id, name: id, hcp: 0 }; }
const PLAYERS = ['A', 'B', 'C', 'D', 'E'].map(makePlayer);
const COURSE = { pars: Array(15).fill(4) };

describe('getWolfHoleSides', () => {
  test('solo: Wolf alone vs. the other 4', () => {
    const sides = getWolfHoleSides(1, PLAYERS, {}, 'solo');
    expect(sides.wolfId).toBe('A');
    expect(sides.smallSide).toEqual(['A']);
    expect(sides.bigSide).toEqual(['B', 'C', 'D', 'E']);
  });

  test('pack: Wolf + partner vs. the other 3', () => {
    const sides = getWolfHoleSides(1, PLAYERS, { partnerId: 'C' }, 'pack');
    expect(sides.smallSide).toEqual(['A', 'C']);
    expect(sides.bigSide).toEqual(['B', 'D', 'E']);
  });

  test('shuck: Wolf stays alone vs. all 4 (including the shucker) — a shuck punishes the Wolf, it does not reward the shucker', () => {
    const sides = getWolfHoleSides(1, PLAYERS, { partnerId: 'C' }, 'shuck');
    expect(sides.smallSide).toEqual(['A']); // hole 1's Wolf, unaffected by who was invited
    expect(sides.bigSide).toEqual(['B', 'C', 'D', 'E']); // shucker C is just one of the four now
  });

  test('shuckDoubles=false makes a Shuck play at the normal solo rate, not 2x — a real Setup toggle, not hardcoded', () => {
    const scores = { 1: { A: 2, B: 5, C: 5, D: 6, E: 5 } };
    const withDoubling = resolveWolfHoleFromConfig({
      hole: 1, activePlayers: PLAYERS, wolfHoles: { 1: { partnerId: 'B', shucked: true } }, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 5, shuckDoubles: true,
    });
    const withoutDoubling = resolveWolfHoleFromConfig({
      hole: 1, activePlayers: PLAYERS, wolfHoles: { 1: { partnerId: 'B', shucked: true } }, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 5, shuckDoubles: false,
    });
    expect(withDoubling.resolved.deltas.A).toBe(40); // 2x, 4 opponents × $10
    expect(withoutDoubling.resolved.deltas.A).toBe(20); // 1x, matches an ordinary solo win
  });

  test('shuckDoubles=false on Classic Wolf falls back to Classic\'s own solo tier (4x/1x), not a flat 1x', () => {
    const scores = { 1: { A: 2, B: 5, C: 5, D: 6, E: 5 } }; // A wins
    const result = resolveWolfHoleFromConfig({
      hole: 1, activePlayers: PLAYERS, wolfHoles: { 1: { partnerId: 'B', shucked: true } }, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 5, wolfStyle: 'classic', shuckDoubles: false,
    });
    // Classic solo win = 4x, same as an ordinary Classic solo hole would be
    expect(result.resolved.deltas.A).toBe(80); // $5 × 4 × 4 opponents
  });

  test('a stale hammerMultiplier from a previous session does NOT apply when Hammer Rule is off — real bug reported by Jon Biro', () => {
    const scores = { 1: { A: 3, B: 5, C: 5, D: 6, E: 5 } };
    const staleWolfHoles = { 1: { hammerMultiplier: 2 } }; // leftover from before, Hammer Rule now off
    const withHammerRuleOff = resolveWolfHoleFromConfig({
      hole: 1, activePlayers: PLAYERS, wolfHoles: staleWolfHoles, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 5, hammerEnabled: false,
    });
    const withHammerRuleOn = resolveWolfHoleFromConfig({
      hole: 1, activePlayers: PLAYERS, wolfHoles: staleWolfHoles, getFormat: getWolfFormat,
      course: COURSE, scores, handicapMode: 'full', betAmount: 5, hammerEnabled: true,
    });
    expect(withHammerRuleOff.resolved.deltas.A).toBe(20); // 1x, stale hammer ignored — $5 × 4 opponents
    expect(withHammerRuleOn.resolved.deltas.A).toBe(40);  // 2x, hammer correctly applies when the rule is genuinely on
    expect(withHammerRuleOff.hammerMultiplier).toBe(1);
  });

  test('a stale conceded/rejected Hammer hole does NOT resolve without scores when Hammer Rule is off', () => {
    const staleWolfHoles = { 1: { hammerResolution: 'rejected', concededBy: 'small' } };
    const result = resolveWolfHoleFromConfig({
      hole: 1, activePlayers: PLAYERS, wolfHoles: staleWolfHoles, getFormat: getWolfFormat,
      course: COURSE, scores: {}, handicapMode: 'full', betAmount: 5, hammerEnabled: false,
    });
    expect(result.resolved).toBeNull(); // correctly unresolved — no real scores, and the stale concession is ignored
  });

  test('rotation: hole 3 → C is Wolf', () => {
    const sides = getWolfHoleSides(3, PLAYERS, {}, 'solo');
    expect(sides.wolfId).toBe('C');
  });
});

describe('getWolfHoleNarrative', () => {
  test('unscored hole returns empty lines, not a crash', () => {
    const result = getWolfHoleNarrative({
      hole: 1, activePlayers: PLAYERS, wolfHoles: {}, getFormat: getWolfFormat,
      course: COURSE, scores: {}, handicapMode: 'full', betAmount: 5,
    });
    expect(result.lines).toEqual([]);
  });

  test('Pack Wolf, played: names, format label, and per-player $ lines', () => {
    const scores = { 1: { A: 3, B: 5, C: 4, D: 5, E: 5 } };
    const result = getWolfHoleNarrative({
      hole: 1, activePlayers: PLAYERS, wolfHoles: { 1: { partnerId: 'B' } },
      getFormat: getWolfFormat, course: COURSE, scores, handicapMode: 'full', betAmount: 5,
    });
    expect(result.lines[0]).toBe('A + B vs. the other 3');
    expect(result.lines).toContain('A, B won the hole.');
    expect(result.lines).toContain('A: +$15.00');
    expect(result.lines).toContain('C: -$10.00');
  });

  test('a push produces a clear push line, no dollar lines', () => {
    const scores = { 1: { A: 3, B: 3, C: 5, D: 6, E: 5 } }; // A ties the best opponent
    const result = getWolfHoleNarrative({
      hole: 1, activePlayers: PLAYERS, wolfHoles: {},
      getFormat: getWolfFormat, course: COURSE, scores, handicapMode: 'full', betAmount: 5,
    });
    expect(result.lines).toContain('Push — no money changes hands this hole.');
  });

  test('Hammer multiplier and concession show up in the format tag', () => {
    const result = getWolfHoleNarrative({
      hole: 1, activePlayers: PLAYERS,
      wolfHoles: { 1: { partnerId: 'B', hammerMultiplier: 2, hammerResolution: 'rejected', concededBy: 'big' } },
      getFormat: getWolfFormat, course: COURSE, scores: {}, handicapMode: 'full', betAmount: 5,
    });
    expect(result.lines[0]).toContain('Hammer 2x, conceded');
  });

  test('Shuck labels the ORIGINAL WOLF as the one left alone, shucked by the invited partner', () => {
    const scores = { 1: { A: 2, B: 4, C: 5, D: 6, E: 5 } }; // A is hole 1's Wolf
    const result = getWolfHoleNarrative({
      hole: 1, activePlayers: PLAYERS, wolfHoles: { 1: { partnerId: 'B', shucked: true } },
      getFormat: getWolfFormat, course: COURSE, scores, handicapMode: 'full', betAmount: 5,
    });
    expect(result.lines[0]).toBe('A — shucked by B, alone vs. everyone');
  });
});
