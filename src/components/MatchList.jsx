import { getPlayerName } from "../engine/scoringEngine";

export default function MatchList({
  players,
  matches,
  results,
  onAddMatch,
  onUpdateMatch,
  onRemoveMatch,
}) {
function renderBirdieSummary(result) {
  if (!result.birdieSummary || !result.birdieSummary.enabled) {
    return null;
  }

  return (
    <div style={{ marginTop: 8, borderTop: "1px solid #ddd", paddingTop: 8 }}>
      <div>
        <strong>Birdie Side Bet</strong>
      </div>
      <div>Net Birdie Units: {result.birdieSummary.units}</div>
      <div>Birdie Payout: ${result.birdieSummary.dollars}</div>
    </div>
  );
}

function renderMatchDetails(match, result) {
  if (result.type === "standard") {
    return (
      <div style={{ marginTop: 8 }}>
        <div>Match Result: {result.label}</div>
        {result.decidedOn ? <div>Decided on Hole: {result.decidedOn}</div> : null}
        <div>Match Bet: ${match.bet}</div>
        <div>
          <strong>Payout: ${result.total}</strong>
        </div>
        {renderBirdieSummary(result)}
      </div>
    );
  }

  if (result.type === "longshort") {
    return (
      <div style={{ marginTop: 8 }}>
        <div>Long Result: {result.longLabel}</div>
        <div>Long Bet: ${match.bet}</div>
        <div>Long Decided on Hole: {result.longDecidedOn ?? "-"}</div>

        <div style={{ marginTop: 6 }}>Short Result: {result.shortLabel}</div>
        <div>Short Bet: ${match.bet / 2}</div>
        <div>Short Decided on Hole: {result.shortDecidedOn ?? "-"}</div>

        <div style={{ marginTop: 6 }}>
          <strong>Total Payout: ${result.total}</strong>
        </div>
        {renderBirdieSummary(result)}
      </div>
    );
  }

  if (result.type === "match_fbt") {
    return (
      <div style={{ marginTop: 8 }}>
        {result.segments.map((seg) => (
          <div key={seg.key}>
            {seg.label}: {seg.resultLabel} | Bet: ${match.bet} | Payout: $
            {seg.dollars}
            {seg.decidedOn ? ` | Decided on Hole: ${seg.decidedOn}` : ""}
          </div>
        ))}
        <div style={{ marginTop: 6 }}>
          <strong>Net Payout: ${result.total}</strong>
        </div>
        {renderBirdieSummary(result)}
      </div>
    );
  }

  if (result.type === "stroke") {
    return (
      <div style={{ marginTop: 8 }}>
        <div>
          Stroke Mode: {result.strokeScoring} / {result.strokePayoutMode}
        </div>

        {result.segments.map((seg) => (
          <div key={seg.key}>
            {seg.label}: {seg.aTotal ?? "-"} vs {seg.bTotal ?? "-"} | Units:{" "}
            {seg.units} | Payout: ${seg.dollars}
          </div>
        ))}

        <div style={{ marginTop: 6 }}>
          <strong>Net Payout: ${result.total}</strong>
        </div>
        {renderBirdieSummary(result)}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div>
        <strong>Payout: ${result.total}</strong>
      </div>
      {renderBirdieSummary(result)}
    </div>
  );
}

  return (
    <div>
      <h3>Matches</h3>
      <button onClick={onAddMatch}>Add Match</button>

      {results.map(({ match, result }) => (
        <div
          key={match.id}
          style={{ border: "1px solid gray", margin: 6, padding: 10 }}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <select
              value={match.p1Id}
              onChange={(e) => onUpdateMatch(match.id, { p1Id: e.target.value })}
            >
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <span>vs</span>

            <select
              value={match.p2Id}
              onChange={(e) => onUpdateMatch(match.id, { p2Id: e.target.value })}
            >
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={match.type}
              onChange={(e) => onUpdateMatch(match.id, { type: e.target.value })}
            >
              <option value="standard">Standard Match Play</option>
              <option value="longshort">Long / Short Match Play</option>
              <option value="match_fbt">Front / Back / Total Match Play</option>
              <option value="stroke">Stroke Play</option>
            </select>

            <label>
              Match Bet:
              <input
                type="text"
                inputMode="numeric"
                value={match.bet ?? ""}
                onFocus={(e) => {
                    setTimeout(() => {
                    e.target.setSelectionRange(0, e.target.value.length);
                    }, 0);
                }}
                onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, "");

                    if (cleaned === "") {
                    onUpdateMatch(match.id, { bet: "" });
                    return;
                    }

                    const num = Math.min(100, Math.max(0, Number(cleaned)));

                    onUpdateMatch(match.id, { bet: num });
                }}
                style={{ width: 70, marginLeft: 6, fontSize: 16, padding: 6 }}
                />
            </label>
<label>
  Birdie Bet:
      <input
            type="text"
            inputMode="numeric"
            value={match.birdieBet ?? ""}
            onFocus={(e) => {
                setTimeout(() => {
                e.target.setSelectionRange(0, e.target.value.length);
                }, 0);
            }}
            onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, "");

                if (cleaned === "") {
                onUpdateMatch(match.id, { birdieBet: "" });
                return;
                }

                const num = Math.min(100, Math.max(0, Number(cleaned)));

                onUpdateMatch(match.id, { birdieBet: num });
            }}
            style={{ width: 70, marginLeft: 6, fontSize: 16, padding: 6 }}
            />
