/**
 * wolfEngine.test.js
 * Run with: npm test -- --testPathPattern=wolfEngine
 *
 * Verifies resolveWolfHole() against the exact worked payout tables in
 * "Wolf Golf Game — Program Requirements (Final)" Section 7A, plus the
 * Hammer stacking table (8A), the Shuck example (10A), and the confirmed
 * tie-is-always-a-push rule (6B).
 *
 * Scope note: this covers hole-level resolution only. Super Wolf assignment,
 * carryover, and full-round settlement (scoreRound wiring) are separate,
 * not yet tested here.
 */

import { resolveWolfHole, WOLF_POINT_VALUES } from './engine/scoringEngine';

// ─── helpers ────────────────────────────────────────────────────────────────

function singleHoleCourse(par = 4, hcp = 1) {
  return { pars: [par], hcp: [hcp] };
}

function makePlayer(id, hcp) {
  return { id, name: id, hcp };
}

/** 5 scratch players so net === gross; keeps the win/lose/push math isolated
 *  from handicap logic (that's already covered by the existing engine tests). */
const PLAYERS = ['Wolf', 'P2', 'P3', 'P4', 'P5'].map((id) => makePlayer(id, 0));
const COURSE = singleHoleCourse(4, 1);
const HOLE = 1;

function scoresFor(map) {
  return { [HOLE]: map };
}

// ─── Pack Wolf (2v3) ──────────────────────────────────────────────────────

describe('resolveWolfHole — Pack Wolf', () => {
  const smallSide = ['Wolf', 'P2'];
  const bigSide = ['P3', 'P4', 'P5'];

  test.each([
    [1, 2, 4, 6],
    [2, 4, 8, 12],
    [4, 8, 16, 24],
    [5, 10, 20, 30],
  ])('bet $%i → each loser pays $%i per winner, $%i total; each winner collects $%i total', (bet, perPairing, loserTotal, winnerTotal) => {
    const scores = scoresFor({ Wolf: 3, P2: 5, P3: 4, P4: 5, P5: 5 }); // small side best-ball = 3, big = 4 → small wins
    const result = resolveWolfHole({
      format: 'pack', smallSide, bigSide, hole: HOLE,
      players: PLAYERS, course: COURSE, scores, handicapMode: 'full',
      betAmount: bet,
    });
    expect(result.winner).toBe('small');
    expect(result.dollarsPerPairing).toBe(perPairing);
    expect(result.deltas.Wolf).toBe(winnerTotal);
    expect(result.deltas.P2).toBe(winnerTotal);
    expect(result.deltas.P3).toBe(-loserTotal);
    expect(result.deltas.P4).toBe(-loserTotal);
    expect(result.deltas.P5).toBe(-loserTotal);
  });

  test('zero-sum: total winnings equal total losses', () => {
    const scores = scoresFor({ Wolf: 3, P2: 5, P3: 4, P4: 5, P5: 5 });
    const result = resolveWolfHole({
      format: 'pack', smallSide, bigSide, hole: HOLE,
      players: PLAYERS, course: COURSE, scores, handicapMode: 'full',
      betAmount: 5,
    });
    const sum = Object.values(result.deltas).reduce((s, v) => s + v, 0);
    expect(sum).toBe(0);
  });
});

// ─── Lone Wolf (1v4) ──────────────────────────────────────────────────────

describe('resolveWolfHole — Lone Wolf', () => {
  const smallSide = ['Wolf'];
  const bigSide = ['P2', 'P3', 'P4', 'P5'];

  test.each([
    [1, 4, 16],
    [2, 8, 32],
    [4, 16, 64],
    [5, 20, 80],
  ])('Wolf wins, bet $%i → each opponent pays $%i, Wolf collects $%i total', (bet, perOpponent, wolfTotal) => {
    const scores = scoresFor({ Wolf: 2, P2: 4, P3: 5, P4: 6, P5: 5 }); // Wolf beats best opponent (4)
    const result = resolveWolfHole({
      format: 'lone', smallSide, bigSide, hole: HOLE,
      players: PLAYERS, course: COURSE, scores, handicapMode: 'full',
      betAmount: bet,
    });
    expect(result.winner).toBe('small');
    expect(result.deltas.P2).toBe(-perOpponent);
    expect(result.deltas.Wolf).toBe(wolfTotal);
  });

  test.each([
    [1, 1, 4],
    [2, 2, 8],
    [4, 4, 16],
    [5, 5, 20],
  ])('opponents win, bet $%i → Wolf pays $%i each, $%i total', (bet, perOpponent, wolfTotal) => {
    const scores = scoresFor({ Wolf: 5, P2: 4, P3: 5, P4: 6, P5: 5 }); // best opponent (4) beats Wolf (5)
    const result = resolveWolfHole({
      format: 'lone', smallSide, bigSide, hole: HOLE,
      players: PLAYERS, course: COURSE, scores, handicapMode: 'full',
      betAmount: bet,
    });
    expect(result.winner).toBe('big');
    expect(result.deltas.P2).toBe(perOpponent);
    expect(result.deltas.Wolf).toBe(-wolfTotal);
  });
});

