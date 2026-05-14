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
  border: "1px solid #ddd",
  padding: "4px 3px",
  textAlign: "center",
  minWidth: 40,
  fontSize: 10,
  whiteSpace: "nowrap",
};

const scorecardLabelCellStyle = {
  ...scorecardCellStyle,
  position: "sticky",
  left: 0,
  background: "#fff",
  zIndex: 1,
  textAlign: "left",
  minWidth: 72,
  fontWeight: 700,
};

function ScorecardCell({ value, running, color }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontWeight: 600, color }}>
        {value}
      </div>
      {running !== undefined && (
        <div style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>
  {running}
</div>
      )}
    </div>
  );
}

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





function getOneVOneResultLabel(result, p1Name, p2Name) {
    if (result?.type === "standard") {
  const units = Number(result?.units || 0);

  if (units !== 0) {
    return `${Math.abs(units)} up`;
  }

  return "Tie";
}

if (result?.type === "longshort") {
  const holes = result?.holes || [];

  const formatClosedLabel = (winnerName, units, label, decidedOn) => {
    if (!winnerName) return "Tie";

    if (decidedOn === 18) {
      return `${winnerName} ${Math.abs(units)} up`;
    }

    return `${winnerName} ${label || `${Math.abs(units)} up`}`;
  };

  const longEndHole = Number(result?.longDecidedOn || 18);
  const longUnits = holes
    .slice(0, longEndHole)
    .reduce((sum, value) => sum + Number(value || 0), 0);

  const shortStartHole = result?.longDecidedOn ? result.longDecidedOn + 1 : null;
  const shortUnits = shortStartHole !== null && shortStartHole <= 18
    ? holes
        .slice(shortStartHole - 1, 18)
        .reduce((sum, value) => sum + Number(value || 0), 0)
    : 0;

  const longWinner =
    longUnits > 0 ? p1Name : longUnits < 0 ? p2Name : null;

  const shortWinner =
    shortUnits > 0 ? p1Name : shortUnits < 0 ? p2Name : null;

  const longLabel = formatClosedLabel(
    longWinner,
    longUnits,
    result.longLabel,
    Number(result?.longDecidedOn || 18)
  );

  const shortLabel = formatClosedLabel(
    shortWinner,
    shortUnits,
    result.shortLabel,
    18
  );

  if (Number(result?.longDecidedOn || 18) >= 18) {
  return `Long: ${longLabel}`;
}

return `Long: ${longLabel} | Short: ${shortLabel}`;
}

if (result?.type === "match_fbt") {
  const segments = result.segments || [];
  const hasFrontOrBack = segments.some(
    (seg) => seg.key === "front" || seg.key === "back"
  );

  return segments
    .map((seg) => {
      const shortLabel =
        seg.key === "front"
          ? "F"
          : seg.key === "back"
            ? "B"
            : seg.key === "total" && hasFrontOrBack
              ? "T"
              : "";

      const units = Number(seg.units || 0);
      const resultLabel = seg.resultLabel || "Tie";
      const prefix = shortLabel ? `${shortLabel}: ` : "";

      if (units > 0) {
        return `${prefix}${p1Name} ${resultLabel}`;
      }

      if (units < 0) {
        return `${prefix}${p2Name} ${resultLabel}`;
      }

      return `${prefix}Tie`;
    })
    .join(" | ");
}

  if (result?.type === "stroke") {
  return (result.segments || [])
    .map((seg) => {
      const shortLabel =
        seg.key === "front"
          ? "F"
          : seg.key === "back"
            ? "B"
            : seg.key === "total"
              ? "T"
              : seg.label;

      const diff = Number(seg.diff || 0);

      if (diff === 0) {
        return `${shortLabel}: Tie`;
      }

      const units = Number(seg.units || 0);
      const winnerName = units > 0 ? p1Name : p2Name;

      return `${shortLabel}: ${winnerName} by ${Math.abs(diff)}`;
    })
    .join(" | ");
}

  return result?.label || result?.longLabel || "Result";
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

function formatScoreWithStrokeDots(playerId, hole, players, course, scores, handicapMode, noPar3Strokes = false) {
  const gross = getRawScore(scores, hole, playerId);

  if (gross === null || gross === undefined) {
    return "-";
  }

  const strokes = getHandicapStrokes(playerId, hole, players, course, handicapMode, noPar3Strokes);
  return `${gross}${"•".repeat(strokes)}`;
}

function getBestBallDisplay(teamIds, hole, players, course, scores, handicapMode, noPar3Strokes = false) {
  const best = getBestBallWinner(teamIds, hole, players, course, scores, handicapMode);

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
    });
    const statuses = getBetStatusesForHole(matchup?.result || [], hole);
    const runningValue = getNetActiveBetCountForHole(matchup?.result || [], hole);

    return {
      hole,
      teamAValue: getBestBallDisplay(teamA, hole, players, course, scores, handicapMode, noPar3Strokes),
      teamBValue: getBestBallDisplay(teamB, hole, players, course, scores, handicapMode, noPar3Strokes),
      result: formatTeamHoleResult(holeResult, teamAName, teamBName),
      running: formatRunningUnits(runningValue),
      pressDetail: formatPressDetail(statuses),
      resultValue: holeResult,
      runningValue,
    };
  });

  const scorecardCellStyle = {
    border: "1px solid #ddd",
    padding: "6px 4px",
    textAlign: "center",
    minWidth: 64,
    fontSize: 12,
    whiteSpace: "nowrap",
  };

  const scorecardLabelCellStyle = {
    ...scorecardCellStyle,
    position: "sticky",
    left: 0,
    background: "#fff",
    zIndex: 1,
    textAlign: "left",
    minWidth: 92,
    fontWeight: 700,
  };

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 6,
        marginBottom: 10,
        overflowX: "auto",
      }}
    >
      <div style={{ padding: 8, fontSize: 13, background: "#f7f7f7" }}>
        <strong>Scorecard View</strong>
        <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
          Gross score shown. Dot means stroke received on that hole.
        </div>
      </div>

      <table style={{ borderCollapse: "collapse", width: "100%" }}>
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
                <td key={`team-a-${gameIndex}-${matchupIndex}-${row.hole}`} style={{ ...scorecardCellStyle }}>
                  {teamAHasBirdie ? (
                    <span style={{ display: "inline-block", width: 22, height: 22, lineHeight: "22px", borderRadius: "50%", border: "2px solid #137333", color: "#137333", fontWeight: 700, fontSize: 11 }}>
                      {row.teamAValue}
                    </span>
                  ) : row.teamAValue}
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
                <td key={`team-b-${gameIndex}-${matchupIndex}-${row.hole}`} style={{ ...scorecardCellStyle }}>
                  {teamBHasBirdie ? (
                    <span style={{ display: "inline-block", width: 22, height: 22, lineHeight: "22px", borderRadius: "50%", border: "2px solid #137333", color: "#137333", fontWeight: 700, fontSize: 11 }}>
                      {row.teamBValue}
                    </span>
                  ) : row.teamBValue}
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

