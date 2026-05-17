export default function HoleResultCard({
  lastHoleSaved,
  buildRealHoleResultLines,
  matchResults = [],
  players = [],
  mode,
  pendingNextGameIndex,
  onChooseTeams,
}) {
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
  const matchLines = Array.isArray(result) ? [] : result?.matchLines || [];
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

      {matchLines.length > 0 && (
        <div style={{ marginTop: 10, marginBottom: 10 }}>
          <strong>Current Match Status</strong>
          {matchLines.map((line, index) => {
            if (typeof line === "string") {
              return <div key={`match-${index}`} style={{ marginTop: 4 }}>{line}</div>;
            }
            const { teamAName, teamBName, netUnits, betScores } = line;
            const color = netUnits > 0 ? "#137333" : netUnits < 0 ? "#b3261e" : "#666";
            const netLabel = netUnits > 0 ? `+${netUnits}` : `${netUnits}`;
            const pressStr = betScores.map(s => s > 0 ? `+${s}` : s === 0 ? `0` : `${s}`).join("/");

            return (
              <div key={`match-${index}`} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 4,
                color,
                fontSize: 14,
              }}>
                <span>{teamAName} {netLabel} vs {teamBName}</span>
                <span style={{ fontSize: 12, fontFamily: "monospace", marginLeft: 8, whiteSpace: "nowrap" }}>
                  {pressStr} = {netLabel}
                </span>
              </div>
            );
          })}
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