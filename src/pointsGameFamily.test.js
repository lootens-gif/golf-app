const { scoreNinePointHole, getNinePointPayout, NINE_POINT_SCALES, getNinePointPlayerIds } = require('./engine/scoringEngine');

const course = { pars: Array(18).fill(4), hcp: Array.from({ length: 18 }, (_, i) => i + 1) };
const players3 = [
  { id: 'a', name: 'A', hcp: 0 }, { id: 'b', name: 'B', hcp: 0 }, { id: 'c', name: 'C', hcp: 0 },
];
const players4 = [...players3, { id: 'd', name: 'D', hcp: 0 }];
const players5 = [...players4, { id: 'e', name: 'E', hcp: 0 }];

// ── getNinePointPlayerIds ─────────────────────────────────────────────
test('getNinePointPlayerIds pulls p1-p5, filters missing', () => {
  expect(getNinePointPlayerIds({ p1Id: 'a', p2Id: 'b', p3Id: 'c' })).toEqual(['a', 'b', 'c']);
  expect(getNinePointPlayerIds({ p1Id: 'a', p2Id: 'b', p3Id: 'c', p4Id: 'd' })).toEqual(['a', 'b', 'c', 'd']);
  expect(getNinePointPlayerIds({ p1Id: 'a', p2Id: 'b', p3Id: 'c', p4Id: 'd', p5Id: 'e' })).toEqual(['a', 'b', 'c', 'd', 'e']);
  expect(getNinePointPlayerIds({})).toEqual([]);
  expect(getNinePointPlayerIds(null)).toEqual([]);
});

// ── 9-Point regression — must exactly match the original hand-written table ──
describe('9-Point (3 players) — regression, must be byte-identical to the original hardcoded table', () => {
  test('no tie: 5/3/1', () => {
    const scores = { 1: { a: 3, b: 4, c: 5 } };
    const r = scoreNinePointHole(['a', 'b', 'c'], 1, players3, course, scores, 'relative');
    expect(r.pointsByPlayerId).toEqual({ a: 5, b: 3, c: 1 });
  });

  test('tie for 1st: 4/4/1', () => {
    const scores = { 1: { a: 3, b: 3, c: 5 } };
    const r = scoreNinePointHole(['a', 'b', 'c'], 1, players3, course, scores, 'relative');
    expect(r.pointsByPlayerId).toEqual({ a: 4, b: 4, c: 1 });
  });

  test('tie for 2nd: 5/2/2', () => {
    const scores = { 1: { a: 3, b: 4, c: 4 } };
    const r = scoreNinePointHole(['a', 'b', 'c'], 1, players3, course, scores, 'relative');
    expect(r.pointsByPlayerId).toEqual({ a: 5, b: 2, c: 2 });
  });

  test('all tie: 3/3/3', () => {
    const scores = { 1: { a: 4, b: 4, c: 4 } };
    const r = scoreNinePointHole(['a', 'b', 'c'], 1, players3, course, scores, 'relative');
    expect(r.pointsByPlayerId).toEqual({ a: 3, b: 3, c: 3 });
  });

  test('blitz: 9/0/0', () => {
    const scores = { 1: { a: 2, b: 5, c: 6 } };
    const r = scoreNinePointHole(['a', 'b', 'c'], 1, players3, course, scores, 'relative', true);
    expect(r.pointsByPlayerId).toEqual({ a: 9, b: 0, c: 0 });
    expect(r.mode).toBe('blitz');
  });

  test('birdie double: winner made gross birdie, points x2', () => {
    const scores = { 1: { a: 3, b: 5, c: 6 } }; // par 4, a shoots 3 = birdie
    const r = scoreNinePointHole(['a', 'b', 'c'], 1, players3, course, scores, 'relative', false, false, true);
    expect(r.pointsByPlayerId).toEqual({ a: 10, b: 6, c: 2 });
    expect(r.birdieMode).toBe('birdie');
  });

  test('eagle triple (toggle on): winner made gross eagle, points x3', () => {
    const scores = { 1: { a: 2, b: 5, c: 6 } }; // par 4, a shoots 2 = eagle
    const r = scoreNinePointHole(['a', 'b', 'c'], 1, players3, course, scores, 'relative', false, false, true, true);
    expect(r.pointsByPlayerId).toEqual({ a: 15, b: 9, c: 3 });
    expect(r.birdieMode).toBe('eagle');
  });
});

