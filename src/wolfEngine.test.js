/**
 * wolfEngine.test.js
 * Run with: npm test -- --testPathPattern=wolfEngine
 *
 * REWRITTEN against Harrison Biro's direct, confirmed real numbers (his
 * $25 worked example: Wolf=$25/opp, Lone Wolf=$50/opp, Blind Wolf=$75/opp,
 * Pack Wolf pooled 2v3 = $37.50/$16.67 each). Harrison Wolf is now the
 * default wolfStyle. Classic Wolf (the original document's asymmetric
 * point table) is preserved and tested as the selectable alternative —
 * it was never deleted, just demoted from "the only option" to "a variant."
 *
 * Scope note: hole-level resolution only. Super Wolf assignment, carryover,
 * and settlement wiring are covered in their own test files.
 */

import { resolveWolfHole, WOLF_MULTIPLIER_TABLES, WOLF_STYLES, WOLF_SETTLEMENT_STYLES } from './engine/scoringEngine';

function singleHoleCourse(par = 4, hcp = 1) {
  return { pars: [par], hcp: [hcp] };
}
function makePlayer(id, hcp) {
  return { id, name: id, hcp };
}
const PLAYERS = ['Wolf', 'P2', 'P3', 'P4', 'P5'].map((id) => makePlayer(id, 0));
const COURSE = singleHoleCourse(4, 1);
const HOLE = 1;
function scoresFor(map) { return { [HOLE]: map }; }

// ─── Harrison Wolf — the default style ────────────────────────────────────

describe('resolveWolfHole — Harrison Wolf, solo tiers (Pairwise, matches his $25 example exactly)', () => {
  const smallSide = ['Wolf'];
  const bigSide = ['P2', 'P3', 'P4', 'P5'];
  const winScores = scoresFor({ Wolf: 2, P2: 4, P3: 5, P4: 6, P5: 5 });
  const loseScores = scoresFor({ Wolf: 5, P2: 4, P3: 5, P4: 6, P5: 5 });

  test('Wolf (1x), $25 hole, wins → $25/opponent, $100 total', () => {
    const r = resolveWolfHole({ format: 'solo', smallSide, bigSide, hole: HOLE, players: PLAYERS, course: COURSE, scores: winScores, handicapMode: 'full', betAmount: 25 });
    expect(r.deltas.P2).toBe(-25);
    expect(r.deltas.Wolf).toBe(100);
  });

  test('Wolf (1x), $25 hole, loses → pays $25/opponent, $100 total', () => {
    const r = resolveWolfHole({ format: 'solo', smallSide, bigSide, hole: HOLE, players: PLAYERS, course: COURSE, scores: loseScores, handicapMode: 'full', betAmount: 25 });
    expect(r.deltas.P2).toBe(25);
    expect(r.deltas.Wolf).toBe(-100);
  });

  test('Lone Wolf (2x, declared after own shot), $25 hole, wins → $50/opponent, $200 total', () => {
    const r = resolveWolfHole({ format: 'loneWolf', smallSide, bigSide, hole: HOLE, players: PLAYERS, course: COURSE, scores: winScores, handicapMode: 'full', betAmount: 25 });
    expect(r.deltas.P2).toBe(-50);
    expect(r.deltas.Wolf).toBe(200);
  });

  test('Blind Wolf (3x, declared before own shot), $25 hole, wins → $75/opponent, $300 total', () => {
    const r = resolveWolfHole({ format: 'blindWolf', smallSide, bigSide, hole: HOLE, players: PLAYERS, course: COURSE, scores: winScores, handicapMode: 'full', betAmount: 25 });
    expect(r.deltas.P2).toBe(-75);
    expect(r.deltas.Wolf).toBe(300);
  });
});

