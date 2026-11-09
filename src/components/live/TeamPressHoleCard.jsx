// TeamPressHoleCard.jsx — Nov 2026
//
// One-tap "Call a press" row on the Scoring screen, next to score entry.
// Tap it while entering the hole you're about to play (or just finished) and
// the press starts on that hole. Tap again to undo.
//
// Shown only when the game has exactly ONE matchup (4-player, 1v1, etc.).
// Multi-matchup games (5-player 6/6/6) hide it: a single tap would have to
// pick which matchup, and that case almost never happens.

const sc = {
  green:      "#1a5c35",
  greenLight: "#f0f7f3",
  ink:        "#1a1a1a",
  muted:      "#6b7280",
  border:     "#d1d5db",
};

export default function TeamPressHoleCard({
  currentHole,
  matchupLabels = [],       // e.g. ["Team 1 vs Team 2"]
  manualPressHoles = {},    // { [label]: [holeNumbers] } for the active game
  onToggleCall,             // (label, hole) => void
}) {
  if (matchupLabels.length !== 1) return null;
  const label = matchupLabels[0];
  const called = (manualPressHoles[label] || []).includes(currentHole);

  return (
    <button
      onClick={() => onToggleCall(label, currentHole)}
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 12px",
        marginBottom: 12,
        fontSize: 13,
        fontWeight: called ? 700 : 500,
        fontFamily: "inherit",
        cursor: "pointer",
        borderRadius: 8,
        border: called ? `1.5px solid ${sc.green}` : `1px solid ${sc.border}`,
        background: called ? sc.greenLight : "#fff",
        color: called ? sc.green : sc.ink,
      }}
    >
      <span>{called ? `Press called on hole ${currentHole}` : "Call a press"}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: sc.muted }}>
        {called ? "tap to undo" : `starts hole ${currentHole}`}
      </span>
    </button>
  );
}
