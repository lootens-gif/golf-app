import React, { useState } from "react";
import {
  computeHoleResult,
  getHandicapStrokes,
  getNetScore,
  getRawScore,
  isGrossBirdie,
  isNetBirdie,
} from "../engine/scoringEngine";

// Safely get net units from a team game matchup result (handles both press array and non-press object)
function getMatchUnits(result) {
  if (Array.isArray(result)) {
    return result.reduce((sum, item) => {
      const score = Number(item.score || 0);
      if (score > 0) return sum + 1;
      if (score < 0) return sum - 1;
      return sum;
    }, 0);
  }
  if (result && typeof result === "object") {
    const total = Number(result.total || 0);
    return total > 0 ? 1 : total < 0 ? -1 : 0;
  }
  return 0;
}

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
  background: "#fff",
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
  // noPar3Strokes passed to spread fn so it builds correct quota distribution
  const par = course?.pars?.[hole - 1];
  const strokes = (noPar3Strokes && par === 3) ? 0 : strokesFn(playerId, hole, players, course, handicapMode, noPar3Strokes);
  return `${gross}${"•".repeat(strokes)}`;
}

function getBestBallDisplay(teamIds, hole, players, course, scores, handicapMode, noPar3Strokes = false, getHandicapStrokesFn) {
  const best = getBestBallWinner(teamIds, hole, players, course, scores, handicapMode, getHandicapStrokesFn, noPar3Strokes);

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
    noPar3Strokes,
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
    const pressResult = Array.isArray(matchup?.result) ? matchup.result : [];
    const statuses = getBetStatusesForHole(pressResult, hole);
    const runningValue = getNetActiveBetCountForHole(pressResult, hole);

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
    background: "#fff",
    textAlign: "left",
    minWidth: 90,
    fontWeight: 700,
    borderRight: "2px solid #e5e7eb",
  };

  return (
    <div
      className="scorecard-scroll"
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

      <div className="scorecard-scroll" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <table style={{ borderCollapse: "collapse", minWidth: 500 }}>
        <tbody>
          <tr>
            <td style={scorecardLabelCellStyle}>Hole</td>
            {rows.map((row) => (
              <td key={`hole-${gameIndex}-${matchupIndex}-${row.hole}`} style={{ ...scorecardCellStyle, color: "#444" }}>
                {row.hole}
              </td>
            ))}
            <td style={{ ...scorecardCellStyle, fontWeight: 700, color: "#444", borderLeft: "2px solid #e5e7eb" }}>Tot</td>
          </tr>

          <tr>
            <td style={scorecardLabelCellStyle}>Par</td>
            {rows.map((row) => (
              <td key={`par-${gameIndex}-${matchupIndex}-${row.hole}`} style={{ ...scorecardCellStyle, color: "#9ca3af" }}>
                {course?.pars?.[row.hole - 1] ?? "-"}
              </td>
            ))}
            <td style={{ ...scorecardCellStyle, color: "#9ca3af", borderLeft: "2px solid #e5e7eb" }}>
              {holes.reduce((s, h) => s + (Number(course?.pars?.[h - 1]) || 0), 0)}
            </td>
          </tr>

          <tr>
            <td style={scorecardLabelCellStyle}>HCP</td>
            {rows.map((row) => (
              <td key={`hcp-${gameIndex}-${matchupIndex}-${row.hole}`} style={{ ...scorecardCellStyle, color: "#9ca3af" }}>
                {course?.hcp?.[row.hole - 1] ?? "-"}
              </td>
            ))}
            <td style={{ ...scorecardCellStyle, borderLeft: "2px solid #e5e7eb" }}></td>
          </tr>

          <tr>
            <td style={scorecardLabelCellStyle}>{teamAName}</td>
            {rows.map((row) => {
              const teamAHasBirdie = teamA.filter(Boolean).some(id =>
                isGrossBirdie(scores, course, row.hole, id)
              );
              return (
                <td key={`team-a-${gameIndex}-${matchupIndex}-${row.hole}`} style={{ ...scorecardCellStyle, background: teamAHasBirdie ? "#dcfce7" : "transparent", color: teamAHasBirdie ? "#137333" : "#1a1a1a", fontWeight: teamAHasBirdie ? 700 : 400 }}>
                  {row.teamAValue}
                </td>
              );
            })}
            <td style={{ ...scorecardCellStyle, fontWeight: 700, borderLeft: "2px solid #e5e7eb" }}>
              {(() => {
                const bestBallTotal = teamA.filter(Boolean).reduce((best, id) => {
                  const total = holes.reduce((s, h) => { const v = getRawScore(scores, h, id); return s + (v != null ? Number(v) : 0); }, 0);
                  return best === null ? total : Math.min(best, total);
                }, null);
                return bestBallTotal || "-";
              })()}
            </td>
          </tr>

          <tr>
            <td style={scorecardLabelCellStyle}>{teamBName}</td>
            {rows.map((row) => {
              const teamBHasBirdie = teamB.filter(Boolean).some(id =>
                isGrossBirdie(scores, course, row.hole, id)
              );
              return (
                <td key={`team-b-${gameIndex}-${matchupIndex}-${row.hole}`} style={{ ...scorecardCellStyle, background: teamBHasBirdie ? "#dcfce7" : "transparent", color: teamBHasBirdie ? "#137333" : "#1a1a1a", fontWeight: teamBHasBirdie ? 700 : 400 }}>
                  {row.teamBValue}
                </td>
              );
            })}
            <td style={{ ...scorecardCellStyle, fontWeight: 700, borderLeft: "2px solid #e5e7eb" }}>
              {(() => {
                const bestBallTotal = teamB.filter(Boolean).reduce((best, id) => {
                  const total = holes.reduce((s, h) => { const v = getRawScore(scores, h, id); return s + (v != null ? Number(v) : 0); }, 0);
                  return best === null ? total : Math.min(best, total);
                }, null);
                return bestBallTotal || "-";
              })()}
            </td>
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
            <td style={{ ...scorecardCellStyle, borderLeft: "2px solid #e5e7eb" }}></td>
          </tr>

          <tr>
            <td style={scorecardLabelCellStyle}>Holes {game.start}–{game.end}</td>
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
            <td style={{ ...scorecardCellStyle, borderLeft: "2px solid #e5e7eb" }}></td>
          </tr>

          {showPressDetail && (
            <tr>
              <td style={scorecardLabelCellStyle}>Press Detail</td>
              {rows.map((row) => (
                <td key={`press-${gameIndex}-${matchupIndex}-${row.hole}`} style={{ ...scorecardCellStyle, color: "#444" }}>
                  {row.pressDetail}
                </td>
              ))}
              <td style={{ ...scorecardCellStyle, borderLeft: "2px solid #e5e7eb" }}></td>
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

function getBestBallWinner(teamIds, hole, players, course, scores, handicapMode, getHandicapStrokesFn, noPar3Strokes = false) {
  const entries = (teamIds || [])
    .filter(Boolean)
    .map((playerId) => ({
      playerId,
      name: getPlayerName(players, playerId),
      gross: getRawScore(scores, hole, playerId),
      net: getNetScore(playerId, hole, players, course, scores, handicapMode, noPar3Strokes, getHandicapStrokesFn),
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

function AuditSection({ title, subtitle, children, defaultOpen = false, storageId, sessionKey }) {
  const baseKey = storageId || (typeof title === "string" ? title : "");
  const storageKey = `scorecard-section:${sessionKey ? `${sessionKey}:` : ""}${baseKey}`;

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
    <div style={{ border: "1px solid #d1d5db", borderRadius: 10, marginBottom: 10 }}>
      <button
        type="button"
        onClick={toggleOpen}
        style={{
          width: "100%",
          padding: "11px 14px",
          textAlign: "left",
          background: open ? "#f0f7f3" : "#f9fafb",
          color: "#1a1a1a",
          borderLeft: open ? "3px solid #1a5c35" : "3px solid transparent",
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
      {subtitle && <div style={{ padding: "4px 14px 8px", background: "#f9fafb", fontSize: 12, color: "#6b7280", borderTop: "1px solid #e5e7eb" }}>{subtitle}</div>}
      {open && <div style={{ padding: 12, background: "#fff" }}>{children}</div>}
    </div>
  );
}



function OneVOneAudit({ players, matches, matchResults, birdieResults, scores, course, handicapMode, sessionKey }) {
  const sideMatchEntries = (matchResults || []).filter((entry) => !isNinePointMatch(entry.match));

  if (!sideMatchEntries.length) return null;

  return (
    <AuditSection title="1v1 Matches" defaultOpen={false} storageId="onevone-matches" sessionKey={sessionKey}>
      {sideMatchEntries.map((entry, entryIndex) => {
        const match = entry.match;
        const result = entry.result || {};
        const p1Name = getPlayerName(players, match.p1Id);
        const p2Name = getPlayerName(players, match.p2Id);
        const p1First = p1Name.split(" ")[0];

        // Birdie $$ for this match from P1 perspective
        const matchBirdieNet = (birdieResults || [])
          .filter(e => e.source === "match-birdie" && e.matchId === match.id && e.playerId === match.p1Id)
          .reduce((sum, e) => sum + Number(e.amount || 0), 0);

        const total = Number(result?.total || 0);
        const headerColor = total > 0 ? "#1a5c35" : total < 0 ? "#b3261e" : "#6b7280";
        const birdieColor = matchBirdieNet > 0 ? "#1a5c35" : matchBirdieNet < 0 ? "#b3261e" : "#6b7280";
        const fmtMoney = (v) => v >= 0 ? `+$${Math.abs(v).toFixed(2).replace(/\.00$/, "")}` : `-$${Math.abs(v).toFixed(2).replace(/\.00$/, "")}`;
        const col = (v) => v > 0 ? "#1a5c35" : v < 0 ? "#b3261e" : "#6b7280";

        // Format-specific detail line
        const formatDetail = (() => {
          if (!result) return null;
          if (result.type === "standard") {
            const units = result.units || 0;
            const absUnits = Math.abs(units);
            if (units === 0) return <span style={{ color: "#6b7280" }}>Even</span>;
            const sign = units > 0 ? "+" : "-";
            const label = `${p1First} ${sign}${absUnits} hole${absUnits !== 1 ? "s" : ""} (${fmtMoney(total)})`;
            return <span style={{ color: col(total) }}>{label}</span>;
          }
          if (result.type === "longshort") {
            const longCol = col(result.long || 0);
            const shortCol = col(result.short || 0);
            return (
              <span>
                <span style={{ color: longCol }}>Long {fmtMoney(result.long || 0)}</span>
                <span style={{ color: "#6b7280" }}> · </span>
                <span style={{ color: shortCol }}>Short {fmtMoney(result.short || 0)}</span>
              </span>
            );
          }
          if (result.type === "match_fbt") {
            const segs = result.segments || [];
            const frontSeg = segs.find(s => s.key === "front");
            const backSeg = segs.find(s => s.key === "back");
            const totalSeg = segs.find(s => s.key === "total");
            // Total only — show P1 name + golf notation + $$
            if (totalSeg && !frontSeg && !backSeg) {
              const units = totalSeg.units || 0;
              const resultLbl = totalSeg.resultLabel || (units === 0 ? "AS" : `${Math.abs(units)}UP`);
              // Always from P1 perspective — show P1 name + result
              return <span style={{ color: col(total) }}>{p1First} {resultLbl} ({fmtMoney(total)})</span>;
            }
            // F/B or F/B/T — show segment breakdown
            return (
              <span>
                {segs.map((seg, i) => {
                  const u = seg.units || 0;
                  const lbl = u === 0 ? "AS" : `${Math.abs(u)}${u > 0 ? "UP" : "DN"}`;
                  return (
                    <span key={seg.key}>
                      {i > 0 && <span style={{ color: "#6b7280" }}> · </span>}
                      <span style={{ color: col(u) }}>
                        {seg.key === "front" ? "F" : seg.key === "back" ? "B" : "T"} {lbl}
                      </span>
                    </span>
                  );
                })}
              </span>
            );
          }
          if (result.type === "stroke") {
            const segs = result.segments || [];
            const frontSeg = segs.find(s => s.key === "front");
            const backSeg = segs.find(s => s.key === "back");
            const totalSeg = segs.find(s => s.key === "total");
            if (totalSeg && !frontSeg && !backSeg) {
              const diff = totalSeg.strokeDiff ?? totalSeg.units ?? 0;
              const lbl = diff === 0 ? "Even" : diff > 0 ? `+${diff}` : `${diff}`;
              return <span style={{ color: col(diff) }}>{p1First} {lbl} strokes ({fmtMoney(total)})</span>;
            }
            return (
              <span>
                {segs.map((seg, i) => {
                  const diff = seg.strokeDiff ?? seg.units ?? 0;
                  const lbl = diff === 0 ? "Even" : diff > 0 ? `+${diff}` : `${diff}`;
                  return (
                    <span key={seg.key}>
                      {i > 0 && <span style={{ color: "#6b7280" }}> · </span>}
                      <span style={{ color: col(diff) }}>
                        {seg.key === "front" ? "F" : seg.key === "back" ? "B" : "T"} {lbl}
                      </span>
                    </span>
                  );
                })}
                <span style={{ color: col(total), marginLeft: 6 }}>({fmtMoney(total)})</span>
              </span>
            );
          }
          // Press (array of bets)
          return <span style={{ color: headerColor }}>{fmtMoney(total)}</span>;
        })();

        const oneVOneTitle = (
          <span>
            <span style={{ fontWeight: 700, color: "#1a1a1a" }}>{p1Name} vs {p2Name}</span>
            {formatDetail && <span style={{ marginLeft: 10, fontSize: 13 }}>{formatDetail}</span>}
            {matchBirdieNet !== 0 && (
              <span style={{ color: birdieColor, marginLeft: 10, fontSize: 13 }}>
                Birdies {fmtMoney(matchBirdieNet)}
              </span>
            )}
          </span>
        );

        return (
         <AuditSection
  key={match.id}
  title={oneVOneTitle}
  storageId={`onevone-match-${entryIndex}`}
  defaultOpen={false}
  sessionKey={sessionKey}
>
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
  birdieResults = [],
}) {
  const [showCumulative, setShowCumulative] = React.useState(false);

  const holes = result?.holes || [];
  if (!holes.length) return null;

  // Only show players who are actually in this match
  const matchPlayerIds = [match?.p1Id, match?.p2Id, match?.p3Id].filter(Boolean);
  const matchPlayers = players.filter(p => matchPlayerIds.includes(p.id));

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



  const renderSection = (label, sectionHoles, showLabel = false) => {
    const isFront = label === "Front 9";
    const isBack = label === "Back 9";

    const payoutBalances = result?.payout?.balancesByPlayerId || {};
    const fullPtTotals = result?.totalsByPlayerId || {};

    const hasAnyScore = sectionHoles.some(h =>
      matchPlayers.some(p => {
        const s = scores?.[h.hole]?.[p.id];
        return s != null && Number.isFinite(Number(s));
      })
    );

    const sectionPtTotals = Object.fromEntries(matchPlayers.map(p => [
      p.id,
      sectionHoles.reduce((sum, h) => {
        const hasScore = matchPlayers.some(mp => {
          const s = scores?.[h.hole]?.[mp.id];
          return s != null && Number.isFinite(Number(s));
        });
        return hasScore ? sum + (h.pointsByPlayerId?.[p.id] ?? 0) : sum;
      }, 0)
    ]));

    const fmtNet = (v) => {
      if (v === 0) return "Even";
      const abs = Math.abs(v);
      const str = Number.isInteger(abs) ? String(abs) : abs.toFixed(2);
      return v > 0 ? `+$${str}` : `-$${str}`;
    };

    const extraCols = (isFront ? 1 : 0) + (isBack ? 2 : 0);

    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
        <div className="scorecard-scroll" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
            <tbody>
              {/* Hole header */}
              <tr>
                <td style={{ ...scorecardLabelCellStyle, fontSize: 12 }}>Hole</td>
                {sectionHoles.map((h) => (
                  <td key={h.hole} style={{ ...scorecardCellStyle, fontSize: 12, color: "#6b7280" }}>{h.hole}</td>
                ))}
                {isFront && <td style={{ ...scorecardCellStyle, fontSize: 12, color: "#6b7280", fontWeight: 700 }}>Out</td>}
                {isBack && <td style={{ ...scorecardCellStyle, fontSize: 12, color: "#6b7280", fontWeight: 700 }}>In</td>}
                {isBack && <td style={{ ...scorecardCellStyle, fontSize: 12, color: "#6b7280", fontWeight: 700 }}>Tot</td>}
              </tr>

              <tr>
                <td style={{ ...scorecardLabelCellStyle, fontSize: 12 }}>Par</td>
                {sectionHoles.map((h) => (
                  <td key={h.hole} style={{ ...scorecardCellStyle, fontSize: 12, color: "#9ca3af" }}>{course?.pars?.[h.hole - 1] ?? "-"}</td>
                ))}
                {isFront && <td style={{ ...scorecardCellStyle, fontSize: 12, color: "#9ca3af" }}>{sectionHoles.reduce((s, h) => s + (Number(course?.pars?.[h.hole - 1]) || 0), 0)}</td>}
                {isBack && <td style={{ ...scorecardCellStyle, fontSize: 12, color: "#9ca3af" }}>{sectionHoles.reduce((s, h) => s + (Number(course?.pars?.[h.hole - 1]) || 0), 0)}</td>}
                {isBack && <td style={{ ...scorecardCellStyle }}></td>}
              </tr>

              <tr>
                <td style={{ ...scorecardLabelCellStyle, fontSize: 12 }}>HCP</td>
                {sectionHoles.map((h) => (
                  <td key={h.hole} style={{ ...scorecardCellStyle, fontSize: 12, color: "#9ca3af" }}>{course?.hcp?.[h.hole - 1] ?? "-"}</td>
                ))}
                {isFront && <td style={{ ...scorecardCellStyle }}></td>}
                {isBack && <td style={{ ...scorecardCellStyle }}></td>}
                {isBack && <td style={{ ...scorecardCellStyle }}></td>}
              </tr>

              {/* POINTS SECTION HEADER with toggle */}
              <tr>
                <td colSpan={sectionHoles.length + 1 + extraCols} style={{ padding: "6px 4px 2px", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", borderTop: "2px solid #e5e7eb" }}>
                  <span>Points {betAmt !== 1 ? `($${betAmt})` : ""}</span>
                  {isFront && (
                    <span style={{ marginLeft: 10 }}>
                      {[{ v: false, l: "Per Hole" }, { v: true, l: "Cumulative" }].map(({ v, l }, i) => (
                        <button key={l} onClick={() => setShowCumulative(v)} style={{
                          padding: "2px 8px", fontSize: 10, fontFamily: "inherit",
                          border: "1px solid #1a5c35",
                          borderRight: i === 0 ? "none" : "1px solid #1a5c35",
                          borderRadius: i === 0 ? "4px 0 0 4px" : "0 4px 4px 0",
                          background: showCumulative === v ? "#1a5c35" : "white",
                          color: showCumulative === v ? "white" : "#1a5c35",
                          cursor: "pointer",
                        }}>{l}</button>
                      ))}
                    </span>
                  )}
                </td>
              </tr>

              {/* POINTS ROWS */}
              {matchPlayers.map((player) => {
                const netAmt = payoutBalances[player.id] ?? null;
                const netColor = netAmt === null ? "#ccc" : netAmt > 0 ? "#137333" : netAmt < 0 ? "#b3261e" : "#6b7280";
                const secPts = sectionPtTotals[player.id];
                const totPts = fullPtTotals[player.id] ?? 0;

                return (
                  <tr key={`pts-${player.id}`}>
                    <td style={{ ...scorecardLabelCellStyle, padding: "3px 4px" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{initial(player)}</span>
                      {showLabel && netAmt !== null
                        ? <span style={{ fontSize: 13, fontWeight: 800, color: netColor, marginLeft: 6 }}>{fmtNet(netAmt)}</span>
                        : null}
                    </td>
                    {sectionHoles.map((h) => {
                      const hasScore = matchPlayers.some(p => {
                        const s = scores?.[h.hole]?.[p.id];
                        return s != null && Number.isFinite(Number(s));
                      });
                      if (!hasScore) return <td key={h.hole} style={{ ...scorecardCellStyle, color: "#e5e7eb", fontSize: 13 }}>–</td>;

                      const rawPts = h.pointsByPlayerId?.[player.id] ?? 0;
                      const cumPts = h.runningTotalsByPlayerId?.[player.id] ?? null;
                      const { bg, color } = ptColor(rawPts, hasScore);
                      const displayVal = showCumulative
                        ? (cumPts ?? "–")
                        : (rawPts * betAmt > 0 ? rawPts * betAmt : "0");
                      return (
                        <td key={h.hole} style={{ ...scorecardCellStyle, background: bg, fontSize: 13, color, fontWeight: 700 }}>
                          {displayVal}
                        </td>
                      );
                    })}
                    {isFront && <td style={{ ...scorecardCellStyle, fontWeight: 700, fontSize: 12 }}>{hasAnyScore ? secPts : "–"}</td>}
                    {isBack && <td style={{ ...scorecardCellStyle, fontWeight: 700, fontSize: 12 }}>{hasAnyScore ? secPts : "–"}</td>}
                    {isBack && <td style={{ ...scorecardCellStyle, fontWeight: 700, fontSize: 12, color: netColor }}>{hasAnyScore ? totPts : "–"}</td>}
                  </tr>
                );
              })}

              {/* SCORES SECTION HEADER */}
              <tr>
                <td colSpan={sectionHoles.length + 1 + extraCols} style={{ padding: "6px 4px 2px", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", borderTop: "2px solid #e5e7eb" }}>
                  Scores
                </td>
              </tr>

              {/* SCORE ROWS */}
              {matchPlayers.map((player) => (
                <tr key={`score-${player.id}`}>
                  <td style={{ ...scorecardLabelCellStyle, fontSize: 12, color: "#6b7280" }}>{shortName(player.name)}</td>
                  {sectionHoles.map((h) => {
                    const gross = getRawScore(scores, h.hole, player.id);
                    const strokes = getHandicapStrokes(player.id, h.hole, players, course, handicapMode, !!match?.noPar3Strokes);
                    const display = gross != null ? `${gross}${"•".repeat(strokes)}` : "–";
                    const grossBirdie = isGrossBirdie(scores, course, h.hole, player.id);
                    const didDouble = grossBirdie && h.birdieMode === "birdie" && h.winnerPlayerId === player.id;
                    const didEagle = grossBirdie && h.birdieMode === "eagle" && h.winnerPlayerId === player.id;
                    const netBirdie = match?.birdieEnabled && toyRule && !grossBirdie && isNetBirdie(player.id, h.hole, players, course, scores, handicapMode, !!match?.noPar3Strokes);
                    return (
                      <td key={h.hole} style={{ ...scorecardCellStyle, fontSize: 12, color: "#444" }}>
                        {(didDouble || didEagle) ? (
                          <span style={{ display: "inline-block", width: 20, height: 20, lineHeight: "20px", borderRadius: "50%", background: "#b8952a", color: "#fff", fontWeight: 700, fontSize: 11, outline: didEagle ? "2px solid #b8952a" : "none", outlineOffset: "2px" }}>
                            {display}
                          </span>
                        ) : grossBirdie ? (
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
                  {isFront && <td style={{ ...scorecardCellStyle, fontWeight: 700 }}>
                    {sectionHoles.reduce((s, h) => { const v = getRawScore(scores, h.hole, player.id); return s + (v != null ? Number(v) : 0); }, 0) || "-"}
                  </td>}
                  {isBack && <td style={{ ...scorecardCellStyle, fontWeight: 700 }}>
                    {sectionHoles.reduce((s, h) => { const v = getRawScore(scores, h.hole, player.id); return s + (v != null ? Number(v) : 0); }, 0) || "-"}
                  </td>}
                  {isBack && <td style={{ ...scorecardCellStyle, fontWeight: 700 }}>
                    {allHoleNums.reduce((s, hn) => { const v = getRawScore(scores, hn, player.id); return s + (v != null ? Number(v) : 0); }, 0) || "-"}
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const backHasScores = back.some(h => {
    const s = scores?.[h.hole];
    return s && matchPlayers.some(p => s[p.id] != null && Number.isFinite(Number(s[p.id])));
  });

  return (
    <div style={{ marginTop: 8 }}>
      {renderSection("Front 9", front, !backHasScores)}
      {renderSection("Back 9", back, backHasScores)}

      {/* Total Pts per player */}
      {(() => {
        const totals = result?.totalsByPlayerId || {};
        const ranked = [...matchPlayers].sort((a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0));
        const totalPts = ranked.reduce((sum, p) => sum + (totals[p.id] ?? 0), 0);
        if (totalPts === 0) return null;
        return (
          <div style={{ fontSize: 13, color: "#555", marginTop: 6, paddingLeft: 2, fontWeight: 600 }}>
            Total Pts:{" "}
            {ranked.map((p) => {
              const pts = totals[p.id] ?? 0;
              return (
                <span key={p.id} style={{ marginRight: 10 }}>
                  <span style={{ color: "#1a1a1a" }}>{p.name.split(" ")[0]}</span>
                  <span style={{ color: "#6b7280", marginLeft: 3 }}>{pts}</span>
                </span>
              );
            })}
          </div>
        );
      })()}
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
  const isStroke = match.type === "stroke";
  const isGrossStroke = isStroke && (match.strokeScoring === "gross");

  // For stroke play, use pre-computed running diffs from result
  // result.holes[i] = cumulative running diff at hole i+1 (positive = P1 ahead)
  const strokeRunningDiffs = isStroke ? (result?.holes || []) : [];

  const holes = Array.from({ length: 18 }, (_, i) => i + 1);
  const front = holes.slice(0, 9);
  const back = holes.slice(9, 18);
  const toyRule = !!match.toyRule;

  // Pre-compute hole results and running totals for all 18 holes
  const isFBT = !!(result?.segments?.find(s => s.key === "front") && result?.segments?.find(s => s.key === "back"));
  const frontDecidedOn = result?.segments?.find(s => s.key === "front")?.decidedOn ?? null;
  const backDecidedOn = result?.segments?.find(s => s.key === "back")?.decidedOn ?? null;

  // Helper: format a match conclusion correctly
  // X&Y if decided before last hole, X up if decided on last hole, AS if tied
  function fmtConclusion(units, decidedOn, lastHole) {
    if (units === 0) return { label: "AS", color: "#6b7280" };
    const abs = Math.abs(units);
    const remaining = lastHole - decidedOn;
    const label = remaining === 0 ? `${abs} up` : `${abs}&${remaining}`;
    return { label, color: units > 0 ? "#137333" : "#b3261e" };
  }

  let longRunning = 0;
  let shortRunning = 0;
  let frontRunning = 0;
  let backRunning = 0;
  let cumulativeRunning = 0;

  const holeData = holes.map((hole) => {
    if (isStroke) {
      const cumulative = strokeRunningDiffs[hole - 1] ?? null;
      const prev = hole > 1 ? (strokeRunningDiffs[hole - 2] ?? null) : 0;
      const holeDiff = (cumulative !== null && prev !== null) ? cumulative - prev : null;
      return { hole, res: holeDiff, running: cumulative, totalRunning: cumulative, segment: null, frontRunning: null, backRunning: null };
    }

    const aScore = getRawScore(scores, hole, playerA.id);
    const bScore = getRawScore(scores, hole, playerB.id);
    const holePlayed = aScore != null && bScore != null;

    const res = holePlayed ? computeHoleResult({
      hole, teamA: [playerA.id], teamB: [playerB.id],
      players: matchPlayers, course, scores, handicapMode,
    }) : null;

    // Cumulative across all 18
    if (holePlayed && res != null) {
      if (res > 0) cumulativeRunning += 1;
      if (res < 0) cumulativeRunning -= 1;
    }
    const totalRunning = holePlayed ? cumulativeRunning : null;

    if (isLongShort) {
      if (longClosedOn === null || hole <= longClosedOn) {
        if (holePlayed && res != null) {
          if (res > 0) longRunning += 1;
          if (res < 0) longRunning -= 1;
        }
        return { hole, res, running: holePlayed ? longRunning : null, totalRunning, segment: "Long", afterDecided: false };
      } else {
        if (holePlayed && res != null) {
          if (res > 0) shortRunning += 1;
          if (res < 0) shortRunning -= 1;
        }
        return { hole, res, running: holePlayed ? shortRunning : null, totalRunning, segment: "Short", afterDecided: false };
      }
    }

    if (isFBT) {
      const isFrontHole = hole <= 9;
      const afterFrontDecided = frontDecidedOn != null && hole > frontDecidedOn;
      const afterBackDecided = !isFrontHole && backDecidedOn != null && hole > backDecidedOn;

      if (isFrontHole && !afterFrontDecided && holePlayed && res != null) {
        if (res > 0) frontRunning += 1;
        if (res < 0) frontRunning -= 1;
      }
      if (!isFrontHole && !afterBackDecided && holePlayed && res != null) {
        if (res > 0) backRunning += 1;
        if (res < 0) backRunning -= 1;
      }

      return {
        hole, res,
        running: holePlayed ? (isFrontHole ? frontRunning : backRunning) : null,
        totalRunning,
        afterFrontDecided: isFrontHole && afterFrontDecided,
        afterBackDecided: !isFrontHole && afterBackDecided,
        segment: null,
      };
    }

    // Net Holes — continuous no reset
    if (holePlayed && res != null) {
      if (res > 0) longRunning += 1;
      if (res < 0) longRunning -= 1;
    }
    return { hole, res, running: holePlayed ? longRunning : null, totalRunning, segment: null, afterFrontDecided: false, afterBackDecided: false };
  });

  // Count won birdies per player for summary
  // With toy rule: a gross birdie is pushed (no winner) if the opponent has a net birdie on same hole
  // Only count birdies that actually won money
  const wonBirdieCounts = (() => {
    const countA = holes.filter(h => {
      const grossA = match.birdieEnabled && isGrossBirdie(scores, course, h, playerA.id);
      if (!grossA) return false;
      if (!toyRule) return true;
      // pushed if opponent has net birdie
      const netB = isNetBirdie(playerB.id, h, matchPlayers, course, scores, handicapMode, !!match.noPar3Strokes);
      return !netB;
    }).length;
    const countB = holes.filter(h => {
      const grossB = match.birdieEnabled && isGrossBirdie(scores, course, h, playerB.id);
      if (!grossB) return false;
      if (!toyRule) return true;
      const netA = isNetBirdie(playerA.id, h, matchPlayers, course, scores, handicapMode, !!match.noPar3Strokes);
      return !netA;
    }).length;
    return { [playerA.id]: countA, [playerB.id]: countB };
  })();

  const renderSection = (label, sectionHoles) => {
    const sectionData = holeData.filter(d => sectionHoles.includes(d.hole));

    // Find if match was decided within this section
    const decidedHole = result?.decidedOn
      ?? result?.segments?.reduce((found, s) => found ?? s.decidedOn, null)
      ?? null;
    const decidedInSection = decidedHole != null && sectionHoles.includes(decidedHole);

    // Gross totals per player for this section (all scored holes)
    const sectionTotal = (player) => sectionHoles.reduce((sum, h) => {
      const s = getRawScore(scores, h, player.id);
      return sum + (s != null ? Number(s) : 0);
    }, 0);

    return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div className="scorecard-scroll" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "thin", scrollbarColor: "#d1d5db transparent" }}>
      <table style={{ borderCollapse: "collapse", minWidth: 600 }}>
        <tbody>
          <tr>
            <td style={scorecardLabelCellStyle}>Hole</td>
            {sectionHoles.map(h => (
              <td key={h} style={{ ...scorecardCellStyle, color: "#444" }}>{h}</td>
            ))}
            <td style={{ ...scorecardCellStyle, fontWeight: 700, color: "#444", borderLeft: "1px solid #ddd" }}>Tot</td>
          </tr>

          <tr>
            <td style={scorecardLabelCellStyle}>Par</td>
            {sectionHoles.map(h => (
              <td key={h} style={{ ...scorecardCellStyle, color: "#888" }}>{course?.pars?.[h - 1] ?? "-"}</td>
            ))}
            <td style={{ ...scorecardCellStyle, color: "#888", borderLeft: "1px solid #ddd" }}>
              {sectionHoles.reduce((s, h) => s + (Number(course?.pars?.[h - 1]) || 0), 0)}
            </td>
          </tr>

          <tr>
            <td style={scorecardLabelCellStyle}>HCP</td>
            {sectionHoles.map(h => (
              <td key={h} style={{ ...scorecardCellStyle, color: "#888" }}>{course?.hcp?.[h - 1] ?? "-"}</td>
            ))}
            <td style={{ ...scorecardCellStyle, borderLeft: "1px solid #ddd" }}></td>
          </tr>

          {[playerA, playerB].map((player) => (
            <tr key={player.id}>
              <td style={scorecardLabelCellStyle}>{player.name}</td>
              {sectionHoles.map((hole) => {
                const afterDecided = decidedInSection && hole > decidedHole;
                if (afterDecided) return <td key={hole} style={{ ...scorecardCellStyle, color: "#ccc" }}>-</td>;
                const gross = getRawScore(scores, hole, player.id);
                const strokes = isGrossStroke ? 0 : getHandicapStrokes(player.id, hole, matchPlayers, course, handicapMode, isLongShort ? false : !!match.noPar3Strokes);
                const grossBirdie = isGrossBirdie(scores, course, hole, player.id);
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
              <td style={{ ...scorecardCellStyle, fontWeight: 700, color: "#444", borderLeft: "1px solid #ddd" }}>
                {sectionTotal(player) || "-"}
              </td>
            </tr>
          ))}

          <tr>
            <td style={scorecardLabelCellStyle}>Result</td>
            {sectionData.map(({ hole, res, afterFrontDecided, afterBackDecided }) => {
              const afterDecided = (label === "Front 9" && afterFrontDecided) || (label === "Back 9" && afterBackDecided) || (!isFBT && decidedInSection && hole > decidedHole);
              const aScore = getRawScore(scores, hole, playerA.id);
              const bScore = getRawScore(scores, hole, playerB.id);
              const holePlayed = aScore != null && bScore != null;
              if (!holePlayed) return <td key={hole} style={{ ...scorecardCellStyle, color: "#ccc" }}>-</td>;
              if (isStroke) {
                if (res === null) return <td key={hole} style={{ ...scorecardCellStyle, color: "#ccc" }}>-</td>;
                const color = afterDecided ? "#ccc" : res > 0 ? "#137333" : res < 0 ? "#b3261e" : "#6b7280";
                const lbl = res === 0 ? "0" : res > 0 ? `+${res}` : `${res}`;
                return <td key={hole} style={{ ...scorecardCellStyle, color, fontWeight: 600 }}>{lbl}</td>;
              }
              // After segment decided: show result in grey (still counts for Total)
              const color = afterDecided ? "#bbb" : res > 0 ? "#137333" : res < 0 ? "#b3261e" : "#6b7280";
              return (
                <td key={hole} style={{ ...scorecardCellStyle, color, fontWeight: 600 }}>
                  {res > 0 ? playerA.name[0] : res < 0 ? playerB.name[0] : "Push"}
                </td>
              );
            })}
            <td style={{ ...scorecardCellStyle, borderLeft: "1px solid #ddd" }}></td>
          </tr>

          <tr>
            <td style={scorecardLabelCellStyle}>{label}</td>
            {sectionData.map(({ hole, running, segment, afterFrontDecided, afterBackDecided }) => {
              const afterDecided = (label === "Front 9" && afterFrontDecided) || (label === "Back 9" && afterBackDecided) || (!isFBT && decidedInSection && hole > decidedHole);
              const aScore = getRawScore(scores, hole, playerA.id);
              const bScore = getRawScore(scores, hole, playerB.id);
              const holePlayed = aScore != null && bScore != null;
              if (!holePlayed) return <td key={hole} style={{ ...scorecardCellStyle, color: "#ccc" }}>-</td>;

              // After segment decided: show "-"
              if (afterDecided) return <td key={hole} style={{ ...scorecardCellStyle, color: "#ccc" }}>-</td>;

              if (isStroke) {
                if (running === null) return <td key={hole} style={{ ...scorecardCellStyle, color: "#ccc" }}>-</td>;
                const color = running > 0 ? "#137333" : running < 0 ? "#b3261e" : "#6b7280";
                const lbl = running === 0 ? "0" : running > 0 ? `+${running}` : `${running}`;
                return <td key={hole} style={{ ...scorecardCellStyle, color, fontWeight: 600 }}>{lbl}</td>;
              }

              // On the deciding hole: show conclusion format
              const isFrontDeciding = label === "Front 9" && isFBT && frontDecidedOn === hole;
              const isBackDeciding = label === "Back 9" && isFBT && backDecidedOn === hole;
              const isDeciding = isFrontDeciding || isBackDeciding || (!isFBT && decidedInSection && decidedHole === hole);

              if (isDeciding) {
                const seg = isFrontDeciding ? result?.segments?.find(s => s.key === "front")
                           : isBackDeciding ? result?.segments?.find(s => s.key === "back")
                           : null;
                const units = seg ? seg.units : running;
                const lastHole = isFrontDeciding ? 9 : isBackDeciding ? 18 : 18;
                const fmt = fmtConclusion(units, hole, lastHole);
                return <td key={hole} style={{ ...scorecardCellStyle, color: fmt.color, fontWeight: 700 }}>{fmt.label}</td>;
              }

              // Non-FBT decided on this hole
              if (!isFBT && decidedInSection && decidedHole === hole) {
                const units = running;
                const fmt = fmtConclusion(units, hole, 18);
                return <td key={hole} style={{ ...scorecardCellStyle, color: fmt.color, fontWeight: 700 }}>{fmt.label}</td>;
              }

              const color = running > 0 ? "#137333" : running < 0 ? "#b3261e" : "#6b7280";
              const prefix = segment ? `${segment[0]}: ` : "";
              return (
                <td key={hole} style={{ ...scorecardCellStyle, color, fontWeight: 600 }}>
                  {prefix}{running === 0 ? "Even" : running > 0 ? `${running} up` : `${Math.abs(running)} dn`}
                </td>
              );
            })}
            <td style={{ ...scorecardCellStyle, borderLeft: "1px solid #ddd" }}></td>
          </tr>

          {/* Total row — only on Back 9 when F/B/T all checked */}
          {label === "Back 9" && !isLongShort && !isStroke && result?.segments?.find(s => s.key === "front") && result?.segments?.find(s => s.key === "back") && (
            <tr>
              <td style={{ ...scorecardLabelCellStyle, fontWeight: 700 }}>Total</td>
              {sectionData.map(({ hole, totalRunning }) => {
                const aScore = getRawScore(scores, hole, playerA.id);
                const bScore = getRawScore(scores, hole, playerB.id);
                if (aScore == null || bScore == null || totalRunning == null) {
                  return <td key={hole} style={{ ...scorecardCellStyle, color: "#ccc" }}>-</td>;
                }
                const color = totalRunning > 0 ? "#137333" : totalRunning < 0 ? "#b3261e" : "#6b7280";
                return (
                  <td key={hole} style={{ ...scorecardCellStyle, color, fontWeight: 700 }}>
                    {totalRunning === 0 ? "Even" : totalRunning > 0 ? `${totalRunning} up` : `${Math.abs(totalRunning)} dn`}
                  </td>
                );
              })}
              <td style={{ ...scorecardCellStyle, borderLeft: "1px solid #ddd" }}></td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
  };
  const birdieCountA = wonBirdieCounts[playerA.id];
  const birdieCountB = wonBirdieCounts[playerB.id];

  return (
    <div style={{ marginTop: 8 }}>
      {renderSection("Front 9", front, true)}
      {renderSection("Back 9", back, false)}


      {/* Match Play F+B+T — Total row now inside table above */}

      {/* Stroke F+B+T — Total row */}
      {isStroke && result?.segments?.find(s => s.key === "front") && result?.segments?.find(s => s.key === "back") && (() => {
        const totalDiff = strokeRunningDiffs[17] ?? null;
        if (totalDiff === null) return null;
        const color = totalDiff > 0 ? "#137333" : totalDiff < 0 ? "#b3261e" : "#6b7280";
        const label = totalDiff === 0 ? "Even" : totalDiff > 0 ? `+${totalDiff}` : `${totalDiff}`;
        return (
          <div style={{ fontSize: 13, fontWeight: 700, padding: "7px 4px", borderTop: "2px solid #e5e7eb", display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#555" }}>Total</span>
            <span style={{ color }}>{label} strokes</span>
          </div>
        );
      })()}
      {/* Total Pts per player */}
      {(() => {
        const totals = result?.totalsByPlayerId || {};
        const ranked = [...matchPlayers].sort((a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0));
        const totalPts = ranked.reduce((sum, p) => sum + (totals[p.id] ?? 0), 0);
        if (totalPts === 0) return null;
        return (
          <div style={{ fontSize: 13, color: "#555", marginTop: 6, paddingLeft: 2, fontWeight: 600 }}>
            Total Pts —{" "}
            {ranked.map((p, i) => {
              const pts = totals[p.id] ?? 0;
              const color = pts >= 5 * holes.length / 3 ? "#137333" : pts <= 3 * holes.length / 3 ? "#b3261e" : "#92400e";
              return (
                <span key={p.id} style={{ marginRight: 10 }}>
                  <span style={{ color: "#1a1a1a" }}>{p.name.trim()[0]}</span>
                  <span style={{ color, marginLeft: 2 }}>{pts}pts</span>
                </span>
              );
            })}
          </div>
        );
      })()}

      {/* Match Summary Row */}
      {(() => {
        const fmtResult = (v, type) => {
          if (type === "stroke") {
            if (v === 0) return { label: "Even", color: "#6b7280" };
            return { label: v > 0 ? `+${v}` : `${v}`, color: v > 0 ? "#137333" : "#b3261e" };
          }
          if (v === 0) return { label: "AS", color: "#6b7280" };
          const abs = Math.abs(v);
          return { label: v > 0 ? `${abs} up` : `${abs} dn`, color: v > 0 ? "#137333" : "#b3261e" };
        };

        if (result?.type === "longshort") {
          const longUnits = result.long / (match.bet || 1);
          const longFmt = fmtResult(longUnits, "match");
          const longDone = result.longDecidedOn != null;
          const shortUnits = longDone ? (result.short / (match.bet / 2 || 1)) : null;
          return (
            <div style={{ fontSize: 13, padding: "6px 2px", borderTop: "1px solid #eee", display: "flex", gap: 12, flexWrap: "wrap" }}>
              <span><span style={{ color: "#555" }}>Long </span><span style={{ color: longFmt.color, fontWeight: 700 }}>{longFmt.label}</span></span>
              {longDone && shortUnits !== null && (
                <span><span style={{ color: "#555" }}>Short </span><span style={{ color: fmtResult(shortUnits, "match").color, fontWeight: 700 }}>{fmtResult(shortUnits, "match").label}</span></span>
              )}
            </div>
          );
        }

        if (result?.type === "match_fbt") {
          const segs = result.segments || [];
          const frontSeg = segs.find(s => s.key === "front");
          const backSeg = segs.find(s => s.key === "back");
          const totalSeg = segs.find(s => s.key === "total");
          const items = [];
          if (frontSeg) {
            const fmt = fmtConclusion(frontSeg.units, frontSeg.decidedOn ?? 9, 9);
            items.push({ key: "f", label: "Front", value: fmt.label, color: fmt.color });
          }
          if (backSeg) {
            const fmt = fmtConclusion(backSeg.units, backSeg.decidedOn ?? 18, 18);
            items.push({ key: "b", label: "Back", value: fmt.label, color: fmt.color });
          }
          if (totalSeg && (frontSeg || backSeg)) {
            const fmt = fmtConclusion(totalSeg.units, totalSeg.decidedOn ?? 18, 18);
            items.push({ key: "t", label: "Total", value: fmt.label, color: fmt.color });
          }
          if (totalSeg && !frontSeg && !backSeg) {
            const fmt = fmtConclusion(totalSeg.units, totalSeg.decidedOn ?? 18, 18);
            items.push({ key: "t", label: "Full Match", value: fmt.label, color: fmt.color });
          }
          if (!items.length) return null;
          return (
            <div style={{ fontSize: 13, padding: "6px 2px", borderTop: "1px solid #eee", display: "flex", gap: 12, flexWrap: "wrap" }}>
              {items.map((item, i) => (
                <span key={item.key}>
                  {i > 0 && <span style={{ color: "#ccc" }}> · </span>}
                  <span style={{ color: "#555" }}>{item.label} </span>
                  <span style={{ color: item.color, fontWeight: 700 }}>{item.value}</span>
                </span>
              ))}
            </div>
          );
        }

        if (result?.type === "stroke") {
          const segs = result.segments || [];
          const frontSeg = segs.find(s => s.key === "front");
          const backSeg = segs.find(s => s.key === "back");
          const totalSeg = segs.find(s => s.key === "total");
          const items = [];
          if (frontSeg) { const f = fmtResult(frontSeg.strokeDiff ?? frontSeg.units, "stroke"); items.push({ key: "f", label: "Front", value: f.label, color: f.color }); }
          if (backSeg) { const b = fmtResult(backSeg.strokeDiff ?? backSeg.units, "stroke"); items.push({ key: "b", label: "Back", value: b.label, color: b.color }); }
          if (totalSeg && (frontSeg || backSeg)) { const t = fmtResult(totalSeg.strokeDiff ?? totalSeg.units, "stroke"); items.push({ key: "t", label: "Total", value: t.label, color: t.color }); }
          if (totalSeg && !frontSeg && !backSeg) { const t = fmtResult(totalSeg.strokeDiff ?? totalSeg.units, "stroke"); items.push({ key: "t", label: "Full Match", value: t.label, color: t.color }); }
          if (!items.length) return null;
          return (
            <div style={{ fontSize: 13, padding: "6px 2px", borderTop: "1px solid #eee", display: "flex", gap: 12, flexWrap: "wrap" }}>
              {items.map((item, i) => (
                <span key={item.key}>
                  {i > 0 && <span style={{ color: "#ccc" }}> · </span>}
                  <span style={{ color: "#555" }}>{item.label} </span>
                  <span style={{ color: item.color, fontWeight: 700 }}>{item.value}</span>
                </span>
              ))}
            </div>
          );
        }

        return null;
      })()}

      <div style={{ fontSize: 12, color: "#555", marginTop: 4, paddingLeft: 2 }}>
        {!match.birdieEnabled
          ? "🚫 No birdies tracked"
          : (() => {
              const label = toyRule
                ? "🐦 Toy Birdies (pushes excluded)"
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
  birdieResults = [],
  sessionKey,
}) {
  const ninePointEntry = (matchResults || []).find((entry) =>
    isNinePointMatch(entry.match)
  );

  if (!ninePointEntry) return null;

  const { result, match } = ninePointEntry;

  // Compute total net $ per player: points payout + birdie side bet
  const matchPlayerIds = [match?.p1Id, match?.p2Id, match?.p3Id].filter(Boolean);
  const matchPlayers = players.filter(p => matchPlayerIds.includes(p.id));
  const pointsBalances = result?.payout?.balancesByPlayerId || {};
  const birdieTotals = Object.fromEntries(matchPlayerIds.map(id => [id, 0]));
  birdieResults.forEach(entry => {
    if (entry.source === "nine-point-birdie" && birdieTotals[entry.playerId] !== undefined) {
      birdieTotals[entry.playerId] += Number(entry.amount || 0);
    }
  });
  const netTotals = Object.fromEntries(matchPlayerIds.map(id => [
    id,
    (pointsBalances[id] || 0) + birdieTotals[id]
  ]));

  const rankedPlayers = [...matchPlayers].sort((a, b) => netTotals[b.id] - netTotals[a.id]);
  const fmtNet = (v) => {
    if (v === 0) return "Even";
    const abs = Math.abs(v);
    const str = Number.isInteger(abs) ? String(abs) : abs.toFixed(2);
    return v > 0 ? `+$${str}` : `-$${str}`;
  };

  const title = (
    <span>
      <span style={{ fontWeight: 700, color: "#1a1a1a" }}>9-Point</span>
      <span style={{ marginLeft: 10, fontSize: 13 }}>
        {rankedPlayers.map((player, i) => {
          const net = netTotals[player.id];
          const color = net > 0 ? "#137333" : net < 0 ? "#b3261e" : "#6b7280";
          return (
            <span key={player.id} style={{ marginRight: 10 }}>
              <span style={{ color: "#1a1a1a" }}>{player.name}</span>
              <span style={{ color, fontWeight: 700, marginLeft: 3 }}>{fmtNet(net)}</span>
            </span>
          );
        })}
      </span>
    </span>
  );

  return (
    <AuditSection title={title} defaultOpen={false} sessionKey={sessionKey}>
      <NinePointScorecard
        players={players}
        result={result}
        match={match}
        scores={scores}
        course={course}
        handicapMode={handicapMode}
        teamGameUnitAmount={teamGameUnitAmount}
        birdieResults={birdieResults}
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
  birdieResults = [],
  segmentBirdieAmounts = {},
  sessionKey,
}) {
  if (!teamGameResults?.length) return null;

  // Helper: compute birdie summary for a set of matchup labels
  function getBirdieSummary(matchupLabels, teamAIds, teamBIds, birdieResultsArr, unitAmount, birdiesEnabled, scores, course, holeRange) {
    if (!birdiesEnabled) return null;

    // All players in this matchup
    const allMatchupPlayerIds = [...new Set([...teamAIds, ...teamBIds])];

    // Count gross birdies from scores directly for these players on these holes
    const grossMadeSet = new Set();
    if (scores && course && holeRange) {
      const [start, end] = holeRange;
      for (let hole = start; hole <= end; hole++) {
        allMatchupPlayerIds.forEach(playerId => {
          if (isGrossBirdie(scores, course, hole, playerId)) {
            grossMadeSet.add(`${playerId}-${hole}`);
          }
        });
      }
    }
    const grossMade = grossMadeSet.size;
    if (grossMade === 0) return "No birdies this segment";

    return `${grossMade} birdie${grossMade !== 1 ? "s" : ""} made`;
  }

  // Compute overall player net $$ across ALL games for Level 0 header
  const overallPlayerDollars = {};
  players.forEach(p => { overallPlayerDollars[p.id] = 0; });
  teamGameResults.forEach(game => {
    (game.matches || []).forEach(matchup => {
      const sel = getTeamGameSelection?.(game.index ?? 0);
      const { teamAKey, teamBKey } = parseTeamKeys(matchup.label);
      const teamA = matchup.teamA || (sel?.[teamAKey] || []).filter(Boolean);
      const teamB = matchup.teamB || (sel?.[teamBKey] || []).filter(Boolean);
      const result = matchup.result;
      const isNonPress = result && !Array.isArray(result) && result.type;
      const dollars = isNonPress
        ? (result.total || 0)
        : getMatchUnits(result) * Number(teamGameUnitAmount || 0);
      teamA.forEach(id => { if (overallPlayerDollars[id] !== undefined) overallPlayerDollars[id] += dollars; });
      teamB.forEach(id => { if (overallPlayerDollars[id] !== undefined) overallPlayerDollars[id] -= dollars; });
    });
    // Add birdies
    (birdieResults || []).filter(e => e.source === "team-birdie").forEach(e => {
      if (overallPlayerDollars[e.playerId] !== undefined) overallPlayerDollars[e.playerId] += Number(e.amount || 0);
    });
  });
  // deduplicate birdie additions (they're already summed per game, don't double-add)
  // reset and redo properly
  players.forEach(p => { overallPlayerDollars[p.id] = 0; });
  (birdieResults || []).filter(e => e.source === "team-birdie").forEach(e => {
    if (overallPlayerDollars[e.playerId] !== undefined) overallPlayerDollars[e.playerId] += Number(e.amount || 0);
  });
  teamGameResults.forEach(game => {
    (game.matches || []).forEach(matchup => {
      const sel = getTeamGameSelection?.(game.index ?? 0);
      const { teamAKey, teamBKey } = parseTeamKeys(matchup.label);
      const teamA = matchup.teamA || (sel?.[teamAKey] || []).filter(Boolean);
      const teamB = matchup.teamB || (sel?.[teamBKey] || []).filter(Boolean);
      const result = matchup.result;
      const isNonPress = result && !Array.isArray(result) && result.type;
      const dollars = isNonPress
        ? (result.total || 0)
        : getMatchUnits(result) * Number(teamGameUnitAmount || 0);
      teamA.forEach(id => { if (overallPlayerDollars[id] !== undefined) overallPlayerDollars[id] += dollars; });
      teamB.forEach(id => { if (overallPlayerDollars[id] !== undefined) overallPlayerDollars[id] -= dollars; });
    });
  });

  const activePlayers = players.filter(p => Object.keys(overallPlayerDollars).includes(p.id) && p.name && !p.name.match(/^P\d+$/));
  const sortedPlayers = [...activePlayers].sort((a, b) => overallPlayerDollars[b.id] - overallPlayerDollars[a.id]);

  const teamGameTitle = (
    <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 8px" }}>
      <span style={{ fontWeight: 700, color: "#1a1a1a" }}>Team Game</span>
      {sortedPlayers.map((p) => {
        const net = overallPlayerDollars[p.id] || 0;
        const color = net > 0 ? "#137333" : net < 0 ? "#b3261e" : "#6b7280";
        return (
          <span key={p.id}>
            <span style={{ color: "#1a1a1a" }}>{p.name.split(" ")[0]}</span>
            <span style={{ color, marginLeft: 2 }}>{formatMoney(net)}</span>
          </span>
        );
      })}
    </span>
  );

  return (
     <AuditSection title={teamGameTitle} defaultOpen={true} sessionKey={sessionKey}>
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
          const units = getMatchUnits(matchup.result);
          teamA.forEach(id => { if (playerNetBets[id] !== undefined) playerNetBets[id] += units; });
          teamB.forEach(id => { if (playerNetBets[id] !== undefined) playerNetBets[id] -= units; });
        });

        // Wheel team is team1
        const wheelIds = (selection?.team1 || []).filter(Boolean);
        const wheelNames = wheelIds.map(id => players.find(p => p.id === id)?.name || id).join('/');
        const wheelBets = wheelIds.length > 0 ? (playerNetBets[wheelIds[0]] || 0) : 0;

        // Opponent players (not on wheel team)
        const opponentPlayers = players.filter(p => !wheelIds.includes(p.id));

        // Birdie summary for this segment
        const segmentMatchupLabels = (game.matches || []).map(m => m.label);
        const segmentWheelIds = wheelIds;
        const segmentTeamBIds = players.filter(p => !segmentWheelIds.includes(p.id)).map(p => p.id);
        const segmentBirdieLine = getBirdieSummary(segmentMatchupLabels, segmentWheelIds, segmentTeamBIds, birdieResults, teamGameUnitAmount, game.birdieEnabled, scores, course, [game.start, game.end]);

        // Birdie $$ per player — from pre-computed segmentBirdieAmounts (correct, no cross-segment issues)
        const playerBirdieDollars = segmentBirdieAmounts[game.index ?? gameIndex] || {};

        const wheelMatchPerPlayer = wheelBets * Number(teamGameUnitAmount || 0);
        // Wheel birdie per player — read directly from engine output (same for both wheel players)
        const wheelBirdiePerPlayer = wheelIds.length > 0 ? (playerBirdieDollars[wheelIds[0]] || 0) : 0;

        const fmtAmt = (v) => {
          if (v === 0) return "$0";
          const abs = Math.abs(v);
          const s = Number.isInteger(abs) ? String(abs) : abs.toFixed(2);
          return v > 0 ? `+$${s}` : `-$${s}`;
        };
        const col = (v) => v > 0 ? "#1a5c35" : v < 0 ? "#b3261e" : "#6b7280";

        const gameTitle = (
          <span style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "2px 6px", fontSize: 13 }}>
            <span style={{ fontWeight: 700, color: "#1a1a1a", whiteSpace: "nowrap", fontSize: 14 }}>Holes {game.start}–{game.end}</span>
            <span style={{ whiteSpace: "nowrap" }}>
              <span style={{ fontWeight: 600, color: "#1a1a1a" }}>{wheelNames}</span>{" "}
              <span style={{ color: col(wheelMatchPerPlayer) }}>{fmtAmt(wheelMatchPerPlayer)}ea</span>
              {wheelBirdiePerPlayer !== 0 && (
                <span style={{ color: col(wheelBirdiePerPlayer) }}> {fmtAmt(wheelBirdiePerPlayer)}ea 🐦</span>
              )}
            </span>
            {opponentPlayers.map((p) => {
              const matchDollars = (playerNetBets[p.id] || 0) * Number(teamGameUnitAmount || 0);
              const birdieDollars = playerBirdieDollars[p.id] || 0;
              return (
                <span key={p.id} style={{ whiteSpace: "nowrap" }}>
                  <span style={{ color: "#6b7280" }}> · </span>
                  <span style={{ color: "#1a1a1a" }}>{p.name.split(" ")[0]}</span>{" "}
                  <span style={{ color: col(matchDollars) }}>{fmtAmt(matchDollars)}</span>
                  {birdieDollars !== 0 && (
                    <span style={{ color: col(birdieDollars) }}> {fmtAmt(birdieDollars)} 🐦</span>
                  )}
                </span>
              );
            })}
          </span>
        );

        return (
          <div key={gameIndex}>
            <AuditSection
              title={gameTitle}
              defaultOpen={false}
              storageId={`game-${gameIndex}`}
              subtitle={segmentBirdieLine ? `🐦 ${segmentBirdieLine}` : null}
              sessionKey={sessionKey}
            >
            {(game.matches || []).map((matchup, matchupIndex) => {
              const { teamAKey, teamBKey } = parseTeamKeys(matchup.label);
              const teamA = matchup.teamA || (selection?.[teamAKey] || []).filter(Boolean);
              const teamB = matchup.teamB || (selection?.[teamBKey] || []).filter(Boolean);
              const teamAName = getTeamName(players, teamA);
              const teamBName = getTeamName(players, teamB);

              // Detect non-press result (has .type field)
              const result = matchup.result;
              const isNonPress = result && !Array.isArray(result) && result.type;

              let totalDollars = 0;
              let matchSummaryLine = null;

              if (isNonPress) {
                totalDollars = result.total || 0;
                const winner = totalDollars > 0 ? teamAName : totalDollars < 0 ? teamBName : null;
                if (result.type === "standard" || result.type === "longshort") {
                  matchSummaryLine = winner ? `${winner} wins — ${result.label || ""}` : "Tied";
                } else if (result.type === "match_fbt") {
                  matchSummaryLine = (result.segments || []).map(s => `${s.label}: ${s.resultLabel}`).join(" · ");
                } else if (result.type === "stroke") {
                  matchSummaryLine = (result.segments || []).map(s => {
                    const w = s.winner > 0 ? teamAName : s.winner < 0 ? teamBName : "Tied";
                    return `${s.label}: ${w}${s.diff != null ? ` by ${s.diff}` : ""}`;
                  }).join(" · ");
                }
              } else {
                const totalUnits = getMatchUnits(matchup.result);
                totalDollars = totalUnits * Number(teamGameUnitAmount || 0);
              }

              // Birdie summary for this matchup
              const matchupBirdieLine = getBirdieSummary([matchup.label], teamA, teamB, birdieResults, teamGameUnitAmount, game.birdieEnabled, scores, course, [game.start, game.end]);

              // Press detail for last completed hole
              const lastScoredHole = (() => {
                const segHoles = Array.from({ length: game.end - game.start + 1 }, (_, i) => game.end - i);
                return segHoles.find(h =>
                  teamA.concat(teamB).some(id => {
                    const s = scores?.[h]?.[id];
                    return s != null && Number.isFinite(Number(s));
                  })
                );
              })();
              const pressDetailStr = lastScoredHole && !isNonPress
                ? formatPressDetail(getBetStatusesForHole(Array.isArray(matchup.result) ? matchup.result : [], lastScoredHole))
                : null;

              // Initials helper
              const initials = (name = "") => name.split(" ").map(w => w[0]).join("").toUpperCase();
              const teamAInitials = teamA.map(id => initials(players.find(p => p.id === id)?.name)).join("/");
              const teamBInitials = teamB.map(id => initials(players.find(p => p.id === id)?.name)).join("/");

              // Birdie $$ for this matchup from teamA perspective — per player (ea)
              const matchupBirdieEntry = (birdieResults || []).find(e =>
                e.source === "team-birdie" &&
                e.matchupId === matchup.label &&
                e.holeNumber >= game.start &&
                e.holeNumber <= game.end &&
                teamA.includes(e.playerId)
              );
              const matchupBirdieDollars = matchupBirdieEntry ? Number(matchupBirdieEntry.amount || 0) : 0;
              const birdiePaidCount = matchupBirdieEntry ? (matchupBirdieEntry.netPaid || 0) : 0;
              const birdieDolColor = matchupBirdieDollars > 0 ? "#137333" : matchupBirdieDollars < 0 ? "#b3261e" : "#6b7280";

              const matchColor = totalDollars > 0 ? "#137333" : totalDollars < 0 ? "#b3261e" : "#666";
              const matchTitle = (
                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span>
                    <span style={{ fontWeight: 600, color: matchColor }}>
                      {teamAInitials} vs {teamBInitials} | {formatMoney(totalDollars)}ea
                    </span>
                    {matchupBirdieDollars !== 0 && (
                      <span style={{ color: birdieDolColor, marginLeft: 6, fontSize: 12 }}>
                        {formatMoney(matchupBirdieDollars)}ea 🐦
                      </span>
                    )}
                  </span>
                  {pressDetailStr && pressDetailStr !== "-" && (
                    <span style={{ fontSize: 11, color: "#6b7280" }}>Bets {pressDetailStr}</span>
                  )}
                  {game.birdieEnabled && (
                    <span style={{ fontSize: 11, color: "#6b7280" }}>
                      🐦 {matchupBirdieLine && matchupBirdieLine !== "No birdies this segment"
                        ? `${matchupBirdieLine} (${birdiePaidCount} paid)`
                        : "No birdies this segment"}
                    </span>
                  )}
                </span>
              );

              return (
                <AuditSection
                  key={`${gameIndex}-${matchupIndex}`}
                  title={matchTitle}
                  storageId={`matchup-${gameIndex}-${matchupIndex}`}
                  defaultOpen={false}
                  sessionKey={sessionKey}
                >
                  {isNonPress && (
                    <div style={{ padding: "8px 0 4px", fontSize: 13 }}>
                      {result.type === "match_fbt" && (result.segments || []).map(s => (
                        <div key={s.key} style={{ marginBottom: 4 }}>
                          <strong>{s.label}:</strong> {s.resultLabel} — {formatMoney(s.dollars)}
                        </div>
                      ))}
                      {result.type === "stroke" && (result.segments || []).map(s => (
                        <div key={s.key} style={{ marginBottom: 4 }}>
                          <strong>{s.label}:</strong> {teamAName} {s.aTotal ?? "–"} · {teamBName} {s.bTotal ?? "–"} — {formatMoney(s.dollars)}
                        </div>
                      ))}
                      {(result.type === "standard" || result.type === "longshort") && (
                        <div>{matchSummaryLine} — {formatMoney(totalDollars)}</div>
                      )}
                    </div>
                  )}
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
                    showPressDetail={!isNonPress}
                    noPar3Strokes={noPar3TeamGame}
                    getHandicapStrokesFn={getHandicapStrokesFn}
                  />
                  )}
                </AuditSection>
              );
            })}
          </AuditSection>
          </div>
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
  const dotStr = "•".repeat(strokes || 0);

  if (gross === null || gross === undefined) {
    return dotStr
      ? <span style={{ color: "#1a1a1a", fontSize: 11, fontWeight: 700, letterSpacing: "-1px" }}>{dotStr}</span>
      : <span style={{ color: "#d1d5db" }}>–</span>;
  }

  const symbol = getScoreSymbol(gross, par);
  const display = gross;
  const dotsEl = dotStr ? <span style={{ color: "#1a1a1a", fontSize: 9, letterSpacing: "-1px", display: "block", lineHeight: 1, fontWeight: 700 }}>{dotStr}</span> : null;

  if (!symbol) {
    return dotsEl
      ? <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}>{display}{dotsEl}</span>
      : <span>{display}</span>;
  }

  if (symbol.type === "birdie") {
    return (
      <span style={{
        display: "inline-flex", flexDirection: "column", alignItems: "center",
        minWidth: 26, height: 30, justifyContent: "center",
        borderRadius: "50%", border: `2px solid ${symbol.color}`,
        color: symbol.color, fontWeight: 700, fontSize: 11, padding: "0 2px"
      }}>
        {display}{dotsEl}
      </span>
    );
  }

  if (symbol.type === "eagle") {
    return (
      <span style={{
        display: "inline-flex", flexDirection: "column", alignItems: "center",
        minWidth: 26, height: 30, justifyContent: "center",
        borderRadius: "50%", border: `2px solid ${symbol.color}`,
        outline: `2px solid ${symbol.color}`, outlineOffset: "2px",
        color: symbol.color, fontWeight: 700, fontSize: 11, padding: "0 2px"
      }}>
        {display}{dotsEl}
      </span>
    );
  }

  if (symbol.type === "bogey") {
    return (
      <span style={{
        display: "inline-flex", flexDirection: "column", alignItems: "center",
        minWidth: 26, height: 30, justifyContent: "center",
        border: `2px solid ${symbol.color}`,
        color: symbol.color, fontWeight: 700, fontSize: 11, padding: "0 2px"
      }}>
        {display}{dotsEl}
      </span>
    );
  }

  if (symbol.type === "double") {
    return (
      <span style={{
        display: "inline-flex", flexDirection: "column", alignItems: "center",
        minWidth: 26, height: 30, justifyContent: "center",
        border: `2px solid ${symbol.color}`,
        outline: `2px solid ${symbol.color}`, outlineOffset: "2px",
        color: symbol.color, fontWeight: 700, fontSize: 11, padding: "0 2px"
      }}>
        {display}{dotsEl}
      </span>
    );
  }

  return <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}>{display}{dotsEl}</span>;
}

function TotalScorecard({ players, scores, course, handicapMode, goToLive, onUpdateScore, initialSelectedPlayer = null, getHandicapStrokesFn, noPar3TeamGame = false }) {
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
    background: "#fff",
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
      <div className="scorecard-scroll" style={{ marginBottom: 16, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
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
                <td key={h} style={{ ...cellStyle, color: "#888", fontSize: 10, textAlign: "right", paddingRight: 3 }}>{hcps[h - 1] || "-"}</td>
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
                _strokesFn(player.id, h, players, course, handicapMode, noPar3TeamGame)
              );
              const grossScores = sectionHoles.map(h => getRawScore(scores, h, player.id));
              const sectionTotal = grossScores.reduce((sum, g) => g !== null ? sum + g : sum, 0);
              const hasAllBack = grossScores.every(g => g !== null);

              const frontScores = front.map(h => getRawScore(scores, h, player.id));
              const frontTotal = frontScores.reduce((sum, g) => g !== null ? sum + g : sum, 0);
              const hasAllFront = frontScores.every(g => g !== null);

              const grossTotal = frontTotal + sectionTotal;
              const netStrokes = holes.reduce((sum, h) =>
                sum + getHandicapStrokes(player.id, h, players, course, "full", noPar3TeamGame), 0);
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
                    {player.name} ({Number(player.hcp) < 0 ? `+${Math.abs(Number(player.hcp))}` : player.hcp})
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
  segmentBirdieAmounts = {},
  sessionKey,
}) {
  return (
    <div>
      <div style={{ fontSize: 13, color: "#555", marginBottom: 10 }}>
        Tap any section to expand
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
  birdieResults={birdieResults}
  segmentBirdieAmounts={segmentBirdieAmounts}
  sessionKey={sessionKey}
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
  sessionKey={sessionKey}
/>

{/* 9 POINT */}
<NinePointAudit
  players={players}
  matchResults={matchResults}
  scores={scores}
  course={course}
  handicapMode={handicapMode}
  teamGameUnitAmount={teamGameUnitAmount}
  birdieResults={birdieResults}
  sessionKey={sessionKey}
/>

{/* TOTAL SCORECARD */}
<div ref={drillPlayerId ? (el) => { if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 150); } : null}>
  <AuditSection title={`Total Scorecard${course?.name ? ` · ${course.name}` : ""}`} defaultOpen={drillPlayerId !== null} key={drillPlayerId || "total"} sessionKey={sessionKey}>
    <TotalScorecard
      players={players}
      scores={scores}
      course={course}
      handicapMode={handicapMode}
      goToLive={goToLive}
      onUpdateScore={onUpdateScore}
      initialSelectedPlayer={drillPlayerId}
      getHandicapStrokesFn={null}
      noPar3TeamGame={noPar3TeamGame}
    />
  </AuditSection>
</div>

    </div>
  );
}
