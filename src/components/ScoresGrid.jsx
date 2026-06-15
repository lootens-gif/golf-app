export default function ScoresGrid({ players, scores, onSetScore }) {
  function focusNextScoreField(currentHole, currentPlayerId) {
    const playerIndex = players.findIndex((p) => p.id === currentPlayerId);
    if (playerIndex === -1) return;

    let nextHole = currentHole;
    let nextPlayerIndex = playerIndex + 1;

    if (nextPlayerIndex >= players.length) {
      nextPlayerIndex = 0;
      nextHole = currentHole + 1;
    }

    if (nextHole > 18) return;

    const nextPlayerId = players[nextPlayerIndex]?.id;
    if (!nextPlayerId) return;

    // setTimeout required for iOS Safari — focus() blocked without delay
    setTimeout(() => {
      const nextInput = document.getElementById(`score-${nextHole}-${nextPlayerId}`);
      if (nextInput) {
        nextInput.focus();
        nextInput.select?.();
      }
    }, 10);
  }

  function handleScoreChange(hole, playerId, rawValue) {
    const cleaned = rawValue.replace(/\D/g, "").slice(0, 1);
    onSetScore(hole, playerId, cleaned);
    if (cleaned !== "") {
      focusNextScoreField(hole, playerId);
    }
  }

  return (
    <div>
      <h3>Scores</h3>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            borderCollapse: "collapse",
            minWidth: 420,
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  border: "1px solid #ccc",
                  padding: 6,
                  background: "#f5f5f5",
                }}
              >
                Hole
              </th>
              {players.map((player) => (
                <th
                  key={player.id}
                  style={{
                    border: "1px solid #ccc",
                    padding: 6,
                    background: "#f5f5f5",
                    minWidth: 58,
                    textAlign: "center",
                  }}
                >
                  {player.name
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean)
                    .map((part) => part[0])
                    .join("")}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {Array.from({ length: 18 }, (_, i) => i + 1).map((hole) => (
              <tr key={hole}>
                <td
                  style={{
                    border: "1px solid #ccc",
                    padding: 6,
                    textAlign: "center",
                    fontWeight: "bold",
                  }}
                >
                  {hole}
                </td>

                {players.map((player) => (
                  <td
                    key={player.id}
                    style={{
                      border: "1px solid #ccc",
                      padding: 4,
                      textAlign: "center",
                    }}
                  >
                    <input
                      id={`score-${hole}-${player.id}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      placeholder={player.name}
                      value={scores[hole]?.[player.id] ?? ""}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) =>
                        handleScoreChange(hole, player.id, e.target.value)
                      }
                      style={{
                        width: 64,
                        textAlign: "center",
                        fontSize: 18,
                        padding: 8,
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}