describe('resolveWolfHole — Harrison Wolf, Pack Wolf (2v3), Pairwise vs Pooled', () => {
  const smallSide = ['Wolf', 'P2'];
  const bigSide = ['P3', 'P4', 'P5'];
  const winScores = scoresFor({ Wolf: 3, P2: 5, P3: 4, P4: 5, P5: 5 });
  const loseScores = scoresFor({ Wolf: 5, P2: 5, P3: 3, P4: 5, P5: 5 });

  test('Pairwise: $25 hole, Wolf+partner win → each opponent pays $25 to EACH winner ($50 total per opponent), each winner collects $75', () => {
    const r = resolveWolfHole({
      format: 'pack', smallSide, bigSide, hole: HOLE, players: PLAYERS, course: COURSE, scores: winScores,
      handicapMode: 'full', betAmount: 25, settlementStyle: WOLF_SETTLEMENT_STYLES.PAIRWISE,
    });
    expect(r.deltas.P3).toBe(-50);
    expect(r.deltas.Wolf).toBe(75);
  });

  test('Pooled: $25 hole, Wolf+partner win → matches Harrison\'s exact numbers: $37.50 each', () => {
    const r = resolveWolfHole({
      format: 'pack', smallSide, bigSide, hole: HOLE, players: PLAYERS, course: COURSE, scores: winScores,
      handicapMode: 'full', betAmount: 25, settlementStyle: WOLF_SETTLEMENT_STYLES.POOLED,
    });
    expect(r.deltas.Wolf).toBeCloseTo(37.5, 5);
    expect(r.deltas.P2).toBeCloseTo(37.5, 5);
    expect(r.deltas.P3).toBe(-25);
  });

  test('Pooled: $25 hole, opponents win → matches Harrison\'s exact numbers: $16.67 each', () => {
    const r = resolveWolfHole({
      format: 'pack', smallSide, bigSide, hole: HOLE, players: PLAYERS, course: COURSE, scores: loseScores,
      handicapMode: 'full', betAmount: 25, settlementStyle: WOLF_SETTLEMENT_STYLES.POOLED,
    });
    expect(r.deltas.P3).toBeCloseTo(50 / 3, 5);
    expect(r.deltas.Wolf).toBe(-25);
  });

  test('Pooled and Pairwise are always zero-sum, even with fractional splits', () => {
    const r = resolveWolfHole({
      format: 'pack', smallSide, bigSide, hole: HOLE, players: PLAYERS, course: COURSE, scores: loseScores,
      handicapMode: 'full', betAmount: 25, settlementStyle: WOLF_SETTLEMENT_STYLES.POOLED,
    });
    const sum = Object.values(r.deltas).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(0, 8);
  });
});

describe('Pairwise and Pooled equivalence — only when the SINGLE player is on the winning side', () => {
  test('solo wins (1-person side is the winner) → pairwise === pooled, trivial split', () => {
    const scores = scoresFor({ Wolf: 2, P2: 3, P3: 5, P4: 6, P5: 5 }); // Wolf (solo) beats P2's best
    const pairwise = resolveWolfHole({ format: 'solo', smallSide: ['Wolf'], bigSide: ['P2', 'P3', 'P4', 'P5'], hole: HOLE, players: PLAYERS, course: COURSE, scores, handicapMode: 'full', betAmount: 25, settlementStyle: WOLF_SETTLEMENT_STYLES.PAIRWISE });
    const pooled = resolveWolfHole({ format: 'solo', smallSide: ['Wolf'], bigSide: ['P2', 'P3', 'P4', 'P5'], hole: HOLE, players: PLAYERS, course: COURSE, scores, handicapMode: 'full', betAmount: 25, settlementStyle: WOLF_SETTLEMENT_STYLES.POOLED });
    expect(pooled.deltas).toEqual(pairwise.deltas);
  });

  test('solo LOSES (1-person side is the loser, 4-person side wins) → pairwise and pooled genuinely DIVERGE', () => {
    const scores = scoresFor({ Wolf: 3, P2: 2, P3: 5, P4: 6, P5: 5 }); // P2 (best of the 4) beats Wolf
    const pairwise = resolveWolfHole({ format: 'solo', smallSide: ['Wolf'], bigSide: ['P2', 'P3', 'P4', 'P5'], hole: HOLE, players: PLAYERS, course: COURSE, scores, handicapMode: 'full', betAmount: 25, settlementStyle: WOLF_SETTLEMENT_STYLES.PAIRWISE });
    const pooled = resolveWolfHole({ format: 'solo', smallSide: ['Wolf'], bigSide: ['P2', 'P3', 'P4', 'P5'], hole: HOLE, players: PLAYERS, course: COURSE, scores, handicapMode: 'full', betAmount: 25, settlementStyle: WOLF_SETTLEMENT_STYLES.POOLED });
    // Pairwise: Wolf (1 loser) pays each of 4 winners the full $25 individually = -$100 total
    expect(pairwise.deltas.Wolf).toBe(-100);
    expect(pairwise.deltas.P2).toBe(25);
    // Pooled: Wolf's single $25 contribution splits 4 ways = -$25 total, $6.25 each winner
    expect(pooled.deltas.Wolf).toBe(-25);
    expect(pooled.deltas.P2).toBeCloseTo(6.25, 5);
    expect(pooled.deltas).not.toEqual(pairwise.deltas);
  });
});

