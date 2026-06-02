export default function WheelEditor({
  players,
  wheelGroups,
  wheelTeams,
  pressTrigger,
  onSetTeams,
  onSetTrigger,
}) {
  function getRange(index) {
    const start =
      wheelGroups.slice(0, index).reduce((a, b) => a + b, 0) + 1;
    const end = start + wheelGroups[index] - 1;
    return { start, end };
  }

  return (
    <div>
      <h3>Wheel</h3>

      {wheelGroups.map((_, index) => {
        const range = getRange(index);
        const current = wheelTeams[index] || {
          teamA: [players[0]?.name || "", players[1]?.name || ""],
          teamB: [players[2]?.name || "", players[3]?.name || ""],
        };

        return (
          <div
            key={index}
            style={{ border: "1px solid gray", padding: 8, marginBottom: 8 }}
          >
            <div>
              Wheel {index + 1}: Holes {range.start}-{range.end}
            </div>

            <div style={{ marginTop: 6 }}>
              <strong>Team A</strong>
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                {[0, 1].map((slot) => (
                  <select
                    key={slot}
                    value={current.teamA[slot] || ""}
                    onChange={(e) => {
                      const next = {
                        ...current,
                        teamA: [...current.teamA],
                      };
                      next.teamA[slot] = e.target.value;
                      onSetTeams(index, next);
                    }}
                  >
                    {players.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 6 }}>
              <strong>Team B</strong>
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                {[0, 1].map((slot) => (
                  <select
                    key={slot}
                    value={current.teamB[slot] || ""}
                    onChange={(e) => {
                      const next = {
                        ...current,
                        teamB: [...current.teamB],
                      };
                      next.teamB[slot] = e.target.value;
                      onSetTeams(index, next);
                    }}
                  >
                    {players.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <label>
                Press Trigger:
                <input
                  type="number"
                  value={pressTrigger[index] ?? 1}
                  onChange={(e) => onSetTrigger(index, Number(e.target.value) || 2)}
                  style={{ width: 60, marginLeft: 6 }}
                />
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}