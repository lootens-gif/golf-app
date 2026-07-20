import { getRunningStrokeDiffs } from "../scoring/getRunningStrokeDiffs";


export function getActivePlayers(allPlayers, mode) {
  if (mode === "3p") return allPlayers.slice(0, 3);
  if (mode === "4p") return allPlayers.slice(0, 4);
  return allPlayers.slice(0, 5);
}

export function getLowestHandicap(players) {
  const valid = players.map((p) => Number(p.hcp) || 0);
  return Math.min(...valid);
}

export function getPlayerById(players, playerId) {
  return players.find((p) => p.id === playerId) || null;
  
}

export function getPlayerName(players, playerId) {
  return getPlayerById(players, playerId)?.name || "";
}

export function getHandicapBase(player, players, handicapMode) {
  if (!player) return 0;
  const playerHcp = Number(player.hcp) || 0;

  if (handicapMode === "full") {
    return playerHcp;
  }

  const validPlayers = players.filter((p) => p && Number.isFinite(Number(p.hcp)));
  const low = validPlayers.length ? Math.min(...validPlayers.map((p) => Number(p.hcp))) : 0;

  return Math.max(0, playerHcp - low);
}

export function getHandicapStrokes(
  playerId,
  hole,
  players,
  course,
  handicapMode,
  noPar3Strokes = false
) {
  const player = getPlayerById(players, playerId);
  if (!player) return 0;

  // Skip strokes on par 3 holes if toggle is on
  if (noPar3Strokes && course?.pars?.[hole - 1] === 3) return 0;

  let handicapValue = Number(
    getHandicapBase(player, players, handicapMode) || 0
  );
  if (handicapValue <= 0) return 0;

  // When noPar3=true, cap at number of non-par3 holes (Interpretation B)
  if (noPar3Strokes && course?.pars) {
    const eligibleHoles = course.pars.filter(p => p !== 3).length;
    handicapValue = Math.min(handicapValue, eligibleHoles);
  }

  const fullRounds = Math.floor(handicapValue / 18);
  const remainder = handicapValue % 18;

  const holeHcp = Number(course?.hcp?.[hole - 1]);
  if (!Number.isFinite(holeHcp)) return fullRounds;

  let strokes = fullRounds;

  if (remainder > 0 && holeHcp <= remainder) {
    strokes += 1;
  }

  return strokes;
}


/**
 * getSpreadHandicapStrokes — distributes handicap strokes evenly across
 * 6-hole segments (1-6, 7-12, 13-18) for the 6/6/6 COD format.
 *
 * Algorithm:
 * 1. base = floor(totalStrokes / 3), extra = totalStrokes % 3
 * 2. Each segment gets base strokes minimum
 * 3. Extra strokes go to the segment(s) whose (base+1)th hardest eligible hole
 *    has the lowest HCP number (hardest marginal hole gets the extra stroke)
 * 4. Within each segment, strokes go to the hardest eligible holes (lowest HCP)
 * 5. If noPar3Strokes, par 3 holes are ineligible; overflow goes to hardest
 *    eligible hole across any segment
 */
