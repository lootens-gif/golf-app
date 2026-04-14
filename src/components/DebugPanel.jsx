import {
  getRawScore,
  getHandicapStrokes,
  getNetScore,
  getPlayerName,
  getTeamNetScore,
  computeHoleResult,
} from "../engine/scoringEngine";

function formatHoleResult(result, teamALabel = "Team A", teamBLabel = "Team B") {
  if (result === 1) return `${teamALabel} wins`;
  if (result === -1) return `${teamBLabel} wins`;
  if (result === 0) return "Tie";
  return "-";
}

function getBestBallDetails(team, hole, players, course, scores, handicapMode) {
  const entries = (team || [])
    .filter(Boolean)
    .map((playerId) => {
      const player = players.find((p) => p.id === playerId);
      const net = getNetScore(
        playerId,
        hole,
        players,
        course,
        scores,
        handicapMode
      );

      return {
        playerId,
        playerName: player?.name || "",
        net,
      };
    })
    .filter((entry) => entry.net !== null);

  if (entries.length === 0) {
    return null;
  }

  const best = entries.reduce((lowest, current) => {
    if (!lowest) return current;
    return current.net < lowest.net ? current : lowest;
  }, null);

  return best;
}

export default function DebugPanel({
  players,
  course,
  scores,
  handicapMode,
  teamA = [],
  teamB = [],
  startHole = 1,
  endHole = 18,
  title = "Debug View",
  teamALabel = "Team A",
  teamBLabel = "Team B",
}) {
  const safeTeamA = (teamA || []).filter(Boolean);
  const safeTeamB = (teamB || []).filter(Boolean);

  return (
    <div style={{ border: "2px solid #666", padding: 12, marginTop: 12 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>

      <div style={{ marginBottom: 8 }}>
        <div>
          <strong>{teamALabel}:</strong>{" "}
          {safeTeamA.length
            ? safeTeamA.map((id) => getPlayerName(players, id)).join(" + ")
            : "-"}
        </div>
        <div>
          <strong>{teamBLabel}:</strong>{" "}
          {safeTeamB.length
            ? safeTeamB.map((id) => getPlayerName(players, id)).join(" + ")
            : "-"}
        </div>
      </div>

      {Array.from({ length: endHole - startHole + 1 }, (_, i) => {
        const hole = startHole + i;

        const teamANet =
          safeTeamA.length > 0
            ? getTeamNetScore(
                safeTeamA,
                hole,
                players,
                course,
                scores,
                handicapMode
              )
            : null;

        const teamBNet =
          safeTeamB.length > 0
            ? getTeamNetScore(
                safeTeamB,
                hole,
                players,
                course,
                scores,
                handicapMode
              )
            : null;
        
        const teamABestBall = getBestBallDetails(
            safeTeamA,
            hole,
            players,
            course,
            scores,
            handicapMode
            );

        const teamBBestBall = getBestBallDetails(
            safeTeamB,
            hole,
            players,
            course,
            scores,
            handicapMode
        );    
        const holeResult =
          safeTeamA.length > 0 && safeTeamB.length > 0
            ? computeHoleResult({
                hole,
                teamA: safeTeamA,
                teamB: safeTeamB,
                players,
                course,
                scores,
                handicapMode,
              })
            : null;

        return (
          <div
            key={hole}
            style={{
              borderTop: "1px solid #ddd",
              paddingTop: 10,
              marginTop: 10,
            }}
          >
            <div style={{ marginBottom: 6 }}>
              <strong>
                Hole {hole} | Par {course?.pars?.[hole - 1] ?? "-"} | HCP{" "}
                {course?.hcp?.[hole - 1] ?? "-"}
              </strong>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(120px, 1fr))",
                gap: 6,
                fontWeight: "bold",
                marginBottom: 6,
              }}
            >
              <div>Player</div>
              <div>Gross</div>
              <div>Strokes</div>
              <div>Net</div>
            </div>

            {players.map((player) => {
              const gross = getRawScore(scores, hole, player.id);
              const strokes =
                gross === null
                  ? null
                  : getHandicapStrokes(
                      player.id,
                      hole,
                      players,
                      course,
                      handicapMode
                    );
              const net = getNetScore(
                player.id,
                hole,
                players,
                course,
                scores,
                handicapMode
              );

              const isOnTeamA = safeTeamA.includes(player.id);
              const isOnTeamB = safeTeamB.includes(player.id);

              let bg = "#fff";
              if (isOnTeamA) bg = "#e8f4ff";
              if (isOnTeamB) bg = "#fff3e8";

              return (
                <div
                  key={player.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(120px, 1fr))",
                    gap: 6,
                    padding: "4px 6px",
                    background: bg,
                    marginBottom: 4,
                  }}
                >
                  <div>
                    {player.name}
                    {isOnTeamA ? " (A)" : isOnTeamB ? " (B)" : ""}
                  </div>
                  <div>{gross ?? "-"}</div>
                  <div>{strokes ?? "-"}</div>
                  <div>{net ?? "-"}</div>
                </div>
              );
            })}

            <div
              style={{
                marginTop: 8,
                padding: 8,
                background: "#f7f7f7",
                border: "1px solid #ddd",
              }}
            >
            <div>
                <strong>{teamALabel} best ball net:</strong> {teamANet ?? "-"}
                {teamABestBall ? ` (${teamABestBall.playerName})` : ""}
                </div>
                <div>
                <strong>{teamBLabel} best ball net:</strong> {teamBNet ?? "-"}
                {teamBBestBall ? ` (${teamBBestBall.playerName})` : ""}
            </div>
              <div>
                <strong>Hole result:</strong>{" "}
                {formatHoleResult(holeResult, teamALabel, teamBLabel)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}