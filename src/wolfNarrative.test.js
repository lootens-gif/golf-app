/**
 * wolfNarrative.test.js
 * Run with: npm test -- --testPathPattern=wolfNarrative
 *
 * Tests getWolfHoleSides() and getWolfHoleNarrative() — the shared logic
 * powering both the Live screen's Hole Result card and the Results
 * screen's Match Detail view, so there's exactly one tested source for
 * "what happened on this Wolf hole, in words."
 */

import { getWolfHoleSides, getWolfHoleNarrative } from './engine/scoringEngine';
import { getWolfFormat } from './components/live/WolfHoleCard';

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

  test('shuck: the shucker alone vs. Wolf + the other 3', () => {
    const sides = getWolfHoleSides(1, PLAYERS, { partnerId: 'C' }, 'shuck');
    expect(sides.smallSide).toEqual(['C']);
    expect(sides.bigSide).toEqual(['A', 'B', 'D', 'E']);
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

  test('Shuck labels the shucker, not the Wolf, as the one who "shucked"', () => {
    const scores = { 1: { B: 2, A: 4, C: 5, D: 6, E: 5 } };
    const result = getWolfHoleNarrative({
      hole: 1, activePlayers: PLAYERS, wolfHoles: { 1: { partnerId: 'B', shucked: true } },
      getFormat: getWolfFormat, course: COURSE, scores, handicapMode: 'full', betAmount: 5,
    });
    expect(result.lines[0]).toBe('B shucked — alone vs. everyone else');
  });
});
