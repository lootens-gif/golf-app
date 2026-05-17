import React, { useState, useEffect, useRef } from "react";
import SettlementSection from "../components/SettlementSection";
import AuditTrail from "../components/AuditTrail";

const SCORECARD_OPEN_KEY = "results-scorecard-open";

const sc = {
  green:      "#1a5c35",
  greenLight: "#f0f7f3",
  gold:       "#b8952a",
  goldLight:  "#fdf8ee",
  ink:        "#1a1a1a",
  muted:      "#6b7280",
  border:     "#d1d5db",
  red:        "#b3261e",
  card:       "#ffffff",
};

function Card({ children, style = {} }) {
  return (
    <div style={{ background: sc.card, border: `1px solid ${sc.border}`, borderRadius: 12, padding: 16, marginBottom: 14, ...style }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: sc.muted, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${sc.border}` }}>
      {children}
    </div>
  );
}

function fmt(amount) {
  const n = Number(amount ?? 0);
  if (n > 0) return { str: `+$${n.toFixed(2)}`, color: sc.green };
  if (n < 0) return { str: `-$${Math.abs(n).toFixed(2)}`, color: sc.red };
  return { str: "Even", color: sc.muted };
}

export default function ResultsScreen({
  players, leaderboard, computedResults, roundSummaryRows = [],
  enableTeamGame, scores = {}, course, matches = [], matchResults = [],
  birdieResults = [], teamGames = [], teamGameResults = [],
  getTeamGameSelection, handicapMode, teamGameUnitAmount,
  noPar3TeamGame = false, goToLive, backToSetup, onUpdateScore,
}) {
  const [showAuditTrail, setShowAuditTrail] = useState(() => {
    try { return window.localStorage.getItem(SCORECARD_OPEN_KEY) === "open"; } catch { return false; }
  });
  const [drillPlayerId, setDrillPlayerId] = useState(null);
  const scorecardRef = useRef(null);

  useEffect(() => {
    try { window.localStorage.setItem(SCORECARD_OPEN_KEY, showAuditTrail ? "open" : "closed"); } catch {}
  }, [showAuditTrail]);

  const holesWithScores = Object.keys(scores).filter(h => {
    const holeScores = scores[h] || {};
    return players.some(p => Number.isFinite(holeScores[p.id]));
  }).length;
  const roundComplete = holesWithScores >= 18;

  const grossNetRows = players.map((player) => {
    const frontGross = Array.from({ length: 9 }, (_, i) => i + 1).reduce((sum, hole) => { const v = Number(scores?.[hole]?.[player.id]); return Number.isFinite(v) ? sum + v : sum; }, 0);
    const backGross = Array.from({ length: 9 }, (_, i) => i + 10).reduce((sum, hole) => { const v = Number(scores?.[hole]?.[player.id]); return Number.isFinite(v) ? sum + v : sum; }, 0);
    const totalGross = frontGross + backGross;
    const net = totalGross - Number(player.hcp || 0);
    return { player, frontGross, backGross, totalGross, net };
  });

  const sortedPlayers = [...players].sort((a, b) => Number(leaderboard[b.id] ?? 0) - Number(leaderboard[a.id] ?? 0));
  const totalWon = players.reduce((sum, p) => { const a = Number(leaderboard[p.id] ?? 0); return a > 0 ? sum + a : sum; }, 0);

  return (
    <div style={{ fontFamily: "'Georgia', serif" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: sc.ink }}>
          {roundComplete ? "Final Results" : "Live Results"}
        </h2>
        {!roundComplete && (
          <span style={{ fontSize: 11, background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d", borderRadius: 20, padding: "3px 10px", fontWeight: 600 }}>
            In Progress
          </span>
        )}
      </div>

      {/* LEADERBOARD */}
      <Card style={{ borderTop: `3px solid ${sc.green}` }}>
        <SectionLabel>Leaderboard</SectionLabel>
        <div style={{ fontSize: 12, color: sc.muted, marginBottom: 10 }}>Tap a name to see their scorecard</div>
        {sortedPlayers.map((player, i) => {
          const amount = Number(leaderboard[player.id] ?? 0);
          const { str, color } = fmt(amount);
          const isSelected = drillPlayerId === player.id;
          return (
            <div key={player.id} onClick={() => { setDrillPlayerId(player.id); setShowAuditTrail(true); setTimeout(() => scorecardRef.current?.scrollIntoView({ behavior: "smooth" }), 100); }}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", marginBottom: 6, borderRadius: 8, background: isSelected ? sc.greenLight : i === 0 && amount > 0 ? sc.goldLight : "#fafafa", border: `1px solid ${isSelected ? sc.green : sc.border}`, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: i === 0 && amount > 0 ? sc.gold : sc.border, color: i === 0 && amount > 0 ? "#fff" : sc.muted, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: 16, fontWeight: 600, color: sc.ink }}>{player.name}</span>
              </div>
              <span style={{ fontSize: 17, fontWeight: 800, color }}>{str}</span>
            </div>
          );
        })}
        <div style={{ marginTop: 10, padding: "8px 12px", background: sc.greenLight, borderRadius: 8, fontSize: 12, color: sc.green, fontWeight: 600, display: "flex", justifyContent: "space-between" }}>
          <span>Money in play</span>
          <span>${totalWon.toFixed(2)} won = ${totalWon.toFixed(2)} lost ✓</span>
        </div>
      </Card>

      {/* SCORECARDS TOGGLE */}
      <div ref={scorecardRef} onClick={() => setShowAuditTrail(v => !v)}
        style={{ marginBottom: 12, padding: "12px 16px", borderRadius: 10, border: `1px solid ${sc.border}`, background: showAuditTrail ? sc.green : "#fafafa", color: showAuditTrail ? "#fff" : sc.ink, fontWeight: 600, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
        <span>Scorecards & Match Detail</span>
        <span>{showAuditTrail ? "▲" : "▼"}</span>
      </div>

      {showAuditTrail && (
        <AuditTrail
          players={players} matches={matches} matchResults={matchResults}
          birdieResults={birdieResults} teamGames={teamGames} teamGameResults={teamGameResults}
          getTeamGameSelection={getTeamGameSelection} scores={scores} course={course}
          handicapMode={handicapMode} teamGameUnitAmount={teamGameUnitAmount}
          noPar3TeamGame={noPar3TeamGame} goToLive={goToLive} onUpdateScore={onUpdateScore}
          drillPlayerId={drillPlayerId}
        />
      )}

      {/* SETTLE UP */}
      <SettlementSection
        playerLedger={computedResults.playerLedger} tabs={computedResults.tabs}
        players={players} roundSummaryRows={roundSummaryRows} enableTeamGame={enableTeamGame}
      />

      {/* GHIN */}
      <Card>
        <SectionLabel>Gross / Net for GHIN</SectionLabel>
        {grossNetRows.map(({ player, frontGross, backGross, totalGross, net }) => (
          <div key={player.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${sc.border}`, fontSize: 14 }}>
            <span style={{ fontWeight: 600, color: sc.ink, minWidth: 70 }}>{player.name}</span>
            <span style={{ color: sc.muted, fontSize: 13 }}>{frontGross} + {backGross} = <strong style={{ color: sc.ink }}>{totalGross}</strong></span>
            <span style={{ background: sc.greenLight, color: sc.green, fontWeight: 700, fontSize: 13, padding: "3px 10px", borderRadius: 20 }}>Net {net}</span>
          </div>
        ))}
      </Card>

    </div>
  );
}
