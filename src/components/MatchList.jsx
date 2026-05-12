import { useState } from "react";
import {
  getPlayerName,
  
} from "../engine/scoringEngine";



export default function MatchList({
  players,
  matches,
  results,
  birdieResults = [],
  onAddMatch,
  onUpdateMatch,
  onRemoveMatch,
  
}) {
  const [expandedNinePointIds, setExpandedNinePointIds] = useState({});
 

  function getHoleStats(holes) {
    const wins = holes.filter((h) => h > 0).length;
    const losses = holes.filter((h) => h < 0).length;
    const pushes = holes.filter((h) => h === 0).length;
    const net = wins - losses;

    return { wins, losses, pushes, net };
  }

  function renderNinePointResult(result, match, isExpanded) {
    const playerIds = [match.p1Id, match.p2Id, match.p3Id].filter(Boolean);

    return (
      
  <div
    style={{
      marginTop: 8,
      padding: 10,
      border: "1px solid #ddd",
      borderRadius: 8,
      background: "#fafafa",
    }}
  >
       <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  }}
>
  <div style={{ fontWeight: "bold", fontSize: 16 }}>
    9 Point
  </div>

  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
    <div style={{ fontSize: 12, color: "#666" }}>
      {match.blitzEnabled ? "Blitz On" : "Blitz Off"}
    </div>

    <button
      type="button"
      onClick={() =>
        setExpandedNinePointIds((prev) => ({
          ...prev,
          [match.id]: !prev[match.id],
        }))
      }
      style={{ fontSize: 12 }}
    >
      {isExpanded ? "Hide Hole Details" : "Show Hole Details"}
    </button>
  </div>
</div>

        <div
  style={{
    marginBottom: 10,
    display: "grid",
    gap: 6,
  }}
>
          {playerIds.map((playerId) => {
            const name = getPlayerName(players, playerId) || playerId;
            const total = result.totalsByPlayerId?.[playerId] ?? 0;
            const balance = result.payout?.balancesByPlayerId?.[playerId] ?? 0;

            return (
              <div key={playerId}>
                {name}: {total} pts{" "}
                <span style={{ color: "#666" }}>
                  ({balance > 0 ? "+" : ""}${balance.toFixed(2)})
                </span>
              </div>
            );
          })}
        </div>

        {isExpanded && (
  <div style={{ marginTop: 8 }}>
    <div style={{ fontWeight: "bold", marginBottom: 6 }}>Hole Points</div>

    {result.holes.map((holeObj) => (
      <div
        key={holeObj.hole}
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 6,
          padding: "4px 0",
          borderBottom: "1px solid #eee",
        }}
      >
        <div style={{ width: 36 }}>
          <strong>{holeObj.hole}</strong>
        </div>

        {playerIds.map((playerId) => {
          const name = getPlayerName(players, playerId) || playerId;
          const points = holeObj.pointsByPlayerId?.[playerId];
          const running = holeObj.runningTotalsByPlayerId?.[playerId];
          const net = holeObj.netScoresByPlayerId?.[playerId];

          return (
            <div key={playerId} style={{ minWidth: 120 }}>
              <div style={{ fontSize: 12, fontWeight: "bold" }}>{name}</div>
              {holeObj.status === "complete" ? (
                <div style={{ fontSize: 12 }}>
                  Net {net} • {points} pts • {running} total
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "#777" }}>Pending</div>
              )}
            </div>
          );
        })}

        {holeObj.mode === "blitz" ? (
          <div style={{ fontSize: 12, fontWeight: "bold", color: "#b45309" }}>
            Blitz
          </div>
        ) : null}
      </div>
    ))}
  </div>
)}


        {result.payout?.status === "tie" ? (
          <div style={{ marginTop: 8, color: "#666" }}>
            Round tied — settle manually
          </div>
        ) : null}
      </div>
    );
  }



  function renderHoleRows(holes) {
    const front = holes.slice(0, 9);
    const back = holes.slice(9, 18);

    return (
      <div style={{ marginTop: 8 }}>
        {[front, back].map((row, rowIndex) => (
          <div
            key={rowIndex}
            style={{
              display: "flex",
              gap: 4,
              marginBottom: 4,
              flexWrap: "nowrap",
            }}
          >
            {row.map((h, idx) => {
              const actualIndex = rowIndex * 9 + idx;

              return (
                <div
                  key={actualIndex}
                  style={{
                    width: 24,
                    height: 24,
                    lineHeight: "24px",
                    textAlign: "center",
                    background:
                      h === null
                        ? "#eee"
                        : h > 0
                        ? "green"
                        : h < 0
                        ? "red"
                        : "#ccc",
                    color: "#000",
                    fontSize: 12,
                    border: "1px solid #bbb",
                  }}
                >
                  {h ?? "-"}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  function renderHoleStats(holeStats) {
    return (
      <div style={{ marginTop: 8, fontSize: 13, color: "#555" }}>
        <div>Hole Wins: {holeStats.wins}</div>
        <div>Hole Losses: {holeStats.losses}</div>
        <div>Pushes: {holeStats.pushes}</div>
        <div>Net Holes Won: {holeStats.net}</div>
      </div>
    );
  }



  function renderMatchBirdieDetails(match) {
    if (!match?.birdieEnabled) return null;

    const matchBirdies = birdieResults.filter(
      (entry) =>
        entry.source === "match-birdie" &&
        entry.matchId === match.id &&
        Number(entry.amount) > 0
    );

    if (!matchBirdies.length) {
      return (
        <div style={{ marginTop: 8, fontSize: 13, color: "#666" }}>
          Birdies: none yet
        </div>
      );
    }

    return (
      <div style={{ marginTop: 8 }}>
        <div>
          <strong>Birdies:</strong>
        </div>

        {matchBirdies.map((entry, index) => {
          const playerName = getPlayerName(players, entry.playerId) || entry.playerId;
          const opponentName = getPlayerName(players, entry.opponentId) || entry.opponentId;

          return (
            <div key={`${match.id}-birdie-${index}`} style={{ fontSize: 13 }}>
              Hole {entry.holeNumber}: {playerName} +${Math.abs(Number(entry.amount))} vs{" "}
              {opponentName}
            </div>
          );
        })}
      </div>
    );
  }

  function renderMatchDetails(match, result) {
    if (result?.gameType === "ninePoint") {
  return null;
}
    const holeStats = getHoleStats(result.holes || []);

    if (result.type === "standard") {
      return (
        <div style={{ marginTop: 8 }}>
          <div>Match Result: {result.label}</div>
          {result.decidedOn ? <div>Decided on Hole: {result.decidedOn}</div> : null}
          <div>Match Bet: ${match.bet}</div>
          <div>
            <strong>Match Payout: ${result.total}</strong>
          </div>
          {renderMatchBirdieDetails(match)}
          {renderHoleStats(holeStats)}
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
          {renderHoleStats(holeStats)}
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
          {renderHoleStats(holeStats)}
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
          {renderHoleStats(holeStats)}
        </div>
      );
    }

    return (
      <div style={{ marginTop: 8 }}>
        <div>
          <strong>Payout: ${result.total}</strong>
        </div>
        {renderHoleStats(holeStats)}
      </div>
    );
  }

  return (
    <div>
      <h3>Matches</h3>
      

      {results.map(({ match, result }) => (
  <div
    key={match.id}
    style={{ border: "1px solid gray", margin: 6, padding: 10 }}
  >
    {match.gameType === "ninePoint" && (
      <div style={{ fontSize: 12, fontWeight: "bold", color: "#555", marginBottom: 4 }}>
        9 POINT GAME
      </div>
    )}
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
           {match.gameType === "ninePoint" ? (
  <>
    <select
      value={match.p1Id || ""}
      onChange={(e) => onUpdateMatch(match.id, { p1Id: e.target.value })}
    >
      {players.map((p) => (
        <option
          key={p.id}
          value={p.id}
          disabled={p.id === match.p2Id || p.id === match.p3Id}
        >
          {p.name}
        </option>
      ))}
    </select>

    <span>vs</span>

    <select
      value={match.p2Id || ""}
      onChange={(e) => onUpdateMatch(match.id, { p2Id: e.target.value })}
    >
      {players.map((p) => (
        <option
          key={p.id}
          value={p.id}
          disabled={p.id === match.p1Id || p.id === match.p3Id}
        >
          {p.name}
        </option>
      ))}
    </select>

    <span>vs</span>

    <select
      value={match.p3Id || ""}
      onChange={(e) => onUpdateMatch(match.id, { p3Id: e.target.value })}
    >
      {players.map((p) => (
        <option
          key={p.id}
          value={p.id}
          disabled={p.id === match.p1Id || p.id === match.p2Id}
        >
          {p.name}
        </option>
      ))}
    </select>
  </>
) : (
  <>
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
  </>
)}

            <span>vs</span>

           {match.gameType !== "ninePoint" && (
  <select
    value={match.type}
    onChange={(e) => onUpdateMatch(match.id, { type: e.target.value })}
  >
    <option value="standard">Net Holes</option>
    <option value="longshort">Long/Short</option>
<option value="match_fbt">Match Play</option>
    <option value="stroke">Stroke</option>
  </select>
)}

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

                  onUpdateMatch(match.id, { bet: num, birdieBet: num });
                }}
                style={{ width: 70, marginLeft: 6, fontSize: 16, padding: 6 }}
              />
            </label>

              {match.gameType === "ninePoint" && (
                <label style={{ marginLeft: 10 }}>
                  <input
                    type="checkbox"
                    checked={!!match.blitzEnabled}
                    onChange={(e) =>
                      onUpdateMatch(match.id, { blitzEnabled: e.target.checked })
                    }
                  />
                  Blitz
                </label>
              )}

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

            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
  <input
    type="checkbox"
    checked={!!match.birdieEnabled}
                onChange={(e) =>
                  onUpdateMatch(match.id, { birdieEnabled: e.target.checked })
                }
              />
              Birdies
            </label>

           <button
  type="button"
  onClick={() => onRemoveMatch(match.id)}
  style={{
    marginLeft: 8,
    background: "#fff",
    border: "1px solid #ccc",
    color: "#555",
    padding: "6px 10px",
    borderRadius: 6,
    fontSize: 13,
  }}
>
  Cancel Match
</button>
          </div>

          {match.birdieEnabled && (
  <div style={{ marginTop: 8 }}>
    <div style={{ fontSize: 12, color: "#666" }}>
      {match.toyRule
        ? "Toy Birdies — Net birdie ties Gross birdie."
        : "Birdies use gross score only."}
    </div>
    <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
      <input
        type="checkbox"
        checked={!!match.toyRule}
        onChange={(e) =>
          onUpdateMatch(match.id, { toyRule: e.target.checked })
        }
      />
      <span style={{ fontSize: 12 }}>Toy Birdies</span>
    </label>
  </div>
)}

<label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
  <input
    type="checkbox"
    checked={!!match.noPar3Strokes}
    onChange={(e) =>
      onUpdateMatch(match.id, { noPar3Strokes: e.target.checked })
    }
  />
  <span style={{ fontSize: 12 }}>No Par 3 Strokes</span>
</label>

{match.type === "match_fbt" && (
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
        checked={match.matchPlayFront !== false}
        onChange={(e) =>
          onUpdateMatch(match.id, { matchPlayFront: e.target.checked })
        }
      />
      Front 9
    </label>

    <label>
      <input
        type="checkbox"
        checked={match.matchPlayBack !== false}
        onChange={(e) =>
          onUpdateMatch(match.id, { matchPlayBack: e.target.checked })
        }
      />
      Back 9
    </label>

    <label>
      <input
        type="checkbox"
        checked={match.matchPlayTotal !== false}
        onChange={(e) =>
          onUpdateMatch(match.id, { matchPlayTotal: e.target.checked })
        }
      />
      Total 18
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

         <div style={{ marginTop: 12, paddingTop: 10, borderTop: "2px dashed #ddd" }}>
           <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Live Results</div>
           <div style={{ marginBottom: 4, fontWeight: 600 }}>
             {match.gameType === "ninePoint"
               ? `${getPlayerName(players, match.p1Id)} vs ${getPlayerName(players, match.p2Id)} vs ${getPlayerName(players, match.p3Id)}`
               : `${getPlayerName(players, match.p1Id)} vs ${getPlayerName(players, match.p2Id)}`}
           </div>

          {result?.gameType === "ninePoint"
            ? renderNinePointResult(result, match, !!expandedNinePointIds[match.id])
            : renderHoleRows(result.holes || [])}

          {renderMatchDetails(match, result)}
         </div>
        </div>
      ))}
    </div>
  );
}