import { useState } from "react";

export default function HoleResultCard({
  lastHoleSaved,
  buildRealHoleResultLines,
  matchResults = [],
  players = [],
  mode,
  enableTeamGame = false,
  teamGameResults = [],
  getTeamGameSelection,
  renderTeamMatchupStatus,
  pendingNextGameIndex,
  onChooseTeams,
}) {
  const [showDetail, setShowDetail] = useState(false);
  if (!lastHoleSaved) return null;



  const result = buildRealHoleResultLines(lastHoleSaved);


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
    Number(hole.hole) === Number(lastHoleSaved) &&
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
        Hole {lastHoleSaved}
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

      {enableTeamGame && teamGameResults.some(g => (g.matches || []).length > 0) && renderTeamMatchupStatus && (
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => setShowDetail(v => !v)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "#1a5c35",
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
                return (
                  <div key={gameIndex} style={{ marginBottom: gameIndex < teamGameResults.length - 1 ? 12 : 0 }}>
                    {(game.matches || []).map((matchup, mIdx) => {
                      const parts = matchup.label.split(" ");
                      const teamAKey = `team${parts[1] || ""}`.toLowerCase();
                      const teamBKey = `team${parts[4] || ""}`.toLowerCase();
                      const teamA = (selection?.[teamAKey] || []).filter(Boolean);
                      const teamB = (selection?.[teamBKey] || []).filter(Boolean);
                      const teamAName = teamA.map(id => getPlayerName(id)).join("/");
                      const teamBName = teamB.map(id => getPlayerName(id)).join("/");
                      return renderTeamMatchupStatus(matchup, teamAName, teamBName, mIdx);
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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