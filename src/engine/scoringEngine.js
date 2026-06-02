import { getRunningStrokeDiffs } from "../scoring/getRunningStrokeDiffs";


export function getActivePlayers(allPlayers, mode) {
  if (mode === "3p") return allPlayers.slice(0, 3);
  if (mode === "4p") return allPlayers.slice(0, 4);
  return allPlayers.slice(0, 5);
}

export function getLowestHandicap(players) {
  return Math.min(...players.map((p) => p.hcp));
}

export function getPlayerById(players, playerId) {
  return players.find((p) => p.id === playerId) || null;
  
}

export function getPlayerName(players, playerId) {
  return getPlayerById(players, playerId)?.name || "";
}

export function getHandicapBase(player, players, handicapMode) {
  if (!player) return 0;

  if (handicapMode === "full") {
    return player.hcp;
  }


  // ✅ FORCE correct comparison set
  const validPlayers = players.filter((p) => p && typeof p.hcp === "number");

  const low = Math.min(...validPlayers.map((p) => p.hcp));

  return Math.max(0, player.hcp - low);
}

export function getHandicapStrokes(
  playerId,
  hole,
  players,
  course,
  handicapMode
) {
  const player = getPlayerById(players, playerId);
  if (!player) return 0;

  const handicapValue = Number(
    getHandicapBase(player, players, handicapMode) || 0
  );
  if (handicapValue <= 0) return 0;

  const fullRounds = Math.floor(handicapValue / 18);
  const remainder = handicapValue % 18;

  const holeHcp = Number(course?.hcp?.[hole - 1]);
  if (!Number.isFinite(holeHcp)) return fullRounds;

  let strokes = fullRounds;

  // Important: MUST be <= so a 1-stroke difference applies on handicap hole 1.
  if (remainder > 0 && holeHcp <= remainder) {
    strokes += 1;
  }

  return strokes;
}


/**
 * getSpreadHandicapStrokes — distributes handicap strokes evenly across
 * 6-hole segments (1-6, 7-12, 13-18) for the 6/6/6 COD format.
 * Remainder strokes go to segments containing the globally hardest holes.
 * Within each segment, strokes go to the hardest holes in that segment.
 */
export function getSpreadHandicapStrokes(playerId, hole, players, course, handicapMode) {
  const player = getPlayerById(players, playerId);
  if (!player) return 0;

  const totalStrokes = Number(getHandicapBase(player, players, handicapMode) || 0);
  if (totalStrokes <= 0) return 0;

  const fullRounds = Math.floor(totalStrokes / 18);
  const remainder = totalStrokes % 18;

  const segments = [[1,2,3,4,5,6],[7,8,9,10,11,12],[13,14,15,16,17,18]];
  const holeHcp = (h) => Number(course?.hcp?.[h - 1]);

  const base = Math.floor(remainder / 3);
  const extra = remainder % 3;

  // Distribute extras to segments containing the globally hardest holes
  const allHoles = Array.from({length:18},(_,i)=>i+1)
    .filter(h => Number.isFinite(holeHcp(h)))
    .sort((a,b) => holeHcp(a) - holeHcp(b));

  const segmentExtras = [0,0,0];
  let extrasLeft = extra;
  for (const h of allHoles) {
    if (extrasLeft === 0) break;
    const segIdx = segments.findIndex(seg => seg.includes(h));
    if (segIdx >= 0 && segmentExtras[segIdx] === 0) {
      segmentExtras[segIdx] = 1;
      extrasLeft--;
    }
  }

  // For each segment pick (base + extra) hardest holes
  const strokeHoles = new Set();
  segments.forEach((seg, i) => {
    const quota = base + segmentExtras[i];
    if (quota <= 0) return;
    [...seg]
      .filter(h => Number.isFinite(holeHcp(h)))
      .sort((a,b) => holeHcp(a) - holeHcp(b))
      .slice(0, quota)
      .forEach(h => strokeHoles.add(h));
  });

  return fullRounds + (strokeHoles.has(hole) ? 1 : 0);
}

export function getRawScore(scores, hole, playerId) {
  const value = scores[hole]?.[playerId];
  return Number.isFinite(value) ? value : null;
}

export function getNetScore(
  playerId,
  hole,
  players,
  course,
  scores,
  handicapMode,
  noPar3Strokes,
  getHandicapStrokesFn
) {
  const raw = getRawScore(scores, hole, playerId);
  if (raw === null) return null;
  // Skip strokes on par 3 holes if noPar3Strokes is enabled
  const par = course?.pars?.[hole - 1];
  if (noPar3Strokes && par === 3) return raw;
  const strokesFn = getHandicapStrokesFn || getHandicapStrokes;
  const strokes = strokesFn(playerId, hole, players, course, handicapMode);
  return raw - strokes;
}



export function isNetBirdie(playerId, hole, players, course, scores, handicapMode) {
  const net = getNetScore(playerId, hole, players, course, scores, handicapMode);
  if (net === null) return false;
  const par = course.pars[hole - 1];
  return net < par;
}

export function getTeamNetScore(
  team,
  hole,
  players,
  course,
  scores,
  handicapMode,
  getHandicapStrokesFn,
  noPar3Strokes = false
) {
  const strokesFn = getHandicapStrokesFn || getHandicapStrokes;
  const netScores = team
    .map((playerId) =>
      getNetScore(playerId, hole, players, course, scores, handicapMode, noPar3Strokes, strokesFn)
    )
    .filter((score) => score !== null);

  if (netScores.length !== team.length) {
    return null;
  }

  return Math.min(...netScores);
}

export function getNinePointHoleStatus(
  playerIds,
  hole,
  scores
) {
  if (!Array.isArray(playerIds) || playerIds.length !== 3) {
    return "invalid";
  }

  const allPresent = playerIds.every((playerId) => getRawScore(scores, hole, playerId) !== null);
  return allPresent ? "complete" : "incomplete";
}

