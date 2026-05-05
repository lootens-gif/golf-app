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

function formatMatchScore(score) {
  const value = Number(score || 0);
  if (value > 0) return `${value} up`;
  if (value < 0) return `${Math.abs(value)} down`;
  return "even";
}

function formatHoleWinner(result, teamAName, teamBName) {
  if (result > 0) return `${teamAName} wins`;
  if (result < 0) return `${teamBName} wins`;
  if (result === 0) return "Push";
  return "Incomplete";
}

function getPlayerName(players, playerId) {
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
            title={`${p1Name} vs ${p2Name} | Match ${formatMoney(result.total)} | ${result.label || result.longLabel || "Result"}`}
          >
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
                  <div><strong>Hole {hole}</strong> — {formatHoleWinner(holeResult, p1Name, p2Name)}; match is {formatMatchScore(running)}</div>
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
                        <div><strong>Hole {hole}</strong> — {formatHoleWinner(holeResult, teamAName, teamBName)}</div>
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
