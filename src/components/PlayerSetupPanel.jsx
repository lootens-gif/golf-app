import { useState } from "react";

export default function PlayerSetupPanel({
  mode,
  players,
  onPlayerChange,
  onResetSetup,
}) {
  const [activeHcpIndex, setActiveHcpIndex] = useState(null);
  const [freshEntry, setFreshEntry] = useState(false); // true = next digit replaces

  function displayHcp(hcp) {
    if (hcp === "" || hcp == null) return "";
    const n = Number(hcp);
    if (n < 0) return `+${Math.abs(n)}`;
    return `${n}`;
  }

  function handleKeypad(index, key) {
    const current = players[index].hcp;
    const isPlus = Number(current) < 0;
    const absVal = Math.abs(Number(current) || 0);
    const digits = freshEntry || absVal === 0 ? "" : String(absVal);

    if (key === "back") {
      const newDigits = digits.slice(0, -1);
      setFreshEntry(false);
      if (newDigits === "") {
        onPlayerChange(index, "hcp", "");
      } else {
        const n = Number(newDigits);
        onPlayerChange(index, "hcp", isPlus ? -n : n);
      }
    } else if (key === "+") {
      const n = Number(digits) || absVal;
      setFreshEntry(false);
      if (n > 0) onPlayerChange(index, "hcp", isPlus ? n : -n);
    } else {
      const newDigits = digits === "" ? key : digits + key;
      const n = Math.min(Number(newDigits), 54);
      setFreshEntry(false);
      onPlayerChange(index, "hcp", isPlus ? -n : n);
    }
  }

  function openKeypad(index) {
    setActiveHcpIndex(index);
    setFreshEntry(true); // first digit replaces current value
  }

  const KeypadButton = ({ label, onPress, color, bg }) => (
    <button
      onPointerDown={(e) => { e.preventDefault(); onPress(); }}
      style={{
        padding: "14px 0", fontSize: label === "back" ? 18 : 20, fontWeight: 500,
        background: bg || "#fff", color: color || "#1a1a1a",
        border: "none", borderTop: "0.5px solid #e5e7eb",
        cursor: "pointer", fontFamily: "inherit", userSelect: "none",
      }}
    >
      {label === "back" ? "⌫" : label}
    </button>
  );

  return (
    <div>
      <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>Player Setup</h3>

      {players.map((player, index) => {
        const isActive = activeHcpIndex === index;
        const isPlus = Number(player.hcp) < 0;
        return (
          <div key={player.id} style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#666", minWidth: 20, textAlign: "right" }}>
                {index + 1}.
              </span>
              <input
                type="text"
                value={player.name}
                placeholder="Name"
                onFocus={(e) => { setActiveHcpIndex(null); setTimeout(() => e.target.setSelectionRange(0, e.target.value.length), 0); }}
                onClick={(e) => setTimeout(() => e.target.setSelectionRange(0, e.target.value.length), 0)}
                onChange={(e) => onPlayerChange(index, "name", e.target.value)}
                style={{ fontSize: 15, padding: "5px 8px", flex: 1, minWidth: 0, maxWidth: 160 }}
              />
              <span style={{ fontSize: 13, color: "#666" }}>HCP</span>
              <div
                onClick={() => activeHcpIndex === index ? setActiveHcpIndex(null) : openKeypad(index)}
                style={{
                  width: 48, fontSize: 15, padding: "5px 6px", textAlign: "center",
                  border: `1px solid ${isActive ? "#1a5c35" : "#d1d5db"}`,
                  borderRadius: 6, cursor: "pointer", background: "#fff",
                  color: isPlus ? "#b3261e" : "#1a1a1a", fontWeight: isPlus ? 700 : 400,
                  minHeight: 32, lineHeight: "22px",
                }}
              >
                {displayHcp(player.hcp) || <span style={{ color: "#ccc" }}>0</span>}
              </div>
            </div>

            {/* Inline keypad */}
            {isActive && (
              <div style={{ marginTop: 6, marginLeft: 26, border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", background: "#f9fafb" }}>
                {/* Display */}
                <div style={{ padding: "8px 14px", borderBottom: "0.5px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#666" }}>{player.name} HCP</span>
                  <span style={{ fontSize: 24, fontWeight: 500, color: isPlus ? "#b3261e" : "#1a1a1a", minWidth: 40, textAlign: "right" }}>
                    {displayHcp(player.hcp) || "—"}
                  </span>
                </div>
                {/* Keys */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5px", background: "#e5e7eb" }}>
                  {["1","2","3","4","5","6","7","8","9"].map(k => (
                    <KeypadButton key={k} label={k} onPress={() => handleKeypad(index, k)} />
                  ))}
                  <KeypadButton label="+" onPress={() => handleKeypad(index, "+")} color="#b3261e" bg="#fff5f5" />
                  <KeypadButton label="0" onPress={() => handleKeypad(index, "0")} />
                  <KeypadButton label="back" onPress={() => handleKeypad(index, "back")} color="#666" />
                </div>
                <button
                  onPointerDown={(e) => { e.preventDefault(); setActiveHcpIndex(null); }}
                  style={{ width: "100%", padding: "10px 0", fontSize: 14, fontWeight: 600, color: "#1a5c35", background: "#f0fdf4", border: "none", borderTop: "0.5px solid #e5e7eb", cursor: "pointer", fontFamily: "inherit" }}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        );
      })}

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
