import { useState, useRef } from "react";

export default function PlayerSetupPanel({
  mode,
  players,
  onPlayerChange,
  onResetSetup,
}) {
  const [activeHcpIndex, setActiveHcpIndex] = useState(null);
  const [freshEntry, setFreshEntry] = useState(false); // true = next digit replaces
  // Auto-advance targets: after finishing a player's HCP, we jump straight
  // to the next active player — their own HCP keypad if they already have
  // a real name (the "type all names first, then all HCPs" flow), or their
  // Name field if they don't (the "name, HCP, name, HCP" flow). This ref
  // holds each row's Name <input> so we can .focus() it programmatically.
  const nameRefs = useRef({});
  // Tracks each Name field's value at the moment it was focused, so blur
  // can tell "this was still a placeholder (P1/P2/blank) and just became
  // a real name" (fresh setup — auto-open the keypad) apart from "this
  // was already a real name and got tweaked" (a correction, e.g. fixing
  // "John" to "Jon" mid-round — don't interrupt with the keypad). Default
  // players ship with sample HCP values already filled in, so checking
  // whether HCP is blank doesn't distinguish these two cases — the name's
  // own placeholder-ness at focus time is the reliable signal.
  const nameAtFocusRef = useRef({});

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
      if (newDigits.length > 2) return; // 2-digit max
      const n = Number(newDigits);
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
                ref={(el) => { nameRefs.current[index] = el; }}
                type="text"
                value={player.name}
                placeholder="Name"
                onFocus={(e) => {
                  nameAtFocusRef.current[index] = player.name;
                  setActiveHcpIndex(null);
                  setTimeout(() => e.target.setSelectionRange(0, e.target.value.length), 0);
                }}
                onClick={(e) => setTimeout(() => e.target.setSelectionRange(0, e.target.value.length), 0)}
                onBlur={() => {
                  // Only auto-open the HCP keypad if this name was still a
                  // placeholder (blank, or "P1"/"P2"/etc) when this field
                  // was focused, and now has a real name typed in — that's
                  // unambiguously fresh setup. If it was already a real
                  // name before this edit, this blur is a correction (e.g.
                  // fixing "John" to "Jon" mid-round), and the keypad
                  // popping open would be an unwanted interruption.
                  const before = nameAtFocusRef.current[index];
                  const wasPlaceholder = !before || !before.trim() || /^P\d+$/.test(before.trim());
                  const nowHasRealName = player.name && player.name.trim() && !/^P\d+$/.test(player.name.trim());
                  if (wasPlaceholder && nowHasRealName) {
                    openKeypad(index);
                  }
                }}
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
                  onPointerDown={(e) => {
                    e.preventDefault();
                    // Smart-advance: jump straight to whatever the next
                    // active player still needs. Already has a real name
                    // (not blank, not still "P1"/"P2" etc) -> their HCP
                    // is what's missing, open their keypad directly. No
                    // real name yet -> focus their Name field instead so
                    // typing can continue right away. Last active player
                    // (no next one) -> just close, nothing to advance to.
                    const nextPlayer = players[index + 1];
                    const nextHasRealName =
                      nextPlayer && nextPlayer.name && nextPlayer.name.trim() && !nextPlayer.name.match(/^P\d+$/);
                    if (nextHasRealName) {
                      openKeypad(index + 1);
                    } else {
                      setActiveHcpIndex(null);
                      if (nextPlayer) nameRefs.current[index + 1]?.focus();
                    }
                  }}
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