</label>
            <label>
              <input
                type="checkbox"
                checked={!!match.birdieEnabled}
                onChange={(e) =>
                  onUpdateMatch(match.id, { birdieEnabled: e.target.checked })
                }
              />
              Birdies
            </label>

            <button onClick={() => onRemoveMatch(match.id)}>Remove</button>
          </div>

          {match.birdieEnabled && (
            <div
              style={{
                marginTop: 8,
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <label>
                <input
                  type="checkbox"
                  checked={!!match.matchGrossBirdieAdvantage}
                  onChange={(e) =>
                    onUpdateMatch(match.id, {
                      matchGrossBirdieAdvantage: e.target.checked,
                    })
                  }
                />
                Gross Birdie Wins
              </label>
            </div>
          )}

          {match.type === "stroke" && (
            <div
              style={{
                marginTop: 8,
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <label>
                Gross / Net:
                <select
                  value={match.strokeScoring || "net"}
                  onChange={(e) =>
                    onUpdateMatch(match.id, { strokeScoring: e.target.value })
                  }
                  style={{ marginLeft: 6 }}
                >
                  <option value="gross">Gross</option>
                  <option value="net">Net</option>
                </select>
              </label>

              <label>
                Payout:
                <select
                  value={match.strokePayoutMode || "winloss"}
                  onChange={(e) =>
                    onUpdateMatch(match.id, {
                      strokePayoutMode: e.target.value,
                    })
                  }
                  style={{ marginLeft: 6 }}
                >
                  <option value="winloss">Win / Loss</option>
                  <option value="differential">Differential</option>
                </select>
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={!!match.strokeFront}
                  onChange={(e) =>
                    onUpdateMatch(match.id, { strokeFront: e.target.checked })
                  }
                />
                Front 9
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={!!match.strokeBack}
                  onChange={(e) =>
                    onUpdateMatch(match.id, { strokeBack: e.target.checked })
                  }
                />
                Back 9
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={!!match.strokeTotal}
                  onChange={(e) =>
                    onUpdateMatch(match.id, { strokeTotal: e.target.checked })
                  }
                />
                Total 18
              </label>
            </div>
          )}

          <div style={{ marginTop: 8 }}>
            {getPlayerName(players, match.p1Id)} vs{" "}
            {getPlayerName(players, match.p2Id)}
          </div>

          <div
            style={{
              display: "flex",
              gap: 4,
              marginTop: 8,
              flexWrap: "wrap",
            }}
          >
            {result.holes.map((h, idx) => (
              <div
                key={idx}
                style={{
                  width: 20,
                  textAlign: "center",
                  background:
                    h === null
                      ? "#eee"
                      : h > 0
                      ? "green"
                      : h < 0
                      ? "red"
                      : "#ccc",
                }}
              >
                {h ?? "-"}
              </div>
            ))}
          </div>

          {renderMatchDetails(match, result)}
        </div>
      ))}
    </div>
  );
}