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
  handicapMode
) {
  const raw = getRawScore(scores, hole, playerId);
  if (raw === null) return null;

  const strokes = getHandicapStrokes(
    playerId,
    hole,
    players,
    course,
    handicapMode
  );

  return raw - strokes;
}

export function isGrossBirdie(playerId, hole, course, scores) {
  const raw = getRawScore(scores, hole, playerId);
  if (raw === null) return false;
  const par = course.pars[hole - 1];
  return raw < par;
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
  handicapMode
) {
  const netScores = team
    .map((playerId) =>
      getNetScore(playerId, hole, players, course, scores, handicapMode)
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
  blitzEnabled = false
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
    netScore: getNetScore(playerId, hole, players, course, scores, handicapMode),
  }));

  const sorted = [...scoredPlayers].sort((a, b) => a.netScore - b.netScore);
  const [first, second, third] = sorted;

  const pointsByPlayerId = Object.fromEntries(
    playerIds.map((playerId) => [playerId, 0])
  );

  const netScoresByPlayerId = Object.fromEntries(
    scoredPlayers.map((entry) => [entry.playerId, entry.netScore])
  );

  const uniqueWinner = first.netScore < second.netScore;
  const blitzApplies =
    blitzEnabled &&
    uniqueWinner &&
    second.netScore - first.netScore >= 2 &&
    third.netScore - first.netScore >= 2;

  if (blitzApplies) {
    pointsByPlayerId[first.playerId] = 9;
    pointsByPlayerId[second.playerId] = 0;
    pointsByPlayerId[third.playerId] = 0;

    return {
      status: "complete",
      mode: "blitz",
      pointsByPlayerId,
      netScoresByPlayerId,
    };
  }

  if (first.netScore === second.netScore && second.netScore === third.netScore) {
    pointsByPlayerId[first.playerId] = 3;
    pointsByPlayerId[second.playerId] = 3;
    pointsByPlayerId[third.playerId] = 3;
  } else if (first.netScore === second.netScore) {
    pointsByPlayerId[first.playerId] = 4;
    pointsByPlayerId[second.playerId] = 4;
    pointsByPlayerId[third.playerId] = 1;
  } else if (second.netScore === third.netScore) {
    pointsByPlayerId[first.playerId] = 5;
    pointsByPlayerId[second.playerId] = 2;
    pointsByPlayerId[third.playerId] = 2;
  } else {
    pointsByPlayerId[first.playerId] = 5;
    pointsByPlayerId[second.playerId] = 3;
    pointsByPlayerId[third.playerId] = 1;
  }

  return {
    status: "complete",
    mode: "standard",
    pointsByPlayerId,
    netScoresByPlayerId,
  };
}

