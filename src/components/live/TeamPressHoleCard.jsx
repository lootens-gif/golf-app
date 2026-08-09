// TeamPressHoleCard.jsx — Aug 2026
//
// On-course "Call Press" control for Team Press, living on the Scoring
// screen next to score entry — same placement pattern as WolfHoleCard,
// per Tim's explicit ask ("similar to how we do things for Wolf on
// course at the time of the hole"), rather than buried back in Setup.
//
// One toggle button per active team matchup for the CURRENT hole's
// segment (Team 1 vs Team 2, Team 1 vs Team 3, Team 1 vs Team 4 — however
// many are active in 6/6/6 etc.). Tap to call a press on this hole for
// that matchup, tap again to undo — identical interaction pattern to
// Wolf's Lone Wolf / Blind Wolf declare buttons. Confirmed design (Aug
// 2026): a manual call is independent of the auto-trigger, not deduped
// against it, and each matchup's manual presses are tracked completely
// separately from every other matchup's.

const sc = {
  green:      "#1a5c35",
  greenLight: "#f0f7f3",
  ink:        "#1a1a1a",
  muted:      "#6b7280",
  border:     "#d1d5db",
};

export default function TeamPressHoleCard({
  currentHole,
  matchupLabels = [],       // e.g. ["Team 1 vs Team 2", "Team 1 vs Team 3"]
  manualPressHoles = {},    // { [label]: [holeNumbers] } for the active game
  onToggleCall,             // (label, hole) => void
}) {
  if (!matchupLabels.length) return null;

  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${sc.border}`,
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 10,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: sc.ink }}>
          Hole {currentHole} — Press
        </div>
      </div>

      <div style={{ fontSize: 12, color: sc.muted, marginBottom: 8 }}>
        Call Press (tap to call, tap again to undo)
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {matchupLabels.map((label) => {
          const called = (manualPressHoles[label] || []).includes(currentHole);
          return (
            <button
              key={label}
              onClick={() => onToggleCall(label, currentHole)}
              style={{
                padding: "10px 12px",
                fontSize: 13,
                fontWeight: called ? 700 : 500,
                fontFamily: "inherit",
                cursor: "pointer",
                borderRadius: 8,
                textAlign: "left",
                border: called ? `1.5px solid ${sc.green}` : `1px solid ${sc.border}`,
                background: called ? sc.greenLight : "#fff",
                color: called ? sc.green : sc.ink,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{label}</span>
              <span style={{ fontSize: 11, fontWeight: 600 }}>
                {called ? "Press called ✓" : "Call Press"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