export function scoreNinePointHole(
  playerIds,
  hole,
  players,
  course,
  scores,
  handicapMode,
  blitzEnabled = false,
  noPar3Strokes = false,
  birdieDoublePoints = false
) {
  if (!Array.isArray(playerIds) || playerIds.length !== 3) {
    return {
      status: "invalid",
      reason: "ninePoint requires exactly 3 players",
      mode: null,
      pointsByPlayerId: {},
      netScoresByPlayerId: {},
    };
  }

  const status = getNinePointHoleStatus(playerIds, hole, scores);

  if (status !== "complete") {
    return {
      status,
      reason: status === "invalid" ? "invalid player count" : "missing score",
      mode: null,
      pointsByPlayerId: Object.fromEntries(playerIds.map((playerId) => [playerId, 0])),
      netScoresByPlayerId: Object.fromEntries(playerIds.map((playerId) => [playerId, null])),
    };
  }

  const scoredPlayers = playerIds.map((playerId) => ({
    playerId,
    netScore: getNetScore(playerId, hole, players, course, scores, handicapMode, noPar3Strokes),
  }));

  const sorted = [...scoredPlayers].sort((a, b) => a.netScore - b.netScore);
  const [first, second, third] = sorted;

  const pointsByPlayerId = Object.fromEntries(
    playerIds.map((playerId) => [playerId, 0])
  );

  const netScoresByPlayerId = Object.fromEntries(
    scoredPlayers.map((entry) => [entry.playerId, entry.netScore])
  );

  // Check if any player made a gross birdie on this hole
  const par = course?.pars?.[hole - 1];
  const anyBirdie = birdieDoublePoints && par != null &&
    playerIds.some(id => {
      const gross = scores?.[hole]?.[id];
      return Number.isFinite(gross) && gross < par;
    });

  const multiplier = anyBirdie ? 2 : 1;

  const uniqueWinner = first.netScore < second.netScore;
  const blitzApplies =
    blitzEnabled &&
    uniqueWinner &&
    second.netScore - first.netScore >= 2 &&
    third.netScore - first.netScore >= 2;

  if (blitzApplies) {
    pointsByPlayerId[first.playerId] = 9 * multiplier;
    pointsByPlayerId[second.playerId] = 0;
    pointsByPlayerId[third.playerId] = 0;

    return {
      status: "complete",
      mode: anyBirdie ? "blitz-birdie" : "blitz",
      pointsByPlayerId,
      netScoresByPlayerId,
    };
  }

  if (first.netScore === second.netScore && second.netScore === third.netScore) {
    pointsByPlayerId[first.playerId] = 3 * multiplier;
    pointsByPlayerId[second.playerId] = 3 * multiplier;
    pointsByPlayerId[third.playerId] = 3 * multiplier;
  } else if (first.netScore === second.netScore) {
    pointsByPlayerId[first.playerId] = 4 * multiplier;
    pointsByPlayerId[second.playerId] = 4 * multiplier;
    pointsByPlayerId[third.playerId] = 1 * multiplier;
  } else if (second.netScore === third.netScore) {
    pointsByPlayerId[first.playerId] = 5 * multiplier;
    pointsByPlayerId[second.playerId] = 2 * multiplier;
    pointsByPlayerId[third.playerId] = 2 * multiplier;
  } else {
    pointsByPlayerId[first.playerId] = 5 * multiplier;
    pointsByPlayerId[second.playerId] = 3 * multiplier;
    pointsByPlayerId[third.playerId] = 1 * multiplier;
  }

  return {
    status: "complete",
    mode: anyBirdie ? "birdie-double" : "standard",
    pointsByPlayerId,
    netScoresByPlayerId,
  };
}

export function getNinePointPayout(totalsByPlayerId, dollarsPerPoint = 0) {
const rate = Math.max(0, Number(dollarsPerPoint ?? 0));
  const ranked = Object.entries(totalsByPlayerId)
    .map(([playerId, points]) => ({
      playerId,
      points: Number(points || 0),
    }))
    .sort((a, b) => b.points - a.points);

  if (ranked.length !== 3) {
    return {
      status: "invalid",
      ranking: ranked,
      balancesByPlayerId: {},
      transactions: [],
    };
  }

  const [first, second, third] = ranked;

  if (
  first.points === second.points &&
  second.points === third.points
) {
  return {
    status: "tie",
    ranking: ranked,
    balancesByPlayerId: Object.fromEntries(ranked.map((r) => [r.playerId, 0])),
    transactions: [],
  };
}

const transactions = [
  {
    fromPlayerId: third.playerId,
    toPlayerId: first.playerId,
    amount: (first.points - third.points) * rate,
  },
  {
    fromPlayerId: third.playerId,
    toPlayerId: second.playerId,
    amount: (second.points - third.points) * rate,
  },
  {
    fromPlayerId: second.playerId,
    toPlayerId: first.playerId,
    amount: (first.points - second.points) * rate,
  },
];

  const balancesByPlayerId = Object.fromEntries(
    ranked.map((r) => [r.playerId, 0])
  );

  transactions.forEach((tx) => {
    balancesByPlayerId[tx.fromPlayerId] -= tx.amount;
    balancesByPlayerId[tx.toPlayerId] += tx.amount;
  });

  return {
    status: "complete",
    ranking: ranked,
    balancesByPlayerId,
    transactions,
  };
}

export function getNinePointMatchSummary(
  playerIds,
  players,
  course,
  scores,
  handicapMode,
  blitzEnabled = false,
  dollarsPerPoint = 0,
  holeCount = 18,
  noPar3Strokes = false,
  birdieDoublePoints = false
) {
  if (!Array.isArray(playerIds) || playerIds.length !== 3) {
    return {
      gameType: "ninePoint",
      status: "invalid",
      holes: [],
      totalsByPlayerId: {},
      payout: {
        status: "invalid",
        balancesByPlayerId: {},
        transactions: [],
      },
    };
  }

  const runningTotals = Object.fromEntries(
    playerIds.map((playerId) => [playerId, 0])
  );

  const holes = [];

  for (let hole = 1; hole <= holeCount; hole += 1) {
    const holeResult = scoreNinePointHole(
      playerIds,
      hole,
      players,
      course,
      scores,
      handicapMode,
      blitzEnabled,
      noPar3Strokes,
      birdieDoublePoints
    );

    if (holeResult.status === "complete") {
      playerIds.forEach((playerId) => {
        runningTotals[playerId] += holeResult.pointsByPlayerId[playerId] || 0;
      });
    }

    holes.push({
      hole,
      ...holeResult,
      runningTotalsByPlayerId: { ...runningTotals },
    });
  }

  return {
    gameType: "ninePoint",
    status: "complete",
    holes,
    totalsByPlayerId: { ...runningTotals },
    payout: getNinePointPayout(runningTotals, dollarsPerPoint),
  };
}

