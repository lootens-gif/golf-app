import { useState } from "react";
import SettlementSection from "../components/SettlementSection";
import AuditTrail from "../components/AuditTrail";

export default function ResultsScreen({
  players,
  leaderboard,
  computedResults,
  roundSummaryRows = [],
  enableTeamGame,
  scores = {},
  course,
  matches = [],
  matchResults = [],
  birdieResults = [],
  teamGames = [],
  teamGameResults = [],
  getTeamGameSelection,
  handicapMode,
  teamGameUnitAmount,
  noPar3TeamGame = false,
  goToLive,
  backToSetup,
}) {
  const [showAuditTrail, setShowAuditTrail] = useState(false);

if (window.__debug) {
  console.log("MATCH RESULTS DEBUG", matchResults);
}

  const grossNetRows = players.map((player) => {
  const frontGross = Array.from({ length: 9 }, (_, i) => i + 1).reduce(
    (sum, hole) => {
      const value = Number(scores?.[hole]?.[player.id]);
      return Number.isFinite(value) ? sum + value : sum;
    },
    0
  );

  const backGross = Array.from({ length: 9 }, (_, i) => i + 10).reduce(
    (sum, hole) => {
      const value = Number(scores?.[hole]?.[player.id]);
      return Number.isFinite(value) ? sum + value : sum;
    },
    0
  );

  const totalGross = frontGross + backGross;
  const handicap = Number(player.hcp || 0);
  const net = totalGross - handicap;

  return {
    player,
    frontGross,
    backGross,
    totalGross,
    net,
  };
});
  return (
    <>
      <h2 style={{ marginBottom: 16 }}>Final Results</h2>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Leaderboard</h3>
        {[...players]
          .sort((a, b) => Number(leaderboard[b.id] ?? 0) - Number(leaderboard[a.id] ?? 0))
          .map((player) => {
          const amount = Number(leaderboard[player.id] ?? 0);
          return (
            <div key={player.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <strong>{player.name}</strong>
              <span style={{ color: amount > 0 ? "#137333" : amount < 0 ? "#b3261e" : "#666", fontWeight: 700 }}>
                {amount > 0 ? `+$${amount.toFixed(2)}` : amount < 0 ? `-$${Math.abs(amount).toFixed(2)}` : "Even"}
              </span>
            </div>
          );
        })}
        {(() => {
          const won = players.reduce((sum, p) => {
            const a = Number(leaderboard[p.id] ?? 0);
            return a > 0 ? sum + a : sum;
          }, 0);
          return (
            <div style={{ marginTop: 10, padding: 8, background: "#f7f7f7", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, color: "#555" }}>
              Money balances: ${won.toFixed(2)} won = ${won.toFixed(2)} lost ✓
            </div>
          );
        })()}
      </div>

      <SettlementSection
        playerLedger={computedResults.playerLedger}
        tabs={computedResults.tabs}
        players={players}
        roundSummaryRows={roundSummaryRows}
        enableTeamGame={enableTeamGame}
      />

<div
        onClick={() => setShowAuditTrail((current) => !current)}
        style={{
          marginTop: 16,
          marginBottom: 12,
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid #ddd",
          background: "#f7f7f7",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
          gap: 6,
        }}
      >
        <span>Scorecards</span>
        <span>{showAuditTrail ? "▲" : "▼"}</span>
      </div>

      {showAuditTrail && (
        <AuditTrail
          players={players}
          matches={matches}
          matchResults={matchResults}
          birdieResults={birdieResults}
          teamGames={teamGames}
          teamGameResults={teamGameResults}
          getTeamGameSelection={getTeamGameSelection}
          scores={scores}
          course={course}
          handicapMode={handicapMode}
          teamGameUnitAmount={teamGameUnitAmount}
          noPar3TeamGame={noPar3TeamGame}
          goToLive={goToLive}
        />
      )}

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Gross / Net for GHIN</h3>
        {grossNetRows.map(({ player, frontGross, backGross, totalGross, net }) => (
          <div
            key={player.id}
            style={{ display: "grid", gridTemplateColumns: "1fr 170px 70px", gap: 8, marginBottom: 4 }}
          >
            <div>{player.name}</div>
            <div>Gross {frontGross} + {backGross} = {totalGross}</div>
            <div>Net {net}</div>
          </div>
        ))}
      </div>
    </>
  );
}