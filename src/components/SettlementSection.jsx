function SettlementSection({
  playerLedger = [],
  tabs = [],
  players = [],
  roundSummaryRows = [],
}) {
  const getPlayerName = (playerId) => {
    return players.find((player) => player.id === playerId)?.name || playerId;
  };

  return (
    <section className="settlement-section">
      <h2>Round Summary</h2>

      <div className="settlement-card">
        <h3>Standings</h3>

        {playerLedger.length === 0 ? (
          <p>No settled results yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>Main Game</th>
                <th>Side Matches</th>
                <th>Birdies</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {playerLedger.map((row) => (
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

      <div className="settlement-card">
        <h3>Settle Up</h3>

        {tabs.length === 0 ? (
          <p>Everyone is settled up.</p>
        ) : (
          <ul style={{ paddingLeft: 16, marginTop: 8 }}>
            {[...tabs]
              .sort((a, b) => b.amount - a.amount)
              .map((tab, index) => {
                const fromName = getPlayerName(tab.fromPlayerId);
                const toName = getPlayerName(tab.toPlayerId);

                return (
                  <li
                    key={`${tab.fromPlayerId}-${tab.toPlayerId}-${index}`}
                    style={{
                      marginBottom: 6,
                      padding: 6,
                      background: "#f7f7f7",
                      border: "1px solid #ddd",
                      borderRadius: 4,
                    }}
                  >
                    <strong>{fromName}</strong> pays{" "}
                    <strong>{toName}</strong> ${Number(tab.amount).toFixed(2)}
                  </li>
                );
              })}
          </ul>
        )}
      </div>

      <div className="settlement-card">
        <h3>Game Summary</h3>

        {roundSummaryRows.length === 0 ? (
          <p>No game summary available.</p>
        ) : (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "80px 60px 60px 60px 70px",
                gap: 8,
                fontFamily: "monospace",
                fontWeight: "bold",
                marginBottom: 6,
              }}
            >
              <div>Name</div>
              <div>G1</div>
              <div>G2</div>
              <div>G3</div>
              <div>Total</div>
            </div>

            {roundSummaryRows.map((row) => (
              <div
                key={row.playerId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "80px 60px 60px 60px 70px",
                  gap: 8,
                  fontFamily: "monospace",
                  marginBottom: 4,
                }}
              >
                <div>
                  <strong>{row.name}</strong>
                </div>
                <div>{row.gameTotals?.[0] > 0 ? `+${row.gameTotals[0]}` : row.gameTotals?.[0] ?? 0}</div>
                <div>{row.gameTotals?.[1] > 0 ? `+${row.gameTotals[1]}` : row.gameTotals?.[1] ?? 0}</div>
                <div>{row.gameTotals?.[2] > 0 ? `+${row.gameTotals[2]}` : row.gameTotals?.[2] ?? 0}</div>
                <div style={{ fontWeight: "bold" }}>
                  {row.netTotal > 0 ? `+${row.netTotal}` : row.netTotal}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default SettlementSection;