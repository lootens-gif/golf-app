// VegasWheelShadow.jsx — Aug 2026
//
// Private, Admin-only shadow calculation. Only ever rendered when
// isAdminView is true (see App.jsx) — never visible on a normal host's
// live Results screen, never exposed in Setup, no trace of it anywhere
// the group would see. Reuses the REAL team pairings already configured
// for the day's actual 6/6/6 Press Wheel — no separate team-selection UI.
//
// Flip the Bird is a genuine toggle (not baked in) specifically so Tim
// can compare the swing it makes before deciding whether it's worth
// floating to the group at all. The 10+ protective flip is NOT a toggle —
// it's always on, matching standard Vegas convention.

import { useState } from "react";
import { computeVegasWheelShadow } from "../engine/scoringEngine";

const col = {
  ink: "#1a1a1a",
  muted: "#6b7280",
  faint: "#9ca3af",
  border: "#d1d5db",
  green: "#137333",
  red: "#b3261e",
  bg: "#fdf8ee", // deliberately distinct from every other card style in the app -
                 // this should never be mistaken for something the group sees
};

function fmtMoney(v) {
  const rounded = Math.round(v * 100) / 100;
  return rounded >= 0 ? `+$${rounded}` : `-$${Math.abs(rounded)}`;
}

export default function VegasWheelShadow({ teamGames, players, teamContext }) {
  const [flipTheBirdEnabled, setFlipTheBirdEnabled] = useState(false);
  const [betInput, setBetInput] = useState("0.25");

  const dollarsPerPoint = Number(betInput) || 0;

  const { balancesByPlayerId, matchupDetails } = computeVegasWheelShadow({
    teamGames,
    ...teamContext,
    flipTheBirdEnabled,
    dollarsPerPoint,
  });

  const hasAnyData = matchupDetails.some((m) => m.holes.length > 0);

  const sorted = [...players]
    .filter((p) => balancesByPlayerId[p.id] !== undefined)
    .sort((a, b) => (balancesByPlayerId[b.id] || 0) - (balancesByPlayerId[a.id] || 0));

  return (
    <div style={{ background: col.bg, border: `1.5px dashed ${col.faint}`, borderRadius: 12, padding: 14, marginTop: 16, marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: col.muted, fontWeight: 600, marginBottom: 2 }}>
        🔒 Admin only — Vegas Wheel shadow calc
      </div>
      <div style={{ fontSize: 11, color: col.faint, marginBottom: 10 }}>
        Not visible to the group. Uses this round's real team pairings, different math.
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={flipTheBirdEnabled}
            onChange={(e) => setFlipTheBirdEnabled(e.target.checked)}
          />
          Flip the Bird
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          $/point:
          <input
            type="text"
            inputMode="decimal"
            value={betInput}
            onChange={(e) => {
              let cleaned = e.target.value.replace(/[^\d.]/g, "");
              const firstDot = cleaned.indexOf(".");
              if (firstDot !== -1) {
                cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
              }
              setBetInput(cleaned);
            }}
            style={{ width: 56, fontSize: 13, padding: "4px 6px" }}
          />
        </label>
      </div>

      {!hasAnyData ? (
        <div style={{ fontSize: 12, color: col.faint }}>No scores entered yet for this round's team segments.</div>
      ) : (
        <>
          {sorted.map((p) => {
            const v = balancesByPlayerId[p.id] || 0;
            const c = v > 0 ? col.green : v < 0 ? col.red : col.muted;
            return (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "2px 0" }}>
                <span style={{ color: col.ink }}>{p.name}</span>
                <span style={{ color: c, fontWeight: 600 }}>{fmtMoney(v)}</span>
              </div>
            );
          })}

          <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${col.border}`, fontSize: 11, color: col.faint }}>
            {matchupDetails.map((m, i) => (
              <div key={i}>
                Segment {m.segment + 1}, {m.label}: {m.holes.length} holes scored, {m.totalDiff >= 0 ? "+" : ""}{m.totalDiff} pt diff
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
