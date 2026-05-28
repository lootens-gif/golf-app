import React, { useState } from "react";
import {
  computeHoleResult,
  getHandicapStrokes,
  getNetScore,
  getRawScore,
  isGrossBirdie,
  isNetBirdie,
} from "../engine/scoringEngine";

const scorecardCellStyle = {
  border: "1px solid #e5e7eb",
  padding: "5px 3px",
  textAlign: "center",
  minWidth: 36,
  fontSize: 11,
  whiteSpace: "nowrap",
  color: "#1a1a1a",
};

const scorecardLabelCellStyle = {
  ...scorecardCellStyle,
  position: "sticky",
  left: 0,
  background: "#fff",
  zIndex: 1,
  textAlign: "left",
  minWidth: 80,
  fontWeight: 700,
  borderRight: "2px solid #e5e7eb",
};



function isNinePointMatch(match) {
  return (
    match?.gameType === "ninePoint" ||
    match?.gameType === "9_point" ||
    match?.type === "ninePoint" ||
    match?.type === "9_point"
  );
}

function formatMoney(value) {
  const amount = Number(value || 0);
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${sign}$${Math.abs(amount)}`;
}





function getOneVOneMoneyLabel(result, p1Name, p2Name) {
  const total = Number(result?.total || 0);

  if (total > 0) return `${p1Name} ${formatMoney(total)}`;
  if (total < 0) return `${p2Name} ${formatMoney(Math.abs(total))}`;
  return "No payout";
}



function getPlayerName(players, playerId) {
  const player = players.find((p) => p.id === playerId);
  return player?.name || playerId;
}

function getTeamName(players, ids = []) {
  const names = ids.filter(Boolean).map((id) => getPlayerName(players, id));
  return names.length ? names.join(" / ") : "-";
}

function formatScoreWithStrokeDots(playerId, hole, players, course, scores, handicapMode, noPar3Strokes = false, getHandicapStrokesFn) {
  const gross = getRawScore(scores, hole, playerId);

  if (gross === null || gross === undefined) {
    return "-";
  }

  const strokesFn = getHandicapStrokesFn || getHandicapStrokes;
  // noPar3Strokes handled here, not in strokesFn (spread fn doesn't accept it)
  const par = course?.pars?.[hole - 1];
  const strokes = (noPar3Strokes && par === 3) ? 0 : strokesFn(playerId, hole, players, course, handicapMode);
  return `${gross}${"•".repeat(strokes)}`;
}

function getBestBallDisplay(teamIds, hole, players, course, scores, handicapMode, noPar3Strokes = false, getHandicapStrokesFn) {
  const best = getBestBallWinner(teamIds, hole, players, course, scores, handicapMode, getHandicapStrokesFn);

  if (!best) {
    return "-";
  }

  return `${best.name} ${formatScoreWithStrokeDots(
    best.playerId,
    hole,
    players,
    course,
    scores,
    handicapMode,
    noPar3Strokes
    getHandicapStrokesFn

  )}`;
}

function getTeamAbbrev(teamName = "") {
  return String(teamName)
    .split(" / ")
    .filter(Boolean)
    .map((name) => name.trim()[0])
    .join("/");
}

function formatTeamHoleResult(result, teamAName, teamBName) {
  if (result > 0) return getTeamAbbrev(teamAName);
  if (result < 0) return getTeamAbbrev(teamBName);
  if (result === 0) return "Push";
  return "-";
}

function formatRunningUnits(value) {
  const units = Number(value || 0);

  if (units > 0) return `+${units}`;
  if (units < 0) return `${units}`;
  return "Even";
}

function getBetStatusesForHole(bets = [], hole) {
  return bets
    .filter((bet) => {
      const startHole = Number(bet.startHole || 0);

      // Include bets active on this hole, plus a newly-created press
      // that starts on the next hole so the scorecard shows the trailing 0.
      return startHole && hole >= startHole - 1;
    })
    .map((bet) => {
      const startHole = Number(bet.startHole || 0);

      if (hole < startHole) {
        return 0;
      }

      const resultsThroughHole = (bet.history || []).slice(
        0,
        hole - startHole + 1
      );

      return resultsThroughHole.reduce(
        (sum, value) => sum + Number(value || 0),
        0
      );
    });
}

function getNetActiveBetCountForHole(bets = [], hole) {
  return getBetStatusesForHole(bets, hole).reduce((total, status) => {
    if (status > 0) return total + 1;
    if (status < 0) return total - 1;
    return total;
  }, 0);
}

function formatPressDetail(statuses = []) {
  if (!statuses.length) return "-";
  return statuses.map((status) => String(Number(status || 0))).join("/");
}

function TeamGameScorecard({
  game,
  matchup,
  gameIndex,
  matchupIndex,
  teamA,
  teamB,
  teamAName,
  teamBName,
  players,
  course,
  scores,
  handicapMode,
  showPressDetail = false,
  noPar3Strokes = false,
  getHandicapStrokesFn,
}) {
  const holes = Array.from(
    { length: Number(game.end || 0) - Number(game.start || 0) + 1 },
    (_, i) => Number(game.start) + i
  );

  const teamABirdies = teamA.filter(Boolean).reduce((count, playerId) =>
    count + holes.filter(h => isGrossBirdie(scores, course, h, playerId)).length, 0);
  const teamBBirdies = teamB.filter(Boolean).reduce((count, playerId) =>
    count + holes.filter(h => isGrossBirdie(scores, course, h, playerId)).length, 0);

  const rows = holes.map((hole) => {
    const holeResult = computeHoleResult({
      hole,
      teamA,
      teamB,
      players,
      course,
      scores,
      handicapMode,
      noPar3Strokes,
      getHandicapStrokesFn,
    });
    const statuses = getBetStatusesForHole(matchup?.result || [], hole);
    const runningValue = getNetActiveBetCountForHole(matchup?.result || [], hole);

    return {
      hole,
      teamAValue: getBestBallDisplay(teamA, hole, players, course, scores, handicapMode, noPar3Strokes, getHandicapStrokesFn),
      teamBValue: getBestBallDisplay(teamB, hole, players, course, scores, handicapMode, noPar3Strokes, getHandicapStrokesFn),
      result: formatTeamHoleResult(holeResult, teamAName, teamBName),
      running: formatRunningUnits(runningValue),
      pressDetail: formatPressDetail(statuses),
      resultValue: holeResult,
      runningValue,
    };
  });

  const scorecardCellStyle = {
    border: "1px solid #e5e7eb",
    padding: "5px 3px",
    textAlign: "center",
    minWidth: 48,
    fontSize: 11,
    whiteSpace: "nowrap",
    color: "#1a1a1a",
  };

  const scorecardLabelCellStyle = {
    ...scorecardCellStyle,
    position: "sticky",
    left: 0,
    background: "#fff",
    zIndex: 1,
    textAlign: "left",
    minWidth: 90,
    fontWeight: 700,
    borderRight: "2px solid #e5e7eb",
  };

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        marginBottom: 10,
        overflowX: "auto",
      }}
    >
      <div style={{ padding: "10px 12px", fontSize: 13, background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
        <strong style={{ color: "#1a5c35" }}>Scorecard View</strong>
        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
          Gross score shown. Dot means stroke received on that hole.
        </div>
      </div>

      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <table style={{ borderCollapse: "collapse", minWidth: 500 }}>
        <tbody>
          <tr>
            <td style={scorecardLabelCellStyle}>Hole</td>
            {rows.map((row) => (
              <td key={`hole-${gameIndex}-${matchupIndex}-${row.hole}`} style={{ ...scorecardCellStyle, color: "#444" }}>
                {row.hole}
              </td>
            ))}
          </tr>

          <tr>
            <td style={scorecardLabelCellStyle}>{teamAName}</td>
            {rows.map((row) => {
              const teamAHasBirdie = game.birdieEnabled && teamA.filter(Boolean).some(id =>
                isGrossBirdie(scores, course, row.hole, id)
              );
              return (
                <td key={`team-a-${gameIndex}-${matchupIndex}-${row.hole}`} style={{ ...scorecardCellStyle, background: teamAHasBirdie ? "#fef9c3" : "transparent", color: "#1a1a1a" }}>
                  {row.teamAValue}
                </td>
              );
            })}
          </tr>

          <tr>
            <td style={scorecardLabelCellStyle}>{teamBName}</td>
            {rows.map((row) => {
              const teamBHasBirdie = game.birdieEnabled && teamB.filter(Boolean).some(id =>
                isGrossBirdie(scores, course, row.hole, id)
              );
              return (
                <td key={`team-b-${gameIndex}-${matchupIndex}-${row.hole}`} style={{ ...scorecardCellStyle, background: teamBHasBirdie ? "#fef9c3" : "transparent", color: "#1a1a1a" }}>
                  {row.teamBValue}
                </td>
              );
            })}
          </tr>

          <tr>
            <td style={scorecardLabelCellStyle}>Result</td>
            {rows.map((row) => (
              <td
                key={`result-${gameIndex}-${matchupIndex}-${row.hole}`}
                style={{
                  ...scorecardCellStyle,
                  background:
                    row.resultValue > 0
                      ? "#e6f4ea"
                      : row.resultValue < 0
                        ? "#fde8e8"
                        : "#f3f4f6",
                  fontWeight: 700,
                }}
              >
                {row.result}
              </td>
            ))}
          </tr>

          <tr>
            <td style={scorecardLabelCellStyle}>Running</td>
            {rows.map((row) => (
              <td
                key={`running-${gameIndex}-${matchupIndex}-${row.hole}`}
                style={{
                  ...scorecardCellStyle,
                  color:
                    row.runningValue > 0
                      ? "#137333"
                      : row.runningValue < 0
                        ? "#b3261e"
                        : "#555",
                  fontWeight: 700,
                }}
              >
                {row.running}
              </td>
            ))}
          </tr>

          {showPressDetail && (
            <tr>
              <td style={scorecardLabelCellStyle}>Press Detail</td>
              {rows.map((row) => (
                <td key={`press-${gameIndex}-${matchupIndex}-${row.hole}`} style={{ ...scorecardCellStyle, color: "#444" }}>
                  {row.pressDetail}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
      </div>

      <div style={{ fontSize: 12, color: "#555", padding: "6px 8px", borderTop: "1px solid #eee" }}>
        {!game.birdieEnabled
          ? "🚫 No birdies tracked"
          : (() => {
              const label = game.toyRule
                ? "🐦 Toy Birdies"
                : "🐦 Birdies tracked (gross only)";
              const summary =
                teamABirdies === 0 && teamBBirdies === 0
                  ? "No birdies"
                  : teamABirdies === teamBBirdies
                  ? `Birdies tied (${teamABirdies} each)`
                  : teamABirdies > teamBBirdies
                  ? `${teamAName} wins birdies +${teamABirdies - teamBBirdies}`
                  : `${teamBName} wins birdies +${teamBBirdies - teamABirdies}`;
              return `${label} — ${summary}`;
            })()}
      </div>
    </div>
  );
}

function getBestBallWinner(teamIds, hole, players, course, scores, handicapMode, getHandicapStrokesFn) {
  const entries = (teamIds || [])
    .filter(Boolean)
    .map((playerId) => ({
      playerId,
      name: getPlayerName(players, playerId),
      gross: getRawScore(scores, hole, playerId),
      net: getNetScore(playerId, hole, players, course, scores, handicapMode, false, getHandicapStrokesFn),
    }))
    .filter((entry) => entry.net !== null);

  if (!entries.length) return null;

  return entries.reduce((best, entry) => {
    if (!best) return entry;
    return entry.net < best.net ? entry : best;
  }, null);
}

function parseTeamKeys(label = "") {
  const parts = String(label).split(" ");
  return {
    teamAKey: `team${parts[1] || ""}`.toLowerCase(),
    teamBKey: `team${parts[4] || ""}`.toLowerCase(),
  };
}

function AuditSection({ title, children, defaultOpen = false }) {
  const storageKey = `scorecard-section:${title}`;

  const [open, setOpen] = useState(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);

      if (saved === "open") return true;
      if (saved === "closed") return false;
    } catch {
      // ignore localStorage issues
    }

    return defaultOpen;
  });

  const toggleOpen = () => {
    setOpen((current) => {
      const next = !current;

      try {
        window.localStorage.setItem(storageKey, next ? "open" : "closed");
      } catch {
        // ignore localStorage issues
      }

      return next;
    });
  };

  return (
    <div style={{ border: "1px solid #d1d5db", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
      <button
        type="button"
        onClick={toggleOpen}
        style={{
          width: "100%",
          padding: "11px 14px",
          textAlign: "left",
          background: open ? "#1a5c35" : "#f9fafb",
          color: open ? "#fff" : "#1a1a1a",
          border: 0,
          fontWeight: 600,
          fontSize: 14,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "inherit",
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: 12, opacity: 0.7 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && <div style={{ padding: 12, background: "#fff" }}>{children}</div>}
    </div>
  );
}



function OneVOneAudit({ players, matches, matchResults, birdieResults, scores, course, handicapMode }) {
  const sideMatchEntries = (matchResults || []).filter((entry) => !isNinePointMatch(entry.match));

  if (!sideMatchEntries.length) return null;

  return (
    <AuditSection title="1v1 Matches"defaultOpen>
      {sideMatchEntries.map((entry) => {
        const match = entry.match;
        const result = entry.result || {};
        const p1Name = getPlayerName(players, match.p1Id);
        const p2Name = getPlayerName(players, match.p2Id);

        // Money — always show "if ended now"
        const moneyStr = getOneVOneMoneyLabel(result, p1Name, p2Name);

        const total = Number(result?.total || 0);
        const headerColor = total > 0 ? "#1a5c35" : total < 0 ? "#b3261e" : "#6b7280";
        const oneVOneTitle = (
          <span>
            <span style={{ fontWeight: 700, color: "#1a1a1a" }}>{p1Name} vs {p2Name}</span>
            <span style={{ color: headerColor, marginLeft: 10, fontSize: 13 }}>{moneyStr}</span>
          </span>
        );

        return (
         <AuditSection
  key={match.id}
title={oneVOneTitle}          >
  <OneVOneScorecard
    match={match}
    result={result}
    players={players}
    scores={scores}
    course={course}
    handicapMode={handicapMode}
  />

  
          </AuditSection>
        );
      })}
    </AuditSection>
  );
}

function NinePointScorecard({
  players,
  result,
  scores,
  course,
  handicapMode,
  match,
  teamGameUnitAmount,
}) {
  const holes = result?.holes || [];
  if (!holes.length) return null;

  const front = holes.slice(0, 9);
  const back = holes.slice(9, 18);
  const toyRule = !!match?.toyRule;
  const betAmt = Number(match?.bet) || Number(teamGameUnitAmount) || 1;
  const allHoleNums = holes.map(h => h.hole);

  // Count gross birdies per player for summary
  const birdieCounts = Object.fromEntries(
    players.map(p => [
      p.id,
      allHoleNums.filter(h => isGrossBirdie(scores, course, h, p.id)).length
    ])
  );




  // First initial only for points rows
  const initial = (p) => p.name.trim()[0]?.toUpperCase() || "?";

  // Truncate name for score rows
  const shortName = (name) => name.length > 10 ? name.slice(0, 9) + "…" : name;

  // Point color
  const ptColor = (pts, played) => {
    if (!played) return { bg: "transparent", color: "#ccc" };
    if (pts >= 5) return { bg: "#dcfce7", color: "#137333" }; // 1st - green
    if (pts >= 3) return { bg: "#fef9c3", color: "#92400e" }; // 2nd - gold
    return { bg: "#fef2f2", color: "#b3261e" }; // 3rd/last - red
  };

  const renderSection = (label, sectionHoles) => {
    // Compute section net $ for each player (running total at end of section)
    const sectionNetPts = Object.fromEntries(players.map(p => {
      const lastPlayed = [...sectionHoles].reverse().find(h => {
        const s = scores?.[h.hole]?.[p.id];
        return s != null && Number.isFinite(Number(s));
      });
      return [p.id, lastPlayed?.runningTotalsByPlayerId?.[p.id] ?? null];
    }));
    // Avg pts per player per 9 = 3pts/hole × 9 holes ÷ 3 players = 9 (each player "paid in" 3pts/hole)
    const ptsPerPlayerPer9 = 3 * sectionHoles.length; // 3 pts average per hole
    const sectionAvg = ptsPerPlayerPer9;

    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
            <tbody>
              {/* Hole header */}
              <tr>
                <td style={{ ...scorecardLabelCellStyle, fontSize: 12 }}>Hole</td>
                {sectionHoles.map((h) => (
                  <td key={h.hole} style={{ ...scorecardCellStyle, fontSize: 12, color: "#6b7280" }}>{h.hole}</td>
                ))}
              </tr>

              {/* POINTS SECTION HEADER */}
              <tr>
                <td colSpan={sectionHoles.length + 1} style={{ padding: "6px 4px 2px", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", borderTop: "2px solid #e5e7eb" }}>
                  Points {betAmt !== 1 ? `($${betAmt})` : ""}
                </td>
              </tr>

              {/* POINTS ROWS — initial + net $ + hole values */}
              {players.map((player) => {
                const rawNet = sectionNetPts[player.id] !== null
                  ? (sectionNetPts[player.id] - sectionAvg) * betAmt
                  : null;
                const netAmt = rawNet !== null ? Math.round(rawNet * 100) / 100 : null;
                const fmtAmt = (v) => Number.isInteger(v) ? String(v) : v.toFixed(2);
                const netStr = netAmt === null ? "–" : netAmt > 0 ? `+$${fmtAmt(netAmt)}` : netAmt < 0 ? `-$${fmtAmt(Math.abs(netAmt))}` : "Even";
                const netColor = netAmt === null ? "#ccc" : netAmt > 0 ? "#137333" : netAmt < 0 ? "#b3261e" : "#6b7280";

                return (
                  <tr key={`pts-${player.id}`}>
                    <td style={{ ...scorecardLabelCellStyle, padding: "3px 4px" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{initial(player)}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: netColor, marginLeft: 6 }}>{netStr}</span>
                    </td>
                    {sectionHoles.map((h) => {
                      const hasScore = players.some(p => {
                        const s = scores?.[h.hole]?.[p.id];
                        return s != null && Number.isFinite(Number(s));
                      });
                      if (!hasScore) return <td key={h.hole} style={{ ...scorecardCellStyle, color: "#e5e7eb", fontSize: 13 }}>–</td>;

                      const pts = h.pointsByPlayerId?.[player.id] ?? 0;
                      const dollarVal = pts * betAmt;
                      const { bg, color } = ptColor(pts, hasScore);
                      return (
                        <td key={h.hole} style={{ ...scorecardCellStyle, background: bg, fontSize: 13, color: color, fontWeight: 700 }}>
                          {hasScore ? (dollarVal > 0 ? dollarVal : "0") : "–"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* SCORES SECTION HEADER */}
              <tr>
                <td colSpan={sectionHoles.length + 1} style={{ padding: "6px 4px 2px", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", borderTop: "2px solid #e5e7eb" }}>
                  Scores
                </td>
              </tr>

              {/* SCORE ROWS */}
              {players.map((player) => (
                <tr key={`score-${player.id}`}>
                  <td style={{ ...scorecardLabelCellStyle, fontSize: 12, color: "#6b7280" }}>{shortName(player.name)}</td>
                  {sectionHoles.map((h) => {
                    const gross = getRawScore(scores, h.hole, player.id);
                    const strokes = getHandicapStrokes(player.id, h.hole, players, course, handicapMode, !!match?.noPar3Strokes);
                    const display = gross != null ? `${gross}${"•".repeat(strokes)}` : "–";
                    const grossBirdie = match?.birdieEnabled && isGrossBirdie(scores, course, h.hole, player.id);
                    const netBirdie = match?.birdieEnabled && toyRule && !grossBirdie && isNetBirdie(player.id, h.hole, players, course, scores, handicapMode, !!match?.noPar3Strokes);
                    return (
                      <td key={h.hole} style={{ ...scorecardCellStyle, fontSize: 12, color: "#444" }}>
                        {grossBirdie ? (
                          <span style={{ display: "inline-block", width: 20, height: 20, lineHeight: "20px", borderRadius: "50%", border: "2px solid #137333", color: "#137333", fontWeight: 700, fontSize: 11 }}>
                            {display}
                          </span>
                        ) : netBirdie ? (
                          <span style={{ display: "inline-block", width: 20, height: 20, lineHeight: "20px", borderRadius: "50%", border: "2px dashed #1a73e8", color: "#1a73e8", fontWeight: 700, fontSize: 11 }}>
                            {display}
                          </span>
                        ) : display}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div style={{ marginTop: 8 }}>
      {renderSection("Front 9", front)}
      {renderSection("Back 9", back)}
      <div style={{ fontSize: 12, color: "#555", marginTop: 4, paddingLeft: 2 }}>
        {!match?.birdieEnabled
          ? "🚫 No birdies tracked"
          : (() => {
              const label = toyRule ? "🐦 Toy Birdies" : "🐦 Birdies tracked (gross only)";
              const counts = players.map(p => ({ name: p.name, count: birdieCounts[p.id] || 0 }));
              const total = counts.reduce((sum, p) => sum + p.count, 0);
              if (total === 0) return `${label} — No birdies`;
              const max = Math.max(...counts.map(p => p.count));
              const leaders = counts.filter(p => p.count === max);
              if (leaders.length === counts.length) return `${label} — Birdies tied (${max} each)`;
              const leader = leaders[0];
              const others = counts.filter(p => p.count !== max);
              return `${label} — ${leader.name} wins birdies: ${others.map(o => `+${leader.count - o.count} over ${o.name}`).join(", ")}`;
            })()}
      </div>
    </div>
  );
}

function OneVOneScorecard({ match, players, scores, course, handicapMode, result }) {
  const playerA = players.find((p) => p.id === match.p1Id);
  const playerB = players.find((p) => p.id === match.p2Id);

  if (!playerA || !playerB) return null;

  const matchPlayers = [playerA, playerB];
  const isLongShort = match.type === "longshort";
  const longClosedOn = result?.longDecidedOn || null;



  const holes = Array.from({ length: 18 }, (_, i) => i + 1);
  const front = holes.slice(0, 9);
  const back = holes.slice(9, 18);
  const toyRule = !!match.toyRule;

  // Pre-compute hole results and running totals for all 18 holes
  let longRunning = 0;
  let shortRunning = 0;

  const holeData = holes.map((hole) => {
    const res = computeHoleResult({
      hole,
      teamA: [playerA.id],
      teamB: [playerB.id],
      players: matchPlayers,
      course,
      scores,
      handicapMode,
    });

    if (isLongShort) {
      if (longClosedOn === null || hole <= longClosedOn) {
        // Still in Long
        if (res > 0) longRunning += 1;
        if (res < 0) longRunning -= 1;
        return { hole, res, running: longRunning, segment: "Long" };
      } else {
        // In Short
        if (res > 0) shortRunning += 1;
        if (res < 0) shortRunning -= 1;
        return { hole, res, running: shortRunning, segment: "Short" };
      }
    } else {
      if (res > 0) longRunning += 1;
      if (res < 0) longRunning -= 1;
      return { hole, res, running: longRunning, segment: null };
    }
  });

  // Count gross birdies per player for summary
  const birdieCounts = {
    [playerA.id]: holes.filter(h => isGrossBirdie(scores, course, h, playerA.id)).length,
    [playerB.id]: holes.filter(h => isGrossBirdie(scores, course, h, playerB.id)).length,
  };

  const renderSection = (label, sectionHoles) => {
    const sectionData = holeData.filter(d => sectionHoles.includes(d.hole));

    return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <table style={{ borderCollapse: "collapse", minWidth: 500 }}>
        <tbody>
          <tr>
            <td style={scorecardLabelCellStyle}>Hole</td>
            {sectionHoles.map(h => (
              <td key={h} style={{ ...scorecardCellStyle, color: "#444" }}>{h}</td>
            ))}
          </tr>

          {[playerA, playerB].map((player) => (
            <tr key={player.id}>
              <td style={scorecardLabelCellStyle}>{player.name}</td>

              {sectionHoles.map((hole) => {
                const gross = getRawScore(scores, hole, player.id);
                const strokes = getHandicapStrokes(player.id, hole, matchPlayers, course, handicapMode, isLongShort ? false : !!match.noPar3Strokes);
                const grossBirdie = match.birdieEnabled && isGrossBirdie(scores, course, hole, player.id);
                const netBirdie = match.birdieEnabled && toyRule && !grossBirdie && isNetBirdie(player.id, hole, matchPlayers, course, scores, handicapMode, !!match.noPar3Strokes);

                return (
                  <td key={hole} style={{ ...scorecardCellStyle, color: "#444", background: grossBirdie ? "#fef9c3" : "transparent" }}>
                    {grossBirdie ? (
                      <span style={{ display: "inline-block", width: 22, height: 22, lineHeight: "22px", borderRadius: "50%", background: "#b8952a", color: "#fff", fontWeight: 700, fontSize: 11 }}>
                        {gross != null ? `${gross}${"•".repeat(strokes)}` : "-"}
                      </span>
                    ) : netBirdie ? (
                      <span style={{ display: "inline-block", width: 22, height: 22, lineHeight: "22px", borderRadius: "50%", border: "2px dashed #1a73e8", color: "#1a73e8", fontWeight: 700, fontSize: 11 }}>
                        {gross != null ? `${gross}${"•".repeat(strokes)}` : "-"}
                      </span>
                    ) : gross != null ? `${gross}${"•".repeat(strokes)}` : "-"}
                  </td>
                );
              })}
            </tr>
          ))}

          <tr>
            <td style={scorecardLabelCellStyle}>Result</td>
            {sectionData.map(({ hole, res }) => {
              let color = "#666";
              if (res > 0) color = "#137333";
              if (res < 0) color = "#b3261e";
              return (
                <td key={hole} style={{ ...scorecardCellStyle, color, fontWeight: 600 }}>
                  {res > 0 ? playerA.name[0] : res < 0 ? playerB.name[0] : "Push"}
                </td>
              );
            })}
          </tr>

          <tr>
            <td style={scorecardLabelCellStyle}>Running</td>
            {sectionData.map(({ hole, running, segment }) => {
              let color = "#666";
              if (running > 0) color = "#137333";
              if (running < 0) color = "#b3261e";
              const prefix = segment ? `${segment[0]}: ` : "";
              return (
                <td key={hole} style={{ ...scorecardCellStyle, color, fontWeight: 600 }}>
                  {prefix}{running === 0 ? "Even" : running > 0 ? `${running} up` : `${Math.abs(running)} dn`}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  );
  };

  const birdieCountA = birdieCounts[playerA.id];
  const birdieCountB = birdieCounts[playerB.id];

  return (
    <div style={{ marginTop: 8 }}>
      {renderSection("Front 9", front)}
      {renderSection("Back 9", back)}
      <div style={{ fontSize: 12, color: "#555", marginTop: 4, paddingLeft: 2 }}>
        {!match.birdieEnabled
          ? "🚫 No birdies tracked"
          : (() => {
              const label = toyRule
                ? "🐦 Toy Birdies"
                : "🐦 Birdies tracked (gross only)";
              const summary =
                birdieCountA === 0 && birdieCountB === 0
                  ? "No birdies"
                  : birdieCountA === birdieCountB
                  ? `Birdies tied (${birdieCountA} each)`
                  : birdieCountA > birdieCountB
                  ? `${playerA.name} wins birdies +${birdieCountA - birdieCountB}`
                  : `${playerB.name} wins birdies +${birdieCountB - birdieCountA}`;
              return `${label} — ${summary}`;
            })()}
        </div>
    </div>
  );
}

function NinePointAudit({
  players,
  matchResults,
  scores,
  course,
  handicapMode,
  teamGameUnitAmount,
}) {
  const ninePointEntry = (matchResults || []).find((entry) =>
    isNinePointMatch(entry.match)
  );

  if (!ninePointEntry) return null;

  return (
    <AuditSection title="9-Point" defaultOpen>
      <NinePointScorecard
        players={players}
        result={ninePointEntry.result}
        match={ninePointEntry.match}
        scores={scores}
        course={course}
        handicapMode={handicapMode}
        teamGameUnitAmount={teamGameUnitAmount}
      />
    </AuditSection>
  );
}

function TeamGameAudit({
  players,
  teamGames,
  teamGameResults,
  getTeamGameSelection,
  scores,
  course,
  handicapMode,
  teamGameUnitAmount,
  noPar3TeamGame = false,
  getHandicapStrokesFn,
}) {
  if (!teamGameResults?.length) return null;

  return (
     <AuditSection title="Team Game" defaultOpen>
      {teamGameResults.map((game, gameIndex) => {
        if (game.duplicateError) {
          return (
            <div key={gameIndex} style={{ marginBottom: 12 }}>
              <strong>Game {gameIndex + 1}</strong>: duplicate team selections
            </div>
          );
        }

        const selection = getTeamGameSelection?.(game.index ?? gameIndex);

        // Calculate net bets per player across all matches in this game
        const playerNetBets = {};
        players.forEach(p => { playerNetBets[p.id] = 0; });

        (game.matches || []).forEach((matchup) => {
          const { teamAKey, teamBKey } = parseTeamKeys(matchup.label);
          const teamA = (selection?.[teamAKey] || []).filter(Boolean);
          const teamB = (selection?.[teamBKey] || []).filter(Boolean);
          const units = (matchup.result || []).reduce((sum, bet) => {
            const score = Number(bet.score || 0);
            if (score > 0) return sum + 1;
            if (score < 0) return sum - 1;
            return sum;
          }, 0);
          teamA.forEach(id => { if (playerNetBets[id] !== undefined) playerNetBets[id] += units; });
          teamB.forEach(id => { if (playerNetBets[id] !== undefined) playerNetBets[id] -= units; });
        });

        // Wheel team is team1
        const wheelIds = (selection?.team1 || []).filter(Boolean);
        const wheelNames = wheelIds.map(id => players.find(p => p.id === id)?.name || id).join('/');
        const wheelBets = wheelIds.length > 0 ? (playerNetBets[wheelIds[0]] || 0) : 0;
        const wheelDollars = wheelBets * Number(teamGameUnitAmount || 0);

        // Opponent players (not on wheel team)
        const opponentPlayers = players.filter(p => !wheelIds.includes(p.id));

        const gameTitle = (
          <span>
            <span style={{ fontWeight: 700, color: "#1a1a1a" }}>Holes {game.start}–{game.end}</span>
            <span style={{ color: wheelBets >= 0 ? "#1a5c35" : "#b3261e", marginLeft: 8, fontWeight: 700 }}>
              {wheelNames} {wheelBets > 0 ? "+" : ""}{wheelBets} ({formatMoney(wheelDollars)}ea)
            </span>
            <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 6 }}>
              {opponentPlayers.map((p, i) => {
                const bets = playerNetBets[p.id] || 0;
                const color = bets > 0 ? "#1a5c35" : bets < 0 ? "#b3261e" : "#6b7280";
                return (
                  <span key={p.id}>
                    {i > 0 && " · "}
                    <span style={{ color }}>{p.name} {bets > 0 ? "+" : ""}{bets}</span>
                  </span>
                );
              })}
            </span>
          </span>
        );

        return (
          <AuditSection
            key={gameIndex}
            title={gameTitle}
          >
            {(game.matches || []).map((matchup, matchupIndex) => {
              const { teamAKey, teamBKey } = parseTeamKeys(matchup.label);
              const teamA = (selection?.[teamAKey] || []).filter(Boolean);
              const teamB = (selection?.[teamBKey] || []).filter(Boolean);
              const teamAName = getTeamName(players, teamA);
              const teamBName = getTeamName(players, teamB);
              const totalUnits = (matchup.result || []).reduce((sum, bet) => {
                const score = Number(bet.score || 0);
                if (score > 0) return sum + 1;
                if (score < 0) return sum - 1;
                return sum;
              }, 0);
              const totalDollars = totalUnits * Number(teamGameUnitAmount || 0);

              const matchColor = totalUnits > 0 ? "#137333" : totalUnits < 0 ? "#b3261e" : "#666";
              const matchTitle = (
                <span style={{ color: matchColor }}>
                  {teamAName} vs {teamBName} | {totalUnits > 0 ? "+" : ""}{totalUnits} bets | {formatMoney(totalDollars)}
                </span>
              );

              return (
                <AuditSection
                  key={`${gameIndex}-${matchupIndex}`}
                  title={matchTitle}
                >
                  <TeamGameScorecard
                    game={game}
                    matchup={matchup}
                    gameIndex={gameIndex}
                    matchupIndex={matchupIndex}
                    teamA={teamA}
                    teamB={teamB}
                    teamAName={teamAName}
                    teamBName={teamBName}
                    players={players}
                    course={course}
                    scores={scores}
                    handicapMode={handicapMode}
                    showPressDetail
                    noPar3Strokes={noPar3TeamGame}
                    getHandicapStrokesFn={getHandicapStrokesFn}
                  />
                </AuditSection>
              );
            })}
          </AuditSection>
        );
      })}
    </AuditSection>
  );
}

function getScoreSymbol(gross, par) {
  if (gross === null || gross === undefined) return null;
  const diff = gross - par;

  if (diff <= -2) return { type: "eagle", color: "#137333" };
  if (diff === -1) return { type: "birdie", color: "#137333" };
  if (diff === 1) return { type: "bogey", color: "#b3261e" };
  if (diff >= 2) return { type: "double", color: "#b3261e" };
  return null;
}

function ScoreCell({ gross, par, strokes }) {
  if (gross === null || gross === undefined) {
    return <span style={{ color: "#aaa" }}>-</span>;
  }

  const symbol = getScoreSymbol(gross, par);
  const dotStr = "•".repeat(strokes);
  const display = `${gross}${dotStr}`;

  if (!symbol) {
    return <span>{display}</span>;
  }

  if (symbol.type === "birdie") {
    return (
      <span style={{
        display: "inline-block", minWidth: 26, height: 26, lineHeight: "26px",
        borderRadius: "50%", border: `2px solid ${symbol.color}`,
        color: symbol.color, fontWeight: 700, fontSize: 11, padding: "0 2px"
      }}>
        {display}
      </span>
    );
  }

  if (symbol.type === "eagle") {
    return (
      <span style={{
        display: "inline-block", minWidth: 26, height: 26, lineHeight: "22px",
        borderRadius: "50%", border: `2px solid ${symbol.color}`,
        outline: `2px solid ${symbol.color}`, outlineOffset: "2px",
        color: symbol.color, fontWeight: 700, fontSize: 11, padding: "0 2px"
      }}>
        {display}
      </span>
    );
  }

  if (symbol.type === "bogey") {
    return (
      <span style={{
        display: "inline-block", minWidth: 26, height: 26, lineHeight: "26px",
        border: `2px solid ${symbol.color}`,
        color: symbol.color, fontWeight: 700, fontSize: 11, padding: "0 2px"
      }}>
        {display}
      </span>
    );
  }

  if (symbol.type === "double") {
    return (
      <span style={{
        display: "inline-block", minWidth: 26, height: 26, lineHeight: "22px",
        border: `2px solid ${symbol.color}`,
        outline: `2px solid ${symbol.color}`, outlineOffset: "2px",
        color: symbol.color, fontWeight: 700, fontSize: 11, padding: "0 2px"
      }}>
        {display}
      </span>
    );
  }

  return <span>{display}</span>;
}

function TotalScorecard({ players, scores, course, handicapMode, goToLive, onUpdateScore, initialSelectedPlayer = null, getHandicapStrokesFn }) {
  const [selectedPlayer, setSelectedPlayer] = React.useState(initialSelectedPlayer);

  // Update if initialSelectedPlayer changes (from leaderboard drill-in)
  React.useEffect(() => {
    if (initialSelectedPlayer !== null) {
      setSelectedPlayer(initialSelectedPlayer);
    }
  }, [initialSelectedPlayer]);
  const [editingCell, setEditingCell] = React.useState(null); // { hole, playerId }
  const [editValue, setEditValue] = React.useState("");

  const holes = Array.from({ length: 18 }, (_, i) => i + 1);
  const front = holes.slice(0, 9);
  const back = holes.slice(9, 18);

  const pars = course?.pars || [];
  const hcps = course?.hcp || [];


  const displayPlayers = selectedPlayer
    ? players.filter(p => p.id === selectedPlayer)
    : players;

  const cellStyle = {
    border: "1px solid #ddd",
    padding: "4px 2px",
    textAlign: "center",
    fontSize: 11,
    minWidth: 28,
    whiteSpace: "nowrap",
  };

  const labelStyle = {
    ...cellStyle,
    textAlign: "left",
    minWidth: 80,
    fontWeight: 600,
    position: "sticky",
    left: 0,
    background: "#fff",
    zIndex: 1,
    padding: "4px 6px",
  };

  const headerStyle = {
    ...cellStyle,
    background: "#f0f0f0",
    fontWeight: 700,
  };

  const renderTable = (label, sectionHoles, isBack = false) => {
    const secPar = sectionHoles.reduce((sum, h) => sum + (pars[h - 1] || 0), 0);
    const frontPar9 = front.reduce((sum, h) => sum + (pars[h - 1] || 0), 0);

    return (
      <div style={{ marginBottom: 16, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>{label}</div>
        <table style={{ borderCollapse: "collapse", minWidth: 520 }}>
          <tbody>
            {/* Hole row */}
            <tr>
              <td style={labelStyle}>Hole</td>
              {sectionHoles.map(h => (
                <td key={h} style={headerStyle}>{h}</td>
              ))}
              <td style={headerStyle}>{isBack ? "In" : "Out"}</td>
              {isBack && <td style={headerStyle}>Out</td>}
              {isBack && <td style={headerStyle}>Tot</td>}
              {isBack && <td style={{ ...headerStyle, color: "#137333" }}>Net</td>}
            </tr>

            {/* Par row */}
            <tr>
              <td style={labelStyle}>Par</td>
              {sectionHoles.map(h => (
                <td key={h} style={cellStyle}>{pars[h - 1] || "-"}</td>
              ))}
              <td style={{ ...cellStyle, fontWeight: 700 }}>{secPar}</td>
              {isBack && <td style={{ ...cellStyle, fontWeight: 700 }}>{frontPar9}</td>}
              {isBack && <td style={{ ...cellStyle, fontWeight: 700 }}>{frontPar9 + secPar}</td>}
              {isBack && <td style={cellStyle}></td>}
            </tr>

            {/* HCP row */}
            <tr>
              <td style={labelStyle}>HCP</td>
              {sectionHoles.map(h => (
                <td key={h} style={{ ...cellStyle, color: "#888", fontSize: 10 }}>{hcps[h - 1] || "-"}</td>
              ))}
              <td style={cellStyle}></td>
              {isBack && <td style={cellStyle}></td>}
              {isBack && <td style={cellStyle}></td>}
              {isBack && <td style={cellStyle}></td>}
            </tr>

            {/* Player rows */}
            {displayPlayers.map(player => {
              const _strokesFn = getHandicapStrokesFn || getHandicapStrokes;
              const strokes = sectionHoles.map(h =>
                _strokesFn(player.id, h, players, course, handicapMode)
              );
              const grossScores = sectionHoles.map(h => getRawScore(scores, h, player.id));
              const sectionTotal = grossScores.reduce((sum, g) => g !== null ? sum + g : sum, 0);
              const hasAllBack = grossScores.every(g => g !== null);

              const frontScores = front.map(h => getRawScore(scores, h, player.id));
              const frontTotal = frontScores.reduce((sum, g) => g !== null ? sum + g : sum, 0);
              const hasAllFront = frontScores.every(g => g !== null);

              const grossTotal = frontTotal + sectionTotal;
              const netStrokes = holes.reduce((sum, h) =>
                sum + _strokesFn(player.id, h, players, course, handicapMode), 0);
              const netTotal = grossTotal - netStrokes;
              const hasAll = hasAllFront && hasAllBack;

              return (
                <tr key={player.id}>
                  <td
                    style={{
                      ...labelStyle,
                      cursor: "pointer",
                      color: selectedPlayer === player.id ? "#1a73e8" : "#000",
                      textDecoration: selectedPlayer === player.id ? "underline" : "none",
                    }}
                    onClick={() => setSelectedPlayer(
                      selectedPlayer === player.id ? null : player.id
                    )}
                  >
                    {player.name} ({player.hcp})
                  </td>
                  {sectionHoles.map((h, i) => {
                    const isEditing = editingCell?.hole === h && editingCell?.playerId === player.id;
                    return (
                      <td key={h} style={cellStyle}>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValue}
                            autoFocus
                            onFocus={(e) => e.target.select()}
                            style={{ width: 36, fontSize: 12, textAlign: "center", border: "1px solid #1a73e8", borderRadius: 3 }}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => {
                              const val = editValue === "" ? null : Number(editValue);
                              if (onUpdateScore && editValue !== "" && Number.isFinite(val)) {
                                onUpdateScore(h, player.id, val);
                              }
                              setEditingCell(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.target.blur();
                              if (e.key === "Escape") { setEditingCell(null); }
                            }}
                          />
                        ) : (
                          <span
                            style={{ cursor: onUpdateScore ? "pointer" : "default" }}
                            onClick={() => {
                              if (!onUpdateScore) return;
                              setEditingCell({ hole: h, playerId: player.id });
                              setEditValue(grossScores[i] ?? "");
                            }}
                          >
                            <ScoreCell
                              gross={grossScores[i]}
                              par={pars[h - 1]}
                              strokes={strokes[i]}
                            />
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td style={{ ...cellStyle, fontWeight: 700 }}>
                    {hasAllBack ? sectionTotal : "-"}
                  </td>
                  {isBack && <td style={{ ...cellStyle, fontWeight: 700 }}>{hasAllFront ? frontTotal : "-"}</td>}
                  {isBack && <td style={{ ...cellStyle, fontWeight: 700 }}>{hasAll ? grossTotal : "-"}</td>}
                  {isBack && <td style={{ ...cellStyle, fontWeight: 700, color: "#137333" }}>{hasAll ? netTotal : "-"}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
        {isBack && selectedPlayer && (
          <div
            style={{ marginTop: 8, fontSize: 12, color: "#1a73e8", textAlign: "center", cursor: "pointer" }}
            onClick={() => setSelectedPlayer(null)}
          >
            ✕ Show all players
          </div>
        )}
      </div>
    );
  };

  // Totals table (Out / In / Total / Net)

  return (
    <div>
      <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>
        Tap a player name to view their scorecard only. Tap hole scores to edit if needed below.
      </div>
      {renderTable("Front 9", front, false)}
      {renderTable("Back 9", back, true)}
      {onUpdateScore && (
        <div style={{ fontSize: 12, color: "#888", marginTop: 4, textAlign: "center" }}>
          Tap any score to edit
        </div>
      )}
    </div>
  );
}

export default function AuditTrail({
  players,
  matches,
  matchResults,
  birdieResults,
  teamGames,
  teamGameResults,
  getTeamGameSelection,
  scores,
  course,
  handicapMode,
  teamGameUnitAmount,
  noPar3TeamGame = false,
  goToLive,
  onUpdateScore,
  drillPlayerId = null,
  getHandicapStrokesFn,
}) {
  return (
    <div style={{ border: "2px solid #444", padding: 12, marginBottom: 12 }}>
      <h3 style={{ marginTop: 0 }}>Scorecards</h3>
      <div style={{ fontSize: 13, color: "#555", marginBottom: 10 }}>
        Tap any match to see hole-by-hole detail
      </div>

    {/* TEAM GAME FIRST */}
<TeamGameAudit
  players={players}
  teamGames={teamGames}
  teamGameResults={teamGameResults}
  getTeamGameSelection={getTeamGameSelection}
  getHandicapStrokesFn={getHandicapStrokesFn}
  scores={scores}
  course={course}
  handicapMode={handicapMode}
  teamGameUnitAmount={teamGameUnitAmount}
  noPar3TeamGame={noPar3TeamGame}
/>

{/* 1v1 */}
<OneVOneAudit
  players={players}
  matches={matches}
  matchResults={matchResults}
  birdieResults={birdieResults}
  scores={scores}
  course={course}
  handicapMode={handicapMode}
/>

{/* 9 POINT */}
<NinePointAudit
  players={players}
  matchResults={matchResults}
  scores={scores}
  course={course}
  handicapMode={handicapMode}
  teamGameUnitAmount={teamGameUnitAmount}
/>

{/* TOTAL SCORECARD */}
<div ref={drillPlayerId ? (el) => { if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 150); } : null}>
  <AuditSection title="Total Scorecard" defaultOpen={drillPlayerId !== null} key={drillPlayerId || "total"}>
    <TotalScorecard
      players={players}
      scores={scores}
      course={course}
      handicapMode={handicapMode}
      goToLive={goToLive}
      onUpdateScore={onUpdateScore}
      initialSelectedPlayer={drillPlayerId}
      getHandicapStrokesFn={getHandicapStrokesFn}
    />
  </AuditSection>
</div>

    </div>
  );
}