export function computeHoleResult({
  hole,
  teamA,
  teamB,
  players,
  course,
  scores,
  handicapMode,
  getHandicapStrokesFn,
  noPar3Strokes = false,
}) {
  const strokesFn = getHandicapStrokesFn || getHandicapStrokes;
  const aScore = getTeamNetScore(teamA, hole, players, course, scores, handicapMode, strokesFn, noPar3Strokes);
  const bScore = getTeamNetScore(teamB, hole, players, course, scores, handicapMode, strokesFn, noPar3Strokes);

  if (aScore === null || bScore === null) {
    return null;
  }

  if (aScore < bScore) return 1;
  if (bScore < aScore) return -1;
  return 0;
}

function signUnit(score) {
  if (score > 0) return 1;
  if (score < 0) return -1;
  return 0;
}

function sumResults(holes, startHole, endHole) {
  let total = 0;
  let completed = 0;

  for (let hole = startHole; hole <= endHole; hole++) {
    const result = holes[hole - 1];
    if (result === null || result === undefined) break;
    total += result;
    completed += 1;
  }

  return { total, completed };
}

function decideMatchPlaySegment(holes, startHole, endHole) {
  let running = 0;
  let decidedOn = null;

  for (let hole = startHole; hole <= endHole; hole++) {
    const result = holes[hole - 1];
    if (result === null || result === undefined) break;

    running += result;
    const remaining = endHole - hole;

    if (Math.abs(running) > remaining && decidedOn === null) {
      decidedOn = hole;
      break;
    }
  }

  const { total } = sumResults(holes, startHole, endHole);

  let label = "Tie";
  if (decidedOn !== null) {
    let clinchScore = 0;

    for (let hole = startHole; hole <= decidedOn; hole++) {
      const result = holes[hole - 1];
      if (result === null || result === undefined) break;
      clinchScore += result;
    }

    const margin = Math.abs(clinchScore);
    const remaining = endHole - decidedOn;
    label = `${margin}&${remaining}`;
  } else if (total !== 0) {
    label = `${Math.abs(total)} up`;
  }

  return {
    score: total,
    units: signUnit(total),
    decidedOn,
    label,
  };
}

export function getStrokeValueForHole(
  playerId,
  hole,
  players,
  course,
  scores,
  handicapMode,
  strokeScoring
) {
  if (strokeScoring === "gross") {
    return getRawScore(scores, hole, playerId);
  }

  return getNetScore(playerId, hole, players, course, scores, handicapMode);
}

function sumStrokeSegment({
  playerId,
  startHole,
  endHole,
  players,
  course,
  scores,
  handicapMode,
  strokeScoring,
}) {
  let total = 0;

  for (let hole = startHole; hole <= endHole; hole++) {
    const value = getStrokeValueForHole(
      playerId,
      hole,
      players,
      course,
      scores,
      handicapMode,
      strokeScoring
    );

    if (value === null || value === undefined) {
      return { total: null };
    }

    total += value;
  }

  return { total };
}

function settleStrokeSegment(aTotal, bTotal, payoutMode, bet) {
  if (aTotal === null || bTotal === null) {
    return {
      units: 0,
      dollars: 0,
      winner: 0,
      diff: null,
    };
  }

  const diff = Math.abs(aTotal - bTotal);
  const winner = aTotal < bTotal ? 1 : bTotal < aTotal ? -1 : 0;

  if (winner === 0) {
    return {
      units: 0,
      dollars: 0,
      winner: 0,
      diff: 0,
    };
  }

  const units = payoutMode === "differential" ? diff : 1;

  return {
    units: winner * units,
    dollars: winner * units * bet,
    winner,
    diff,
  };
}





