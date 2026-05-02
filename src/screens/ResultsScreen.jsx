import SettlementSection from "../components/SettlementSection";

export default function ResultsScreen({
  players,
  leaderboard,
  computedResults,
  roundSummaryRows = [],
  enableTeamGame,
  goToLive,
  backToSetup,
}) {
  return (
    <>
   

      <h3>Final Results</h3>

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
    </>
  );
}