// ─── Blind Lone Wolf ──────────────────────────────────────────────────────

describe('resolveWolfHole — Blind Lone Wolf', () => {
  const smallSide = ['Wolf'];
  const bigSide = ['P2', 'P3', 'P4', 'P5'];

  test.each([
    [1, 12, 48],
    [5, 60, 240],
  ])('Wolf wins, bet $%i → each opponent pays $%i, Wolf collects $%i total', (bet, perOpponent, wolfTotal) => {
    const scores = scoresFor({ Wolf: 2, P2: 4, P3: 5, P4: 6, P5: 5 });
    const result = resolveWolfHole({
      format: 'blind', smallSide, bigSide, hole: HOLE,
      players: PLAYERS, course: COURSE, scores, handicapMode: 'full',
      betAmount: bet,
    });
    expect(result.deltas.Wolf).toBe(wolfTotal);
  });

  test.each([
    [1, 3, 12],
    [5, 15, 60],
  ])('opponents win, bet $%i → Wolf pays $%i each, $%i total', (bet, perOpponent, wolfTotal) => {
    const scores = scoresFor({ Wolf: 5, P2: 4, P3: 5, P4: 6, P5: 5 });
    const result = resolveWolfHole({
      format: 'blind', smallSide, bigSide, hole: HOLE,
      players: PLAYERS, course: COURSE, scores, handicapMode: 'full',
      betAmount: bet,
    });
    expect(result.deltas.Wolf).toBe(-wolfTotal);
  });
});

// ─── Shuck (1v4, doubled) ─────────────────────────────────────────────────

describe('resolveWolfHole — Shuck', () => {
  const smallSide = ['P2']; // the shucker
  const bigSide = ['Wolf', 'P3', 'P4', 'P5'];

  test('shucker wins at $5/pt → $40 per opponent, $160 total, all 4 opponents pay', () => {
    const scores = scoresFor({ P2: 2, Wolf: 4, P3: 5, P4: 6, P5: 5 });
    const result = resolveWolfHole({
      format: 'shuck', smallSide, bigSide, hole: HOLE,
      players: PLAYERS, course: COURSE, scores, handicapMode: 'full',
      betAmount: 5,
    });
    expect(result.winner).toBe('small');
    expect(result.deltas.Wolf).toBe(-40);
    expect(result.deltas.P3).toBe(-40);
    expect(result.deltas.P4).toBe(-40);
    expect(result.deltas.P5).toBe(-40);
    expect(result.deltas.P2).toBe(160);
  });

  test('opponents win at $5/pt → shucker pays $10 each, $40 total', () => {
    const scores = scoresFor({ P2: 5, Wolf: 4, P3: 5, P4: 6, P5: 5 });
    const result = resolveWolfHole({
      format: 'shuck', smallSide, bigSide, hole: HOLE,
      players: PLAYERS, course: COURSE, scores, handicapMode: 'full',
      betAmount: 5,
    });
    expect(result.winner).toBe('big');
    expect(result.deltas.P2).toBe(-40);
    expect(result.deltas.Wolf).toBe(10);
  });
});

// ─── Ties are always a push (Section 6B — corrected from the original draft) ─

