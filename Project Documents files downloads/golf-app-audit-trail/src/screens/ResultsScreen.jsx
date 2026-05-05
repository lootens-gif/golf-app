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
  goToLive,
  backToSetup,
}) {
  const [showAuditTrail, setShowAuditTrail] = useState(false);

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
   

      <h3>Final Results</h3>
<div style={{ border: "1px solid gray", padding: 12, marginBottom: 12 }}>
  <h3 style={{ marginTop: 0 }}>Gross / Net for GHIN</h3>

  {grossNetRows.map(({ player, frontGross, backGross, totalGross, net }) => (
    <div
      key={player.id}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 170px 70px",
        gap: 8,
        marginBottom: 4,
      }}
    >
      <div>{player.name}</div>
      <div>
        Gross {frontGross} + {backGross} = {totalGross}
      </div>
      <div>Net {net}</div>
    </div>
  ))}
</div>
      <div style={{ border: "1px solid gray", padding: 12, marginBottom: 12 }}>
  <h3 style={{ marginTop: 0 }}>Leaderboard</h3>

  {players.map((player) => (
    <div key={player.id}>
      {player.name}: ${leaderboard[player.id] ?? 0}
    </div>
  ))}

  {(() => {
    const won = players.reduce((sum, player) => {
      const amount = Number(leaderboard[player.id] ?? 0);
      return amount > 0 ? sum + amount : sum;
    }, 0);

    const lost = players.reduce((sum, player) => {
      const amount = Number(leaderboard[player.id] ?? 0);
      return amount < 0 ? sum + Math.abs(amount) : sum;
    }, 0);

    return (
      <div
        style={{
          marginTop: 10,
          padding: 8,
          background: "#f7f7f7",
          border: "1px solid #ddd",
          borderRadius: 6,
          fontSize: 14,
          fontWeight: "bold",
        }}
      >
        Money balances: ${won.toFixed(2)} won = ${lost.toFixed(2)} lost ✓
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

      <div style={{ marginBottom: 12 }}>
        <button
          type="button"
          className="secondary-button"
          onClick={() => setShowAuditTrail((current) => !current)}
        >
          {showAuditTrail ? "Hide Audit Trail" : "Show Audit Trail"}
        </button>
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
        />
      )}
    </>
  );
}