export function playIndividualMatch(match, context) {
  const {
    players,
    course,
    scores,
    handicapMode,
  } = context;

// -----------------------------
// 9 POINT MODE (3-player)
// -----------------------------
const noPar3Strokes = !!match.noPar3Strokes;
if (match.gameType === "ninePoint") {
  const playerIds = [match.p1Id, match.p2Id, match.p3Id].filter(Boolean);

  const result = getNinePointMatchSummary(
    playerIds,
    players,
    course,
    scores,
    handicapMode,
    Boolean(match.blitzEnabled),
    Number(match.bet ?? 0),
    18,
    noPar3Strokes,
    Boolean(match.birdieDoublePoints)
  );


return result;
}

  const holes = [];
  let running = 0;

const p1 = players.find((p) => p.id === match.p1Id);
const p2 = players.find((p) => p.id === match.p2Id);
const matchPlayers = [p1, p2].filter(Boolean);
  
  for (let hole = 1; hole <= 18; hole++) {
    const result = computeHoleResult({
      hole,
      teamA: [match.p1Id],
      teamB: [match.p2Id],
      players: matchPlayers,
      course,
      scores,
      handicapMode,
    });

    holes.push(result);
    if (result !== null) running += result;
  }


  if (match.type === "standard") {
  const segment = decideMatchPlaySegment(holes, 1, 18);

  return {
    type: "standard",
    holes,
    units: running,
    total: running * match.bet,
    label: segment.label,
    decidedOn: segment.decidedOn,
  };
}

  if (match.type === "longshort") {
    const longSegment = decideMatchPlaySegment(holes, 1, 18);
    const longUnits = signUnit(longSegment.score);
    const longResult = longUnits * match.bet;

    let shortStart = longSegment.decidedOn ? longSegment.decidedOn + 1 : 10;
    if (shortStart > 18) shortStart = 19;

    let shortSegment = {
      score: 0,
      units: 0,
      label: "Tie",
      decidedOn: null,
    };

    if (shortStart <= 18) {
      shortSegment = decideMatchPlaySegment(holes, shortStart, 18);
    }

    const shortBet = match.bet / 2;
    const shortResult = shortSegment.units * shortBet;

    return {
      type: "longshort",
      holes,
      total: longResult + shortResult,
      long: longResult,
      short: shortResult,
      longLabel: longSegment.label,
      shortLabel: shortSegment.label,
      longDecidedOn: longSegment.decidedOn,
      shortDecidedOn: shortSegment.decidedOn,
    };
  }

  if (match.type === "match_fbt") {
  const segmentDefs = [
    { key: "front", label: "Front 9", start: 1, end: 9, enabled: match.matchPlayFront !== false },
    { key: "back", label: "Back 9", start: 10, end: 18, enabled: match.matchPlayBack !== false },
    { key: "total", label: "Total 18", start: 1, end: 18, enabled: match.matchPlayTotal !== false },
  ].filter((seg) => seg.enabled);

  const safeSegmentDefs = segmentDefs.length
    ? segmentDefs
    : [{ key: "total", label: "Total 18", start: 1, end: 18, enabled: true }];

  const segments = safeSegmentDefs.map((seg) => {
    const segment = decideMatchPlaySegment(holes, seg.start, seg.end);

    return {
      key: seg.key,
      label: seg.label,
      units: segment.units,
      dollars: segment.units * match.bet,
      resultLabel: segment.label,
      decidedOn: segment.decidedOn,
    };
  });

  return {
  type: "match_fbt",
  holes,
  segments,
  total: segments.reduce((sum, seg) => sum + seg.dollars, 0),
};
}

  if (match.type === "stroke") {
    const strokeScoring = match.strokeScoring || "net";
    const strokePayoutMode = match.strokePayoutMode || "winloss";

    const runningHoleDiffs = getRunningStrokeDiffs({
    p1Id: match.p1Id,
    p2Id: match.p2Id,
    players: matchPlayers,
    course,
    scores,
    handicapMode,
    strokeScoring,
    getStrokeValueForHole,
    });

    const segmentDefs = [
      { key: "front", label: "Front 9", start: 1, end: 9, enabled: !!match.strokeFront },
      { key: "back", label: "Back 9", start: 10, end: 18, enabled: !!match.strokeBack },
      { key: "total", label: "Total 18", start: 1, end: 18, enabled: !!match.strokeTotal },
    ].filter((seg) => seg.enabled);

    const segments = segmentDefs.map((seg) => {
      const a = sumStrokeSegment({
        playerId: match.p1Id,
        startHole: seg.start,
        endHole: seg.end,
        players: matchPlayers,
        course,
        scores,
        handicapMode,
        strokeScoring,
      });

      const b = sumStrokeSegment({
        playerId: match.p2Id,
        startHole: seg.start,
        endHole: seg.end,
        players: matchPlayers,
        course,
        scores,
        handicapMode,
        strokeScoring,
      });

      const settlement = settleStrokeSegment(
        a.total,
        b.total,
        strokePayoutMode,
        match.bet
      );

      return {
        key: seg.key,
        label: seg.label,
        aTotal: a.total,
        bTotal: b.total,
        diff: settlement.diff,
        units: settlement.units,
        dollars: settlement.dollars,
        winner: settlement.winner,
      };
    });

    return {
  type: "stroke",
  holes: runningHoleDiffs,
  strokeScoring,
  strokePayoutMode,
  segments,
  total: segments.reduce((sum, seg) => sum + seg.dollars, 0),
};
  }

  return {
    type: match.type,
    holes,
    total: running * match.bet,
  };
}

export function playPressMatch({
  teamA,
  teamB,
  start,
  end,
  trigger = 2,
  context,
}) {
  const numericTrigger = Math.max(1, Number(trigger) || 2);

  const bets = [
    {
      label: "Base Match",
      score: 0,
      history: [],
      startHole: start,
    },
  ];

  let pressCount = 0;

  for (let hole = start; hole <= end; hole++) {
    const result = computeHoleResult({
      hole,
      teamA,
      teamB,
      // IMPORTANT:
// Team games (5p 6/6/6) use full player pool for handicap baseline,
// NOT just the 4 players in the current match.
// Do not filter players here.
      players: context.players,
      course: context.course,
      scores: context.scores,
      handicapMode: context.handicapMode,
      getHandicapStrokesFn: context.getHandicapStrokesFn,
      noPar3Strokes: !!context.noPar3TeamGame,
    });

    if (result === null) break;

    for (const bet of bets) {
      bet.score += result;
      bet.history.push(result);
    }

    const latestBet = bets[bets.length - 1];
    const hasRemainingHole = hole < end;

    if (hasRemainingHole && Math.abs(latestBet.score) >= numericTrigger) {
      pressCount += 1;
      bets.push({
        label: `Press ${pressCount}`,
        score: 0,
        history: [],
        startHole: hole + 1,
      });
    }
  }

  return bets.map((bet) => ({
    label: bet.label,
    score: bet.score,
    history: bet.history,
    startHole: bet.startHole,
  }));
}

export function buildLeaderboard(ledger = [], context = {}) {
  const board = {};
  const players = context.players || [];

  players.forEach((p) => {
    const entry = ledger.find((item) => item.playerId === p.id);
    board[p.id] = Number(entry?.total || 0);
  });

  return board;
}

export function getHoleGrossScore(scores, holeNumber, playerId) {
  return Number(scores?.[String(holeNumber)]?.[playerId] || 0);
}

export function isGrossBirdie(scores, course, holeNumber, playerId) {
  const gross = getHoleGrossScore(scores, holeNumber, playerId);
  const par = Number(course?.pars?.[holeNumber - 1] || 0);

  return gross > 0 && par > 0 && gross <= par - 1;
}