export function getSpreadHandicapStrokes(playerId, hole, players, course, handicapMode, noPar3Strokes = false) {
  const player = getPlayerById(players, playerId);
  if (!player) return 0;

  const totalStrokes = Number(getHandicapBase(player, players, handicapMode) || 0);
  if (totalStrokes <= 0) return 0;

  const pars = course?.pars || [];
  const holeHcp = (h) => Number(course?.hcp?.[h - 1]);
  const isPar3 = (h) => pars[h - 1] === 3;

  const segments = [[1,2,3,4,5,6],[7,8,9,10,11,12],[13,14,15,16,17,18]];

  // Build eligible hole list per segment (sorted by HCP ascending = hardest first)
  const segmentEligible = segments.map(seg =>
    seg
      .filter(h => Number.isFinite(holeHcp(h)) && !(noPar3Strokes && isPar3(h)))
      .sort((a, b) => holeHcp(a) - holeHcp(b))
  );

  const totalEligible = segmentEligible.reduce((sum, seg) => sum + seg.length, 0);

  // If par3 strokes excluded, cap total strokes at eligible holes — no overflow, no double strokes
  const effectiveStrokes = noPar3Strokes ? Math.min(totalStrokes, totalEligible) : totalStrokes;

  const base = Math.floor(effectiveStrokes / 3);
  const extra = effectiveStrokes % 3;

  // Determine how many strokes each segment gets
  const segmentQuotas = [base, base, base];

  // Assign extra strokes: compare the (base+1)th hole across segments
  // whichever segment's marginal hole is hardest (lowest HCP) gets the extra
  if (extra > 0) {
    // Build array of [segIdx, marginalHcp] for segments that have a (base+1)th hole
    const marginals = segments.map((_, i) => {
      const nextHole = segmentEligible[i][base]; // 0-indexed: base = base+1th hole
      return {
        segIdx: i,
        marginalHcp: nextHole ? holeHcp(nextHole) : Infinity,
      };
    }).sort((a, b) => a.marginalHcp - b.marginalHcp); // lowest HCP = hardest = gets extra first // lowest HCP = hardest = gets extra first

    for (let e = 0; e < extra; e++) {
      if (marginals[e]) {
        segmentQuotas[marginals[e].segIdx]++;
      }
    }
  }

  // Build the set of holes that receive strokes
  const strokeHoles = new Set();

  // First pass: assign quota holes per segment
  segments.forEach((_, i) => {
    const quota = segmentQuotas[i];
    segmentEligible[i].slice(0, quota).forEach(h => strokeHoles.add(h));
  });

  // Handle overflow (only possible when par3 toggle OFF and HCP 19+)
  // Overflow strokes go to hardest eligible holes globally as double strokes
  const doubleStrokes = new Set();
  if (!noPar3Strokes) {
    segments.forEach((_, i) => {
      const quota = segmentQuotas[i];
      const available = segmentEligible[i].length;
      if (quota > available && available > 0) {
        const overflow = quota - available;
        const allEligible = segments.flat()
          .filter(h => Number.isFinite(holeHcp(h)))
          .filter(h => !doubleStrokes.has(h))
          .sort((a, b) => holeHcp(a) - holeHcp(b));
        for (let o = 0; o < overflow; o++) {
          if (allEligible[o]) {
            doubleStrokes.add(allEligible[o]);
            strokeHoles.add(allEligible[o]);
          }
        }
      }
    });
  }

  // Return: 2 if hole gets double stroke, 1 if gets single, 0 if none
  if (doubleStrokes.has(hole)) return 2;
  if (strokeHoles.has(hole)) return 1;
  return 0;
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



export function isNetBirdie(playerId, hole, players, course, scores, handicapMode, noPar3Strokes = false) {
  const net = getNetScore(playerId, hole, players, course, scores, handicapMode, noPar3Strokes);
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
  birdieDoublePoints = false,
  eagleTriplePoints = false
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

  const par = course?.pars?.[hole - 1];
  const uniqueWinner = first.netScore < second.netScore;

  // Birdie double only applies if:
  // 1. birdieDoublePoints toggle is on
  // 2. There is a unique winner (not a tie for first)
  // 3. The unique winner made a gross birdie (gross < par)
  const winnerGross = par != null ? scores?.[hole]?.[first.playerId] : null;
  const winnerMadeGrossBirdie = birdieDoublePoints && uniqueWinner && par != null &&
    Number.isFinite(winnerGross) && winnerGross < par;

  // Eagle = 2 under par
  const winnerMadeEagle = winnerMadeGrossBirdie && Number.isFinite(winnerGross) && winnerGross <= par - 2;

  // multiplier: eagle 3x if eagleTriplePoints on, else 2x (falls back to birdie 2x); birdie 2x
  const multiplier = winnerMadeEagle
    ? (eagleTriplePoints ? 3 : 2)
    : winnerMadeGrossBirdie ? 2 : 1;
  // Store birdie/eagle info on result for rendering
  const birdieMode = winnerMadeEagle ? "eagle" : winnerMadeGrossBirdie ? "birdie" : null;

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
      mode: birdieMode ? `blitz-${birdieMode}` : "blitz",
      birdieMode,
      winnerPlayerId: first.playerId,
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
    mode: birdieMode ? `birdie-double-${birdieMode}` : "standard",
    birdieMode,
    winnerPlayerId: first.playerId,
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
  birdieDoublePoints = false,
  eagleTriplePoints = false
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
      birdieDoublePoints,
      eagleTriplePoints
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
    label = remaining === 0 ? `${margin} up` : `${margin}&${remaining}`;
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

  // Play Even — override handicap function to return 0 strokes for all holes
  const playEvenFn = match.playEven ? () => 0 : null;

// -----------------------------
// 9 POINT MODE (3-player)
// -----------------------------
const noPar3Strokes = !!match.noPar3Strokes;
if (match.gameType === "ninePoint") {
  const playerIds = [match.p1Id, match.p2Id, match.p3Id].filter(Boolean);
  const ninePointPlayers = players.filter(p => playerIds.includes(p.id));

  const result = getNinePointMatchSummary(
    playerIds,
    ninePointPlayers,
    course,
    scores,
    handicapMode,
    Boolean(match.blitzEnabled),
    Number(match.bet ?? 0),
    18,
    noPar3Strokes,
    Boolean(match.birdieDoublePoints),
    Boolean(match.eagleTriplePoints)
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
      getHandicapStrokesFn: playEvenFn,
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

// ─── TEAM MATCH (non-press formats) ────────────────────────────────────────
// Mirrors playIndividualMatch but uses computeHoleResult for per-hole scoring.
// teamA / teamB are arrays of player IDs.
// match.type: "standard" | "longshort" | "match_fbt" | "stroke"
// match.strokeCombined: if true, stroke = sum of both team members' net scores
export function playTeamMatch(match, context) {
  const { players, course, scores, handicapMode, getHandicapStrokesFn, noPar3TeamGame } = context;
  const teamA = match.teamA || [];
  const teamB = match.teamB || [];

  // Build per-hole result array (1 = teamA wins, -1 = teamB wins, 0 = tie)
  const holeResults = [];
  for (let hole = 1; hole <= 18; hole++) {
    const r = computeHoleResult({ hole, teamA, teamB, players, course, scores, handicapMode, getHandicapStrokesFn, noPar3Strokes: !!noPar3TeamGame });
    if (r === null) break;
    holeResults.push(r);
  }

  const bet = Number(match.bet ?? 0);

  // ── Standard (Net Holes) ──
  if (match.type === "standard") {
    const segment = decideMatchPlaySegment(holeResults, 1, 18);
    return {
      type: "standard",
      holes: holeResults,
      total: signUnit(segment.score) * bet,
      label: segment.label,
      decidedOn: segment.decidedOn,
    };
  }

  // ── Long / Short ──
  if (match.type === "longshort") {
    const longSegment = decideMatchPlaySegment(holeResults, 1, 18);
    const longUnits = signUnit(longSegment.score);
    const longResult = longUnits * bet;
    let shortStart = longSegment.decidedOn ? longSegment.decidedOn + 1 : 10;
    if (shortStart > 18) shortStart = 19;
    let shortSegment = { score: 0, units: 0, label: "Tie", decidedOn: null };
    if (shortStart <= 18) shortSegment = decideMatchPlaySegment(holeResults, shortStart, 18);
    const shortResult = shortSegment.units * (bet / 2);
    return {
      type: "longshort",
      holes: holeResults,
      total: longResult + shortResult,
      long: longResult,
      short: shortResult,
      longLabel: longSegment.label,
      shortLabel: shortSegment.label,
      longDecidedOn: longSegment.decidedOn,
      shortDecidedOn: shortSegment.decidedOn,
    };
  }

  // ── Match Play (FBT) ──
  if (match.type === "match_fbt") {
    const segmentDefs = [
      { key: "front", label: "Front 9", start: 1, end: 9, enabled: match.matchPlayFront !== false },
      { key: "back", label: "Back 9", start: 10, end: 18, enabled: match.matchPlayBack !== false },
      { key: "total", label: "Total 18", start: 1, end: 18, enabled: match.matchPlayTotal !== false },
    ].filter(s => s.enabled);
    const safeDefs = segmentDefs.length ? segmentDefs : [{ key: "total", label: "Total 18", start: 1, end: 18 }];
    const segments = safeDefs.map(seg => {
      const segment = decideMatchPlaySegment(holeResults, seg.start, seg.end);
      return { key: seg.key, label: seg.label, units: segment.units, dollars: segment.units * bet, resultLabel: segment.label, decidedOn: segment.decidedOn };
    });
    return { type: "match_fbt", holes: holeResults, segments, total: segments.reduce((s, seg) => s + seg.dollars, 0) };
  }

  // ── Stroke Play ──
  if (match.type === "stroke") {
    const strokeScoring = match.strokeScoring || "net";
    const strokePayoutMode = match.strokePayoutMode || "winloss";
    const combined = !!match.strokeCombined;

    const segmentDefs = [
      { key: "front", label: "Front 9", start: 1, end: 9, enabled: !!match.strokeFront },
      { key: "back", label: "Back 9", start: 10, end: 18, enabled: !!match.strokeBack },
      { key: "total", label: "Total 18", start: 1, end: 18, enabled: !!match.strokeTotal },
    ].filter(s => s.enabled);

    // Team score per segment: combined = sum both players, otherwise best net (low)
    const teamSegmentScore = (team, start, end) => {
      if (combined) {
        let total = 0;
        for (const playerId of team) {
          const seg = sumStrokeSegment({ playerId, startHole: start, endHole: end, players, course, scores, handicapMode, strokeScoring });
          if (seg.total === null) return null;
          total += seg.total;
        }
        return total;
      } else {
        // Best net: lowest score on team
        let best = null;
        for (const playerId of team) {
          const seg = sumStrokeSegment({ playerId, startHole: start, endHole: end, players, course, scores, handicapMode, strokeScoring });
          if (seg.total === null) continue;
          if (best === null || seg.total < best) best = seg.total;
        }
        return best;
      }
    };

    const segments = segmentDefs.map(seg => {
      const aTotal = teamSegmentScore(teamA, seg.start, seg.end);
      const bTotal = teamSegmentScore(teamB, seg.start, seg.end);
      const settlement = settleStrokeSegment(aTotal, bTotal, strokePayoutMode, bet);
      return { key: seg.key, label: seg.label, aTotal, bTotal, diff: settlement.diff, units: settlement.units, dollars: settlement.dollars, winner: settlement.winner };
    });

    return { type: "stroke", holes: holeResults, strokeScoring, strokePayoutMode, strokeCombined: combined, segments, total: segments.reduce((s, seg) => s + seg.dollars, 0) };
  }

  return { type: match.type, holes: holeResults, total: 0 };
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
      const matchNoPar3 = !!match.noPar3Strokes;
      // Use only the 2 players in this match for relative handicap calculation
      const matchPlayers = players.filter(p => p.id === p1Id || p.id === p2Id);
      const p1Net = matchToyRule ? isNetBirdie(p1Id, holeNumber, matchPlayers, course, scores, handicapMode, matchNoPar3) : false;
      const p2Net = matchToyRule ? isNetBirdie(p2Id, holeNumber, matchPlayers, course, scores, handicapMode, matchNoPar3) : false;

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
            results.push({ playerId: winnerId, amount, holeNumber, source: "nine-point-birdie" });
            results.push({ playerId: loserId, amount: -amount, holeNumber, source: "nine-point-birdie" });
          });
        });
        // Net birdie players pay nothing and collect nothing — they just don't pay the gross birdie

      } else {
        // Original gross-only rule
        if (grossBirdiePlayers.length === 0) continue;
        const losers = scoredPlayerIds.filter((id) => !grossBirdiePlayers.includes(id));
        grossBirdiePlayers.forEach((winnerId) => {
          losers.forEach((loserId) => {
            results.push({ playerId: winnerId, amount, holeNumber, source: "nine-point-birdie" });
            results.push({ playerId: loserId, amount: -amount, holeNumber, source: "nine-point-birdie" });
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

      // Use only match players for relative handicap
      const matchPlayers = players.filter(p => teamAPlayers.includes(p.id) || teamBPlayers.includes(p.id));

      // Count gross birdie WINS per team across segment
      // Toy Rule ON: gross birdie only counts if that team WON the hole
      // Toy Rule OFF: gross birdie counts regardless of hole result
      let teamABirdieWins = 0;
      let teamBBirdieWins = 0;
      const teamABirdieHoles = [];
      const teamBBirdieHoles = [];

      for (let holeNumber = startHole; holeNumber <= endHole; holeNumber += 1) {
        const holeScores = scores?.[holeNumber] || {};
        const teamAActive = teamAPlayers.filter(id => holeScores[id] != null);
        const teamBActive = teamBPlayers.filter(id => holeScores[id] != null);
        if (!teamAActive.length || !teamBActive.length) continue;

        const teamAGross = teamAActive.filter(id => isGrossBirdie(scores, course, holeNumber, id)).length;
        const teamBGross = teamBActive.filter(id => isGrossBirdie(scores, course, holeNumber, id)).length;

        if (teamAGross === 0 && teamBGross === 0) continue;

        if (toyRule) {
          // With Toy Rule: gross birdie only pays if that team won the hole
          const holeResult = computeHoleResult({
            hole: holeNumber,
            teamA: teamAPlayers,
            teamB: teamBPlayers,
            players: matchPlayers,
            course,
            scores,
            handicapMode,
          });
          if (teamAGross > 0 && holeResult === 1) {
            teamABirdieWins += teamAGross;
            teamABirdieHoles.push(holeNumber);
          }
          if (teamBGross > 0 && holeResult === -1) {
            teamBBirdieWins += teamBGross;
            teamBBirdieHoles.push(holeNumber);
          }
        } else {
          // Without Toy Rule: all gross birdies count
          teamABirdieWins += teamAGross;
          teamBBirdieWins += teamBGross;
          if (teamAGross > 0) teamABirdieHoles.push(holeNumber);
          if (teamBGross > 0) teamBBirdieHoles.push(holeNumber);
        }
      }

      const diff = teamABirdieWins - teamBBirdieWins;

      // Players who scored in this segment
      const teamAScored = teamAPlayers.filter(id => {
        for (let h = startHole; h <= endHole; h++) { if (scores?.[h]?.[id] != null) return true; }
        return false;
      });
      const teamBScored = teamBPlayers.filter(id => {
        for (let h = startHole; h <= endHole; h++) { if (scores?.[h]?.[id] != null) return true; }
        return false;
      });

      if (diff > 0) {
        const holeNum = teamABirdieHoles[0] ?? startHole;
        teamAScored.forEach(id => results.push({ playerId: id, amount: diff * amount, holeNumber: holeNum, source: "team-birdie", matchupId: match.label, grossMade: teamABirdieWins, netPaid: diff }));
        teamBScored.forEach(id => results.push({ playerId: id, amount: -(diff * amount), holeNumber: holeNum, source: "team-birdie", matchupId: match.label, grossMade: teamABirdieWins, netPaid: diff }));
      } else if (diff < 0) {
        const holeNum = teamBBirdieHoles[0] ?? startHole;
        teamBScored.forEach(id => results.push({ playerId: id, amount: (-diff) * amount, holeNumber: holeNum, source: "team-birdie", matchupId: match.label, grossMade: teamBBirdieWins, netPaid: -diff }));
        teamAScored.forEach(id => results.push({ playerId: id, amount: diff * amount, holeNumber: holeNum, source: "team-birdie", matchupId: match.label, grossMade: teamBBirdieWins, netPaid: -diff }));
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
  wolfResult = null,
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

  // All birdie sources go to birdies bucket only
  // match game amounts go to sideMatches separately via matchResults loop below
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
    let totalScore = 0;
    if (Array.isArray(matchup.result)) {
      // Press format: result is array of bet results
      totalScore = matchup.result.reduce((sum, item) => {
        const score = item.score || 0;
        if (score > 0) return sum + 1;
        if (score < 0) return sum - 1;
        return sum;
      }, 0);
    } else if (matchup.result && typeof matchup.result === "object") {
      // Non-press format: result is a structured object with a total
      const dollars = Number(matchup.result.total || 0);
      totalScore = dollars > 0 ? 1 : dollars < 0 ? -1 : 0;
    }

const dollars = totalScore * teamGameUnitAmount;
    const teamACount = teamAPlayers.filter(Boolean).length;
    const teamBCount = teamBPlayers.filter(Boolean).length;
    // In unequal teams (2v1), solo player pays each winner individually
    const teamAShare = dollars;
    const teamBShare = teamBCount > 0 ? dollars * teamACount / teamBCount : dollars;

    // pay each player on the winning team, charge each player on the losing team
    teamAPlayers.forEach((playerId) => {
      if (!ledgerMap[playerId]) return;
      ledgerMap[playerId].mainGame += teamAShare;
      ledgerMap[playerId].total += teamAShare;
      eventLedger.push({
        holeNumber: game.start ?? null,
        playerId,
        amount: teamAShare,
        gameType: "main",
        label: `Team Game ${game.index + 1}`,
      });
    });

    teamBPlayers.forEach((playerId) => {
      if (!ledgerMap[playerId]) return;
      ledgerMap[playerId].mainGame -= teamBShare;
      ledgerMap[playerId].total -= teamBShare;
      eventLedger.push({
        holeNumber: game.start ?? null,
        playerId,
        amount: -teamBShare,
        gameType: "main",
        label: `Team Game ${game.index + 1}`,
      });
    });
  }
}

// WOLF SETTLEMENT
// Same pattern as 9-Point above: wolfResult.balancesByPlayerId is a final
// per-player $ total (already summed across every hole via
// computeWolfRoundBalances), merged straight into mainGame — since Wolf
// reuses the same pairwise settlement approach 9-Point already uses, not a
// separate zero-out calculation.
if (wolfResult && wolfResult.balancesByPlayerId) {
  Object.entries(wolfResult.balancesByPlayerId).forEach(([playerId, amount]) => {
    if (!ledgerMap[playerId] || typeof amount !== "number") return;
    ledgerMap[playerId].mainGame += amount;
    ledgerMap[playerId].total += amount;
    eventLedger.push({
      holeNumber: null,
      playerId,
      amount,
      gameType: "main",
      label: "Wolf",
    });
  });
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

// ─── WOLF ENGINE ─────────────────────────────────────────────────────────────
// Per Harrison Biro's direct, confirmed answers (July 2026) — NOT the
// original AI-drafted document, which turned out to be wrong on multiple
// counts (hitting order, the tie rule, "half press" terminology) and is
// now preserved only as an optional "Classic Wolf" variant for groups who
// actually play that way. Harrison Wolf is the default.
//
// Scope of this pass: hole-level resolution, both settlement styles
// (Pairwise and Pooled), both rule styles (Harrison and Classic).

/**
 * Two independent, orthogonal settings:
 *  - wolfStyle: which multiplier table applies to each tier
 *  - settlementStyle: how a multi-person winning/losing side actually gets paid
 */
export const WOLF_STYLES = {
  HARRISON: "harrison",
  CLASSIC: "classic",
};

export const WOLF_SETTLEMENT_STYLES = {
  PAIRWISE: "pairwise", // every loser pays every winner individually (always clean $, no split)
  POOLED: "pooled",     // losers each contribute the same amount into a pool; winners split it evenly
};

/**
 * Multipliers applied DIRECTLY to the bet amount — confirmed against
 * Harrison's real worked numbers ($25 hole: Wolf=$25/opponent, Lone Wolf=
 * $50/opponent, Blind Wolf=$75/opponent — a clean 1x/2x/3x of the bet).
 * "small" = Wolf's side (1 player solo/blind/loneWolf/shuck, 2 for pack).
 * "big"   = the opponents.
 *
 * Harrison Wolf has THREE solo tiers, not two — confirmed directly:
 *  - solo: no partner picked, no early declaration (watched all 4 hit) — 1x
 *  - loneWolf: declared alone right after your OWN tee shot, before
 *    watching anyone else — 2x
 *  - blindWolf: declared alone before even your own tee shot — 3x
 * A partnered Pack Wolf hole is always 1x under Harrison's rules — the
 * tier multiplier only applies when going solo.
 *
 * Classic Wolf (the original document's numbers) never distinguished a
 * separate "declared right after your own shot" tier — solo and loneWolf
 * collapse to the same value there.
 */
export const WOLF_MULTIPLIER_TABLES = {
  [WOLF_STYLES.HARRISON]: {
    pack:      { small: 1, big: 1 },
    solo:      { small: 1, big: 1 },
    loneWolf:  { small: 2, big: 2 },
    blindWolf: { small: 3, big: 3 },
    shuck:     { small: 2, big: 2 },
  },
  [WOLF_STYLES.CLASSIC]: {
    pack:      { small: 2,  big: 2 },
    solo:      { small: 4,  big: 1 },
    loneWolf:  { small: 4,  big: 1 }, // same as solo — Classic doesn't have this tier
    blindWolf: { small: 12, big: 3 },
    shuck:     { small: 8,  big: 2 },
  },
};

/**
 * Resolve a single Wolf hole and return the dollar delta for every player
 * involved, under whichever wolfStyle + settlementStyle the round is using.
 *
 * @param {"pack"|"solo"|"loneWolf"|"blindWolf"|"shuck"} format
 * @param {string[]} smallSide   - Wolf's side. 1 id (solo/loneWolf/blindWolf/shuck) or 2 ids (pack).
 * @param {string[]} bigSide     - Opponents. 3 ids (pack) or 4 ids (solo/loneWolf/blindWolf/shuck).
 * @param {number} betAmount     - $ for this hole (Super Wolf's elevated
 *                                 amount, if applicable, is just passed in already).
 * @param {string} wolfStyle     - WOLF_STYLES.HARRISON (default) or .CLASSIC.
 * @param {string} settlementStyle - WOLF_SETTLEMENT_STYLES.PAIRWISE (default) or .POOLED.
 *                                 These only produce identical results when the
 *                                 single player's side is the WINNER (trivial
 *                                 1-way split either way). If the single player's
 *                                 side loses to a multi-person side, Pairwise and
 *                                 Pooled genuinely diverge — see tests.
 * @param {number} hammerMultiplier - 1 if no hammer; 2/4/8/16/32 if thrown & accepted.
 * @param {number} birdieMultiplier - 1 (none) / 2 (birdie) / 3 (eagle) / 4 (albatross).
 * @param {"small"|"big"|null} concededBy - set when a Hammer was rejected; the
 *                                 conceding side loses outright, no score comparison.
 */
export function resolveWolfHole({
  format,
  smallSide,
  bigSide,
  hole,
  players,
  course,
  scores,
  handicapMode,
  noPar3Strokes = false,
  betAmount,
  wolfStyle = WOLF_STYLES.HARRISON,
  settlementStyle = WOLF_SETTLEMENT_STYLES.PAIRWISE,
  hammerMultiplier = 1,
  birdieMultiplier = 1,
  addAHammerMultiplier = 1,
  concededBy = null,
  shuckDoubles = true, // Setup toggle — some groups don't want the extra Shuck penalty
}) {
  const table = WOLF_MULTIPLIER_TABLES[wolfStyle] || WOLF_MULTIPLIER_TABLES[WOLF_STYLES.HARRISON];
  // With the penalty off, a Shuck plays exactly like an ordinary solo Wolf
  // hole would under whatever style is active — not a hardcoded 1x, since
  // Classic Wolf's own solo tier is already asymmetric (4x/1x). "No
  // penalty" means "no different from any other solo hole," not "always
  // flat."
  const tierValues = (format === "shuck" && !shuckDoubles) ? table.solo : table[format];
  if (!tierValues) throw new Error(`Unknown Wolf format: ${format}`);

  let winner; // "small" | "big" | "push"

  if (concededBy) {
    winner = concededBy === "small" ? "big" : "small";
  } else {
    const smallBest = getBestBallWinner(smallSide, hole, players, course, scores, handicapMode, null, noPar3Strokes);
    const bigBest = getBestBallWinner(bigSide, hole, players, course, scores, handicapMode, null, noPar3Strokes);
    if (!smallBest || !bigBest) return null; // scores not yet entered for this hole

    if (smallBest.net < bigBest.net) winner = "small";
    else if (bigBest.net < smallBest.net) winner = "big";
    else winner = "push"; // confirmed: ties are ALWAYS a push, every format — never a loss for the lone side
  }

  const deltas = {};
  [...smallSide, ...bigSide].forEach((id) => { deltas[id] = 0; });

  if (winner === "push") {
    return { winner, deltas, multiplier: 0, dollarsPerPairing: 0 };
  }

  const winningSide = winner === "small" ? smallSide : bigSide;
  const losingSide = winner === "small" ? bigSide : smallSide;
  const multiplier = tierValues[winner];
  const dollarsPerPairing = multiplier * (Number(betAmount) || 0) * hammerMultiplier * birdieMultiplier * addAHammerMultiplier;

  if (settlementStyle === WOLF_SETTLEMENT_STYLES.POOLED) {
    // Each losing player contributes the same per-pairing rate into a
    // shared pool; the pool splits evenly across the winning side. For a
    // 1-winner or 1-loser side this produces identical numbers to Pairwise
    // — the two styles only actually diverge on a Pack Wolf hole (2v3).
    const pool = dollarsPerPairing * losingSide.length;
    const perWinner = pool / winningSide.length;
    const perLoser = pool / losingSide.length; // == dollarsPerPairing, kept explicit for clarity

    winningSide.forEach((winId) => { deltas[winId] = (deltas[winId] || 0) + perWinner; });
    losingSide.forEach((loseId) => { deltas[loseId] = (deltas[loseId] || 0) - perLoser; });

    return { winner, deltas, multiplier, dollarsPerPairing, pool, perWinner };
  }

  // Pairwise (default): every losing player pays every winning player the full per-pairing amount.
  winningSide.forEach((winId) => {
    losingSide.forEach((loseId) => {
      deltas[winId] = (deltas[winId] || 0) + dollarsPerPairing;
      deltas[loseId] = (deltas[loseId] || 0) - dollarsPerPairing;
    });
  });

  return { winner, deltas, multiplier, dollarsPerPairing };
}

/**
 * Carryover on Push — Section 12/12A of the confirmed spec.
 * A 3-way mode, not a simple on/off, because Wolf's teams reshuffle every
 * hole (unlike a fixed match), so carrying a Hammer multiplier forward is a
 * separate decision from carrying the base point value.
 */
export const WOLF_CARRYOVER_MODES = {
  OFF: "off",
  VALUE_ONLY: "value_only",
  VALUE_AND_HAMMERS: "value_and_hammers",
};

/**
 * Advances Wolf carryover state by one hole.
 *
 * @param {{carriedAmount:number, pushCount:number}} state - pass
 *   {carriedAmount:0, pushCount:0} for hole 1 / after any hole that was won.
 * @param {{isPush:boolean, holeBaseValue:number, holeHammerMultiplier?:number}} hole
 *   - the hole that just finished. holeHammerMultiplier only matters in
 *   VALUE_AND_HAMMERS mode (defaults to 1 = no hammer).
 * @param {{mode:string, maxCarryover?:number|null}} config - maxCarryover of
 *   null/undefined means unlimited stacking.
 *
 * @returns {{nextState: object, effectiveBaseValue: number}} - effectiveBaseValue
 *   is what THIS hole's base value actually was (its own base + whatever had
 *   already carried in from prior pushes); nextState is what carries into
 *   the following hole.
 */
export function applyWolfCarryover(state, hole, config) {
  const { carriedAmount = 0, pushCount = 0 } = state || {};
  const { isPush, holeBaseValue, holeHammerMultiplier = 1 } = hole;
  const { mode = WOLF_CARRYOVER_MODES.OFF, maxCarryover = null } = config || {};

  const effectiveBaseValue = holeBaseValue + carriedAmount;

  // A won hole (not a push) always resets carryover for the next hole,
  // regardless of mode.
  if (!isPush) {
    return { nextState: { carriedAmount: 0, pushCount: 0 }, effectiveBaseValue };
  }

  if (mode === WOLF_CARRYOVER_MODES.OFF) {
    return { nextState: { carriedAmount: 0, pushCount: 0 }, effectiveBaseValue };
  }

  const atCap = maxCarryover != null && pushCount >= maxCarryover;
  if (atCap) {
    // Cap already reached — holds flat, no further increase, state unchanged.
    return { nextState: { carriedAmount, pushCount }, effectiveBaseValue };
  }

  const contribution = mode === WOLF_CARRYOVER_MODES.VALUE_AND_HAMMERS
    ? holeBaseValue * holeHammerMultiplier
    : holeBaseValue;

  return {
    nextState: { carriedAmount: carriedAmount + contribution, pushCount: pushCount + 1 },
    effectiveBaseValue,
  };
}

/**
 * Super Wolf hole split — Section 9D of the confirmed spec.
 * Computes how many holes are "regular rotation" vs. "Super Wolf" so every
 * player gets an equal number of standard Wolf turns, with Super Wolf
 * absorbing whatever's left over. v1 case (5 players/18 holes) = 15 + 3.
 * Deliberately parameterized (not hardcoded to 15+3) per the spec, even
 * though only the 5-player/18-hole case is needed at launch.
 */
export function getWolfHoleSplit(totalHoles, playerCount) {
  const turnsPerPlayer = Math.floor((Number(totalHoles) || 0) / (Number(playerCount) || 1));
  const regularHoles = turnsPerPlayer * playerCount;
  const superWolfHoles = totalHoles - regularHoles;
  return { regularHoles, superWolfHoles, turnsPerPlayer };
}

/**
 * Super Wolf assignment — Section 9A of the confirmed spec.
 * The player down the most Wolf money (Wolf money ONLY — never combined
 * with 1v1 or other side bets) becomes Super Wolf. Ties are broken by
 * earlier position in the standard rotation order.
 *
 * @param {Object} wolfStandings - { playerId: dollarAmount, ... }
 * @param {string[]} rotationOrder - full rotation sequence, tiebreak only.
 * @returns {{ranked: Array<{playerId, standing}>, superWolf: string|null}}
 *   ranked is sorted worst (most negative) to best — matches the rank
 *   display shown at the Super Wolf tee box.
 */
export function getSuperWolfAssignment(wolfStandings, rotationOrder = []) {
  const entries = Object.entries(wolfStandings || {}).map(([playerId, standing]) => ({
    playerId,
    standing: Number(standing) || 0,
  }));

  entries.sort((a, b) => {
    if (a.standing !== b.standing) return a.standing - b.standing; // most negative (worst) first
    const aIdx = rotationOrder.indexOf(a.playerId);
    const bIdx = rotationOrder.indexOf(b.playerId);
    if (aIdx === -1 && bIdx === -1) return 0;
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx; // earlier in rotation wins the tie
  });

  return {
    ranked: entries,
    superWolf: entries.length ? entries[0].playerId : null,
  };
}

/**
 * Super Wolf hitting order — Section 9C of the confirmed spec.
 * Chosen once at Setup, applied identically at holes 16, 17, and 18.
 * Super Wolf itself always hits first (Section 4A/9A) — this only orders
 * the other 4 players.
 */
export const SUPER_WOLF_ORDER_MODES = {
  STANDARD: "standard",
  WOLF_CONTROLS: "wolf_controls",
  RANK_BY_DEFICIT: "rank_by_deficit",
};

/**
 * @param {string} mode - one of SUPER_WOLF_ORDER_MODES
 * @param {string[]} otherFour - the 4 non-Super-Wolf player IDs
 * @param {{rotationOrder?: string[], wolfStandings?: Object, manualOrder?: string[]|null}} opts
 *   - rotationOrder: full rotation sequence — used for STANDARD ordering and all tiebreaks
 *   - wolfStandings: { playerId: dollarAmount } — required for RANK_BY_DEFICIT
 *   - manualOrder: required for WOLF_CONTROLS — the order Super Wolf calls out,
 *     tapped in by the Scorekeeper at the tee box
 * @returns {string[]|null} - the ordered 4 players, or null if WOLF_CONTROLS
 *   mode and manualOrder hasn't been entered yet (signals the UI still needs input)
 */
export function getSuperWolfHittingOrder(mode, otherFour, opts = {}) {
  const { rotationOrder = [], wolfStandings = {}, manualOrder = null } = opts;

  if (mode === SUPER_WOLF_ORDER_MODES.WOLF_CONTROLS) {
    if (!manualOrder || manualOrder.length !== otherFour.length) return null;
    return manualOrder;
  }

  const byRotation = (a, b) => {
    const ai = rotationOrder.indexOf(a);
    const bi = rotationOrder.indexOf(b);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  };

  if (mode === SUPER_WOLF_ORDER_MODES.RANK_BY_DEFICIT) {
    return [...otherFour].sort((a, b) => {
      const sa = Number(wolfStandings[a]) || 0;
      const sb = Number(wolfStandings[b]) || 0;
      if (sa !== sb) return sa - sb; // most negative (most down) hits first
      return byRotation(a, b);
    });
  }

  // STANDARD
  return [...otherFour].sort(byRotation);
}

/**
 * Sums a full round's worth of per-hole Wolf results into final per-player
 * dollar totals, in the same shape 9-Point's payout.balancesByPlayerId uses
 * — so it can be merged into scoreRound()'s ledger the exact same way
 * (see the WOLF SETTLEMENT block in scoreRound above).
 *
 * @param {Array<{deltas: Object}|null>} holeResults - one entry per hole
 *   played so far; each is the direct output of resolveWolfHole(), or null
 *   for a hole not yet scored (skipped safely).
 * @param {string[]} playerIds - every player who might appear, so everyone
 *   shows up in the output even at a $0 balance.
 * @returns {{balancesByPlayerId: Object}}
 */
export function computeWolfRoundBalances(holeResults, playerIds = []) {
  const balances = {};
  playerIds.forEach((id) => { balances[id] = 0; });

  (holeResults || []).forEach((hole) => {
    if (!hole || !hole.deltas) return;
    Object.entries(hole.deltas).forEach(([playerId, amount]) => {
      balances[playerId] = (balances[playerId] || 0) + (Number(amount) || 0);
    });
  });

  return { balancesByPlayerId: balances };
}

/**
 * Determines gross-score-vs-par birdie multiplier for whichever side wins
 * a Wolf hole — same pattern as 9-Point's winnerMadeGrossBirdie, applied
 * to the best gross score among the winning side's players.
 * 1 = none, 2 = birdie, 3 = eagle, 4 = albatross or better.
 */
export function getWolfBirdieMultiplier(winningSide, hole, course, scores) {
  const par = course?.pars?.[hole - 1];
  if (par == null) return 1;
  let bestGross = null;
  (winningSide || []).forEach((id) => {
    const raw = scores?.[hole]?.[id];
    if (raw == null) return;
    const gross = Number(raw);
    if (bestGross == null || gross < bestGross) bestGross = gross;
  });
  if (bestGross == null) return 1;
  const under = par - bestGross;
  if (under >= 3) return 4;
  if (under === 2) return 3;
  if (under === 1) return 2;
  return 1;
}

/**
 * Add-A-Hammer clean sweep check (Section 8B) — automatic ×2 bonus when
 * EVERY member of the winning side individually beat EVERY member of the
 * losing side on net score, not just the best-ball comparison that
 * determined the winner. Best-ball only needs one player to be better, so
 * this is a genuinely separate, non-trivial check.
 *
 * Confirmed rule: only evaluates when the winning side has MORE than one
 * player (Pack Wolf either direction, or 4 opponents beating a lone
 * player) — with a single-player winning side, "did everyone on the
 * winning side beat everyone" is automatically true by definition of
 * best-ball, so there's nothing meaningful to check.
 */
export function checkWolfCleanSweep(winningSide, losingSide, hole, players, course, scores, handicapMode, noPar3Strokes) {
  if (!winningSide || winningSide.length <= 1) return false;
  const winnerNets = winningSide.map((id) => getNetScore(id, hole, players, course, scores, handicapMode, noPar3Strokes));
  const loserNets = losingSide.map((id) => getNetScore(id, hole, players, course, scores, handicapMode, noPar3Strokes));
  if (winnerNets.some((n) => n == null) || loserNets.some((n) => n == null)) return false;
  return winnerNets.every((wn) => loserNets.every((ln) => wn < ln));
}

/**
 * Orchestrates a full Wolf round's worth of hole resolution (holes 1-15
 * only — Super Wolf 16-18 stays blocked separately) into the final
 * balancesByPlayerId shape scoreRound() consumes. Extracted out of
 * App.jsx's render body specifically so this can be unit tested directly
 * instead of only verified by "the app didn't crash."
 *
 * @param {Object[]} activePlayers - in rotation order, exactly 5.
 * @param {Object} wolfHoles - { [hole]: rawConfig } as captured by WolfHoleCard.
 * @param {Function} getFormat - WolfHoleCard's getWolfFormat(config) => format string.
 *   Passed in rather than imported directly to keep this engine file free
 *   of any dependency on a UI component.
 * @param {Object} course, scores, handicapMode, noPar3Strokes - same as everywhere else.
 * @param {number} betAmount - teamGameUnitAmount.
 * @param {string} wolfStyle, settlementStyle - the two Setup toggles.
 * @param {boolean} birdieEnabled - the Birdie/Eagle/Albatross Multiplier Setup toggle.
 * @returns {{balancesByPlayerId: Object}}
 */
/**
 * Figures out who's on which side for a single Wolf hole, from rotation +
 * the raw config WolfHoleCard captured. Structural only — no scores needed.
 * Extracted so both the settlement math and the display narrative share
 * exactly one source of truth for "who's playing whom."
 */
export function getWolfHoleSides(hole, activePlayers, config, format, overrideWolfId = null) {
  const wolfIndex = (hole - 1) % activePlayers.length;
  const wolfId = overrideWolfId || activePlayers[wolfIndex]?.id;
  const otherIds = activePlayers.filter((p) => p.id !== wolfId).map((p) => p.id);

  let smallSide, bigSide;
  if (format === "pack") {
    smallSide = [wolfId, config.partnerId];
    bigSide = otherIds.filter((id) => id !== config.partnerId);
  } else {
    // Shuck: the invited partner REFUSES to team up. This leaves the
    // original Wolf alone against all 4, exactly like nobody had ever
    // been picked — the shucker doesn't inherit anything, they're just
    // folded back into the opponents. Confirmed by real playtesting
    // (Jon/Harrison Biro): the previous version had this backwards,
    // treating the shucker as if THEY became the new solo Wolf, which
    // rewarded refusing a partnership instead of punishing it.
    smallSide = [wolfId];
    bigSide = otherIds;
  }

  return { wolfId, otherIds, smallSide, bigSide };
}

/**
 * Fully resolves ONE Wolf hole — sides, the engine call, and the two-pass
 * birdie + Add-A-Hammer multipliers — returning both the money result AND
 * the descriptive pieces (wolfId, partnerId, format, sides) needed to build
 * a human-readable narrative. This is the single shared source both
 * computeWolfRoundResult (money only) and getWolfHoleNarrative (display
 * text) are built on top of.
 */
export function resolveWolfHoleFromConfig({
  hole,
  activePlayers,
  wolfHoles,
  getFormat,
  course,
  scores,
  handicapMode,
  noPar3Strokes = false,
  betAmount,
  wolfStyle = WOLF_STYLES.HARRISON,
  settlementStyle = WOLF_SETTLEMENT_STYLES.PAIRWISE,
  birdieEnabled = false,
  addAHammerEnabled = false,
  addAHammerHammerHolesOnly = false,
  overrideWolfId = null, // used for Super Wolf holes 16-18 — Wolf isn't by rotation there
  shuckDoubles = true, // Setup toggle — some groups don't want the extra Shuck penalty
  hammerEnabled = true, // Setup toggle — "Hammer Rule." Confirmed real bug: the
  // engine previously read config.hammerMultiplier unconditionally, with
  // no awareness of whether Hammer Rule was even on. The toggle only ever
  // controlled whether the UI buttons were shown — a stale or leftover
  // hammer value in storage would still apply financially either way.
  // This gate is defense in depth: correct even if wolfHoles ever ends up
  // stale again for some other reason in the future.
}) {
  const config = { ...(wolfHoles?.[hole] || {}) };
  const format = getFormat(config);
  const { wolfId, smallSide, bigSide } = getWolfHoleSides(hole, activePlayers, config, format, overrideWolfId);

  const hammerMultiplier = hammerEnabled ? (Number(config.hammerMultiplier) || 1) : 1;
  const concededBy = hammerEnabled && config.hammerResolution === "rejected" ? config.concededBy : null;

  const provisional = resolveWolfHole({
    format, smallSide, bigSide, hole,
    players: activePlayers, course, scores, handicapMode,
    noPar3Strokes, betAmount, wolfStyle, settlementStyle,
    hammerMultiplier, concededBy, shuckDoubles,
  });
  if (!provisional) return { config, format, wolfId, smallSide, bigSide, hammerMultiplier, concededBy, resolved: null };

  let birdieMultiplier = 1;
  let addAHammerMultiplier = 1;
  let addAHammerTriggered = false;

  if (provisional.winner !== "push") {
    const winningSide = provisional.winner === "small" ? smallSide : bigSide;
    const losingSide = provisional.winner === "small" ? bigSide : smallSide;

    if (birdieEnabled) {
      birdieMultiplier = getWolfBirdieMultiplier(winningSide, hole, course, scores);
    }

    // Never applies on a hole that ended by Hammer rejection — no scores
    // were played to compare, so there's no sweep to detect.
    if (addAHammerEnabled && !concededBy) {
      const hammerHoleOk = !addAHammerHammerHolesOnly || hammerMultiplier > 1;
      if (hammerHoleOk && checkWolfCleanSweep(winningSide, losingSide, hole, activePlayers, course, scores, handicapMode, noPar3Strokes)) {
        addAHammerMultiplier = 2;
        addAHammerTriggered = true;
      }
    }
  }

  const resolved = (birdieMultiplier > 1 || addAHammerMultiplier > 1)
    ? resolveWolfHole({
        format, smallSide, bigSide, hole,
        players: activePlayers, course, scores, handicapMode,
        noPar3Strokes, betAmount, wolfStyle, settlementStyle,
        hammerMultiplier, concededBy, birdieMultiplier, addAHammerMultiplier, shuckDoubles,
      })
    : provisional;

  return { config, format, wolfId, smallSide, bigSide, hammerMultiplier, concededBy, birdieMultiplier, addAHammerMultiplier, addAHammerTriggered, resolved };
}

/**
 * Computes the effective bet amount for every Wolf hole (1-15), accounting
 * for Carryover on Push. Whether a hole is a push doesn't depend on the
 * bet amount at all — only the best-ball comparison — so this runs as its
 * own sequential pass, independent of dollar math, and both
 * computeWolfRoundResult and getWolfHoleNarrative look up their hole's
 * entry from it instead of each re-deriving carryover state separately.
 */
export function computeWolfCarryoverSchedule({
  activePlayers,
  wolfHoles,
  getFormat,
  course,
  scores,
  handicapMode,
  noPar3Strokes = false,
  betAmount,
  carryoverMode = WOLF_CARRYOVER_MODES.OFF,
  maxCarryover = null,
  hammerEnabled = true, // same gate as resolveWolfHoleFromConfig — a stale
  // conceded hole with Hammer Rule off should not affect push detection.
}) {
  const schedule = {};
  let state = { carriedAmount: 0, pushCount: 0 };

  for (let hole = 1; hole <= 15; hole++) {
    const config = { ...(wolfHoles?.[hole] || {}) };
    const format = getFormat(config);
    const { smallSide, bigSide } = getWolfHoleSides(hole, activePlayers, config, format);
    const hammerMultiplier = hammerEnabled ? (Number(config.hammerMultiplier) || 1) : 1;
    const concededBy = hammerEnabled && config.hammerResolution === "rejected" ? config.concededBy : null;

    let isPush = null; // null = not yet scored
    if (concededBy) {
      isPush = false;
    } else {
      const smallBest = getBestBallWinner(smallSide, hole, activePlayers, course, scores, handicapMode, null, noPar3Strokes);
      const bigBest = getBestBallWinner(bigSide, hole, activePlayers, course, scores, handicapMode, null, noPar3Strokes);
      if (smallBest && bigBest) isPush = smallBest.net === bigBest.net;
    }

    const carriedInAmount = state.carriedAmount;
    const carriedInCount = state.pushCount;

    schedule[hole] = {
      effectiveBetAmount: (Number(betAmount) || 0) + carriedInAmount,
      carriedInAmount,
      carriedInCount,
      isPush,
    };

    if (isPush === null) continue; // not scored yet — don't advance state for future holes

    const advanced = applyWolfCarryover(
      state,
      { isPush, holeBaseValue: Number(betAmount) || 0, holeHammerMultiplier: hammerMultiplier },
      { mode: carryoverMode, maxCarryover }
    );
    state = advanced.nextState;
  }

  return schedule;
}

export function computeWolfRoundResult({
  activePlayers,
  wolfHoles,
  getFormat,
  course,
  scores,
  handicapMode,
  noPar3Strokes = false,
  betAmount,
  wolfStyle = WOLF_STYLES.HARRISON,
  settlementStyle = WOLF_SETTLEMENT_STYLES.PAIRWISE,
  birdieEnabled = false,
  addAHammerEnabled = false,
  addAHammerHammerHolesOnly = false,
  carryoverMode = WOLF_CARRYOVER_MODES.OFF,
  maxCarryover = null,
  shuckDoubles = true, // Setup toggle — some groups don't want the extra Shuck penalty
  hammerEnabled = true, // Setup toggle — "Hammer Rule"
}) {
  if (!activePlayers || activePlayers.length !== 5) {
    return { balancesByPlayerId: {} };
  }

  const schedule = computeWolfCarryoverSchedule({
    activePlayers, wolfHoles, getFormat, course, scores, handicapMode,
    noPar3Strokes, betAmount, carryoverMode, maxCarryover, hammerEnabled,
  });

  const playerIds = activePlayers.map((p) => p.id);
  const holeResults = [];

  // Holes 1-15: standard rotation, carryover-adjusted bet amount.
  for (let hole = 1; hole <= 15; hole++) {
    const effectiveBetAmount = schedule[hole]?.effectiveBetAmount ?? betAmount;
    const { resolved } = resolveWolfHoleFromConfig({
      hole, activePlayers, wolfHoles, getFormat, course, scores, handicapMode,
      noPar3Strokes, betAmount: effectiveBetAmount, wolfStyle, settlementStyle, birdieEnabled,
      addAHammerEnabled, addAHammerHammerHolesOnly, shuckDoubles, hammerEnabled,
    });
    holeResults.push(resolved);
  }

  // Holes 16-18 (Super Wolf): Wolf is whoever's down the most on Wolf money
  // ONLY, recalculated fresh before each hole — never rotation. Bet amount
  // is whatever was set at that hole's tee box, not the round's base rate.
  for (let hole = 16; hole <= 18; hole++) {
    const standingsSoFar = computeWolfRoundBalances(holeResults, playerIds).balancesByPlayerId;
    const { superWolf } = getSuperWolfAssignment(standingsSoFar, playerIds);
    const config = wolfHoles?.[hole] || {};
    const superWolfBetAmount = config.superWolfBetAmount != null ? Number(config.superWolfBetAmount) : betAmount;

    const { resolved } = resolveWolfHoleFromConfig({
      hole, activePlayers, wolfHoles, getFormat, course, scores, handicapMode,
      noPar3Strokes, betAmount: superWolfBetAmount, wolfStyle, settlementStyle, birdieEnabled,
      addAHammerEnabled, addAHammerHammerHolesOnly, overrideWolfId: superWolf, shuckDoubles, hammerEnabled,
    });
    holeResults.push(resolved);
  }

  return computeWolfRoundBalances(holeResults, playerIds);
}

/**
 * Builds a human-readable summary of a single Wolf hole — used by BOTH the
 * Live screen's Hole Result card and the Results screen's Match Detail
 * view, so there's exactly one place that turns Wolf's raw config into
 * words, not two independent (and inevitably diverging) implementations.
 *
 * @returns {{lines: string[], resolved: object|null, format: string}}
 *   lines is empty if the hole hasn't been scored yet.
 */
export function getWolfHoleNarrative({
  hole,
  activePlayers,
  wolfHoles,
  getFormat,
  course,
  scores,
  handicapMode,
  noPar3Strokes = false,
  betAmount,
  wolfStyle = WOLF_STYLES.HARRISON,
  settlementStyle = WOLF_SETTLEMENT_STYLES.PAIRWISE,
  birdieEnabled = false,
  addAHammerEnabled = false,
  addAHammerHammerHolesOnly = false,
  carryoverMode = WOLF_CARRYOVER_MODES.OFF,
  maxCarryover = null,
  shuckDoubles = true, // Setup toggle — some groups don't want the extra Shuck penalty
  hammerEnabled = true, // Setup toggle — "Hammer Rule"
}) {
  const nameOf = (id) => activePlayers.find((p) => p.id === id)?.name || id;
  const playerIds = activePlayers.map((p) => p.id);
  const isSuperWolf = hole >= 16;

  const schedule = computeWolfCarryoverSchedule({
    activePlayers, wolfHoles, getFormat, course, scores, handicapMode,
    noPar3Strokes, betAmount, carryoverMode, maxCarryover, hammerEnabled,
  });

  let effectiveBetAmount, overrideWolfId = null, rankedStandings = null;

  if (isSuperWolf) {
    // Rebuild every prior hole (1..hole-1) to get the standings this hole's
    // Super Wolf assignment depends on — recalculated fresh each time, per
    // the confirmed rule, not just carried from a stale snapshot.
    const priorResults = [];
    for (let h = 1; h < 16; h++) {
      const eff = schedule[h]?.effectiveBetAmount ?? betAmount;
      const { resolved: r } = resolveWolfHoleFromConfig({
        hole: h, activePlayers, wolfHoles, getFormat, course, scores, handicapMode,
        noPar3Strokes, betAmount: eff, wolfStyle, settlementStyle, birdieEnabled,
        addAHammerEnabled, addAHammerHammerHolesOnly, shuckDoubles, hammerEnabled,
      });
      priorResults.push(r);
    }
    for (let h = 16; h < hole; h++) {
      const standingsSoFar = computeWolfRoundBalances(priorResults, playerIds).balancesByPlayerId;
      const { superWolf } = getSuperWolfAssignment(standingsSoFar, playerIds);
      const cfg = wolfHoles?.[h] || {};
      const amt = cfg.superWolfBetAmount != null ? Number(cfg.superWolfBetAmount) : betAmount;
      const { resolved: r } = resolveWolfHoleFromConfig({
        hole: h, activePlayers, wolfHoles, getFormat, course, scores, handicapMode,
        noPar3Strokes, betAmount: amt, wolfStyle, settlementStyle, birdieEnabled,
        addAHammerEnabled, addAHammerHammerHolesOnly, overrideWolfId: superWolf, shuckDoubles, hammerEnabled,
      });
      priorResults.push(r);
    }
    const standingsForThisHole = computeWolfRoundBalances(priorResults, playerIds).balancesByPlayerId;
    const assignment = getSuperWolfAssignment(standingsForThisHole, playerIds);
    overrideWolfId = assignment.superWolf;
    rankedStandings = assignment.ranked;
    const config = wolfHoles?.[hole] || {};
    effectiveBetAmount = config.superWolfBetAmount != null ? Number(config.superWolfBetAmount) : betAmount;
  } else {
    const scheduleEntry = schedule[hole] || {};
    effectiveBetAmount = scheduleEntry.effectiveBetAmount ?? betAmount;
  }

  const scheduleEntry = schedule[hole] || {};

  const { config, format, wolfId, smallSide, bigSide, hammerMultiplier, concededBy, addAHammerTriggered, resolved } =
    resolveWolfHoleFromConfig({
      hole, activePlayers, wolfHoles, getFormat, course, scores, handicapMode,
      noPar3Strokes, betAmount: effectiveBetAmount, wolfStyle, settlementStyle, birdieEnabled,
      addAHammerEnabled, addAHammerHammerHolesOnly, overrideWolfId, shuckDoubles, hammerEnabled,
    });

  if (!resolved) return { lines: [], resolved: null, format, isSuperWolf, rankedStandings, wolfId: overrideWolfId, effectiveBetAmount };

  const wolfName = nameOf(wolfId);
  const partnerName = config.partnerId ? nameOf(config.partnerId) : null;

  let formatLabel;
  if (format === "pack") formatLabel = `${wolfName} + ${partnerName} vs. the other 3`;
  else if (format === "shuck") formatLabel = `${wolfName} — shucked by ${partnerName}, alone vs. everyone`;
  else if (format === "blindWolf") formatLabel = `${wolfName} — Blind Wolf`;
  else if (format === "loneWolf") formatLabel = `${wolfName} — Lone Wolf`;
  else formatLabel = `${wolfName} — Solo Wolf`;
  if (isSuperWolf) formatLabel = `Super Wolf ($${effectiveBetAmount} bet) — ${formatLabel}`;

  const tags = [];
  if (hammerMultiplier > 1) tags.push(concededBy ? `Hammer ${hammerMultiplier}x, conceded` : `Hammer ${hammerMultiplier}x`);
  if (addAHammerTriggered) tags.push("Hammer Sweep 2x");

  const lines = [`${formatLabel}${tags.length ? ` (${tags.join(", ")})` : ""}`];

  if (resolved.winner === "push") {
    lines.push("Push — no money changes hands this hole.");
    if (!isSuperWolf && carryoverMode !== WOLF_CARRYOVER_MODES.OFF) {
      lines.push("Carries forward to the next hole.");
    }
  } else {
    if (!isSuperWolf && (scheduleEntry.carriedInCount || 0) > 0) {
      const n = scheduleEntry.carriedInCount;
      lines.push(`${n} carryover${n !== 1 ? "s" : ""} won — worth $${scheduleEntry.carriedInAmount.toFixed(2)} extra this hole.`);
    }
    const winningSide = resolved.winner === "small" ? smallSide : bigSide;
    const losingSide = resolved.winner === "small" ? bigSide : smallSide;
    const winnerNames = winningSide.map(nameOf).join(", ");
    lines.push(`${winnerNames} won the hole.`);
    [...winningSide, ...losingSide].forEach((id) => {
      const amount = resolved.deltas[id] || 0;
      const str = amount > 0 ? `+$${amount.toFixed(2)}` : amount < 0 ? `-$${Math.abs(amount).toFixed(2)}` : "$0.00";
      lines.push(`${nameOf(id)}: ${str}`);
    });
  }

  return { lines, resolved, format, wolfId, smallSide, bigSide, config, addAHammerTriggered, hammerMultiplier, concededBy, isSuperWolf, rankedStandings, effectiveBetAmount };
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

// ── SHARED BEST BALL DISPLAY FUNCTIONS ───────────────────────────────────────
// Single source of truth — imported by App.jsx and AuditTrail.jsx
// Parameter order: (..., getHandicapStrokesFn, noPar3Strokes)

export function formatScoreWithStrokeDots(playerId, hole, players, course, scores, handicapMode, getHandicapStrokesFn = null, noPar3Strokes = false) {
  const gross = getRawScore(scores, hole, playerId);
  if (gross === null || gross === undefined) return "-";
  const strokesFn = getHandicapStrokesFn || getHandicapStrokes;
  const par = course?.pars?.[hole - 1];
  const strokes = (noPar3Strokes && par === 3) ? 0 : strokesFn(playerId, hole, players, course, handicapMode, noPar3Strokes);
  return `${gross}${"•".repeat(strokes)}`;
}

export function getBestBallWinner(teamIds, hole, players, course, scores, handicapMode, getHandicapStrokesFn = null, noPar3Strokes = false) {
  const entries = (teamIds || [])
    .filter(Boolean)
    .map((playerId) => ({
      playerId,
      name: getPlayerById(players, playerId)?.name || playerId,
      gross: getRawScore(scores, hole, playerId),
      net: getNetScore(playerId, hole, players, course, scores, handicapMode, noPar3Strokes, getHandicapStrokesFn),
    }))
    .filter((e) => e.net !== null);

  if (!entries.length) return null;
  return entries.reduce((best, e) => (!best || e.net < best.net ? e : best), null);
}

export function getBestBallDisplay(teamIds, hole, players, course, scores, handicapMode, getHandicapStrokesFn = null, noPar3Strokes = false) {
  const best = getBestBallWinner(teamIds, hole, players, course, scores, handicapMode, getHandicapStrokesFn, noPar3Strokes);
  if (!best) return "-";
  const firstName = best.name.split(" ")[0];
  return `${firstName} ${formatScoreWithStrokeDots(best.playerId, hole, players, course, scores, handicapMode, getHandicapStrokesFn, noPar3Strokes)}`;
}