function getBestBallWinner(teamIds, hole, players, course, scores, handicapMode) {
  const entries = (teamIds || [])
    .filter(Boolean)
    .map((playerId) => ({
      playerId,
      name: getPlayerName(players, playerId),
      gross: getRawScore(scores, hole, playerId),
      net: getNetScore(playerId, hole, players, course, scores, handicapMode),
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
    <div style={{ border: "1px solid #ccc", borderRadius: 6, marginBottom: 10 }}>
      <button
        type="button"
        onClick={toggleOpen}
        style={{
          width: "100%",
          padding: 10,
          textAlign: "left",
          background: "#f7f7f7",
          border: 0,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {open ? "▾" : "▸"} {title}
      </button>
      {open && <div style={{ padding: 10 }}>{children}</div>}
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

        // Calculate holes played for this match
        const holesPlayed = Array.from({ length: 18 }, (_, i) => i + 1).filter(h => {
          const s = scores?.[h] || {};
          return Number.isFinite(s[match.p1Id]) && Number.isFinite(s[match.p2Id]);
        }).length;
        const isComplete = holesPlayed >= 18;
        const throughStr = !isComplete && holesPlayed > 0 ? ` through ${holesPlayed}` : "";

        // Build result label
        let resultStr = "";
        if (result?.type === "longshort") {
          const longDecidedOn = result?.longDecidedOn;
          const holes = result?.holes || [];
          const longEndHole = Number(longDecidedOn || 18);
          const longUnits = holes.slice(0, longEndHole).reduce((sum, v) => sum + Number(v || 0), 0);
          const longWinner = longUnits > 0 ? p1Name : longUnits < 0 ? p2Name : null;

          if (!isComplete && !longDecidedOn) {
            // Long still open mid-round
            const absUnits = Math.abs(longUnits);
            resultStr = longWinner ? `${longWinner} ${absUnits} up${throughStr}` : `Even${throughStr}`;
          } else {
            resultStr = getOneVOneResultLabel(result, p1Name, p2Name);
          }
        } else if (result?.type === "standard") {
          const units = Number(result?.units || 0);
          if (units > 0) resultStr = `${p1Name} ${units} up${throughStr}`;
          else if (units < 0) resultStr = `${p2Name} ${Math.abs(units)} up${throughStr}`;
          else resultStr = `Even${throughStr}`;
        } else {
          resultStr = getOneVOneResultLabel(result, p1Name, p2Name);
        }

        // Money — always show "if ended now"
        const moneyStr = getOneVOneMoneyLabel(result, p1Name, p2Name);

        const total = Number(result?.total || 0);
        const headerColor = total > 0 ? "#137333" : total < 0 ? "#b3261e" : "#666";
        const oneVOneTitle = (
          <span style={{ color: headerColor }}>
            {p1Name} vs {p2Name} | {resultStr} | {moneyStr}
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
}) {
  const holes = result?.holes || [];

  if (!holes.length) return null;

  const front = holes.slice(0, 9);
  const back = holes.slice(9, 18);
  const toyRule = !!match?.toyRule;
  const allHoleNums = holes.map(h => h.hole);

  // Count gross birdies per player for summary
  const birdieCounts = Object.fromEntries(
    players.map(p => [
      p.id,
      allHoleNums.filter(h => isGrossBirdie(scores, course, h, p.id)).length
    ])
  );

  const renderSection = (label, sectionHoles) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>

      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <tbody>
          <tr>
            <td style={scorecardLabelCellStyle}>Hole</td>
            {sectionHoles.map((h) => (
              <td key={h.hole} style={{ ...scorecardCellStyle, color: "#444" }}>{h.hole}</td>
            ))}
          </tr>

         <>
  {/* SCORE ROWS */}
  {players.map((player) => (
    <tr key={`score-${player.id}`}>
      <td style={scorecardLabelCellStyle}>{player.name}</td>

      {sectionHoles.map((h) => {
        const gross = getRawScore(scores, h.hole, player.id);
        const strokes = getHandicapStrokes(player.id, h.hole, players, course, handicapMode, !!match?.noPar3Strokes);
        const display = gross != null ? `${gross}${"•".repeat(strokes)}` : "-";
        const grossBirdie = match?.birdieEnabled && isGrossBirdie(scores, course, h.hole, player.id);
        const netBirdie = match?.birdieEnabled && toyRule && !grossBirdie && isNetBirdie(player.id, h.hole, players, course, scores, handicapMode, !!match?.noPar3Strokes);

        return (
          <td key={h.hole} style={{ ...scorecardCellStyle, color: "#444" }}>
            {grossBirdie ? (
              <span style={{ display: "inline-block", width: 22, height: 22, lineHeight: "22px", borderRadius: "50%", border: "2px solid #137333", color: "#137333", fontWeight: 700, fontSize: 11 }}>
                {display}
              </span>
            ) : netBirdie ? (
              <span style={{ display: "inline-block", width: 22, height: 22, lineHeight: "22px", borderRadius: "50%", border: "2px dashed #1a73e8", color: "#1a73e8", fontWeight: 700, fontSize: 11 }}>
                {display}
              </span>
            ) : display}
          </td>
        );
      })}
    </tr>
  ))}

  {/* POINTS + RUNNING */}
  <tr>
    <td style={{ ...scorecardLabelCellStyle, borderTop: "2px solid #ccc" }}>
  Points
</td>
    <td colSpan={sectionHoles.length}></td>
  </tr>

  {players.map((player) => (
    <tr key={`points-${player.id}`}>
      <td style={scorecardLabelCellStyle}>{player.name}</td>

      {sectionHoles.map((h) => {
        const pts = h.pointsByPlayerId?.[player.id] ?? 0;
        const running = h.runningTotalsByPlayerId?.[player.id] ?? 0;

        let color = "#666";
        if (pts === 5) color = "#137333";
        if (pts === 1) color = "#b3261e";

        return (
          <td key={h.hole} style={{ ...scorecardCellStyle, color: "#444" }}>
            <ScorecardCell value={pts} running={running} color={color} />
          </td>
        );
      })}
    </tr>
  ))}
</>
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ marginTop: 8 }}>
      {renderSection("Front 9", front)}
      {renderSection("Back 9", back)}
      <div style={{ fontSize: 12, color: "#555", marginTop: 4, paddingLeft: 2 }}>
        {!match?.birdieEnabled
          ? "🚫 No birdies tracked"
          : (() => {
              const label = toyRule
                ? "🐦 Toy Birdies"
                : "🐦 Birdies tracked (gross only)";
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

      <table style={{ borderCollapse: "collapse", width: "100%" }}>
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
                  <td key={hole} style={{ ...scorecardCellStyle, color: "#444" }}>
                    {grossBirdie ? (
                      <span style={{ display: "inline-block", width: 22, height: 22, lineHeight: "22px", borderRadius: "50%", border: "2px solid #137333", color: "#137333", fontWeight: 700, fontSize: 11 }}>
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
            <span>{game.start}-{game.end} | </span>
            <span style={{ color: wheelBets >= 0 ? "#137333" : "#b3261e", fontWeight: 700 }}>
              {wheelNames} {wheelBets > 0 ? "+" : ""}{wheelBets} ({formatMoney(wheelDollars)}ea)
            </span>
            <br />
            <span style={{ fontSize: 12, color: "#666" }}>
              {opponentPlayers.map((p, i) => {
                const bets = playerNetBets[p.id] || 0;
                const color = bets > 0 ? "#137333" : bets < 0 ? "#b3261e" : "#666";
                return (
                  <span key={p.id}>
                    {i > 0 && " | "}
                    <span style={{ color }}>
                      {p.name} {bets > 0 ? "+" : ""}{bets}
                    </span>
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

function TotalScorecard({ players, scores, course, handicapMode, goToLive, onUpdateScore, initialSelectedPlayer = null }) {
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
      <div style={{ marginBottom: 16, overflowX: "auto" }}>
        <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>{label}</div>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
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
              const strokes = sectionHoles.map(h =>
                getHandicapStrokes(player.id, h, players, course, handicapMode)
              );
              const grossScores = sectionHoles.map(h => getRawScore(scores, h, player.id));
              const sectionTotal = grossScores.reduce((sum, g) => g !== null ? sum + g : sum, 0);
              const hasAllBack = grossScores.every(g => g !== null);

              const frontScores = front.map(h => getRawScore(scores, h, player.id));
              const frontTotal = frontScores.reduce((sum, g) => g !== null ? sum + g : sum, 0);
              const hasAllFront = frontScores.every(g => g !== null);

              const grossTotal = frontTotal + sectionTotal;
              const netStrokes = holes.reduce((sum, h) =>
                sum + getHandicapStrokes(player.id, h, players, course, handicapMode), 0);
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
    />
  </AuditSection>
</div>

    </div>
  );
}
