export default function PlayerSetupPanel({
  mode,
  players,
  onPlayerChange,
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
    <div>
      <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>Player Setup</h3>

      {players.map((player, index) => (
        <div
          key={player.id}
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <span style={{ fontSize: 13, color: "#666", minWidth: 20, textAlign: "right" }}>
            {index + 1}.
          </span>
          <input
            type="text"
            value={player.name}
            placeholder="Name"
            onFocus={(e) => setTimeout(() => e.target.setSelectionRange(0, e.target.value.length), 0)}
            onClick={(e) => setTimeout(() => e.target.setSelectionRange(0, e.target.value.length), 0)}
            onChange={(e) => onPlayerChange(index, "name", e.target.value)}
            style={{ fontSize: 15, padding: "5px 8px", flex: 1, minWidth: 0, maxWidth: 160 }}
          />
          <span style={{ fontSize: 13, color: "#666" }}>HCP</span>
          <input
            type="text"
            inputMode="numeric"
            value={player.hcp ?? ""}
            placeholder="0"
            onFocus={(e) => e.target.select()}
            onChange={(e) => handleHandicapChange(index, e.target.value)}
            style={{ width: 44, fontSize: 15, padding: "5px 6px", textAlign: "center" }}
          />
        </div>
      ))}

      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button
          onClick={() => {
            if (window.confirm("Reset everything to defaults? This clears all scores, matches, and players.")) {
              onResetSetup();
            }
          }}
          style={{ color: "#b3261e", fontSize: 13, background: "transparent", border: "1px solid #fecaca", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit" }}
        >
          Reset All
        </button>
      </div>

      
    </div>
  );
}
