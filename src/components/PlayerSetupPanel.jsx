export default function PlayerSetupPanel({
  mode,
  players,
  onPlayerChange,
  onSaveSetup,
  onLoadSetup,
  onResetSetup,
}) {
  function handleHandicapChange(index, rawValue) {
    const cleaned = rawValue.replace(/\D/g, "");

    if (cleaned === "") {
      onPlayerChange(index, "hcp", "");
      return;
    }

    onPlayerChange(index, "hcp", cleaned);
  }

  return (
    <div style={{ border: "1px solid gray", padding: 10, marginBottom: 12 }}>
      <h3>Player Setup</h3>

      <div style={{ marginBottom: 8 }}>
        Edit player names and handicaps for the current round.
      </div>

      {players.map((player, index) => (
        <div
          key={player.id}
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginBottom: 8,
            flexWrap: "wrap",
          }}
        >
          <strong>Player {index + 1}</strong>

          <label>
            Name:
            <input
                type="text"
                value={player.name}
                onFocus={(e) => {
                    setTimeout(() => {
                    e.target.setSelectionRange(0, e.target.value.length);
                    }, 0);
                }}
                onClick={(e) => {
                    setTimeout(() => {
                    e.target.setSelectionRange(0, e.target.value.length);
                    }, 0);
                }}
                onChange={(e) => onPlayerChange(index, "name", e.target.value)}
                style={{ marginLeft: 6, fontSize: 16, padding: 6, minWidth: 140  }}
            />
          </label>

          <label>
            HCP:
            <input
              type="text"
              inputMode="numeric"
              value={player.hcp ?? ""}
              onFocus={(e) => e.target.select()}
              onChange={(e) => handleHandicapChange(index, e.target.value)}
              style={{ width: 70, marginLeft: 6, fontSize: 16, padding: 6 }}
            />
          </label>
        </div>
      ))}

      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button onClick={onSaveSetup}>Save Setup</button>
        <button onClick={onLoadSetup}>Load Setup</button>
        <button onClick={onResetSetup}>Reset Setup</button>
      </div>

      <div style={{ marginTop: 8, fontSize: 13, color: "#555" }}>
        Current mode: {mode}
      </div>
    </div>
  );
}