export default function ScoresGrid({ players, scores, onSetScore }) {
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
                    minWidth: 70,
                    textAlign: "center",
                  }}
                >
                  {player.name}
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
                      type="number"
                      placeholder={player.name}
                      value={scores[hole]?.[player.id] ?? ""}
                      onChange={(e) => onSetScore(hole, player.id, e.target.value)}
                      style={{
                        width: 56,
                        textAlign: "center",
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