// ── 12-Point (4 players) ──────────────────────────────────────────────
describe('12-Point (4 players) — 6-4-2-0 scale', () => {
  test('no tie: 6/4/2/0', () => {
    const scores = { 1: { a: 3, b: 4, c: 5, d: 6 } };
    const r = scoreNinePointHole(['a', 'b', 'c', 'd'], 1, players4, course, scores, 'relative');
    expect(r.pointsByPlayerId).toEqual({ a: 6, b: 4, c: 2, d: 0 });
  });

  test('confirmed documented tie rule: 1st&2nd tie -> 5-5-2-0', () => {
    const scores = { 1: { a: 3, b: 3, c: 5, d: 6 } };
    const r = scoreNinePointHole(['a', 'b', 'c', 'd'], 1, players4, course, scores, 'relative');
    expect(r.pointsByPlayerId).toEqual({ a: 5, b: 5, c: 2, d: 0 });
  });

  test('3rd&4th tie: 6-4-1-1', () => {
    const scores = { 1: { a: 3, b: 4, c: 5, d: 5 } };
    const r = scoreNinePointHole(['a', 'b', 'c', 'd'], 1, players4, course, scores, 'relative');
    expect(r.pointsByPlayerId).toEqual({ a: 6, b: 4, c: 1, d: 1 });
  });

  test('all 4 tie: 3-3-3-3', () => {
    const scores = { 1: { a: 4, b: 4, c: 4, d: 4 } };
    const r = scoreNinePointHole(['a', 'b', 'c', 'd'], 1, players4, course, scores, 'relative');
    expect(r.pointsByPlayerId).toEqual({ a: 3, b: 3, c: 3, d: 3 });
  });

  test('blitz: winner beats all 3 others by 2+, takes all 12', () => {
    const scores = { 1: { a: 2, b: 5, c: 6, d: 7 } };
    const r = scoreNinePointHole(['a', 'b', 'c', 'd'], 1, players4, course, scores, 'relative', true);
    expect(r.pointsByPlayerId).toEqual({ a: 12, b: 0, c: 0, d: 0 });
  });

  test('blitz does NOT fire if winner is only 1 ahead of one opponent', () => {
    const scores = { 1: { a: 3, b: 4, c: 6, d: 7 } }; // only 1 stroke ahead of b
    const r = scoreNinePointHole(['a', 'b', 'c', 'd'], 1, players4, course, scores, 'relative', true);
    expect(r.mode).not.toBe('blitz');
  });

  test('birdie double works identically at 4 players', () => {
    const scores = { 1: { a: 3, b: 5, c: 6, d: 7 } };
    const r = scoreNinePointHole(['a', 'b', 'c', 'd'], 1, players4, course, scores, 'relative', false, false, true);
    expect(r.pointsByPlayerId).toEqual({ a: 12, b: 8, c: 4, d: 0 });
  });
});

// ── 20-Point (5 players) — exhaustive tie-pattern whole-number check ──
describe('20-Point (5 players) — 8-6-4-2-0 scale', () => {
  test('no tie: 8/6/4/2/0', () => {
    const scores = { 1: { a: 3, b: 4, c: 5, d: 6, e: 7 } };
    const r = scoreNinePointHole(['a', 'b', 'c', 'd', 'e'], 1, players5, course, scores, 'relative');
    expect(r.pointsByPlayerId).toEqual({ a: 8, b: 6, c: 4, d: 2, e: 0 });
  });

  const tieCases = [
    { label: '(1,2) tie', scores: { a: 3, b: 3, c: 5, d: 6, e: 7 }, expect: { a: 7, b: 7, c: 4, d: 2, e: 0 } },
    { label: '(2,3) tie', scores: { a: 3, b: 4, c: 4, d: 6, e: 7 }, expect: { a: 8, b: 5, c: 5, d: 2, e: 0 } },
    { label: '(3,4) tie', scores: { a: 3, b: 4, c: 5, d: 5, e: 7 }, expect: { a: 8, b: 6, c: 3, d: 3, e: 0 } },
    { label: '(4,5) tie', scores: { a: 3, b: 4, c: 5, d: 6, e: 6 }, expect: { a: 8, b: 6, c: 4, d: 1, e: 1 } },
    { label: '(1,2,3) tie', scores: { a: 3, b: 3, c: 3, d: 6, e: 7 }, expect: { a: 6, b: 6, c: 6, d: 2, e: 0 } },
    { label: '(3,4,5) tie', scores: { a: 3, b: 4, c: 5, d: 5, e: 5 }, expect: { a: 8, b: 6, c: 2, d: 2, e: 2 } },
    { label: '(1,2) and (4,5) both tie', scores: { a: 3, b: 3, c: 5, d: 6, e: 6 }, expect: { a: 7, b: 7, c: 4, d: 1, e: 1 } },
    { label: '(1,2,3,4) tie', scores: { a: 3, b: 3, c: 3, d: 3, e: 7 }, expect: { a: 5, b: 5, c: 5, d: 5, e: 0 } },
    { label: 'all 5 tie', scores: { a: 4, b: 4, c: 4, d: 4, e: 4 }, expect: { a: 4, b: 4, c: 4, d: 4, e: 4 } },
  ];

  tieCases.forEach(({ label, scores, expect: exp }) => {
    test(`${label} -> whole numbers, matches hand-derived table`, () => {
      const r = scoreNinePointHole(['a', 'b', 'c', 'd', 'e'], 1, players5, course, { 1: scores }, 'relative');
      expect(r.pointsByPlayerId).toEqual(exp);
      // every value must be a whole number - the mathematically-proven property
      Object.values(r.pointsByPlayerId).forEach(v => expect(Number.isInteger(v)).toBe(true));
    });
  });

  test('blitz: winner beats all 4 others by 2+, takes all 20', () => {
    const scores = { 1: { a: 2, b: 5, c: 6, d: 7, e: 8 } };
    const r = scoreNinePointHole(['a', 'b', 'c', 'd', 'e'], 1, players5, course, scores, 'relative', true);
    expect(r.pointsByPlayerId).toEqual({ a: 20, b: 0, c: 0, d: 0, e: 0 });
  });

  test('eagle triple works identically at 5 players', () => {
    const scores = { 1: { a: 2, b: 5, c: 6, d: 7, e: 8 } };
    const r = scoreNinePointHole(['a', 'b', 'c', 'd', 'e'], 1, players5, course, scores, 'relative', false, false, true, true);
    expect(r.pointsByPlayerId).toEqual({ a: 24, b: 18, c: 12, d: 6, e: 0 });
  });
});

