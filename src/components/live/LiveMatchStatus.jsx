// LiveMatchStatus.jsx — Aug 2026
//
// The Scoring screen's "step 3" tool: give status when needed, either
// someone asks or someone checks themselves. Deliberately NOT built on
// AuditSection or the Results-screen scorecards (OneVOneScorecard /
// TeamGameScorecard) — those exist for step 5 (audit, trust-then-verify,
// after the fact) and staying separate from them is the point, not an
// oversight. This reuses only the glance-line TEXT logic (formatDetail /
// computeOneVOneGlance, computeTeamMatchupGlance) so the two screens agree
// on what a status reads as, without sharing visual weight or persistence.
//
// Format rules (confirmed, Aug 2026):
//   Press (Team + 1v1)        -> expandable, bet chain + Call Press
//   Match Play (Team + 1v1)   -> expandable, but manual press isn't built
//                                 yet, so it says so rather than showing
//                                 a dead button
//   Net Holes / Long-Short /
//   Stroke / 9-Point          -> flat line, no tap target at all —
//                                 there's nothing to decide
//
// No localStorage persistence anywhere in this component — a status check
// is a moment, not a thing to remember across sessions the way Results'
// section-open state is.

import { useState } from "react";
import { computeOneVOneGlance, computeTeamMatchupGlance, getTeamName } from "../AuditTrail";
import { getPlayerName } from "../../engine/scoringEngine";

const col = {
  ink: "#1a1a1a",
  muted: "#6b7280",
  faint: "#9ca3af",
  border: "#e5e7eb",
  green: "#1a5c35",
  greenBg: "#f0f7f3",
  red: "#b3261e",
};

function fmtMoney(v) {
  return v >= 0 ? `+$${Math.abs(v)}` : `-$${Math.abs(v)}`;
}

function CallPressButton({ called, onClick, hole }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        width: "100%",
        marginTop: 8,
        padding: "9px 10px",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "inherit",
        cursor: "pointer",
        border: called ? `1.5px solid ${col.green}` : "1px solid #d1d5db",
        background: called ? col.greenBg : "#fff",
        color: called ? col.green : col.ink,
      }}
    >
      {called ? `Press called on hole ${hole} ✓` : `Call press on hole ${hole}`}
    </button>
  );
}

function PressDetail({ bets, currentHole, onToggle }) {
  const called = (bets || []).some((b) => b.manual && Number(b.startHole) === currentHole);
  return (
    <div>
      {(bets || []).map((bet, i) => {
        const c = bet.score > 0 ? col.green : bet.score < 0 ? col.red : col.muted;
        return (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0" }}>
            <span style={{ color: col.muted }}>
              {bet.label}{bet.manual ? " (called)" : ""} — from hole {bet.startHole}:
            </span>
            <span style={{ color: c }}>{bet.score > 0 ? `+${bet.score}` : bet.score}</span>
          </div>
        );
      })}
      <CallPressButton called={called} hole={currentHole} onClick={onToggle} />
    </div>
  );
}

function NotBuiltDetail() {
  return (
    <div style={{ fontSize: 12, color: col.faint, paddingTop: 2 }}>
      Manual press for this format is not built yet.
    </div>
  );
}

function Row({ item, currentHole, onToggleManualPress }) {
  const [open, setOpen] = useState(false);
  const expandable = item.kind === "press" || item.kind === "match_fbt";

  return (
    <div style={{ borderTop: item.first ? "none" : `0.5px solid ${col.border}` }}>
      <div
        onClick={expandable ? () => setOpen((o) => !o) : undefined}
        style={{
          padding: "10px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: expandable ? "pointer" : "default",
        }}
      >
        <div>
          <div style={{ fontSize: 14, color: col.ink }}>{item.label}</div>
          <div style={{ fontSize: 11, color: col.faint, marginTop: 1 }}>{item.kindLabel}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13 }}>{item.glance}</span>
          {expandable && <span style={{ fontSize: 11, color: col.faint }}>{open ? "▲" : "▼"}</span>}
        </div>
      </div>
      {expandable && open && (
        <div style={{ padding: "0 14px 12px" }}>
          {item.kind === "press"
            ? <PressDetail bets={item.bets} currentHole={currentHole} onToggle={() => onToggleManualPress(item)} />
            : <NotBuiltDetail />}
        </div>
      )}
    </div>
  );
}