// ─── Classic Wolf — the original document's numbers, now an optional variant ─

describe('resolveWolfHole — Classic Wolf style (opt-in, matches the original spec doc exactly)', () => {
  const smallSide2 = ['Wolf', 'P2'];
  const bigSide3 = ['P3', 'P4', 'P5'];
  const smallSide1 = ['Wolf'];
  const bigSide4 = ['P2', 'P3', 'P4', 'P5'];

  test('Pack Wolf: 2-unit tier each side, $5 base → each winner collects $30 (matches original doc Section 7A)', () => {
    const scores = scoresFor({ Wolf: 3, P2: 5, P3: 4, P4: 5, P5: 5 });
    const r = resolveWolfHole({ format: 'pack', smallSide: smallSide2, bigSide: bigSide3, hole: HOLE, players: PLAYERS, course: COURSE, scores, handicapMode: 'full', betAmount: 5, wolfStyle: WOLF_STYLES.CLASSIC });
    expect(r.deltas.Wolf).toBe(30);
  });

  test('Solo (4-unit win / 1-unit lose), $5 base, wins → Wolf collects $80 total (matches original doc)', () => {
    const scores = scoresFor({ Wolf: 2, P2: 4, P3: 5, P4: 6, P5: 5 });
    const r = resolveWolfHole({ format: 'solo', smallSide: smallSide1, bigSide: bigSide4, hole: HOLE, players: PLAYERS, course: COURSE, scores, handicapMode: 'full', betAmount: 5, wolfStyle: WOLF_STYLES.CLASSIC });
    expect(r.deltas.Wolf).toBe(80);
  });

  test('Blind Wolf (12-unit win), $5 base, wins → Wolf collects $240 total (matches original doc)', () => {
    const scores = scoresFor({ Wolf: 2, P2: 4, P3: 5, P4: 6, P5: 5 });
    const r = resolveWolfHole({ format: 'blindWolf', smallSide: smallSide1, bigSide: bigSide4, hole: HOLE, players: PLAYERS, course: COURSE, scores, handicapMode: 'full', betAmount: 5, wolfStyle: WOLF_STYLES.CLASSIC });
    expect(r.deltas.Wolf).toBe(240);
  });

  test('Classic style has no separate loneWolf tier — solo and loneWolf produce identical numbers', () => {
    const scores = scoresFor({ Wolf: 2, P2: 4, P3: 5, P4: 6, P5: 5 });
    const solo = resolveWolfHole({ format: 'solo', smallSide: smallSide1, bigSide: bigSide4, hole: HOLE, players: PLAYERS, course: COURSE, scores, handicapMode: 'full', betAmount: 5, wolfStyle: WOLF_STYLES.CLASSIC });
    const lone = resolveWolfHole({ format: 'loneWolf', smallSide: smallSide1, bigSide: bigSide4, hole: HOLE, players: PLAYERS, course: COURSE, scores, handicapMode: 'full', betAmount: 5, wolfStyle: WOLF_STYLES.CLASSIC });
    expect(lone.deltas).toEqual(solo.deltas);
  });

  test('Shuck (8-unit win / 2-unit lose), $5 base, wins → Shucker collects $160 from 4 opponents (matches original doc)', () => {
    const scores = scoresFor({ P2: 2, Wolf: 4, P3: 5, P4: 6, P5: 5 });
    const r = resolveWolfHole({ format: 'shuck', smallSide: ['P2'], bigSide: ['Wolf', 'P3', 'P4', 'P5'], hole: HOLE, players: PLAYERS, course: COURSE, scores, handicapMode: 'full', betAmount: 5, wolfStyle: WOLF_STYLES.CLASSIC });
    expect(r.deltas.P2).toBe(160);
  });
});