describe('resolveWolfHole — ties are always a push', () => {
  test('Pack Wolf: equal best-ball scores → push, zero deltas', () => {
    const scores = scoresFor({ Wolf: 3, P2: 5, P3: 3, P4: 6, P5: 5 }); // both sides best-ball = 3
    const result = resolveWolfHole({
      format: 'pack', smallSide: ['Wolf', 'P2'], bigSide: ['P3', 'P4', 'P5'], hole: HOLE,
      players: PLAYERS, course: COURSE, scores, handicapMode: 'full',
      betAmount: 5,
    });
    expect(result.winner).toBe('push');
    expect(Object.values(result.deltas).every((v) => v === 0)).toBe(true);
  });

  test('Lone Wolf: Wolf ties the best opponent → push, NOT a loss for the Wolf', () => {
    const scores = scoresFor({ Wolf: 3, P2: 3, P3: 5, P4: 6, P5: 5 }); // Wolf ties P2, the best opponent
    const result = resolveWolfHole({
      format: 'lone', smallSide: ['Wolf'], bigSide: ['P2', 'P3', 'P4', 'P5'], hole: HOLE,
      players: PLAYERS, course: COURSE, scores, handicapMode: 'full',
      betAmount: 5,
    });
    expect(result.winner).toBe('push'); // this is the exact case the original draft got wrong
    expect(Object.values(result.deltas).every((v) => v === 0)).toBe(true);
  });
});

// ─── Hammer multiplier stacking (Section 8A) ─────────────────────────────

describe('resolveWolfHole — Hammer multiplier', () => {
  const smallSide = ['Wolf', 'P2'];
  const bigSide = ['P3', 'P4', 'P5'];
  const scores = scoresFor({ Wolf: 3, P2: 5, P3: 4, P4: 5, P5: 5 }); // small side wins

  test.each([
    [1, 30, 20],   // no hammer
    [2, 60, 40],   // hammer accepted
    [4, 120, 80],  // re-hammer accepted
  ])('multiplier %ix at $5/pt → each winner collects $%i, each loser pays $%i', (mult, winnerTotal, loserTotal) => {
    const result = resolveWolfHole({
      format: 'pack', smallSide, bigSide, hole: HOLE,
      players: PLAYERS, course: COURSE, scores, handicapMode: 'full',
      betAmount: 5, hammerMultiplier: mult,
    });
    expect(result.deltas.Wolf).toBe(winnerTotal);
    expect(result.deltas.P3).toBe(-loserTotal);
  });

  test('rejected hammer: conceding side loses outright at the pre-rejection multiplier, no scores needed', () => {
    const result = resolveWolfHole({
      format: 'pack', smallSide, bigSide, hole: HOLE,
      players: PLAYERS, course: COURSE, scores: {}, handicapMode: 'full', // no scores entered at all
      betAmount: 5, hammerMultiplier: 2, concededBy: 'big',
    });
    expect(result.winner).toBe('small');
    expect(result.deltas.Wolf).toBe(60);
    expect(result.deltas.P3).toBe(-40);
  });
});

// ─── Birdie / Eagle / Albatross multiplier (Section 11) ──────────────────

describe('resolveWolfHole — birdie/eagle/albatross multiplier', () => {
  const smallSide = ['Wolf'];
  const bigSide = ['P2', 'P3', 'P4', 'P5'];
  const scores = scoresFor({ Wolf: 2, P2: 4, P3: 5, P4: 6, P5: 5 }); // Wolf wins

  // NOTE: the doc's Section 11 illustration ("$60 → $120 on a birdie") was a
  // simplified example that only showed the bet amount doubling — it didn't
  // account for the format's own point multiplier (Lone Wolf = 4 pts/win).
  // The real per-pairing amount is pointsPerPlayer × betAmount × multiplier,
  // so at a $60 Super Wolf bet with Lone Wolf's 4-point win value, the true
  // numbers are 4x larger than the doc's simplified illustration implied.
  // Flagging this for Tim — worth a one-line correction in the doc so nobody
  // reads "$60 → $120" as the literal payout.
  test.each([
    [1, 240],
    [2, 480],  // birdie
    [3, 720],  // eagle
    [4, 960],  // albatross
  ])('multiplier %ix on a $60 Super Wolf bet (Lone Wolf, 4pt win value) → Wolf collects $%i per opponent', (mult, perOpponent) => {
    const result = resolveWolfHole({
      format: 'lone', smallSide, bigSide, hole: HOLE,
      players: PLAYERS, course: COURSE, scores, handicapMode: 'full',
      betAmount: 60, birdieMultiplier: mult,
    });
    expect(result.deltas.P2).toBe(-perOpponent);
  });
});

// ─── Sanity: point value table matches the confirmed spec ────────────────

describe('WOLF_POINT_VALUES', () => {
  test('matches Section 7 of the confirmed spec exactly', () => {
    expect(WOLF_POINT_VALUES).toEqual({
      pack:  { small: 2,  big: 2 },
      lone:  { small: 4,  big: 1 },
      blind: { small: 12, big: 3 },
      shuck: { small: 8,  big: 2 },
    });
  });
});