export function getNinePointPayout(totalsByPlayerId, dollarsPerPoint = 1) {
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
    first.points === second.points ||
    second.points === third.points ||
    first.points === third.points
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
      points: first.points - third.points,
      amount: (first.points - third.points) * dollarsPerPoint,
    },
    {
      fromPlayerId: third.playerId,
      toPlayerId: second.playerId,
      points: second.points - third.points,
      amount: (second.points - third.points) * dollarsPerPoint,
    },
    {
      fromPlayerId: second.playerId,
      toPlayerId: first.playerId,
      points: first.points - second.points,
      amount: (first.points - second.points) * dollarsPerPoint,
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
  dollarsPerPoint = 1,
  holeCount = 18
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
      blitzEnabled
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
}) {
  const aScore = getTeamNetScore(
    teamA,
    hole,
    players,
    course,
    scores,
    handicapMode
  );
  const bScore = getTeamNetScore(
    teamB,
    hole,
    players,
    course,
    scores,
    handicapMode
  );

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



function getBirdieCountType({
  teamA,
  teamB,
  hole,
  players,
  course,
  scores,
  handicapMode,
}) {
  if (false) {
    return "any";
  }

  const anyGross = [...teamA, ...teamB].some((playerId) =>
    isGrossBirdie(playerId, hole, course, scores)
  );

  return anyGross ? "gross" : "net";
}

export function getBirdieSideBetResult({
  teamA,
  teamB,
  start,
  end,
  context,
  birdieEnabled = true,
  birdieUnitAmountOverride = null,
}) {
  const {
    players,
    course,
    scores,
    handicapMode,
    birdieUnitAmount,
  } = context;

  if (!birdieEnabled) {
    return {
      enabled: false,
      units: 0,
      dollars: 0,
      holes: [],
    };
  }

  const holes = [];
  let totalUnits = 0;

  for (let hole = start; hole <= end; hole++) {
    const rawReadyA = teamA.every(
      (playerId) => getRawScore(scores, hole, playerId) !== null
    );
    const rawReadyB = teamB.every(
      (playerId) => getRawScore(scores, hole, playerId) !== null
    );

    if (!rawReadyA || !rawReadyB) {
      continue;
    }

    const countType = getBirdieCountType({
      teamA,
      teamB,
      hole,
      players,
      course,
      scores,
      handicapMode,
    });

    let countA = 0;
    let countB = 0;
    let teamAPlayers = [];
    let teamBPlayers = [];

    if (countType === "any") {
      teamAPlayers = teamA.filter((playerId) => {
        return (
          isGrossBirdie(playerId, hole, course, scores) ||
          isNetBirdie(playerId, hole, players, course, scores, handicapMode)
        );
      });

      teamBPlayers = teamB.filter((playerId) => {
        return (
          isGrossBirdie(playerId, hole, course, scores) ||
          isNetBirdie(playerId, hole, players, course, scores, handicapMode)
        );
      });

      countA = teamAPlayers.length;
      countB = teamBPlayers.length;
    } else {
      teamAPlayers = teamA.filter((playerId) => {
        if (countType === "gross") {
          return isGrossBirdie(playerId, hole, course, scores);
        }

        if (countType === "net") {
          return isNetBirdie(
            playerId,
            hole,
            players,
            course,
            scores,
            handicapMode
          );
        }

        return false;
      });

      teamBPlayers = teamB.filter((playerId) => {
        if (countType === "gross") {
          return isGrossBirdie(playerId, hole, course, scores);
        }

        if (countType === "net") {
          return isNetBirdie(
            playerId,
            hole,
            players,
            course,
            scores,
            handicapMode
          );
        }

        return false;
      });

      countA = teamAPlayers.length;
      countB = teamBPlayers.length;
    }

    const net = countA - countB;
    totalUnits += net;

    holes.push({
      hole,
      countA,
      countB,
      net,
      countType,
      teamAPlayers,
      teamBPlayers,
    });
  }

  return {
    enabled: true,
    units: totalUnits,
    dollars: totalUnits * (birdieUnitAmountOverride ?? birdieUnitAmount ?? 0),
    holes,
  };
}

export function getNinePointBirdieSummary(
  playerIds,
  players,
  course,
  scores,
  handicapMode,
  birdieEnabled,
  birdieUnitAmount = 1
) {
  if (!birdieEnabled || !Array.isArray(playerIds) || playerIds.length !== 3) {
    return {
      enabled: !!birdieEnabled,
      countsByPlayerId: Object.fromEntries((playerIds || []).map((id) => [id, 0])),
      birdieHolesByPlayerId: Object.fromEntries((playerIds || []).map((id) => [id, []])),
      payout: {
        status: "inactive",
        balancesByPlayerId: Object.fromEntries((playerIds || []).map((id) => [id, 0])),
        transactions: [],
      },
    };
  }

  const countsByPlayerId = Object.fromEntries(playerIds.map((id) => [id, 0]));
  const birdieHolesByPlayerId = Object.fromEntries(playerIds.map((id) => [id, []]));

  for (let hole = 1; hole <= 18; hole += 1) {
    playerIds.forEach((playerId) => {
      if (isNetBirdie(playerId, hole, players, course, scores, handicapMode)) {
        countsByPlayerId[playerId] += 1;
        birdieHolesByPlayerId[playerId].push(hole);
      }
    });
  }

  const payout = getNinePointPayout(countsByPlayerId, birdieUnitAmount);

  return {
    enabled: true,
    countsByPlayerId,
    birdieHolesByPlayerId,
    payout,
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
if (match.gameType === "ninePoint") {
  const playerIds = [match.p1Id, match.p2Id, match.p3Id].filter(Boolean);

  const result = getNinePointMatchSummary(
    playerIds,
    players,
    course,
    scores,
    handicapMode,
    Boolean(match.blitzEnabled),
    Number(match.bet || 1),
    18
  );

  const birdieSummary = getNinePointBirdieSummary(
    playerIds,
    players,
    course,
    scores,
    handicapMode,
    !!match.birdieEnabled,
    Number(match.birdieBet || 1)
  );

  return {
    ...result,
    birdieSummary,
  };
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

const birdieSummary = getBirdieSideBetResult({
  teamA: [match.p1Id],
  teamB: [match.p2Id],
  start: 1,
  end: 18,
  context,
  birdieEnabled: !!match.birdieEnabled,
  birdieUnitAmountOverride: match.birdieBet,
});

  if (match.type === "standard") {
  const segment = decideMatchPlaySegment(holes, 1, 18);

  return {
    type: "standard",
    holes,
    units: running,
    total: running * match.bet,
    label: segment.label,
    decidedOn: segment.decidedOn,
    birdieSummary,
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
      birdieSummary,
    };
  }

  if (match.type === "match_fbt") {
    const front = decideMatchPlaySegment(holes, 1, 9);
    const back = decideMatchPlaySegment(holes, 10, 18);
    const totalSeg = decideMatchPlaySegment(holes, 1, 18);

    const segments = [
      {
        key: "front",
        label: "Front 9",
        units: front.units,
        dollars: front.units * match.bet,
        resultLabel: front.label,
        decidedOn: front.decidedOn,
      },
      {
        key: "back",
        label: "Back 9",
        units: back.units,
        dollars: back.units * match.bet,
        resultLabel: back.label,
        decidedOn: back.decidedOn,
      },
      {
        key: "total",
        label: "Total 18",
        units: totalSeg.units,
        dollars: totalSeg.units * match.bet,
        resultLabel: totalSeg.label,
        decidedOn: totalSeg.decidedOn,
      },
    ];

    return {
      type: "match_fbt",
      holes,
      segments,
      total: segments.reduce((sum, seg) => sum + seg.dollars, 0),
      birdieSummary,
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
  birdieSummary,
};
  }

  return {
    type: match.type,
    holes,
    total: running * match.bet,
    birdieSummary,
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

export function buildLeaderboard(matches, context) {
  const board = {};
  context.players.forEach((p) => {
    board[p.id] = 0;
  });

  for (const match of matches) {
    const result = playIndividualMatch(match, context);
    board[match.p1Id] -= result.total / 2;
    board[match.p2Id] += result.total / 2;
  }

  return board;
}
export function scoreRound(round, context = {}) {
    const {
  players = [],
  matchResults = [],
  teamGameResults = [],
  teamGameUnitAmount = 1,
} = context;

  const ledgerMap = {};

  players.forEach((player) => {
    ledgerMap[player.id] = {
      playerId: player.id,
      mainGame: 0,
      sideMatches: 0,
      birdies: 0,
      total: 0,
    };
  });

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
  }

  if (ledgerMap[match.p2Id]) {
    ledgerMap[match.p2Id].sideMatches -= result.total;
    ledgerMap[match.p2Id].total -= result.total;
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
    });

    teamBPlayers.forEach((playerId) => {
      if (!ledgerMap[playerId]) return;
      ledgerMap[playerId].mainGame -= dollars;
      ledgerMap[playerId].total -= dollars;
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
