const sc = {
  green:      "#1a5c35",
  greenLight: "#f0f7f3",
  gold:       "#b8952a",
  ink:        "#1a1a1a",
  muted:      "#6b7280",
  border:     "#d1d5db",
  red:        "#b3261e",
  redLight:   "#fef2f2",
  card:       "#ffffff",
};

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: sc.muted, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${sc.border}` }}>
      {children}
    </div>
  );
}

function fmt(val) {
  const n = Number(val ?? 0);
  if (n > 0) return { str: `+$${n.toFixed(2)}`, color: sc.green };
  if (n < 0) return { str: `-$${Math.abs(n).toFixed(2)}`, color: sc.red };
  return { str: "$0.00", color: sc.muted };
}

function SettlementSection({ playerLedger = [], tabs = [], players = [], roundSummaryRows = [], enableTeamGame = true }) {
  const getName = (id) => players.find(p => p.id === id)?.name || id;

  return (
    <div>

      {/* SETTLE UP */}
      <div style={{ background: sc.card, border: `1px solid ${sc.border}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
        <SectionLabel>Settle Up</SectionLabel>
        {tabs.length === 0 ? (
          <div style={{ color: sc.green, fontWeight: 600, fontSize: 14 }}>✓ Everyone is settled up.</div>
        ) : (
          <div>
            {[...tabs].sort((a, b) => b.amount - a.amount).map((tab, i) => (
              <div key={`${tab.fromPlayerId}-${tab.toPlayerId}-${i}`} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "11px 14px", marginBottom: 8,
                background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10,
              }}>
                <span style={{ fontSize: 15 }}>
                  <strong>{getName(tab.fromPlayerId)}</strong>
                  <span style={{ color: sc.muted, margin: "0 6px" }}>pays</span>
                  <strong>{getName(tab.toPlayerId)}</strong>
                </span>
                <span style={{ fontSize: 17, fontWeight: 800, color: sc.ink }}>
                  ${Number(tab.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* STANDINGS */}
      <div style={{ background: sc.card, border: `1px solid ${sc.border}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
        <SectionLabel>Standings</SectionLabel>
        {playerLedger.length === 0 ? (
          <div style={{ color: sc.muted, fontSize: 14 }}>No results yet.</div>
        ) : (
          <div>
            {/* Header */}
            <div style={{ marginBottom: 4 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 55px 55px 55px 68px", gap: 4, padding: "0 8px", marginBottom: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", color: sc.muted, textTransform: "uppercase" }}>Player</div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", color: sc.muted, textTransform: "uppercase", textAlign: "center" }}>Team</div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", color: sc.muted, textTransform: "uppercase", textAlign: "center" }}>1v1</div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", color: sc.muted, textTransform: "uppercase", textAlign: "center" }}>Birds</div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", color: sc.muted, textTransform: "uppercase", textAlign: "right" }}>Total</div>
              </div>
            </div>
            {playerLedger
              .filter(row => players.some(p => p.id === row.playerId))
              .sort((a, b) => Number(b.total ?? 0) - Number(a.total ?? 0))
              .map(row => {
                const total = Number(row.total ?? 0);
                const { str: totalStr, color: totalColor } = fmt(total);
                return (
                  <div key={row.playerId} style={{ display: "grid", gridTemplateColumns: "1fr 55px 55px 55px 68px", gap: 4, padding: "9px 8px", borderRadius: 8, marginBottom: 4, background: total > 0 ? sc.greenLight : total < 0 ? "#fef2f2" : "#fafafa", border: `1px solid ${total > 0 ? "#c3ddd0" : total < 0 ? "#fecaca" : sc.border}` }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: sc.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getName(row.playerId)}</div>
                    <div style={{ fontSize: 12, textAlign: "center", color: fmt(row.mainGame).color, whiteSpace: "nowrap" }}>{fmt(row.mainGame).str}</div>
                    <div style={{ fontSize: 12, textAlign: "center", color: fmt(row.sideMatches).color, whiteSpace: "nowrap" }}>{fmt(row.sideMatches).str}</div>
                    <div style={{ fontSize: 12, textAlign: "center", color: fmt(row.birdies).color, whiteSpace: "nowrap" }}>{fmt(row.birdies).str}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, textAlign: "right", color: totalColor, whiteSpace: "nowrap" }}>{totalStr}</div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

    </div>
  );
}

export default SettlementSection;
