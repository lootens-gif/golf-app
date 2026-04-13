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

function getStrokeValueForHole(
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

function countBirdiesForTeam({
  team,
  hole,
  players,
  course,
  scores,
  handicapMode,
  countType,
}) {
  return team.reduce((sum, playerId) => {
    const qualifies =
      countType === "gross"
        ? isGrossBirdie(playerId, hole, course, scores)
        : isNetBirdie(playerId, hole, players, course, scores, handicapMode);

    return sum + (qualifies ? 1 : 0);
  }, 0);
}

function getBirdieCountType({
  teamA,
  teamB,
  hole,
  players,
  course,
  scores,
  handicapMode,
  grossBirdieAdvantage,
}) {
  if (!grossBirdieAdvantage) {
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
  grossBirdieAdvantageOverride = null,
  birdieUnitAmountOverride = null,
}) {
  const {
    players,
    course,
    scores,
    handicapMode,
    grossBirdieAdvantage,
    birdieMode,
    birdieUnitAmount,
  } = context;

  if (!birdieEnabled || birdieMode === "off") {
    return {
      enabled: false,
      units: 0,
      dollars: 0,
      holes: [],
    };
  }

  const effectiveGrossBirdieAdvantage =
    grossBirdieAdvantageOverride === null
      ? grossBirdieAdvantage
      : grossBirdieAdvantageOverride;

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
      grossBirdieAdvantage: effectiveGrossBirdieAdvantage,
    });

    let countA = 0;
    let countB = 0;

    if (countType === "any") {
      countA = teamA.reduce((sum, playerId) => {
        const qualifies =
          isGrossBirdie(playerId, hole, course, scores) ||
          isNetBirdie(playerId, hole, players, course, scores, handicapMode);
        return sum + (qualifies ? 1 : 0);
      }, 0);

      countB = teamB.reduce((sum, playerId) => {
        const qualifies =
          isGrossBirdie(playerId, hole, course, scores) ||
          isNetBirdie(playerId, hole, players, course, scores, handicapMode);
        return sum + (qualifies ? 1 : 0);
      }, 0);
    } else {
      countA = countBirdiesForTeam({
        team: teamA,
        hole,
        players,
        course,
        scores,
        handicapMode,
        countType,
      });

      countB = countBirdiesForTeam({
        team: teamB,
        hole,
        players,
        course,
        scores,
        handicapMode,
        countType,
      });
    }

    const net = countA - countB;
    totalUnits += net;

    holes.push({
      hole,
      countA,
      countB,
      net,
      countType,
    });
  }

  return {
    enabled: true,
    units: totalUnits,
    dollars: totalUnits * (birdieUnitAmountOverride ?? birdieUnitAmount ?? 0),
    holes,
  };
}

export function playIndividualMatch(match, context) {
  const {
    players,
    course,
    scores,
    handicapMode,
  } = context;

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
  grossBirdieAdvantageOverride:
    typeof match.matchGrossBirdieAdvantage === "boolean"
      ? match.matchGrossBirdieAdvantage
      : null,
  birdieUnitAmountOverride: match.birdieBet,
});

  if (match.type === "standard") {
    const segment = decideMatchPlaySegment(holes, 1, 18);

    return {
      type: "standard",
      holes,
      units: segment.units,
      total: segment.units * match.bet,
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
      holes,
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
      players: context.players.filter(p => [...teamA, ...teamB].includes(p.id)),
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