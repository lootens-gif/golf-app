function SettlementSection({
  playerLedger = [],
  tabs = [],
  players = [],
  roundSummaryRows = [],
  enableTeamGame = true,
}) {
  const getPlayerName = (playerId) => {
    return players.find((player) => player.id === playerId)?.name || playerId;
  };

  return (
    <section className="settlement-section">

     

      <div className="settlement-card">
        <h3>Settle Up</h3>

        {tabs.length === 0 ? (
          <p style={{ color: "#137333", fontWeight: 600 }}>✓ Everyone is settled up.</p>
        ) : (
          <ul style={{ paddingLeft: 0, marginTop: 8, listStyle: "none" }}>
            {[...tabs]
              .sort((a, b) => b.amount - a.amount)
              .map((tab, index) => {
                const fromName = getPlayerName(tab.fromPlayerId);
                const toName = getPlayerName(tab.toPlayerId);
                const amount = Number(tab.amount).toFixed(2);

                return (
                  <li
                    key={`${tab.fromPlayerId}-${tab.toPlayerId}-${index}`}
                    style={{
                      marginBottom: 8,
                      padding: "10px 12px",
                      background: "#fff8e1",
                      border: "1px solid #f9a825",
                      borderRadius: 6,
                      fontSize: 15,
                    }}
                  >
                    <strong>{fromName}</strong> pays <strong>{toName}</strong>{" "}
                    <span style={{ color: "#b3261e", fontWeight: 700 }}>${amount}</span>
                  </li>
                );
              })}
          </ul>
        )}
      </div>

 <div className="settlement-card">
        <h3>Standings</h3>

        {playerLedger.length === 0 ? (
          <p>No settled results yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>Team Game</th>
                <th>Side Matches</th>
                <th>Birdies</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
{playerLedger
  .filter((row) => players.some((player) => player.id === row.playerId))
  .map((row) => (
                    <tr key={row.playerId}>
                  <td>{getPlayerName(row.playerId)}</td>
                  <td>${Number(row.mainGame ?? 0).toFixed(2)}</td>
                  <td>${Number(row.sideMatches ?? 0).toFixed(2)}</td>
                  <td>${Number(row.birdies ?? 0).toFixed(2)}</td>
                  <td>
                    <strong>${Number(row.total ?? 0).toFixed(2)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </section>
  );
}

export default SettlementSection;