function hasValidHoleScore(scores, holeNumber, playerId) {
  return getHoleGrossScore(scores, holeNumber, playerId) > 0;
}

function getScoredPlayers(playerIds, scores, holeNumber) {
  return (playerIds || []).filter(
    (playerId) => hasValidHoleScore(scores, holeNumber, playerId)
  );
}

function getMatchParticipants(match, scores, holeNumber) {
  return getScoredPlayers([match?.p1Id, match?.p2Id], scores, holeNumber);
}

function getNinePointParticipants(match, scores, holeNumber) {
  return getScoredPlayers(
    [match?.p1Id, match?.p2Id, match?.p3Id],
    scores,
    holeNumber
  );
}



export function buildMatchBirdieResults(matches, scores, course, toyRule = false, players = [], handicapMode = "relative") {
  const results = [];

  for (const match of matches || []) {
    const isNinePoint =
      match?.gameType === "ninePoint" ||
      match?.gameType === "9_point" ||
      match?.type === "ninePoint" ||
      match?.type === "9_point";

    if (isNinePoint) continue;
    if (!match?.birdieEnabled) continue;
    if (!match?.p1Id || !match?.p2Id) continue;

    const amount = Number(match?.birdieBet || 0);
    if (!amount || amount <= 0) continue;

    const start = Number(match.startHole || 1);
    const end = Number(match.endHole || 18);

    for (let holeNumber = start; holeNumber <= end; holeNumber += 1) {
      const participants = getMatchParticipants(match, scores, holeNumber);
      if (participants.length !== 2) continue;

      const [p1Id, p2Id] = participants;

      const p1Gross = isGrossBirdie(scores, course, holeNumber, p1Id);
      const p2Gross = isGrossBirdie(scores, course, holeNumber, p2Id);
      const matchToyRule = !!match.toyRule;
      const p1Net = matchToyRule ? isNetBirdie(p1Id, holeNumber, players, course, scores, handicapMode) : false;
      const p2Net = matchToyRule ? isNetBirdie(p2Id, holeNumber, players, course, scores, handicapMode) : false;

      // Under Toy Rule: gross ties net — only gross birdies win outright
      // A net-only birdie does nothing unless there's a gross birdie to tie
      if (matchToyRule) {
        const p1Wins = p1Gross && !p2Gross && !p2Net;
        const p2Wins = p2Gross && !p1Gross && !p1Net;
        // gross vs net = push, gross vs gross = push, net only = nothing

        if (p1Wins) {
          results.push({ playerId: p1Id, opponentId: p2Id, matchId: match.id, holeNumber, amount, source: "match-birdie" });
          results.push({ playerId: p2Id, opponentId: p1Id, matchId: match.id, holeNumber, amount: -amount, source: "match-birdie" });
        } else if (p2Wins) {
          results.push({ playerId: p2Id, opponentId: p1Id, matchId: match.id, holeNumber, amount, source: "match-birdie" });
          results.push({ playerId: p1Id, opponentId: p2Id, matchId: match.id, holeNumber, amount: -amount, source: "match-birdie" });
        }
        // gross vs net = push, both gross = push, net only = nothing — no entries pushed
      } else {
        // Original gross-only rule
        if (p1Gross && !p2Gross) {
          results.push({ playerId: p1Id, opponentId: p2Id, matchId: match.id, holeNumber, amount, source: "match-birdie" });
          results.push({ playerId: p2Id, opponentId: p1Id, matchId: match.id, holeNumber, amount: -amount, source: "match-birdie" });
        } else if (p2Gross && !p1Gross) {
          results.push({ playerId: p2Id, opponentId: p1Id, matchId: match.id, holeNumber, amount, source: "match-birdie" });
          results.push({ playerId: p1Id, opponentId: p2Id, matchId: match.id, holeNumber, amount: -amount, source: "match-birdie" });
        }
      }
    }
  }

  return results;
}

export function buildNinePointBirdieResults(matchResults, scores, course, toyRule = false, players = [], handicapMode = "relative") {
  const results = [];

  for (const entry of matchResults || []) {
    const match = entry?.match;
    if (!match) continue;
    if (!match?.birdieEnabled) continue;

    const amount = Number(match?.birdieBet || 0);
    if (!amount || amount <= 0) continue;

    const isNinePoint =
      match.gameType === "ninePoint" ||
      match.gameType === "9_point" ||
      match.type === "ninePoint" ||
      match.type === "9_point";

    if (!isNinePoint) continue;

    const playerIds = [match.p1Id, match.p2Id, match.p3Id].filter(Boolean);
    if (playerIds.length !== 3) continue;

    const start = Number(match.startHole || 1);
    const end = Number(match.endHole || 18);

    for (let holeNumber = start; holeNumber <= end; holeNumber += 1) {
      const scoredPlayerIds = getNinePointParticipants(match, scores, holeNumber);
      if (scoredPlayerIds.length !== 3) continue;

      const grossBirdiePlayers = scoredPlayerIds.filter((playerId) =>
        isGrossBirdie(scores, course, holeNumber, playerId)
      );
        // Net birdie = defensive only. Protects you from paying gross birdie. Collects nothing.
      const matchToyRule = !!match.toyRule;
      if (matchToyRule) {
        const netBirdiePlayers = scoredPlayerIds.filter(
          (playerId) =>
            !isGrossBirdie(scores, course, holeNumber, playerId) &&
            isNetBirdie(playerId, holeNumber, players, course, scores, handicapMode)
        );

        // Net birdie only activates when there is at least one gross birdie
        if (grossBirdiePlayers.length === 0) continue;

        // Losers = players with no birdie at all (not gross, not net)
        const allBirdiePlayers = [...grossBirdiePlayers, ...netBirdiePlayers];
        const losers = scoredPlayerIds.filter((id) => !allBirdiePlayers.includes(id));

        // Only gross birdie players collect — from losers only, not from net birdie players
        grossBirdiePlayers.forEach((winnerId) => {
          losers.forEach((loserId) => {
            results.push({ playerId: winnerId, amount });
            results.push({ playerId: loserId, amount: -amount });
          });
        });
        // Net birdie players pay nothing and collect nothing — they just don't pay the gross birdie

      } else {
        // Original gross-only rule
        if (grossBirdiePlayers.length === 0) continue;
        const losers = scoredPlayerIds.filter((id) => !grossBirdiePlayers.includes(id));
        grossBirdiePlayers.forEach((winnerId) => {
          losers.forEach((loserId) => {
            results.push({ playerId: winnerId, amount });
            results.push({ playerId: loserId, amount: -amount });
          });
        });
      }
    }
  }

  return results;
}

