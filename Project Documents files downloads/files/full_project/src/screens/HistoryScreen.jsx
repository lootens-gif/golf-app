import { useState, useMemo, useEffect } from "react";

const sc = {
  green:      "#1a5c35",
  greenLight: "#f0f7f3",
  gold:       "#b8952a",
  goldLight:  "#fdf8ee",
  ink:        "#1a1a1a",
  muted:      "#6b7280",
  border:     "#d1d5db",
  red:        "#b3261e",
  redLight:   "#fef2f2",
  card:       "#ffffff",
};

function fmt(n) {
  const v = Number(n ?? 0);
  if (v > 0) return { str: `+$${v.toFixed(2)}`, color: sc.green };
  if (v < 0) return { str: `-$${Math.abs(v).toFixed(2)}`, color: sc.red };
  return { str: "Even", color: sc.muted };
}

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

function StatBox({ label, value, color, sub }) {
  return (
    <div style={{ textAlign: "center", padding: "12px 8px" }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || sc.ink, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: sc.muted, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: sc.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function HistoryScreen({ savedRounds = [], onBack, onLoadRound, fetchStatsRounds }) {
  const [selectedRound, setSelectedRound] = useState(null);
  const [view, setView] = useState("history"); // "history" | "stats"
  const [supabaseRounds, setSupabaseRounds] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // Load Supabase stats rounds when Stats tab is opened
  useEffect(() => {
    if (view === "stats" && fetchStatsRounds && supabaseRounds.length === 0) {
      setLoadingStats(true);
      fetchStatsRounds()
        .then(rounds => setSupabaseRounds(rounds))
        .catch(() => {})
        .finally(() => setLoadingStats(false));
    }
  }, [view, fetchStatsRounds, supabaseRounds.length]);

  // Use Supabase rounds for stats if available, fall back to local savedRounds
  const statsSource = useMemo(() => {
    if (supabaseRounds.length > 0) {
      return supabaseRounds.map(r => ({ ...r, data: r.data, name: r.data?.roundName || `Round ${r.code}`, savedAt: r.updated_at }));
    }
    return savedRounds;
  }, [supabaseRounds, savedRounds]);

  // ── Compute cumulative stats ──
  const stats = useMemo(() => {
    if (!statsSource.length) return null;

    const playerMap = {}; // name → { rounds, totalMoney, wins, birdies, skins }

    statsSource.forEach(round => {
      const data = round.data || {};
      const players = data.allPlayers || [];
      const leaderboard = data.playerLedger || [];

      // Find winner of this round (most money)
      const sorted = [...leaderboard].sort((a, b) => Number(b.total ?? 0) - Number(a.total ?? 0));
      const winnerId = sorted[0]?.playerId;

      leaderboard.forEach(row => {
        const player = players.find(p => p.id === row.playerId);
        if (!player) return;
        const name = player.name;
        if (!playerMap[name]) {
          playerMap[name] = { name, rounds: 0, totalMoney: 0, wins: 0, birdies: 0, skins: 0 };
        }
        playerMap[name].rounds++;
        playerMap[name].totalMoney += Number(row.total ?? 0);
        playerMap[name].birdies += Number(row.birdies ?? 0);
        if (row.playerId === winnerId) playerMap[name].wins++;
      });
    });

    const players = Object.values(playerMap).sort((a, b) => b.totalMoney - a.totalMoney);
    const totalRounds = statsSource.length;
    const biggestWin = players.reduce((max, p) => Math.max(max, p.totalMoney), 0);
    const mostWins = players.reduce((max, p) => Math.max(max, p.wins), 0);

    return { players, totalRounds, biggestWin, mostWins };
  }, [statsSource]);

  // ── Round detail view ──
  if (selectedRound) {
    const data = selectedRound.data || {};
    const players = data.allPlayers || [];
    const leaderboard = data.playerLedger || [];
    const sorted = [...leaderboard].sort((a, b) => Number(b.total ?? 0) - Number(a.total ?? 0));

    return (
      <div style={{ fontFamily: "'Georgia', serif" }}>
        <button onClick={() => setSelectedRound(null)} style={{ background: "transparent", border: "none", color: sc.muted, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16, fontFamily: "inherit" }}>
          ← Back to History
        </button>

        <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: sc.ink }}>{selectedRound.name}</h2>
        <div style={{ fontSize: 13, color: sc.muted, marginBottom: 20 }}>
          {new Date(selectedRound.savedAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </div>

        {/* Leaderboard */}
        <Card style={{ borderTop: `3px solid ${sc.green}` }}>
          <SectionLabel>Final Leaderboard</SectionLabel>
          {sorted.map((row, i) => {
            const player = players.find(p => p.id === row.playerId);
            if (!player) return null;
            const { str, color } = fmt(row.total);
            return (
              <div key={row.playerId} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 12px", marginBottom: 6, borderRadius: 8,
                background: i === 0 ? sc.goldLight : Number(row.total) >= 0 ? sc.greenLight : sc.redLight,
                border: `1px solid ${i === 0 ? "#fcd34d" : Number(row.total) >= 0 ? "#c3ddd0" : "#fecaca"}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: i === 0 ? sc.gold : sc.border,
                    color: i === 0 ? "#fff" : sc.muted,
                    fontSize: 12, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{i + 1}</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: sc.ink }}>{player.name}</span>
                </div>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  {row.birdies !== 0 && <span style={{ fontSize: 12, color: sc.green }}>🐦 ${Math.abs(Number(row.birdies)).toFixed(0)}</span>}
                  <span style={{ fontSize: 16, fontWeight: 800, color }}>{str}</span>
                </div>
              </div>
            );
          })}
        </Card>

        {/* Load this round */}
        <button
          onClick={() => { onLoadRound(selectedRound); onBack(); }}
          style={{
            width: "100%", padding: 14, fontSize: 15, fontWeight: 600,
            background: sc.greenLight, color: sc.green,
            border: `1px solid ${sc.green}`, borderRadius: 10,
            cursor: "pointer", fontFamily: "inherit", marginBottom: 12,
          }}
        >
          Load This Round
        </button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Georgia', serif" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: sc.ink }}>Round History</h2>
        <div style={{ display: "flex", gap: 6 }}>
          {["history", "stats"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "7px 14px", fontSize: 13, fontWeight: 600,
              border: `1px solid ${view === v ? sc.green : sc.border}`,
              background: view === v ? sc.green : "#fff",
              color: view === v ? "#fff" : sc.ink,
              borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
              textTransform: "capitalize",
            }}>{v}</button>
          ))}
        </div>
      </div>

      {savedRounds.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⛳</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: sc.ink, marginBottom: 6 }}>No rounds saved yet</div>
            <div style={{ fontSize: 13, color: sc.muted }}>Complete a round and tap Save Round to see it here.</div>
          </div>
        </Card>
      ) : view === "history" ? (

        // ── ROUND LIST ──
        <div>
          {savedRounds.map(round => {
            const data = round.data || {};
            const players = data.allPlayers || [];
            const leaderboard = data.playerLedger || [];
            const sorted = [...leaderboard].sort((a, b) => Number(b.total ?? 0) - Number(a.total ?? 0));
            const winner = players.find(p => p.id === sorted[0]?.playerId);
            const winnerAmount = sorted[0]?.total ?? 0;
            const holesPlayed = Object.keys(data.scores || {}).length;

            return (
              <div
                key={round.id}
                onClick={() => setSelectedRound(round)}
                style={{
                  background: sc.card, border: `1px solid ${sc.border}`,
                  borderRadius: 12, padding: 16, marginBottom: 10,
                  cursor: "pointer",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: sc.ink, marginBottom: 3 }}>{round.name}</div>
                  <div style={{ fontSize: 12, color: sc.muted }}>
                    {new Date(round.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {" · "}{players.length} players
                    {" · "}{holesPlayed} holes
                  </div>
                  {winner && (
                    <div style={{ fontSize: 12, color: sc.green, marginTop: 3, fontWeight: 600 }}>
                      🏆 {winner.name} +${Number(winnerAmount).toFixed(2)}
                    </div>
                  )}
                </div>
                <span style={{ color: sc.muted, fontSize: 18 }}>›</span>
              </div>
            );
          })}
        </div>

      ) : view === "stats" ? (

        // ── STATS ──
        <div>
          {loadingStats && (
            <div style={{ textAlign: "center", padding: 24, color: sc.muted, fontSize: 14 }}>
              Loading stats from cloud…
            </div>
          )}
          {!loadingStats && supabaseRounds.length > 0 && (
            <div style={{ fontSize: 11, color: sc.green, marginBottom: 12, padding: "6px 10px", background: sc.greenLight, borderRadius: 6 }}>
              ☁️ Showing {supabaseRounds.length} rounds saved to History & Stats
            </div>
          )}
          {!loadingStats && supabaseRounds.length === 0 && savedRounds.length > 0 && (
            <div style={{ fontSize: 11, color: sc.muted, marginBottom: 12, padding: "6px 10px", background: "#fafafa", borderRadius: 6 }}>
              Showing local rounds only — check "Save to History & Stats" when completing future rounds to see cumulative stats here.
            </div>
          )}
          {stats && (
            <>
              {/* Summary stats */}
              <Card>
                <SectionLabel>All Time</SectionLabel>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
                  <StatBox label="Rounds" value={stats.totalRounds} />
                  <StatBox label="Most Wins" value={stats.mostWins} color={sc.gold} />
                  <StatBox label="Top Earner" value={`$${stats.biggestWin.toFixed(0)}`} color={sc.green} />
                </div>
              </Card>

              {/* Player leaderboard */}
              <Card style={{ borderTop: `3px solid ${sc.green}` }}>
                <SectionLabel>Cumulative Money</SectionLabel>
                {stats.players.map((player, i) => {
                  const { str, color } = fmt(player.totalMoney);
                  return (
                    <div key={player.name} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 12px", marginBottom: 6, borderRadius: 8,
                      background: i === 0 ? sc.goldLight : player.totalMoney >= 0 ? sc.greenLight : sc.redLight,
                      border: `1px solid ${i === 0 ? "#fcd34d" : player.totalMoney >= 0 ? "#c3ddd0" : "#fecaca"}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{
                          width: 24, height: 24, borderRadius: "50%",
                          background: i === 0 ? sc.gold : sc.border,
                          color: i === 0 ? "#fff" : sc.muted,
                          fontSize: 12, fontWeight: 700,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>{i + 1}</span>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: sc.ink }}>{player.name}</div>
                          <div style={{ fontSize: 11, color: sc.muted }}>
                            {player.rounds} round{player.rounds !== 1 ? "s" : ""}
                            {player.wins > 0 ? ` · 🏆 ${player.wins} win${player.wins !== 1 ? "s" : ""}` : ""}
                            {player.birdies > 0 ? ` · 🐦 $${player.birdies.toFixed(0)}` : ""}
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: 17, fontWeight: 800, color }}>{str}</span>
                    </div>
                  );
                })}
              </Card>

              {/* Win rate */}
              <Card>
                <SectionLabel>Win Rate</SectionLabel>
                {stats.players
                  .filter(p => p.rounds > 0)
                  .sort((a, b) => (b.wins / b.rounds) - (a.wins / a.rounds))
                  .map(player => {
                    const rate = Math.round((player.wins / player.rounds) * 100);
                    return (
                      <div key={player.name} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: sc.ink }}>{player.name}</span>
                          <span style={{ fontSize: 13, color: sc.muted }}>{player.wins}/{player.rounds} · {rate}%</span>
                        </div>
                        <div style={{ height: 6, background: sc.border, borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${rate}%`, background: sc.green, borderRadius: 3 }} />
                        </div>
                      </div>
                    );
                  })}
              </Card>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