// ── Settlement — generalized pairwise for 4 and 5 players ─────────────
describe('getNinePointPayout — generalized pairwise settlement', () => {
  test('3-player settlement unchanged (regression)', () => {
    const totals = { a: 45, b: 30, c: 15 };
    const p = getNinePointPayout(totals, 1);
    expect(p.transactions.length).toBe(3);
    expect(p.balancesByPlayerId.a).toBeCloseTo(45); // (45-30)+(45-15) = 15+30
    expect(p.balancesByPlayerId.c).toBeCloseTo(-45); // pays everyone
    // zero-sum
    const sum = Object.values(p.balancesByPlayerId).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(0);
  });

  test('4-player settlement: 6 transactions, zero-sum', () => {
    const totals = { a: 40, b: 30, c: 20, d: 10 };
    const p = getNinePointPayout(totals, 1);
    expect(p.transactions.length).toBe(6);
    const sum = Object.values(p.balancesByPlayerId).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(0);
    expect(p.balancesByPlayerId.a).toBeGreaterThan(0);
    expect(p.balancesByPlayerId.d).toBeLessThan(0);
  });

  test('5-player settlement: 10 transactions, zero-sum', () => {
    const totals = { a: 50, b: 40, c: 30, d: 20, e: 10 };
    const p = getNinePointPayout(totals, 1);
    expect(p.transactions.length).toBe(10);
    const sum = Object.values(p.balancesByPlayerId).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(0);
  });

  test('all-tied at any player count returns status "tie", no transactions', () => {
    expect(getNinePointPayout({ a: 20, b: 20, c: 20, d: 20 }, 1).status).toBe('tie');
    expect(getNinePointPayout({ a: 20, b: 20, c: 20, d: 20 }, 1).transactions).toEqual([]);
  });

  test('partial tie does not skip settlement for the non-tied pairs', () => {
    const p = getNinePointPayout({ a: 30, b: 20, c: 20, d: 10 }, 1);
    expect(p.status).toBe('complete');
    // b and c are tied - no transaction between them
    const bcTx = p.transactions.find(t =>
      (t.fromPlayerId === 'b' && t.toPlayerId === 'c') || (t.fromPlayerId === 'c' && t.toPlayerId === 'b')
    );
    expect(bcTx).toBeUndefined();
  });
});

// ── Invalid player counts ──────────────────────────────────────────────
test('2 or 6 players is invalid - not part of the supported family', () => {
  expect(scoreNinePointHole(['a', 'b'], 1, players3, course, {}, 'relative').status).toBe('invalid');
  const players6 = [...players5, { id: 'f', name: 'F', hcp: 0 }];
  expect(scoreNinePointHole(['a', 'b', 'c', 'd', 'e', 'f'], 1, players6, course, {}, 'relative').status).toBe('invalid');
});

test('NINE_POINT_SCALES sums match the game names (9/12/20)', () => {
  expect(NINE_POINT_SCALES[3].reduce((a, b) => a + b, 0)).toBe(9);
  expect(NINE_POINT_SCALES[4].reduce((a, b) => a + b, 0)).toBe(12);
  expect(NINE_POINT_SCALES[5].reduce((a, b) => a + b, 0)).toBe(20);
});
