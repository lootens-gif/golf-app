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
//
// Hole-by-hole detail is expandable per matchup, deliberately showing
// gross AND net AND the combined Vegas number AND whether a flip fired —
// enough for a real by-hand check against a scorecard, not just a final
// number to take on faith.

import { useState } from "react";
import { computeVegasWheelShadow } from "../engine/scoringEngine";

const col = {
  ink: "#1a1a1a",
  muted: "#6b7280",
  faint: "#9ca3af",
  border: "#d1d5db",
  green: "#137333",
  red: "#b3261e",
  gold: "#b45309",
  bg: "#fdf8ee", // deliberately distinct from every other card style in the app -
                 // this should never be mistaken for something the group sees
};

function fmtMoney(v) {
  const rounded = Math.round(v * 100) / 100;
  return rounded >= 0 ? `+$${rounded}` : `-$${Math.abs(rounded)}`;
}

function playerName(players, id) {
  return players.find((p) => p.id === id)?.name?.split(" ")[0] || id;
}

function MatchupDetail({ matchup, players }) {
  const [open, setOpen] = useState(false);
  const teamAName = matchup.team1.map((id) => playerName(players, id)).join("/");
  const teamBName = matchup.team.map((id) => playerName(players, id)).join("/");

  return (
    <div style={{ marginTop: 6, border: `1px solid ${col.border}`, borderRadius: 8, overflow: "hidden" }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{ padding: "6px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "#fff" }}
      >
        <span style={{ fontSize: 12, color: col.ink }}>
          Seg {matchup.segment + 1}: {teamAName} vs {teamBName}
        </span>
        <span style={{ fontSize: 11, color: col.faint }}>
          {matchup.holes.length} holes, {matchup.totalDiff >= 0 ? "+" : ""}{matchup.totalDiff} pt {open ? "▲" : "▼"}
        </span>
      </div>
      {open && (
        <div style={{ padding: "6px 10px", background: "#fff", borderTop: `1px solid ${col.border}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${col.border}`, color: col.faint }}>
                <td style={{ padding: "2px 4px" }}>Hole</td>
                <td style={{ padding: "2px 4px" }}>{teamAName} gross</td>
                <td style={{ padding: "2px 4px" }}>{teamAName} net</td>
                <td style={{ padding: "2px 4px" }}>{teamAName} #</td>
                <td style={{ padding: "2px 4px" }}>{teamBName} gross</td>
                <td style={{ padding: "2px 4px" }}>{teamBName} net</td>
                <td style={{ padding: "2px 4px" }}>{teamBName} #</td>
                <td style={{ padding: "2px 4px" }}>Diff</td>
              </tr>
            </thead>
            <tbody>
              {matchup.holes.map((h) => (
                <tr key={h.hole} style={{ borderBottom: `1px solid #f3f4f6` }}>
                  <td style={{ padding: "2px 4px", color: col.ink }}>{h.hole}</td>
                  <td style={{ padding: "2px 4px" }}>{h.grossA.join("-")}</td>
                  <td style={{ padding: "2px 4px" }}>{h.netA.join("-")}</td>
                  <td style={{ padding: "2px 4px", fontWeight: 600, color: h.flippedA ? col.gold : col.ink }}>
                    {h.vegasA}{h.flippedA ? " 🔄" : ""}
                  </td>
                  <td style={{ padding: "2px 4px" }}>{h.grossB.join("-")}</td>
                  <td style={{ padding: "2px 4px" }}>{h.netB.join("-")}</td>
                  <td style={{ padding: "2px 4px", fontWeight: 600, color: h.flippedB ? col.gold : col.ink }}>
                    {h.vegasB}{h.flippedB ? " 🔄" : ""}
                  </td>
                  <td style={{ padding: "2px 4px", fontWeight: 600, color: h.diff < 0 ? col.green : h.diff > 0 ? col.red : col.muted }}>
                    {h.diff > 0 ? "+" : ""}{h.diff}
                    {h.birdieBy ? ` (🐦 by ${h.birdieBy === "A" ? teamAName : teamBName})` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 10, color: col.faint, marginTop: 4 }}>
            🔄 = flip applied (10+ protective, or Flip the Bird). Diff column: negative = {teamAName} wins the hole.
          </div>
        </div>
      )}
    </div>
  );
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

          <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${col.border}` }}>
            <div style={{ fontSize: 11, color: col.faint, marginBottom: 4 }}>Tap a matchup for hole-by-hole detail:</div>
            {matchupDetails.map((m, i) => (
              <MatchupDetail key={i} matchup={m} players={players} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
