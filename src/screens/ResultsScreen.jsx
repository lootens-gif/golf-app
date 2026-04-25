import SettlementSection from "../components/SettlementSection";

export default function ResultsScreen({
  players,
  leaderboard,
  computedResults,
  goToLive,
}) {
  return (
    <>
      <button onClick={goToLive} style={{ marginBottom: 12 }}>
        Back to Round
      </button>

      <h3>Final Results</h3>

      <div style={{ border: "1px solid gray", padding: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Leaderboard</h3>
        {players.map((player) => (
          <div key={player.id}>
            {player.name}: ${leaderboard[player.id] ?? 0}
          </div>
        ))}
      </div>

      <SettlementSection
        playerLedger={computedResults.playerLedger}
        tabs={computedResults.tabs}
        players={players}
      />
    </>
  );
}