export default function LiveMatchStatus({
  currentHole,
  players,
  matches,
  matchResults,
  teamGameResults,
  getTeamGameSelection,
  teamGameUnitAmount,
  onUpdateMatch,          // 1v1: same updateMatch(id, patch) already used in Setup
  onToggleTeamManualPress, // team: (gameIndex, label, hole) => void
}) {
  const items = [];

  // 1v1 matches
  (matchResults || []).forEach((entry) => {
    const match = entry.match;
    if (!match.p1Id || !match.p2Id || match.gameType === "ninePoint") return;
    const result = entry.result || {};
    const p1Name = getPlayerName(players, match.p1Id);
    const p2Name = getPlayerName(players, match.p2Id);
    const p1First = p1Name.trim().split(" ")[0];
    const p2First = p2Name.trim().split(" ")[0];
    const { total, isPressResult } = computeOneVOneGlance({ match, result, p1First, p2First });

    if (isPressResult) {
      items.push({
        id: `v-${match.id}`,
        label: `${p1First} vs ${p2First}`,
        kindLabel: "1v1 Press",
        kind: "press",
        glance: <span style={{ color: total > 0 ? col.green : total < 0 ? col.red : col.muted }}>{fmtMoney(total)}</span>,
        bets: result,
        match,
      });
    } else if (match.type === "match_fbt") {
      items.push({
        id: `v-${match.id}`,
        label: `${p1First} vs ${p2First}`,
        kindLabel: "1v1 Match Play",
        kind: "match_fbt",
        glance: <span style={{ color: total > 0 ? col.green : total < 0 ? col.red : col.muted }}>{fmtMoney(total)}</span>,
      });
    } else {
      const { formatDetail } = computeOneVOneGlance({ match, result, p1First, p2First });
      items.push({
        id: `v-${match.id}`,
        label: `${p1First} vs ${p2First}`,
        kindLabel: match.type === "longshort" ? "1v1 Long/Short" : match.type === "stroke" ? "1v1 Stroke" : "1v1 Net Holes",
        kind: "flat",
        glance: formatDetail || <span style={{ color: col.muted }}>—</span>,
      });
    }
  });

  // Team matches
  (teamGameResults || []).forEach((game, gameIndex) => {
    if (game.duplicateError) return;
    const selection = getTeamGameSelection?.(game.index ?? gameIndex);
    (game.matches || []).forEach((matchup) => {
      if (currentHole < game.start || currentHole > game.end) return;
      const teamAName = getTeamName(players, matchup.teamA || []);
      const teamBName = getTeamName(players, matchup.teamB || []);
      const { totalDollars, matchSummaryLine, isPress } = computeTeamMatchupGlance({ matchup, teamAName, teamBName, teamGameUnitAmount });

      if (isPress) {
        items.push({
          id: `t-${gameIndex}-${matchup.label}`,
          label: matchup.label,
          kindLabel: "Team Press",
          kind: "press",
          glance: <span style={{ color: totalDollars > 0 ? col.green : totalDollars < 0 ? col.red : col.muted }}>{fmtMoney(totalDollars)}</span>,
          bets: Array.isArray(matchup.result) ? matchup.result : [],
          gameIndex: game.index ?? gameIndex,
        });
      } else {
        items.push({
          id: `t-${gameIndex}-${matchup.label}`,
          label: matchup.label,
          kindLabel: "Team " + (matchup.result?.type === "match_fbt" ? "Match Play" : matchup.result?.type === "longshort" ? "Long/Short" : matchup.result?.type === "stroke" ? "Stroke" : "Net Holes"),
          kind: matchup.result?.type === "match_fbt" ? "match_fbt" : "flat",
          glance: <span style={{ fontSize: 12, color: col.muted }}>{matchSummaryLine || "—"}</span>,
        });
      }
    });
  });

  if (!items.length) return null;

  const toggleManualPress = (item) => {
    if (item.match) {
      const existing = item.match.manualPressHoles || [];
      const next = existing.includes(currentHole)
        ? existing.filter((h) => h !== currentHole)
        : [...existing, currentHole];
      onUpdateMatch(item.match.id, { manualPressHoles: next });
    } else if (item.gameIndex != null) {
      onToggleTeamManualPress(item.gameIndex, item.label, currentHole);
    }
  };

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #d1d5db", marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: col.muted, padding: "10px 14px 4px" }}>Match status</div>
      {items.map((item, i) => (
        <Row
          key={item.id}
          item={{ ...item, first: i === 0 }}
          currentHole={currentHole}
          onToggleManualPress={toggleManualPress}
        />
      ))}
    </div>
  );
}
