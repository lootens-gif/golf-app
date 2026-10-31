const { playTeamMatch, buildVegasMatchupSpecs } = require('./engine/scoringEngine');

// Real scenario (Oct 2026): 4 players, front 9 Tim/Steve vs Doug/Marc,
// back 9 different teams, same format both halves.
const players = [
  { id: 'tim', name: 'Tim', hcp: 0 },
  { id: 'steve', name: 'Steve', hcp: 0 },
  { id: 'doug', name: 'Doug', hcp: 0 },
  { id: 'marc', name: 'Marc', hcp: 0 },
];
const course = { pars: Array(18).fill(4), hcp: Array.from({ length: 18 }, (_, i) => i + 1) };
const ctx = (scores) => ({ players, course, scores, handicapMode: 'relative', noPar3TeamGame: false });

// Holes 1-5: Tim's side wins every hole. 6-9 tied.
// Holes 10-12: Doug's side wins (back-nine teams: Tim/Doug vs Steve/Marc -> Steve/Marc win). 13-18 tied.
function buildScores() {
  const s = {};
  for (let h = 1; h <= 5; h++) s[h] = { tim: 3, steve: 5, doug: 5, marc: 5 };
  for (let h = 6; h <= 9; h++) s[h] = { tim: 4, steve: 4, doug: 4, marc: 4 };
  for (let h = 10; h <= 12; h++) s[h] = { tim: 5, steve: 3, doug: 5, marc: 5 };
  for (let h = 13; h <= 18; h++) s[h] = { tim: 4, steve: 4, doug: 4, marc: 4 };
  return s;
}

const front = { teamA: ['tim', 'steve'], teamB: ['doug', 'marc'], start: 1, end: 9, segmentLabel: 'Front 9', bet: 10 };
const back = { teamA: ['tim', 'doug'], teamB: ['steve', 'marc'], start: 10, end: 18, segmentLabel: 'Back 9', bet: 10 };

describe('Long/Short per half', () => {
  const scores = buildScores();
  const f = playTeamMatch({ ...front, type: 'longshort' }, ctx(scores));
  const b = playTeamMatch({ ...back, type: 'longshort' }, ctx(scores));

  test('front 9: Long clinches inside the half (5 up with 4 to play) and pays the Long bet', () => {
    expect(f.longDecidedOn).toBe(5);
    expect(f.long).toBe(10);
    expect(f.short).toBe(0); // holes 6-9 all tied
    expect(f.total).toBe(10);
  });

  test('back 9 is a fresh match: only holes 10-18 count; 3 down closes the Long on 16, Short (17-18) tied', () => {
    expect(b.longDecidedOn).toBe(16); // 3 down with 2 to play
    expect(b.short).toBe(0);
    expect(b.long).toBe(-10); // Steve/Marc won 3 holes net, teamA lost
    expect(b.total).toBe(-10);
  });

  test('results stay indexed by absolute hole number', () => {
    expect(b.holes.length).toBe(18);
    expect(b.holes[9]).toBe(-1); // hole 10
  });
});

test('Long can clinch the back half and Short runs only to hole 18', () => {
  const s = {};
  for (let h = 1; h <= 9; h++) s[h] = { tim: 4, steve: 4, doug: 4, marc: 4 };
  for (let h = 10; h <= 14; h++) s[h] = { tim: 3, steve: 5, doug: 5, marc: 5 }; // team A 5 up after 14 (4 left)
  s[15] = { tim: 5, steve: 3, doug: 5, marc: 5 }; // Short hole, team B wins
  for (let h = 16; h <= 18; h++) s[h] = { tim: 4, steve: 4, doug: 4, marc: 4 };
  // teamA tim+steve for this check (best ball): hole 15 steve=3 wins for A too -> use doug/marc as A
  const r = playTeamMatch({ type: 'longshort', teamA: ['tim', 'doug'], teamB: ['steve', 'marc'], start: 10, end: 18, bet: 10 }, ctx(s));
  expect(r.longDecidedOn).toBe(14);
  expect(r.shortLabel).not.toBe('N/A');
});

describe('Net Holes per half', () => {
  test('each half settles on its own holes only', () => {
    const scores = buildScores();
    const f = playTeamMatch({ ...front, type: 'standard' }, ctx(scores));
    const b = playTeamMatch({ ...back, type: 'standard' }, ctx(scores));
    expect(f.total).toBe(50); // 5 holes x $10
    expect(b.total).toBe(-30); // 3 holes x $10
  });
});

describe('Match Play per half', () => {
  test('range replaces the front/back/total toggles with the single half', () => {
    const scores = buildScores();
    const b = playTeamMatch({ ...back, type: 'match_fbt', matchPlayFront: true, matchPlayBack: true, matchPlayTotal: true }, ctx(scores));
    expect(b.segments.length).toBe(1);
    expect(b.segments[0].label).toBe('Back 9');
    expect(b.total).toBe(-10);
  });
});

describe('Stroke per half', () => {
  test('range scores only that half', () => {
    const scores = buildScores();
    const f = playTeamMatch({ ...front, type: 'stroke', strokeScoring: 'gross', strokePayoutMode: 'winloss', strokeCombined: true }, ctx(scores));
    expect(f.segments.length).toBe(1);
    expect(f.segments[0].label).toBe('Front 9');
    // front 9 combined gross: A = tim+steve, B = doug+marc over holes 1-9; A is lower
    expect(f.segments[0].dollars).toBeGreaterThan(0);
  });
});

test('no range given: behaves as before (whole 18)', () => {
  const scores = buildScores();
  const r = playTeamMatch({ type: 'standard', teamA: ['tim', 'steve'], teamB: ['doug', 'marc'], bet: 10 }, ctx(scores));
  expect(r.total).toBe(80); // Steve is on team A here, so he wins holes 1-5 and 10-12 for A: 8 x $10
});

describe('Vegas shadow specs in split mode', () => {
  test('one spec per half using each half\'s own teams', () => {
    const teamGames = [
      { teams: { team1: ['tim', 'steve'], team2: ['doug', 'marc'] } },
      { teams: { team1: ['tim', 'doug'], team2: ['steve', 'marc'] } },
    ];
    const specs = buildVegasMatchupSpecs({ enableTeamGame: true, teamGameFormat: 'longshort', teamGames, nonPressTeamSelection: teamGames[0].teams, splitByHalf: true });
    expect(specs.length).toBe(2);
    expect(specs[0]).toMatchObject({ start: 1, end: 9 });
    expect(specs[1]).toMatchObject({ start: 10, end: 18 });
    expect(specs[1].team1).toEqual(['tim', 'doug']);
  });

  test('whole round unchanged without the flag', () => {
    const specs = buildVegasMatchupSpecs({ enableTeamGame: true, teamGameFormat: 'longshort', teamGames: [], nonPressTeamSelection: { team1: ['tim', 'steve'], team2: ['doug', 'marc'] } });
    expect(specs).toEqual([expect.objectContaining({ start: 1, end: 18 })]);
  });
});
