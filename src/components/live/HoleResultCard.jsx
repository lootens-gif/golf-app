import { useState } from "react";

export default function HoleResultCard({
  lastHoleSaved,
  currentHole,
  buildRealHoleResultLines,
  matchResults = [],
  players = [],
  course,
  scores,
  handicapMode,
  getHandicapStrokesFn,
  noPar3TeamGame = false,
  mode,
  enableTeamGame = false,
  teamGameResults = [],
  teamGames = [],
  getTeamGameRange,
  getTeamGameSelection,
  getMatchUnits,
  buildHoleResultSubset,
  pendingNextGameIndex,
  onChooseTeams,
}) {
  const [showDetail, setShowDetail] = useState(false);
  if (!lastHoleSaved) return null;

  // If the person has navigated back to an earlier hole that's already
  // been saved, show that hole's result instead of always showing the
  // most recently saved one — matching what's actually on screen rather
  // than whatever happened most recently, per the Aug 2026 discussion
  // about avoiding a confusing mismatch while reviewing earlier holes.
  const displayHole = (currentHole != null && currentHole <= lastHoleSaved) ? currentHole : lastHoleSaved;

  const result = buildRealHoleResultLines(displayHole);


  const isMainNinePoint = mode === "3p";

  const ninePointEntry = isMainNinePoint
  ? matchResults.find(
      ({ match, result }) =>
        match?.gameType === "ninePoint" &&
        Array.isArray(result?.holes)
    )
  : null;

  const ninePointHole = ninePointEntry?.result?.holes?.find(
  (hole) =>
    Number(hole.hole) === Number(displayHole) &&
    hole.pointsByPlayerId
);

  const ninePointPlayerIds = ninePointEntry?.match
    ? [
        ninePointEntry.match.p1Id,
        ninePointEntry.match.p2Id,
        ninePointEntry.match.p3Id,
      ].filter(Boolean)
    : [];

  const getPlayerName = (playerId) =>
    players.find((player) => player.id === playerId)?.name || playerId;

  const holeLines = Array.isArray(result) ? result : result?.holeLines || [];
  const birdieLines = Array.isArray(result) ? [] : result?.birdieLines || [];

  const shouldShowRegularHoleLines = !ninePointHole && holeLines.length > 0;

  return (
    <div className="app-card" style={{ marginBottom: 12 }}>
      <h3 style={{ marginTop: 0 }}>
        Hole {displayHole}
        {ninePointHole ? " - 9-Point" : " Result"}
      </h3>

      {ninePointHole && (
        <div style={{ marginTop: 6, marginBottom: 10, lineHeight: 1.4 }}>
          {ninePointPlayerIds.map((playerId) => (
            <div key={playerId}>
              {getPlayerName(playerId)}:{" "}
              {ninePointHole.pointsByPlayerId?.[playerId] ?? 0}
            </div>
          ))}
        </div>
      )}

      {shouldShowRegularHoleLines && (
        <div style={{ marginTop: 6, marginBottom: 10, lineHeight: 1.4 }}>
          {holeLines.map((line, index) => (
            <div key={`hole-${index}`}>{line}</div>
          ))}
        </div>
      )}

      {enableTeamGame && teamGameResults.some(g => (g.matches || []).length > 0) && buildHoleResultSubset && (() => {
        // Toggle color: Team 1 perspective, net across all active bets
        // if this is Press (multiple simultaneous presses collapse to
        // one net number, same as getMatchUnits already does
        // elsewhere) — not per-bet, just the one overall up/down.
        // Reads from whichever game/segment actually contains the
        // displayed hole, matching the detail section below it.
        let toggleColor = "#1a5c35";
        if (getMatchUnits && getTeamGameRange) {
          const currentGameIndex = teamGameResults.findIndex((g, idx) => {
            const range = getTeamGameRange(teamGames, idx);
            return displayHole >= range.start && displayHole <= range.end;
          });
          const currentGame = currentGameIndex >= 0 ? teamGameResults[currentGameIndex] : null;
          const firstMatchup = currentGame?.matches?.[0];
          console.log("[DIAG-COLOR] displayHole:", displayHole, "currentGameIndex:", currentGameIndex, "currentGame:", JSON.stringify(currentGame), "firstMatchup:", JSON.stringify(firstMatchup));
          if (firstMatchup) {
            const units = getMatchUnits(firstMatchup.result);
            console.log("[DIAG-COLOR] units:", units);
            toggleColor = units > 0 ? "#137333" : units < 0 ? "#b3261e" : "#6b7280";
          }
        }
        return (
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => setShowDetail(v => !v)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: toggleColor,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {showDetail ? "Hide full detail ▴" : "See full detail ▾"}
          </button>
          {showDetail && (
            <div style={{ marginTop: 8 }}>
              {teamGameResults.map((game, gameIndex) => {
                const selection = getTeamGameSelection(gameIndex);
                if (!selection || !(game.matches || []).length) return null;
                // CONFIRMED REAL BUG (Aug 2026): every segment was
                // rendering as its own block regardless of which one
                // displayHole actually falls in — on hole 10 of a 6/6/6
                // Press setup, this showed segment 1 (already finished),
                // segment 2 (the real current one), and an empty,
                // useless block for segment 3 (not started), all at
                // once. Press specifically allows different team
                // pairings per segment, so showing the wrong segment's
                // matchups isn't just noisy, it's actively the wrong
                // teams. Only the segment actually containing the
                // displayed hole should render.
                if (getTeamGameRange) {
                  const range = getTeamGameRange(teamGames, gameIndex);
                  if (displayHole < range.start || displayHole > range.end) return null;
                }
                return (
                  <div key={gameIndex} style={{ marginBottom: gameIndex < teamGameResults.length - 1 ? 12 : 0 }}>
                    {(game.matches || []).map((matchup, mIdx) => {
                      const parts = matchup.label.split(" ");
                      const teamAKey = `team${parts[1] || ""}`.toLowerCase();
                      const teamBKey = `team${parts[4] || ""}`.toLowerCase();
                      const teamA = (selection?.[teamAKey] || []).filter(Boolean);
                      const teamB = (selection?.[teamBKey] || []).filter(Boolean);
                      const teamAInitials = teamA.map(id => getPlayerName(id).split(" ").map(p => p[0]).join("")).join("/");
                      const teamBInitials = teamB.map(id => getPlayerName(id).split(" ").map(p => p[0]).join("")).join("/");
                      const segmentStart = getTeamGameRange ? getTeamGameRange(teamGames, gameIndex).start : undefined;
                      const subset = buildHoleResultSubset(matchup, teamA, teamB, displayHole, players, course, scores, handicapMode, getHandicapStrokesFn, noPar3TeamGame, segmentStart);
                      if (!subset) return null;
                      return (
                        <div key={mIdx} className="scorecard-scroll" style={{ marginBottom: 8, overflowX: "scroll", WebkitOverflowScrolling: "touch" }}>
                          <table style={{ borderCollapse: "collapse", fontSize: 12, whiteSpace: "nowrap" }}>
                            <tbody>
                              <tr>
                                <td style={{ padding: "4px 8px", color: "#666", textAlign: "left" }}>Hole</td>
                                {subset.rows.map(r => <td key={r.hole} style={{ padding: "4px 8px", textAlign: "center" }}>{r.hole}</td>)}
                              </tr>
                              <tr>
                                <td style={{ padding: "4px 8px", color: "#666", textAlign: "left", borderTop: "0.5px solid #ddd" }}>{teamAInitials}</td>
                                {subset.rows.map(r => <td key={r.hole} style={{ padding: "4px 8px", textAlign: "center", borderTop: "0.5px solid #ddd" }}>{r.teamAScores.join(" ")}</td>)}
                              </tr>
                              <tr>
                                <td style={{ padding: "4px 8px", color: "#666", textAlign: "left" }}>{teamBInitials}</td>
                                {subset.rows.map(r => <td key={r.hole} style={{ padding: "4px 8px", textAlign: "center" }}>{r.teamBScores.join(" ")}</td>)}
                              </tr>
                              <tr>
                                <td style={{ padding: "4px 8px", color: "#666", textAlign: "left", borderTop: "0.5px solid #ddd" }}>{subset.halfLabel}</td>
                                {subset.rows.map(r => <td key={r.hole} style={{ padding: "4px 8px", textAlign: "center", borderTop: "0.5px solid #ddd", color: r.runningColor, fontWeight: 600 }}>{r.runningLabel}</td>)}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        );
      })()}

      {pendingNextGameIndex != null && onChooseTeams && (
        <button
          onClick={onChooseTeams}
          style={{ marginTop: 8, width: "100%" }}
        >
          Choose Teams for Game {pendingNextGameIndex + 1}
        </button>
      )}

      {birdieLines.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <strong>Birdies</strong>
          {birdieLines.map((line, index) => (
            <div key={`birdie-${index}`}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}