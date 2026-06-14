import { useState } from "react";

const sc = {
  green:      "#1a5c35",
  greenLight: "#f0f7f3",
  gold:       "#b8952a",
  goldLight:  "#fdf8ee",
  ink:        "#1a1a1a",
  muted:      "#6b7280",
  border:     "#d1d5db",
  red:        "#b3261e",
};

export default function CourseEditor({ course, onParChange, onHcpChange }) {
  const [currentHole, setCurrentHole] = useState(0); // 0-indexed

  const totalHoles = course.pars.length;

  // Which HCP values are already used (excluding current hole)
  const usedHcps = new Set(
    course.hcp
      .map((v, i) => (i !== currentHole && v != null && v !== "" ? Number(v) : null))
      .filter(Boolean)
  );

  const par = course.pars[currentHole];
  const hcp = course.hcp[currentHole];
  const holeComplete = par && hcp;

  // Count how many holes have both par and hcp filled
  const completedCount = course.pars.filter(
    (p, i) => p && course.hcp[i]
  ).length;

  function selectPar(val) {
    onParChange(currentHole, val);
    // If HCP not set yet, focus stays on HCP pad (no auto-advance)
    // If HCP already set, auto-advance to next hole
    if (course.hcp[currentHole] != null && course.hcp[currentHole] !== "") {
      advanceHole();
    }
  }

  function selectHcp(val) {
    onHcpChange(currentHole, val);
    // If par already set, auto-advance to next hole
    if (course.pars[currentHole] != null && course.pars[currentHole] !== "") {
      advanceHole();
    }
  }

  function advanceHole() {
    if (currentHole < totalHoles - 1) {
      setCurrentHole(currentHole + 1);
    }
  }

  function clearHole() {
    onParChange(currentHole, "");
    onHcpChange(currentHole, "");
  }

  // Progress bar segments
  const segments = Array.from({ length: totalHoles }, (_, i) => {
    const filled = course.pars[i] && course.hcp[i];
    const active = i === currentHole;
    return { filled, active };
  });

  return (
    <div>
      {/* Progress bar */}
      <div style={{ display: "flex", gap: 2, marginBottom: 12 }}>
        {segments.map((seg, i) => (
          <button
            key={i}
            onClick={() => setCurrentHole(i)}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              border: "none",
              padding: 0,
              cursor: "pointer",
              background: seg.active
                ? sc.green
                : seg.filled
                ? sc.gold
                : sc.border,
              outline: seg.active ? `2px solid ${sc.green}` : "none",
              outlineOffset: 1,
            }}
            aria-label={`Hole ${i + 1}`}
          />
        ))}
      </div>

      {/* Hole navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button
          onClick={() => setCurrentHole(Math.max(0, currentHole - 1))}
          disabled={currentHole === 0}
          style={{ fontSize: 22, padding: "4px 12px", borderRadius: 8, border: `1px solid ${sc.border}`, background: "white", cursor: currentHole === 0 ? "not-allowed" : "pointer", opacity: currentHole === 0 ? 0.3 : 1 }}
        >
          ‹
        </button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: sc.ink }}>Hole {currentHole + 1}</div>
          <div style={{ fontSize: 12, color: sc.muted }}>{completedCount} of {totalHoles} complete</div>
        </div>
        <button
          onClick={() => setCurrentHole(Math.min(totalHoles - 1, currentHole + 1))}
          disabled={currentHole === totalHoles - 1}
          style={{ fontSize: 22, padding: "4px 12px", borderRadius: 8, border: `1px solid ${sc.border}`, background: "white", cursor: currentHole === totalHoles - 1 ? "not-allowed" : "pointer", opacity: currentHole === totalHoles - 1 ? 0.3 : 1 }}
        >
          ›
        </button>
      </div>

      {/* Par buttons */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: sc.muted, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Par</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {[3, 4, 5].map(val => {
            const selected = Number(par) === val;
            return (
              <button
                key={val}
                onClick={() => selectPar(val)}
                style={{
                  padding: "14px 0",
                  fontSize: 20,
                  fontWeight: 700,
                  borderRadius: 10,
                  border: selected ? `2px solid ${sc.green}` : `1px solid ${sc.border}`,
                  background: selected ? sc.greenLight : "white",
                  color: selected ? sc.green : sc.ink,
                  cursor: "pointer",
                }}
              >
                {val}
              </button>
            );
          })}
        </div>
      </div>

      {/* HCP pad */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: sc.muted, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Handicap
          {hcp ? <span style={{ marginLeft: 8, color: sc.gold, fontWeight: 700 }}>= {hcp}</span> : null}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
          {Array.from({ length: 18 }, (_, i) => i + 1).map(val => {
            const selected = Number(hcp) === val;
            const used = usedHcps.has(val);
            return (
              <button
                key={val}
                onClick={() => !used && selectHcp(val)}
                disabled={used}
                style={{
                  padding: "10px 0",
                  fontSize: 13,
                  fontWeight: selected ? 700 : 400,
                  borderRadius: 6,
                  border: selected ? `2px solid ${sc.gold}` : `1px solid ${sc.border}`,
                  background: selected ? sc.goldLight : used ? "#f9f9f9" : "white",
                  color: selected ? sc.gold : used ? "#ccc" : sc.ink,
                  cursor: used ? "not-allowed" : "pointer",
                  textDecoration: used ? "line-through" : "none",
                }}
              >
                {val}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        {holeComplete && (
          <button
            onClick={clearHole}
            style={{ padding: "10px 16px", fontSize: 13, borderRadius: 8, border: `1px solid ${sc.border}`, background: "white", color: sc.muted, cursor: "pointer" }}
          >
            Clear hole
          </button>
        )}
        <button
          onClick={advanceHole}
          disabled={currentHole === totalHoles - 1}
          style={{
            flex: 1,
            padding: "10px 0",
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 8,
            border: `1px solid ${holeComplete ? sc.green : sc.border}`,
            background: holeComplete ? sc.greenLight : "white",
            color: holeComplete ? sc.green : sc.muted,
            cursor: currentHole === totalHoles - 1 ? "not-allowed" : "pointer",
            opacity: currentHole === totalHoles - 1 ? 0.4 : 1,
          }}
        >
          Next hole ›
        </button>
      </div>

      {/* All holes summary — tap any to jump */}
      <details style={{ marginTop: 16 }}>
        <summary style={{ fontSize: 12, color: sc.muted, cursor: "pointer", userSelect: "none" }}>
          View all holes
        </summary>
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
          {course.pars.map((p, i) => {
            const h = course.hcp[i];
            const done = p && h;
            const active = i === currentHole;
            return (
              <button
                key={i}
                onClick={() => setCurrentHole(i)}
                style={{
                  padding: "8px 4px",
                  fontSize: 12,
                  borderRadius: 6,
                  border: active ? `2px solid ${sc.green}` : `1px solid ${sc.border}`,
                  background: active ? sc.greenLight : done ? "#fafafa" : "white",
                  color: done ? sc.ink : sc.muted,
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <div style={{ fontWeight: 600 }}>H{i + 1}</div>
                <div style={{ color: done ? sc.green : sc.border }}>{p ? `Par ${p}` : "Par —"}</div>
                <div style={{ color: done ? sc.gold : sc.border }}>{h ? `HCP ${h}` : "HCP —"}</div>
              </button>
            );
          })}
        </div>
      </details>
    </div>
  );
}