export function buildTeamBirdieResults(
  teamGames,
  teamGameResults,
  scores,
  course,
  getTeamGameSelection,
  birdieBetAmount,
  toyRule = false,
  players = [],
  handicapMode = "relative"
) {
  const results = [];

  for (const game of teamGameResults || []) {
    if (game?.duplicateError) continue;

    const gameIndex = typeof game.index === "number" ? game.index : 0;
    const teamGameConfig = teamGames?.[gameIndex] || {};

    const amount =
      birdieBetAmount != null
        ? Number(birdieBetAmount || 0)
        : Number(teamGameConfig?.birdieBet || 0);

    if (!amount || amount <= 0) continue;

    if (birdieBetAmount == null && !teamGameConfig?.birdieEnabled) {
      continue;
    }

    const selection = getTeamGameSelection?.(gameIndex);
    if (!selection) continue;

    for (const match of game.matches || []) {
      const parts = (match.label || "").split(" ");
      const teamAKey = `team${parts[1] || ""}`.toLowerCase();
      const teamBKey = `team${parts[4] || ""}`.toLowerCase();

      const teamAPlayers = (selection[teamAKey] || []).filter(Boolean);
      const teamBPlayers = (selection[teamBKey] || []).filter(Boolean);

      const startHole = Number(game.start || 1);
      const endHole = Number(game.end || 18);

      for (let holeNumber = startHole; holeNumber <= endHole; holeNumber += 1) {
        const holeScores = scores?.[holeNumber] || {};

        const teamAActive = teamAPlayers.filter((playerId) => holeScores[playerId] != null);
        const teamBActive = teamBPlayers.filter((playerId) => holeScores[playerId] != null);

        if (!teamAActive.length || !teamBActive.length) continue;

        const teamAGrossBirdies = teamAActive.filter((playerId) =>
          isGrossBirdie(scores, course, holeNumber, playerId)
        ).length;

        const teamBGrossBirdies = teamBActive.filter((playerId) =>
          isGrossBirdie(scores, course, holeNumber, playerId)
        ).length;

        if (toyRule) {
          const teamANetBirdies = teamAActive.filter(
            (playerId) =>
              !isGrossBirdie(scores, course, holeNumber, playerId) &&
              isNetBirdie(playerId, holeNumber, players, course, scores, handicapMode)
          ).length;

          const teamBNetBirdies = teamBActive.filter(
            (playerId) =>
              !isGrossBirdie(scores, course, holeNumber, playerId) &&
              isNetBirdie(playerId, holeNumber, players, course, scores, handicapMode)
          ).length;

          // Toy Rule for teams:
          // A net birdie on your team protects you from paying the opposing gross birdie
          // Net birdie never earns money — purely defensive
          // If opposing team has a net birdie, your gross birdie cannot collect from them

          const teamAProtected = teamAGrossBirdies > 0 && teamBNetBirdies > 0;
          const teamBProtected = teamBGrossBirdies > 0 && teamANetBirdies > 0;

          const teamACanCollect = teamAGrossBirdies > 0 && !teamAProtected && teamBGrossBirdies === 0;
          const teamBCanCollect = teamBGrossBirdies > 0 && !teamBProtected && teamAGrossBirdies === 0;

          if (teamACanCollect) {
            teamAActive.forEach((playerId) => results.push({ playerId, amount, holeNumber, source: "team-birdie" }));
            teamBActive.forEach((playerId) => results.push({ playerId, amount: -amount, holeNumber, source: "team-birdie" }));
          } else if (teamBCanCollect) {
            teamBActive.forEach((playerId) => results.push({ playerId, amount, holeNumber, source: "team-birdie" }));
            teamAActive.forEach((playerId) => results.push({ playerId, amount: -amount, holeNumber, source: "team-birdie" }));
          }
          // everything else = push, nothing moves

        } else {
          // Original gross-only rule
          if (teamAGrossBirdies > teamBGrossBirdies) {
            const diff = teamAGrossBirdies - teamBGrossBirdies;
            teamAActive.forEach((playerId) => results.push({ playerId, amount: diff * amount, holeNumber, source: "team-birdie" }));
            teamBActive.forEach((playerId) => results.push({ playerId, amount: -diff * amount, holeNumber, source: "team-birdie" }));
          } else if (teamBGrossBirdies > teamAGrossBirdies) {
            const diff = teamBGrossBirdies - teamAGrossBirdies;
            teamBActive.forEach((playerId) => results.push({ playerId, amount: diff * amount, holeNumber, source: "team-birdie" }));
            teamAActive.forEach((playerId) => results.push({ playerId, amount: -diff * amount, holeNumber, source: "team-birdie" }));
          }
        }
      }
    }
  }

  return results;
}

export function buildBirdieResults({
  matches,
  matchResults,
  teamGames,
  teamGameResults,
  scores,
  course,
  getTeamGameSelection,
  birdiesEnabled,
  birdieBetAmount,
  toyRule = false,
  players = [],
  handicapMode = "relative",
}) {
  if (!scores || !course) {
    return [];
  }

  const matchBirdies = buildMatchBirdieResults(matches, scores, course, toyRule, players, handicapMode);

  const teamBirdies = birdiesEnabled
    ? buildTeamBirdieResults(
        teamGames,
        teamGameResults,
        scores,
        course,
        getTeamGameSelection,
        birdieBetAmount,
        toyRule,
        players,
        handicapMode
      )
    : [];

  const ninePointBirdies = buildNinePointBirdieResults(matchResults, scores, course, toyRule, players, handicapMode);

  return [...matchBirdies, ...teamBirdies, ...ninePointBirdies];
}

