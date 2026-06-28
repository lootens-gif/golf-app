import {
  getRawScore,
  getHandicapStrokes,
  getNetScore,
  getPlayerName,
  getTeamNetScore,
  computeHoleResult,
} from "../engine/scoringEngine";

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

  if (entries.length === 0) return null;

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
  computedResults,
  teamGameResults,
  getTeamGameSelection,
}) {
  const safeTeamA = (teamA || []).filter(Boolean);
  const safeTeamB = (teamB || []).filter(Boolean);

  const isThreePlayerNinePoint =
    Array.isArray(players) &&
    players.length === 3 &&
    Array.isArray(computedResults?.playerLedger);

  const ninePointPlayerRows = isThreePlayerNinePoint
    ? computedResults.playerLedger.map((row) => {
        const player = players.find((p) => p.id === row.playerId);
        return {
          playerId: row.playerId,
          name: player?.name || row.playerId,
          mainGame: row.mainGame ?? 0,
          sideMatches: row.sideMatches ?? 0,
          birdies: row.birdies ?? 0,
          total: row.total ?? 0,
        };
      })
    : [];


  const ninePointMatchEntry = isThreePlayerNinePoint
    ? (computedResults?.matchResults || []).find(
        (entry) =>
          entry?.match?.gameType === "ninePoint" ||
          entry?.match?.gameType === "9_point" ||
          entry?.match?.type === "ninePoint" ||
          entry?.match?.type === "9_point"
      )
    : null;

  const ninePointHoles = ninePointMatchEntry?.result?.holes || [];
  const ninePointTransactions = ninePointMatchEntry?.result?.payout?.transactions || [];
  return (
    <div style={{ border: "2px solid #666", padding: 12, marginTop: 12 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>

      {!isThreePlayerNinePoint && (
        <>
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
                    gridTemplateColumns: "120px 80px 80px 80px",
                    gap: 6,
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  <div>Player</div>
                  <div>Gross</div>
                  <div>Strokes</div>
                  <div>Net</div>
                </div>

                {players.map((player) => {
                  const gross = getRawScore(player.id, hole, scores);
                  const strokes = getHandicapStrokes(
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

                  return (
                    <div
                      key={player.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "120px 80px 80px 80px",
                        gap: 6,
                        marginBottom: 4,
                      }}
                    >
                      <div>{player.name}</div>
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
        </>
      )}

      {/* ===== DEBUG LEDGER SECTION ===== */}
      <hr style={{ margin: "20px 0" }} />

      <h3>💰 Player Ledger (Debug)</h3>

      {computedResults?.playerLedger?.map((row) => {
        const player = players.find((p) => p.id === row.playerId);

        return (
          <div
            key={row.playerId}
            style={{
              display: "grid",
              gridTemplateColumns: "150px 100px 100px 100px 100px",
              gap: 6,
              marginBottom: 4,
            }}
          >
            <div>
              <strong>{player?.name || row.playerId}</strong>
            </div>
            <div>Main: {row.mainGame ?? 0}</div>
            <div>Side: {row.sideMatches ?? 0}</div>
            <div>Birdies: {row.birdies ?? 0}</div>
            <div>
              Total: <strong>{row.total ?? 0}</strong>
            </div>
          </div>
        );
      })}

                {/* ===== 3-PLAYER 9-POINT DEBUG ===== */}
      {isThreePlayerNinePoint && (
        <>
          <hr style={{ margin: "20px 0" }} />

          <h3>🎯 3-Player 9-Point Breakdown (Debug)</h3>

          <div
            style={{
              padding: 10,
              background: "#f7f7f7",
              border: "1px solid #ddd",
              marginBottom: 12,
            }}
          >
            <div style={{ marginBottom: 8 }}>
              <strong>Players:</strong> {players.map((p) => p.name).join(" / ")}
            </div>

            <div style={{ marginBottom: 10 }}>
              <strong>Final Ledger</strong>
            </div>

            {ninePointPlayerRows.map((row) => (
              <div
                key={row.playerId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "150px 100px 100px 100px 100px",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <div>
                  <strong>{row.name}</strong>
                </div>
                <div>Main: {row.mainGame}</div>
                <div>Side: {row.sideMatches}</div>
                <div>Birdies: {row.birdies}</div>
                <div>
                  Total: <strong>{row.total}</strong>
                </div>
              </div>
            ))}

            <div style={{ marginTop: 16, marginBottom: 8 }}>
              <strong>Per-Hole Points / Running Totals</strong>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "70px repeat(6, 90px)",
                gap: 6,
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              <div>Hole</div>
              {players.map((p) => (
                <div key={`${p.id}-pts`}>{p.name} Pts</div>
              ))}
              {players.map((p) => (
                <div key={`${p.id}-run`}>{p.name} Run</div>
              ))}
            </div>

            {ninePointHoles.map((holeRow) => (
              <div
                key={holeRow.hole}
                style={{
                  display: "grid",
                  gridTemplateColumns: "70px repeat(6, 90px)",
                  gap: 6,
                  marginBottom: 4,
                  padding: "4px 0",
                  borderTop: "1px solid #eee",
                }}
              >
                <div>
                  <strong>{holeRow.hole}</strong>
                </div>

                {players.map((p) => (
                  <div key={`${holeRow.hole}-${p.id}-pts`}>
                    {holeRow.pointsByPlayerId?.[p.id] ?? 0}
                  </div>
                ))}

                {players.map((p) => (
                  <div key={`${holeRow.hole}-${p.id}-run`}>
                    {holeRow.runningTotalsByPlayerId?.[p.id] ?? 0}
                  </div>
                ))}
              </div>
            ))}

            <div style={{ marginTop: 16, marginBottom: 8 }}>
              <strong>Payout Transactions</strong>
            </div>

            {ninePointTransactions.length === 0 ? (
              <div>-</div>
            ) : (
              ninePointTransactions.map((tx, idx) => {
                const fromName =
                  players.find((p) => p.id === tx.fromPlayerId)?.name || tx.fromPlayerId;
                const toName =
                  players.find((p) => p.id === tx.toPlayerId)?.name || tx.toPlayerId;

                return (
                  <div
                    key={idx}
                    style={{
                      padding: 6,
                      marginBottom: 4,
                      background: "#fff",
                      border: "1px solid #ddd",
                    }}
                  >
                    {fromName} → {toName} | Points: {tx.points} | Amount: {tx.amount}
                  </div>
                );
              })
            )}
            <div style={{ marginTop: 16, marginBottom: 8 }}>
              <strong>Settle Up</strong>
            </div>

            {computedResults?.tabs?.map((tab, idx) => {
              const from = players.find(p => p.id === tab.fromPlayerId)?.name;
              const to = players.find(p => p.id === tab.toPlayerId)?.name;

              return (
                <div key={idx}>
                  {from} → {to}: ${tab.amount}
                </div>
              );
            })}

            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: "pointer" }}>Show computedResults JSON</summary>
              <pre
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  whiteSpace: "pre-wrap",
                  overflowX: "auto",
                }}
              >
                {JSON.stringify(computedResults, null, 2)}
              </pre>
            </details>
          </div>
        </>
      )}  

      {/* ===== TEAM GAME BREAKDOWN ===== */}
      {!isThreePlayerNinePoint && (
        <>
          <hr style={{ margin: "20px 0" }} />

          <h3>🏌️ Team Game Breakdown (Debug)</h3>

          {teamGameResults?.map((game, index) => {
            if (game.duplicateError) return null;

            const selection = getTeamGameSelection(index);
const gameUnitTotals = {};

players.forEach((player) => {
  gameUnitTotals[player.id] = 0;
});

(game.matches || []).forEach((match) => {
  const parts = match.label.split(" ");
  const teamAKey = `team${parts[1]}`;
  const teamBKey = `team${parts[4]}`;

  const matchupTeamAPlayers = selection?.[teamAKey] || [];
  const matchupTeamBPlayers = selection?.[teamBKey] || [];

  const matchupUnits = getMatchUnits(match.result);

  matchupTeamAPlayers.forEach((playerId) => {
    gameUnitTotals[playerId] += matchupUnits;
  });

  matchupTeamBPlayers.forEach((playerId) => {
    gameUnitTotals[playerId] -= matchupUnits;
  });
});
            return (
              <div key={index} style={{ marginBottom: 16 }}>
                <div>
                  <strong>Game {index + 1}</strong>
                </div>

                {game.matches.map((match, i) => {
                  const parts = match.label.split(" ");
                  const teamAKey = `team${parts[1]}`;
                  const teamBKey = `team${parts[4]}`;

                  const teamAPlayers = (selection?.[teamAKey] || []).map(
                    (id) => players.find((p) => p.id === id)?.name || id
                  );

                  const teamBPlayers = (selection?.[teamBKey] || []).map(
                    (id) => players.find((p) => p.id === id)?.name || id
                  );

                  const totalUnits = getMatchUnits(match.result);

                  return (
                    <div
                      key={i}
                      style={{
                        padding: 8,
                        border: "1px solid #ddd",
                        marginTop: 6,
                        background: "#fafafa",
                      }}
                    >
                      <div>
                        <strong>
                          {teamAPlayers.join("/")} vs {teamBPlayers.join("/")}
                        </strong>
                      </div>

                      <div>Units: {totalUnits}</div>
                      <div style={{ marginTop: 4 }}>
                          {totalUnits > 0 && (
                            <>
                              <div>{teamAPlayers.join(", ")}: +{totalUnits}</div>
                              <div>{teamBPlayers.join(", ")}: -{totalUnits}</div>
                            </>
                          )}

                          {totalUnits < 0 && (
                            <>
                              <div>{teamAPlayers.join(", ")}: {totalUnits}</div>
                              <div>{teamBPlayers.join(", ")}: +{Math.abs(totalUnits)}</div>
                            </>
                          )}

                          {totalUnits === 0 && (
                            <>
                              <div>{teamAPlayers.join(", ")}: 0</div>
                              <div>{teamBPlayers.join(", ")}: 0</div>
                            </>
                          )}
                        </div>
                      <div style={{ marginTop: 4 }}>
                        {match.result.map((r, idx) => (
                          <div key={idx}>
                            {r.label}: {r.score}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div
  style={{
    marginTop: 10,
    padding: 8,
    background: "#eef6ff",
    border: "1px solid #cce",
  }}
>
  <strong>Game {index + 1} subtotal (units)</strong>

  <div style={{ marginTop: 6 }}>
    {players.map((player) => {
      const units = gameUnitTotals[player.id] || 0;
      const label = units > 0 ? `+${units}` : `${units}`;

      return (
        <div key={`${index}-${player.id}-subtotal`}>
          {player.name}: {label}
        </div>
      );
    })}
  </div>
</div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}