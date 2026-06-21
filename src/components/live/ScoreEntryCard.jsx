import { useEffect, useState } from "react";

const sc = {
  green:      "#1a5c35",
  greenLight: "#f0f7f3",
  gold:       "#b8952a",
  ink:        "#1a1a1a",
  muted:      "#6b7280",
  border:     "#d1d5db",
  red:        "#b3261e",
};

export default function ScoreEntryCard({
  currentHole,
  course,
  players,
  scores,
  setScore,
  onSaveHole,
  onPrevHole,
  onNextHole,
  handicapMode,
  getHandicapStrokesFn,
  noPar3TeamGame = false,
  isJoiner = false,
  onRefresh,
  onScoreFocus,
  onScoreBlur,
}) {
  const [activePlayerId, setActivePlayerId] = useState(players?.[0]?.id ?? null);

  useEffect(() => {
    setActivePlayerId(players?.[0]?.id ?? null);
  }, [currentHole, players]);

  if (currentHole > 18) {
    return (
      <div style={{ background: sc.greenLight, border: `1px solid ${sc.border}`, borderRadius: 14, padding: 24, textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🏁</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: sc.green }}>Round Complete</div>
        <div style={{ fontSize: 14, color: sc.muted, marginTop: 4 }}>All 18 holes entered</div>
      </div>
    );
  }

  const par = course.pars?.[currentHole - 1] ?? 4;
  const hcp = course.hcp?.[currentHole - 1] ?? "-";
  const activePlayerIndex = players.findIndex((p) => p.id === activePlayerId);
  const activePlayer = players[activePlayerIndex];
  const allScoresEntered = players.every(p => scores[currentHole]?.[p.id] != null);

  function handleKeypadScore(value) {
    if (!activePlayer) return;
    onScoreFocus?.();
    setScore(currentHole, activePlayer.id, String(value));
    const nextIndex = (activePlayerIndex + 1) % players.length;
    setActivePlayerId(players[nextIndex].id);
    // Clear entering flag after 2s — enough for debounce to fire and sync to complete
    setTimeout(() => onScoreBlur?.(), 2000);
  }

  function scoreLabel(score, par) {
  if (score == null) return null;
  const diff = Number(score) - par;
  if (diff <= -2) return { label: "Eagle", color: sc.gold };
  if (diff === -1) return { label: "Birdie", color: sc.green };
  if (diff === 0)  return { label: "Par", color: sc.muted };
  if (diff === 1)  return { label: "Bogey", color: "#e67e22" };
  if (diff === 2)  return { label: "Double", color: sc.red };
  if (diff === 3)  return { label: "Triple", color: sc.red };
  if (diff >= 4)   return { label: "Go Fishing 🎣", color: sc.red };
  return null;
}

  return (
    <div style={{ background: "#fff", border: `1px solid ${sc.border}`, borderRadius: 14, marginBottom: 12, overflow: "hidden" }}>

      {/* JOINER BANNER */}
      {isJoiner && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f0f7f3", borderBottom: `1px solid #c3ddd0`, padding: "6px 12px" }}>
          <span style={{ fontSize: 11, color: "#1a5c35", fontWeight: 500 }}>👁 Viewing live — syncs every 30s</span>
          {onRefresh && (
            <button onClick={onRefresh} style={{ background: "#1a5c35", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>↻</button>
          )}
        </div>
      )}

      {/* HOLE HEADER */}
      <div style={{ background: sc.green, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onPrevHole} disabled={currentHole <= 1} style={{
          background: "rgba(255,255,255,0.15)", border: "none",
          color: currentHole <= 1 ? "rgba(255,255,255,0.3)" : "#fff",
          borderRadius: 8, padding: "8px 16px", fontSize: 20, fontWeight: 700,
          cursor: currentHole <= 1 ? "not-allowed" : "pointer",
        }}>‹</button>

        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#fff", fontSize: 22, fontWeight: 800, lineHeight: 1 }}>Hole {currentHole}</div>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 3 }}>Par {par} · HCP {hcp}</div>
        </div>

        <button onClick={onNextHole} disabled={currentHole >= 18} style={{
          background: "rgba(255,255,255,0.15)", border: "none",
          color: currentHole >= 18 ? "rgba(255,255,255,0.3)" : "#fff",
          borderRadius: 8, padding: "8px 16px", fontSize: 20, fontWeight: 700,
          cursor: currentHole >= 18 ? "not-allowed" : "pointer",
        }}>›</button>
      </div>

      {/* PLAYER ROWS */}
      <div style={{ padding: "10px 12px 0" }}>
        {players.map((player) => {
          const isActive = player.id === activePlayerId;
          const score = scores[currentHole]?.[player.id];
          const hasScore = score != null;
          const label = scoreLabel(score, par);

          return (
            <button key={player.id} type="button" onClick={() => setActivePlayerId(player.id)} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              width: "100%", padding: "11px 14px", marginBottom: 8,
              border: isActive ? `2px solid ${sc.green}` : `1px solid ${sc.border}`,
              borderRadius: 10,
              background: isActive ? sc.greenLight : "#fafafa",
              cursor: "pointer", boxSizing: "border-box",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: isActive ? sc.green : "transparent",
                  border: isActive ? "none" : `1px solid ${sc.border}`,
                }} />
                <span style={{ fontSize: 16, fontWeight: isActive ? 600 : 400, color: isActive ? sc.ink : sc.muted }}>
                  {player.name}
                </span>
                {(() => {
                  if (!getHandicapStrokesFn || !handicapMode) return null;
                  const strokesThisHole = getHandicapStrokesFn(player.id, currentHole, players, course, handicapMode, noPar3TeamGame);
                  const totalStrokes = Array.from({length: 18}, (_, i) => i + 1)
                    .reduce((s, h) => s + getHandicapStrokesFn(player.id, h, players, course, handicapMode, noPar3TeamGame), 0);
                  if (totalStrokes === 0) return null;
                  return (
                    <span style={{ fontSize: 12, color: sc.muted, fontWeight: 400 }}>
                      ({totalStrokes}){strokesThisHole > 0 ? <span style={{ color: sc.green, fontWeight: 700 }}>{" •".repeat(strokesThisHole)}</span> : ""}
                    </span>
                  );
                })()}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {label && <span style={{ fontSize: 11, color: label.color, fontWeight: 600 }}>{label.label}</span>}
                <span style={{ fontSize: 26, fontWeight: 800, color: hasScore ? sc.ink : sc.border, minWidth: 28, textAlign: "right", lineHeight: 1 }}>
                  {hasScore ? score : "–"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* KEYPAD */}
      <div style={{ padding: "4px 12px 12px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 10 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
            const diff = num - par;
            let bg = "#fff", color = sc.ink;
            if (diff <= -2) { bg = "#fdf8ee"; color = sc.gold; }
            else if (diff === -1) { bg = sc.greenLight; color = sc.green; }
            else if (diff >= 2) { bg = "#fef2f2"; color = sc.red; }
            return (
              <button key={num} type="button" onClick={() => handleKeypadScore(num)} style={{
                padding: "16px 8px", fontSize: 22, fontWeight: 700,
                border: `1px solid ${sc.border}`, borderRadius: 10,
                background: bg, color, cursor: "pointer", lineHeight: 1, fontFamily: "inherit",
              }}>{num}</button>
            );
          })}
        </div>

        <button onClick={onSaveHole} disabled={!allScoresEntered} style={{
          width: "100%", padding: 15, fontSize: 17, fontWeight: 700,
          background: allScoresEntered ? sc.green : "#e5e7eb",
          color: allScoresEntered ? "#fff" : sc.muted,
          border: "none", borderRadius: 10,
          cursor: allScoresEntered ? "pointer" : "not-allowed",
          fontFamily: "inherit",
        }}>
          {allScoresEntered ? `Save Hole ${currentHole} ✓` : `Save Hole ${currentHole}`}
        </button>
      </div>
    </div>
  );
}