export function scoreRound(round, context = {}) {
    const {
  players = [],
  matchResults = [],
  teamGameResults = [],
  teamGameUnitAmount = 1,
  birdieResults = [],
} = context;

  const ledgerMap = {};
  const eventLedger = [];

  players.forEach((player) => {
    ledgerMap[player.id] = {
      playerId: player.id,
      mainGame: 0,
      sideMatches: 0,
      birdies: 0,
      total: 0,
    };
  });


for (const entry of birdieResults) {
  if (!entry) continue;

  const playerId = entry.playerId;
  const amount = Number(entry.amount || 0);

  if (!playerId || !ledgerMap[playerId] || amount === 0) continue;

  ledgerMap[playerId].birdies += amount;
  ledgerMap[playerId].total += amount;

  // Route to correct bucket: team game birdies → mainGame, match birdies → sideMatches
  if (entry.source === "match-birdie") {
    ledgerMap[playerId].sideMatches += amount;
  } else {
    ledgerMap[playerId].mainGame += amount;
  }
}


  for (const entry of matchResults) {
    const match = entry.match;
    const result = entry.result;

    if (!match || !result) continue;

    // 9-point main-game settlement
    const isNinePoint =
      match.gameType === "ninePoint" ||
      match.gameType === "9_point" ||
      match.type === "ninePoint" ||
      match.type === "9_point";

    if (isNinePoint) {
      const balances = result?.payout?.balancesByPlayerId || {};

      Object.entries(balances).forEach(([playerId, amount]) => {
        if (!ledgerMap[playerId] || typeof amount !== "number") return;

        ledgerMap[playerId].mainGame += amount;
        ledgerMap[playerId].total += amount;
      });

      continue;
    }

    // Standard 1v1 totals
    if (match.p1Id && match.p2Id && typeof result.total === "number") {
  if (ledgerMap[match.p1Id]) {
    ledgerMap[match.p1Id].sideMatches += result.total;
    ledgerMap[match.p1Id].total += result.total;
  
  eventLedger.push({
  holeNumber: result?.holeNumber ?? result?.hole ?? null,
  playerId: match.p1Id,
  amount: result.total,
  gameType: "side",
  label: "Side Match",
});
  }

  if (ledgerMap[match.p2Id]) {
    ledgerMap[match.p2Id].sideMatches -= result.total;
    ledgerMap[match.p2Id].total -= result.total;

    eventLedger.push({
    holeNumber: result?.holeNumber ?? result?.hole ?? null,
    playerId: match.p2Id,
    amount: -result.total,
    gameType: "side",
    label: "Side Match",
});
  }
}
}

// TEAM GAME SETTLEMENT
for (const game of teamGameResults) {
  if (game.duplicateError) continue;

  const selection = context.getTeamGameSelection?.(game.index);
  if (!selection) continue;

  for (const matchup of game.matches || []) {
    const parts = matchup.label.split(" ");
    const teamAKey = `team${parts[1] || ""}`.toLowerCase();
    const teamBKey = `team${parts[4] || ""}`.toLowerCase();

    const teamAPlayers = selection[teamAKey] || [];
    const teamBPlayers = selection[teamBKey] || [];

    // sum all scores (base + presses, pay each as a separate unit) to determine total units won/lost for the matchup
    const totalScore = (matchup.result || []).reduce((sum, item) => {
    const score = item.score || 0;
    if (score > 0) return sum + 1;
    if (score < 0) return sum - 1;
    return sum;
  }, 0);

const dollars = totalScore * teamGameUnitAmount;
    ;
    // pay each player on the winning team, charge each player on the losing team
    teamAPlayers.forEach((playerId) => {
      if (!ledgerMap[playerId]) return;
      ledgerMap[playerId].mainGame += dollars;
      ledgerMap[playerId].total += dollars;

      eventLedger.push({
        holeNumber: game.start ?? null,
        playerId,
        amount: dollars,
        gameType: "main",
        label: `Team Game ${game.index + 1}`,
      });

    });

    teamBPlayers.forEach((playerId) => {
      if (!ledgerMap[playerId]) return;
      ledgerMap[playerId].mainGame -= dollars;
      ledgerMap[playerId].total -= dollars;

      eventLedger.push({
      holeNumber: game.start ?? null,
      playerId,
      amount: -dollars,
      gameType: "main",
      label: `Team Game ${game.index + 1}`,
    });
    });
  }
}

  const playerLedger = Object.values(ledgerMap);
  const tabs = buildTabsFromLedger(playerLedger);



  const hasMainGameMoney = playerLedger.some((row) => row.mainGame !== 0);

    return {
  mainGameResult: hasMainGameMoney ? playerLedger : null,
  matchResults,
  sideBetResults: [],
  playerLedger,
  eventLedger,
  tabs,
};
}


function buildTabsFromLedger(playerLedger = []) {
  const creditors = playerLedger
    .filter((player) => player.total > 0)
    .map((player) => ({
      playerId: player.playerId,
      remaining: player.total,
    }))
    .sort((a, b) => b.remaining - a.remaining); // 👈 important

  const debtors = playerLedger
    .filter((player) => player.total < 0)
    .map((player) => ({
      playerId: player.playerId,
      remaining: Math.abs(player.total),
    }))
    .sort((a, b) => b.remaining - a.remaining); // 👈 important

  const tabs = [];

  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const amount = Math.min(debtor.remaining, creditor.remaining);

    if (amount > 0) {
      tabs.push({
        fromPlayerId: debtor.playerId,
        toPlayerId: creditor.playerId,
        amount,
      });
    }

    debtor.remaining -= amount;
    creditor.remaining -= amount;

    if (debtor.remaining === 0) i++;
    if (creditor.remaining === 0) j++;
  }

  return tabs;
}

// ─── SKINS ENGINE ────────────────────────────────────────────────────────────

