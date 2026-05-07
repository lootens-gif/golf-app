import { useState } from "react";
import {
  computeHoleResult,
  getHandicapStrokes,
  getNetScore,
  getRawScore,
} from "../engine/scoringEngine";

const scorecardCellStyle = {
  border: "1px solid #ddd",
  padding: "5px 4px",
  textAlign: "center",
  minWidth: 44,
  fontSize: 11,
  whiteSpace: "nowrap",
};

const scorecardLabelCellStyle = {
  ...scorecardCellStyle,
  position: "sticky",
  left: 0,
  background: "#fff",
  zIndex: 1,
  textAlign: "left",
  minWidth: 86,
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

function formatMatchScore(score, p1Name, p2Name) {
  const value = Number(score || 0);

  if (value === 0) return "All square";
  if (value > 0) return `${p1Name} ${value} up`;
  return `${p2Name} ${Math.abs(value)} up`;
}

function formatStrokeDiff(score, p1Name, p2Name) {
  const value = Number(score || 0);

  if (value === 0) return "Stroke total: tied";
  if (value > 0) return `Stroke total: ${p1Name} leads by ${value}`;
  return `Stroke total: ${p2Name} leads by ${Math.abs(value)}`;
}

function getOneVOneGameTypeLabel(match, result) {
  if (result?.type === "standard") return "Net Holes";
  if (result?.type === "longshort") return "Long / Short";
if (result?.type === "match_fbt") return "Match Play";

  if (result?.type === "stroke") {
    const scoring = result.strokeScoring === "gross" ? "Gross" : "Net";
    return `${scoring} Stroke`;
  }

  return match?.type || result?.type || "1v1";
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

  const shortUnits = Number(holes[17] || 0);

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
      const diff = Number(seg.diff || 0);

      if (diff === 0) {
        return `${seg.label}: Tie`;
      }

      const units = Number(seg.units || 0);
      const winnerName = units > 0 ? p1Name : p2Name;

      return `${seg.label}: ${winnerName} by ${Math.abs(diff)}`;
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

function formatHoleWinner(result, teamAName, teamBName) {
  if (result > 0) return `${teamAName} +1`;
  if (result < 0) return `${teamBName} +1`;
  if (result === 0) return "Push";
  return "Incomplete";
}

function getPlayerName(players, playerId) {
  const player = players.find((p) => p.id === playerId);
  return player?.name || playerId;
}

function getTeamName(players, ids = []) {
  const names = ids.filter(Boolean).map((id) => getPlayerName(players, id));
  return names.length ? names.join(" / ") : "-";
}

function formatScoreWithStrokeDots(playerId, hole, players, course, scores, handicapMode) {
  const gross = getRawScore(scores, hole, playerId);

  if (gross === null || gross === undefined) {
    return "-";
  }

  const strokes = getHandicapStrokes(playerId, hole, players, course, handicapMode);
  return `${gross}${"•".repeat(strokes)}`;
}

function getBestBallDisplay(teamIds, hole, players, course, scores, handicapMode) {
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
    handicapMode
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
}) {
  const holes = Array.from(
    { length: Number(game.end || 0) - Number(game.start || 0) + 1 },
    (_, i) => Number(game.start) + i
  );

  const rows = holes.map((hole) => {
    const holeResult = computeHoleResult({
      hole,
      teamA,
      teamB,
      players,
      course,
      scores,
      handicapMode,
    });
    const statuses = getBetStatusesForHole(matchup?.result || [], hole);
    const runningValue = getNetActiveBetCountForHole(matchup?.result || [], hole);

    return {
      hole,
      teamAValue: getBestBallDisplay(teamA, hole, players, course, scores, handicapMode),
      teamBValue: getBestBallDisplay(teamB, hole, players, course, scores, handicapMode),
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
            {rows.map((row) => (
              <td key={`team-a-${gameIndex}-${matchupIndex}-${row.hole}`} style={{ ...scorecardCellStyle, color: "#444" }}>
                {row.teamAValue}
              </td>
            ))}
          </tr>

          <tr>
            <td style={scorecardLabelCellStyle}>{teamBName}</td>
            {rows.map((row) => (
              <td key={`team-b-${gameIndex}-${matchupIndex}-${row.hole}`} style={{ ...scorecardCellStyle, color: "#444" }}>
                {row.teamBValue}
              </td>
            ))}
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
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ border: "1px solid #ccc", borderRadius: 6, marginBottom: 10 }}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
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

function formatOneVOneHoleAuditLine({
  result,
  hole,
  holeResult,
  running,
  p1Name,
  p2Name,
}) {
 if (result?.type === "stroke") {
  const base = formatStrokeDiff(holeResult, p1Name, p2Name);

  if (hole === 9 || hole === 18) {
    const matchingSegments = (result.segments || []).filter((segment) => {
      if (hole === 9) return segment.key === "front";
      if (hole === 18) return segment.key === "back" || segment.key === "total";
      return false;
    });

    if (matchingSegments.length > 0) {
      const segmentText = matchingSegments
        .map((segment) => {
  const diff = Number(segment.diff || 0);
  const units = Number(segment.units || 0);

  if (diff === 0) {
    return `${segment.label}: Tie`;
  }

  const winnerName = units > 0 ? p1Name : p2Name;

  return `${segment.label}: ${winnerName} by ${Math.abs(diff)}`;
})
        .join("; ");

      return `${base}; ${segmentText}`;
    }
  }

  return base;
}

  const base = `${formatHoleWinner(holeResult, p1Name, p2Name)}; Match: ${formatMatchScore(
    running,
    p1Name,
    p2Name
  )}`;

  if (result?.type === "longshort") {
    if (hole === result?.longDecidedOn) {
  const longUnits = (result.holes || [])
    .slice(0, hole)
    .reduce((sum, value) => sum + Number(value || 0), 0);

  const longWinner =
    longUnits > 0 ? p1Name : longUnits < 0 ? p2Name : null;

  const longCloseLabel =
    hole === 18 && longWinner
      ? `${longWinner} ${Math.abs(longUnits)} up`
      : result.longLabel || "Tie";

  return `${base}; Long closed: ${longCloseLabel}`;
}

    if (hole === 17 && Number(result?.longDecidedOn || 18) < 18) {
  return `${formatHoleWinner(holeResult, p1Name, p2Name)}; Short starts: All square`;
}

    if (hole === result?.shortDecidedOn) {
      return `${formatHoleWinner(holeResult, p1Name, p2Name)}; Short closed: ${
        result.shortLabel || "Tie"
      }`;
    }

    return base;
  }

  if (result?.type === "match_fbt") {
    const closedSegments = (result.segments || []).filter(
      (segment) => Number(segment.decidedOn) === hole
    );

    if (closedSegments.length > 0) {
      const closedText = closedSegments
     .map((segment) => `${segment.label} closed: ${segment.resultLabel || "Tie"}`)
        .join("; ");

      return `${base}; ${closedText}`;
    }
  }

  return base;
}

function OneVOneAudit({ players, matches, matchResults, birdieResults, scores, course, handicapMode }) {
  const sideMatchEntries = (matchResults || []).filter((entry) => !isNinePointMatch(entry.match));

  if (!sideMatchEntries.length) return null;

  return (
    <AuditSection title="1v1 Match Audit" defaultOpen>
      {sideMatchEntries.map((entry) => {
        const match = entry.match;
        const result = entry.result || {};
        const p1Name = getPlayerName(players, match.p1Id);
        const p2Name = getPlayerName(players, match.p2Id);
        let running = 0;

        return (
         <AuditSection
  key={match.id}
title={`${p1Name} vs ${p2Name} | ${getOneVOneGameTypeLabel(match, result)} | ${getOneVOneMoneyLabel(result, p1Name, p2Name)} | ${getOneVOneResultLabel(result, p1Name, p2Name )}`}          >
  <OneVOneScorecard
    match={match}
    result={result}
    players={players}
    scores={scores}
    course={course}
    handicapMode={handicapMode}
  />

  {(result.holes || []).map((holeResult, index) => {
              const hole = index + 1;
              if (holeResult === null || holeResult === undefined) return null;
              running += Number(holeResult || 0);

              const p1Gross = getRawScore(scores, hole, match.p1Id);
              const p2Gross = getRawScore(scores, hole, match.p2Id);
              const p1Net = getNetScore(match.p1Id, hole, players, course, scores, handicapMode);
              const p2Net = getNetScore(match.p2Id, hole, players, course, scores, handicapMode);
              const holeBirdies = (birdieResults || []).filter(
                (birdie) =>
                  birdie.source === "match-birdie" &&
                  birdie.matchId === match.id &&
                  birdie.holeNumber === hole &&
                  Number(birdie.amount) > 0
              );

              return (
                <div key={`${match.id}-${hole}`} style={{ borderTop: "1px solid #eee", paddingTop: 8, marginTop: 8 }}>
<div>
  <strong>Hole {hole}</strong> —{" "}
  {formatOneVOneHoleAuditLine({
    result,
    hole,
    holeResult,
    running,
    p1Name,
    p2Name,
  })}
</div>
                  <div style={{ fontSize: 13 }}>
                    {p1Name}: gross {p1Gross ?? "-"}, net {p1Net ?? "-"} | {p2Name}: gross {p2Gross ?? "-"}, net {p2Net ?? "-"}
                  </div>
                  {holeBirdies.length > 0 && (
                    <div style={{ fontSize: 13, marginTop: 4 }}>
                      Birdies: {holeBirdies.map((birdie) => `${getPlayerName(players, birdie.playerId)} ${formatMoney(birdie.amount)} vs ${getPlayerName(players, birdie.opponentId)}`).join("; ")}
                    </div>
                  )}
                </div>
              );
            })}
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
}) {
  const holes = result?.holes || [];

  if (!holes.length) return null;

  const front = holes.slice(0, 9);
  const back = holes.slice(9, 18);

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
const strokes = getHandicapStrokes(
  player.id,
  h.hole,
  players,
  course,
  handicapMode
);

const display =
  gross != null ? `${gross}${"•".repeat(strokes)}` : "-";

        return (
          <td key={h.hole} style={{ ...scorecardCellStyle, color: "#444" }}>
            {display}
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
    </div>
  );
}

function OneVOneScorecard({ match, players, scores, course, handicapMode }) {
  const playerA = players.find((p) => p.id === match.p1Id);
const playerB = players.find((p) => p.id === match.p2Id);

  if (!playerA || !playerB) return null;

  let running = 0;

  const holes = Array.from({ length: 18 }, (_, i) => i + 1);

  const front = holes.slice(0, 9);
  const back = holes.slice(9, 18);

  const renderSection = (label, sectionHoles) => (
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
                const strokes = getHandicapStrokes(player.id, hole, players, course, handicapMode);

                return (
                  <td key={hole} style={{ ...scorecardCellStyle, color: "#444" }}>
                    {gross != null ? `${gross}${"•".repeat(strokes)}` : "-"}
                  </td>
                );
              })}
            </tr>
          ))}

          <tr>
            <td style={scorecardLabelCellStyle}>Result</td>
            {sectionHoles.map((hole) => {
              const res = computeHoleResult({
                hole,
                teamA: [playerA.id],
                teamB: [playerB.id],
                players,
                course,
                scores,
                handicapMode,
              });

              if (res > 0) running += 1;
              if (res < 0) running -= 1;

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
            {sectionHoles.map(() => {
              let color = "#666";
              if (running > 0) color = "#137333";
              if (running < 0) color = "#b3261e";

              return (
                <td style={{ ...scorecardCellStyle, color, fontWeight: 600 }}>
                  {running === 0 ? "Even" : running > 0 ? `${running} up` : `${Math.abs(running)} down`}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ marginTop: 8 }}>
      {renderSection("Front 9", front)}
      {renderSection("Back 9", back)}
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
    <AuditSection title="9-Point Audit" defaultOpen>
      <NinePointScorecard
  players={players}
  result={ninePointEntry.result}
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
}) {
  if (!teamGameResults?.length) return null;

  return (
    <AuditSection title="Team / Wheel Game Audit" defaultOpen>
      {teamGameResults.map((game, gameIndex) => {
        if (game.duplicateError) {
          return (
            <div key={gameIndex} style={{ marginBottom: 12 }}>
              <strong>Game {gameIndex + 1}</strong>: duplicate team selections
            </div>
          );
        }

        const selection = getTeamGameSelection?.(game.index ?? gameIndex);
        const gameConfig = teamGames?.[game.index ?? gameIndex] || {};

        return (
          <AuditSection
            key={gameIndex}
            title={`Game ${gameIndex + 1}: holes ${game.start}-${game.end} | Press trigger ${gameConfig.pressTrigger ?? 1}`}
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

              return (
                <AuditSection
                  key={`${gameIndex}-${matchupIndex}`}
                  title={`${teamAName} vs ${teamBName} | ${totalUnits > 0 ? "+" : ""}${totalUnits} units | ${formatMoney(totalUnits * Number(teamGameUnitAmount || 0))}`}
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
}) {
  return (
    <div style={{ border: "2px solid #444", padding: 12, marginBottom: 12 }}>
      <h3 style={{ marginTop: 0 }}>Scorecards</h3>
      <div style={{ fontSize: 13, color: "#555", marginBottom: 10 }}>
        Read-only scoring detail. Uses the same scoring engine outputs/functions as the round totals.
      </div>

      <OneVOneAudit
        players={players}
        matches={matches}
        matchResults={matchResults}
        birdieResults={birdieResults}
        scores={scores}
        course={course}
        handicapMode={handicapMode}
      />

<>
<NinePointAudit
  players={players}
  matchResults={matchResults}
  scores={scores}
  course={course}
  handicapMode={handicapMode}
/>
</>
      <TeamGameAudit
        players={players}
        teamGames={teamGames}
        teamGameResults={teamGameResults}
        getTeamGameSelection={getTeamGameSelection}
        scores={scores}
        course={course}
        handicapMode={handicapMode}
        teamGameUnitAmount={teamGameUnitAmount}
      />
    </div>
  );
}
