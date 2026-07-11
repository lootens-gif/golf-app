/**
 * wolfSettlement.test.js
 * Run with: npm test -- --testPathPattern=wolfSettlement
 *
 * Verifies computeWolfRoundBalances() sums per-hole resolveWolfHole()
 * results correctly, and that scoreRound() picks those totals up into
 * the mainGame ledger bucket and the final settlement tabs — the same
 * path 9-Point already uses (Section 13 of the confirmed spec: reuse
 * existing pairwise settlement, no new zero-out function needed).
 *
 * Scope note: only holes with a resolved format (1-15, at this point in
 * the build) are covered. Super Wolf holes (16-18) aren't summed here yet
 * — that's still blocked on Harrison's payout-model answer.
 */

import {
  resolveWolfHole,
  computeWolfRoundBalances,
  scoreRound,
} from '../engine/scoringEngine';

function singleHoleCourse(par = 4, hcp = 1) {
  return { pars: [par], hcp: [hcp] };
}
function makePlayer(id) {
  return { id, name: id, hcp: 0 };
}
const PLAYERS = ['Wolf', 'P2', 'P3', 'P4', 'P5'].map(makePlayer);
const COURSE = singleHoleCourse(4, 1);

describe('computeWolfRoundBalances', () => {
  test('sums two holes\' deltas into final per-player totals', () => {
    const hole1 = resolveWolfHole({
      format: 'pack', smallSide: ['Wolf', 'P2'], bigSide: ['P3', 'P4', 'P5'], hole: 1,
      players: PLAYERS, course: COURSE, scores: { 1: { Wolf: 3, P2: 5, P3: 4, P4: 5, P5: 5 } },
      handicapMode: 'full', betAmount: 5,
    });
    const hole2 = resolveWolfHole({
      format: 'solo', smallSide: ['Wolf'], bigSide: ['P2', 'P3', 'P4', 'P5'], hole: 2,
      players: PLAYERS, course: COURSE, scores: { 2: { Wolf: 2, P2: 4, P3: 5, P4: 6, P5: 5 } },
      handicapMode: 'full', betAmount: 5,
    });

    const result = computeWolfRoundBalances([hole1, hole2], PLAYERS.map((p) => p.id));

    // Harrison Wolf, $5 base:
    // Hole 1 (Pack, 1x, small wins): each winner collects $5×3=$15, each loser pays $5×2=$10
    // Hole 2 (Wolf/solo, 1x, Wolf wins): Wolf collects $5×4=$20, each opponent pays $5
    expect(result.balancesByPlayerId.Wolf).toBe(15 + 20);
    expect(result.balancesByPlayerId.P2).toBe(15 - 5);
    expect(result.balancesByPlayerId.P3).toBe(-10 - 5);
    expect(result.balancesByPlayerId.P4).toBe(-10 - 5);
    expect(result.balancesByPlayerId.P5).toBe(-10 - 5);
  });

  test('skips null entries (holes not yet scored) without crashing', () => {
    const hole1 = resolveWolfHole({
      format: 'pack', smallSide: ['Wolf', 'P2'], bigSide: ['P3', 'P4', 'P5'], hole: 1,
      players: PLAYERS, course: COURSE, scores: { 1: { Wolf: 3, P2: 5, P3: 4, P4: 5, P5: 5 } },
      handicapMode: 'full', betAmount: 5,
    });
    const result = computeWolfRoundBalances([hole1, null, null], PLAYERS.map((p) => p.id));
    expect(result.balancesByPlayerId.Wolf).toBe(15);
  });

  test('every player appears even with a $0 balance', () => {
    const result = computeWolfRoundBalances([], PLAYERS.map((p) => p.id));
    PLAYERS.forEach((p) => expect(result.balancesByPlayerId[p.id]).toBe(0));
  });

  test('zero-sum: total of all balances is always 0', () => {
    const hole1 = resolveWolfHole({
      format: 'shuck', smallSide: ['P2'], bigSide: ['Wolf', 'P3', 'P4', 'P5'], hole: 1,
      players: PLAYERS, course: COURSE, scores: { 1: { P2: 2, Wolf: 4, P3: 5, P4: 6, P5: 5 } },
      handicapMode: 'full', betAmount: 5,
    });
    const result = computeWolfRoundBalances([hole1], PLAYERS.map((p) => p.id));
    const sum = Object.values(result.balancesByPlayerId).reduce((s, v) => s + v, 0);
    expect(sum).toBe(0);
  });
});

describe('scoreRound — Wolf settlement wiring', () => {
  test('wolfResult.balancesByPlayerId flows into mainGame and total', () => {
    const wolfResult = {
      balancesByPlayerId: { Wolf: 110, P2: 10, P3: -40, P4: -40, P5: -40 },
    };
    const result = scoreRound({}, { players: PLAYERS, wolfResult });
    const ledger = Object.fromEntries(result.playerLedger.map((r) => [r.playerId, r]));

    expect(ledger.Wolf.mainGame).toBe(110);
    expect(ledger.Wolf.total).toBe(110);
    expect(ledger.P3.mainGame).toBe(-40);
    expect(ledger.P3.total).toBe(-40);
  });

  test('final settlement tabs (who pays whom) are generated correctly from Wolf money alone', () => {
    const wolfResult = {
      balancesByPlayerId: { Wolf: 110, P2: 10, P3: -40, P4: -40, P5: -40 },
    };
    const result = scoreRound({}, { players: PLAYERS, wolfResult });
    const totalPaid = result.tabs.reduce((s, t) => s + t.amount, 0);
    const totalOwed = Object.values(wolfResult.balancesByPlayerId)
      .filter((v) => v > 0)
      .reduce((s, v) => s + v, 0);
    expect(totalPaid).toBe(totalOwed); // every dollar owed is accounted for in the tabs
  });

  test('Wolf settlement coexists cleanly with an unrelated 1v1 match in the same round', () => {
    const wolfResult = { balancesByPlayerId: { Wolf: 50, P2: -50, P3: 0, P4: 0, P5: 0 } };
    const matchResults = [{
      match: { p1Id: 'P3', p2Id: 'P4' },
      result: { total: 20 },
    }];
    const result = scoreRound({}, { players: PLAYERS, wolfResult, matchResults });
    const ledger = Object.fromEntries(result.playerLedger.map((r) => [r.playerId, r]));

    expect(ledger.Wolf.mainGame).toBe(50);
    expect(ledger.P3.sideMatches).toBe(20); // untouched by Wolf, routed correctly to sideMatches
    expect(ledger.P3.total).toBe(20);
  });

  test('no wolfResult provided → ledger is unaffected, same as before this chunk existed', () => {
    const result = scoreRound({}, { players: PLAYERS });
    const ledger = Object.fromEntries(result.playerLedger.map((r) => [r.playerId, r]));
    PLAYERS.forEach((p) => expect(ledger[p.id].total).toBe(0));
  });
});