// ─── Ties are always a push — unaffected by style or settlement choice ─────

describe('resolveWolfHole — ties are always a push, regardless of style/settlement', () => {
  test.each([
    [WOLF_STYLES.HARRISON, WOLF_SETTLEMENT_STYLES.PAIRWISE],
    [WOLF_STYLES.HARRISON, WOLF_SETTLEMENT_STYLES.POOLED],
    [WOLF_STYLES.CLASSIC, WOLF_SETTLEMENT_STYLES.PAIRWISE],
  ])('%s / %s: tied best-ball scores → push, zero deltas', (wolfStyle, settlementStyle) => {
    const scores = scoresFor({ Wolf: 3, P2: 3, P3: 5, P4: 6, P5: 5 });
    const r = resolveWolfHole({ format: 'solo', smallSide: ['Wolf'], bigSide: ['P2', 'P3', 'P4', 'P5'], hole: HOLE, players: PLAYERS, course: COURSE, scores, handicapMode: 'full', betAmount: 25, wolfStyle, settlementStyle });
    expect(r.winner).toBe('push');
    expect(Object.values(r.deltas).every((v) => v === 0)).toBe(true);
  });
});

// ─── Hammer + birdie multipliers stack correctly under the new model ──────

describe('resolveWolfHole — Hammer and birdie multipliers still stack correctly', () => {
  test('Lone Wolf (2x) + Hammer (2x) + birdie (2x) on a $25 hole = 2×2×2×25 = $200/opponent', () => {
    const scores = scoresFor({ Wolf: 2, P2: 4, P3: 5, P4: 6, P5: 5 });
    const r = resolveWolfHole({
      format: 'loneWolf', smallSide: ['Wolf'], bigSide: ['P2', 'P3', 'P4', 'P5'], hole: HOLE,
      players: PLAYERS, course: COURSE, scores, handicapMode: 'full', betAmount: 25,
      hammerMultiplier: 2, birdieMultiplier: 2,
    });
    expect(r.deltas.P2).toBe(-200);
  });

  test('rejected hammer still resolves correctly under the new multiplier model', () => {
    const r = resolveWolfHole({
      format: 'pack', smallSide: ['Wolf', 'P2'], bigSide: ['P3', 'P4', 'P5'], hole: HOLE,
      players: PLAYERS, course: COURSE, scores: {}, handicapMode: 'full', betAmount: 25,
      hammerMultiplier: 2, concededBy: 'big',
    });
    expect(r.winner).toBe('small');
    // Pairwise (default): P3 pays BOTH Wolf and P2 the full per-pairing amount.
    // 1x(pack) × $25 × 2(hammer) = $50 per pairing, × 2 winners = -$100 total.
    expect(r.deltas.P3).toBe(-100);
  });
});

describe('WOLF_MULTIPLIER_TABLES', () => {
  test('Harrison style matches confirmed real numbers exactly', () => {
    expect(WOLF_MULTIPLIER_TABLES[WOLF_STYLES.HARRISON]).toEqual({
      pack:      { small: 1, big: 1 },
      solo:      { small: 1, big: 1 },
      loneWolf:  { small: 2, big: 2 },
      blindWolf: { small: 3, big: 3 },
      shuck:     { small: 2, big: 2 },
    });
  });

  test('Classic style matches the original document exactly', () => {
    expect(WOLF_MULTIPLIER_TABLES[WOLF_STYLES.CLASSIC]).toEqual({
      pack:      { small: 2,  big: 2 },
      solo:      { small: 4,  big: 1 },
      loneWolf:  { small: 4,  big: 1 },
      blindWolf: { small: 12, big: 3 },
      shuck:     { small: 8,  big: 2 },
    });
  });
});