/**
 * Get the hole value for pot skins with escalation.
 * escalation: "flat" | "escalating"
 * baseUnit: $ per hole (flat) or base unit (escalating: front=1x, mid=2x, back=3x)
 */
export function getSkinHoleValue(hole, baseUnit, escalation) {
  if (escalation === "escalating") {
    if (hole <= 6) return baseUnit * 1;
    if (hole <= 12) return baseUnit * 2;
    return baseUnit * 3;
  }
  return baseUnit;
}

/**
 * Compute skins results for a round.
 * Returns array of { hole, winnerId, value, carryover, birdiDouble }
 */
export function computeSkins({
  players,
  scores,
  course,
  handicapMode,
  skinsConfig,
}) {
  const {
    skinsType,        // "value" | "pot" | "tvskins"
    skinsGross,       // true = gross, false = net
    // Skin Value specific
    skinValueAmount,  // $ per skin
    skinCarryover,    // bool
    skinBirdie,       // bool
    skinBirdieDoubleCarryover, // bool (if false, double hole only)
    // Pot specific
    potType,          // "nocarryover" | "flat" | "escalating"
    potBaseUnit,      // $ per hole (flat/escalating) or total donation (nocarryover)
  } = skinsConfig;

  const holeResults = [];
  let carryoverValue = 0;
  let carryoverCount = 0;

  for (let hole = 1; hole <= 18; hole++) {
    const par = course.pars?.[hole - 1] ?? 4;

    // Get score for each player on this hole
    const holeScores = players.map(player => {
      const raw = scores?.[hole]?.[player.id];
      if (raw == null || !Number.isFinite(Number(raw))) return null;

      let score = Number(raw);
      if (!skinsGross) {
        // Net: subtract handicap strokes
        const strokes = getHandicapStrokes(player.id, hole, players, course, handicapMode);
        score = score - strokes;
      }
      return { playerId: player.id, score, raw: Number(raw) };
    }).filter(Boolean);

    // Need all players to have scored
    if (holeScores.length < players.length) {
      holeResults.push({ hole, winnerId: null, value: 0, carryover: carryoverCount, incomplete: true });
      continue;
    }

    const minScore = Math.min(...holeScores.map(s => s.score));
    const winners = holeScores.filter(s => s.score === minScore);

    // Tie — no skin, carry over
    if (winners.length !== 1) {
      if (skinsType === "value" && skinCarryover) {
        carryoverValue += skinValueAmount;
        carryoverCount++;
      } else if (skinsType === "pot" && potType !== "nocarryover") {
        const holeVal = getSkinHoleValue(hole, potBaseUnit, potType === "escalating" ? "escalating" : "flat");
        carryoverValue += holeVal * players.length;
        carryoverCount++;
      }
      holeResults.push({ hole, winnerId: null, value: 0, carryover: carryoverCount, tied: true });
      continue;
    }

    const winner = winners[0];
    const isBirdie = skinsGross
      ? Number(winner.raw) <= par - 1
      : winner.score <= par - 1; // net birdie = net score at or below par - 1

    // Calculate hole value
    let holeValue = 0;
    if (skinsType === "value") {
      holeValue = skinValueAmount + (skinCarryover ? carryoverValue : 0);
      if (skinBirdie && isBirdie) {
        if (skinBirdieDoubleCarryover) {
          holeValue = holeValue * 2;
        } else {
          holeValue = skinValueAmount * 2 + (skinCarryover ? carryoverValue : 0);
        }
      }
    } else if (skinsType === "pot") {
      holeValue = 1; // count skins, divide pot at end
    } else if (skinsType === "tvskins") {
      const baseHoleVal = getSkinHoleValue(hole, potBaseUnit, "escalating") * players.length;
      holeValue = baseHoleVal + carryoverValue;
    }

    holeResults.push({
      hole,
      winnerId: winner.playerId,
      value: holeValue,
      carryover: carryoverCount,
      isBirdie,
      birdiDoubled: skinBirdie && isBirdie,
    });

    carryoverValue = 0;
    carryoverCount = 0;
  }

  return holeResults;
}

/**
 * Settle skins into a player ledger.
 * Returns { playerLedger, holeResults, totalPot }
 */
export function settleSkinsRound({
  players,
  scores,
  course,
  handicapMode,
  skinsConfig,
}) {
  const holeResults = computeSkins({ players, scores, course, handicapMode, skinsConfig });

const { skinsType } = skinsConfig;

  const ledger = {};
  players.forEach(p => { ledger[p.id] = 0; });

  if (skinsType === "pot") {
    // Count skins per player then divide pot
    const skinsWon = {};
    players.forEach(p => { skinsWon[p.id] = 0; });
    holeResults.forEach(h => { if (h.winnerId) skinsWon[h.winnerId]++; });

    const totalSkins = Object.values(skinsWon).reduce((s, v) => s + v, 0);
    const totalPot = (skinsConfig.potDonation || 10) * players.length;
    const valuePerSkin = totalSkins > 0 ? totalPot / totalSkins : 0;
    const perPlayerCost = skinsConfig.potDonation || 10;

    players.forEach(p => {
      ledger[p.id] = (skinsWon[p.id] * valuePerSkin) - perPlayerCost;
    });

    return { holeResults, ledger, totalPot, valuePerSkin, skinsWon };
  }

  // Skin Value or Pot with carryover — settle hole by hole
  const skinsWon = {};
  players.forEach(p => { skinsWon[p.id] = 0; });

  holeResults.forEach(h => {
    if (!h.winnerId || h.value === 0) return;
    skinsWon[h.winnerId]++;
    // Winner collects from each other player
    const perLoser = h.value / (players.length - 1);
    players.forEach(p => {
      if (p.id === h.winnerId) {
        ledger[p.id] += h.value;
      } else {
        ledger[p.id] -= perLoser;
      }
    });
  });

  const totalPot = Object.values(ledger).filter(v => v > 0).reduce((s, v) => s + v, 0);
  return { holeResults, ledger, totalPot, skinsWon };
}
