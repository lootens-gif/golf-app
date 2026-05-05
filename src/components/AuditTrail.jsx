import { useState } from "react";
import {
  computeHoleResult,
  getNetScore,
  getRawScore,
  getTeamNetScore,
} from "../engine/scoringEngine";

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
  if (result?.type === "match_fbt") return "FBT";

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

      const units = Number(seg.units || 0);
      const resultLabel = seg.resultLabel || "Tie";

      if (units > 0) {
        return `${shortLabel}: ${p1Name} ${resultLabel}`;
      }

      if (units < 0) {
        return `${shortLabel}: ${p2Name} ${resultLabel}`;
      }

      return `${shortLabel}: Tie`;
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
  return players.find((player) => player.id === playerId)?.name || playerId;
}

function getTeamName(players, ids = []) {
  const names = ids.filter(Boolean).map((id) => getPlayerName(players, id));
  return names.length ? names.join(" / ") : "-";
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

function NinePointAudit({ players, matchResults }) {
  const ninePointEntry = (matchResults || []).find((entry) => isNinePointMatch(entry.match));
  if (!ninePointEntry) return null;

  const holes = ninePointEntry.result?.holes || [];

  return (
    <AuditSection title="9-Point Audit" defaultOpen>
      {holes.map((hole) => (
        <div key={hole.hole} style={{ borderTop: "1px solid #eee", paddingTop: 8, marginTop: 8 }}>
          <div><strong>Hole {hole.hole}</strong> — {hole.status}{hole.mode ? ` (${hole.mode})` : ""}</div>
          <div style={{ fontSize: 13 }}>
            Net: {players.map((player) => `${player.name} ${hole.netScoresByPlayerId?.[player.id] ?? "-"}`).join(" | ")}
          </div>
          <div style={{ fontSize: 13 }}>
            Points: {players.map((player) => `${player.name} ${hole.pointsByPlayerId?.[player.id] ?? 0}`).join(" | ")}
          </div>
          <div style={{ fontSize: 13 }}>
            Running: {players.map((player) => `${player.name} ${hole.runningTotalsByPlayerId?.[player.id] ?? 0}`).join(" | ")}
          </div>
        </div>
      ))}
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
                  <div style={{ marginBottom: 8 }}>
                    <strong>Press breakdown:</strong>{" "}
                    {(matchup.result || []).map((bet) => `${bet.label}: ${formatMatchScore(bet.score)} from hole ${bet.startHole}`).join("; ") || "-"}
                  </div>

                  {Array.from({ length: Number(game.end || 0) - Number(game.start || 0) + 1 }, (_, i) => Number(game.start) + i).map((hole) => {
                    const teamANet = getTeamNetScore(teamA, hole, players, course, scores, handicapMode);
                    const teamBNet = getTeamNetScore(teamB, hole, players, course, scores, handicapMode);
                    const teamABest = getBestBallWinner(teamA, hole, players, course, scores, handicapMode);
                    const teamBBest = getBestBallWinner(teamB, hole, players, course, scores, handicapMode);
                    const holeResult = computeHoleResult({
                      hole,
                      teamA,
                      teamB,
                      players,
                      course,
                      scores,
                      handicapMode,
                    });

                    return (
                      <div key={`${gameIndex}-${matchupIndex}-${hole}`} style={{ borderTop: "1px solid #eee", paddingTop: 8, marginTop: 8 }}>
                        <div><strong>Hole {hole}</strong> — {formatHoleWinner(holeResult, teamAName, teamBName)}
                        </div>
                        <div style={{ fontSize: 13 }}>
                          {teamAName} best ball net: {teamANet ?? "-"}{teamABest ? ` (${teamABest.name}, gross ${teamABest.gross})` : ""}
                        </div>
                        <div style={{ fontSize: 13 }}>
                          {teamBName} best ball net: {teamBNet ?? "-"}{teamBBest ? ` (${teamBBest.name}, gross ${teamBBest.gross})` : ""}
                        </div>
                      </div>
                    );
                  })}
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
      <h3 style={{ marginTop: 0 }}>Audit Trail</h3>
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

      <NinePointAudit players={players} matchResults={matchResults} />

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
