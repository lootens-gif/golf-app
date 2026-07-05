import { getSpreadHandicapStrokes, getHandicapStrokes, getHandicapBase } from "../engine/scoringEngine";

const sc = {
  green: "#2d6a4f",
  gold: "#b5882a",
  ink: "#1a1a1a",
  muted: "#6b7280",
  border: "#e5e7eb",
  greenLight: "#f0fdf4",
  red: "#b3261e",
};

function getDotsFn(handicapDistribution, enableTeamGame) {
  return (enableTeamGame && handicapDistribution === "spread")
    ? getSpreadHandicapStrokes
    : getHandicapStrokes;
}

export default function RoundPreview({ 
  players, course, matches, teamGames, teamGameFormat,
  teamGameUnitAmount, handicapMode, handicapDistribution,
  enableTeamGame, noPar3TeamGame, birdiesEnabled, birdieBetAmount,
  skinsEnabled, onConfirm, onBack, roundCode,
}) {
  const strokesFn = getDotsFn(handicapDistribution, enableTeamGame);
  const holes = Array.from({ length: 18 }, (_, i) => i + 1);
  const isSpread = enableTeamGame && handicapDistribution === "spread";

  const activePlayers = players.filter(p => p.name && !p.name.match(/^P\d+$/));

  return (
    <div style={{ fontFamily: "'Georgia', serif", padding: "0 0 40px" }}>

      {/* Header */}
      <div style={{ background: sc.green, color: "#fff", padding: "14px 16px", marginBottom: 16, borderRadius: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>Round Preview</div>
        <div style={{ fontSize: 13, opacity: 0.85 }}>
          {course?.name || "No course"}{roundCode ? ` · Code: ${roundCode}` : ""}
        </div>
      </div>

      {/* Players & Handicaps */}
      <Section title="Players & Handicaps">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${sc.border}` }}>
              <th style={{ textAlign: "left", padding: "4px 0", color: sc.muted, fontWeight: 400 }}>Player</th>
              <th style={{ textAlign: "center", padding: "4px 0", color: sc.muted, fontWeight: 400 }}>HCP</th>
              <th style={{ textAlign: "center", padding: "4px 0", color: sc.muted, fontWeight: 400 }}>Relative</th>
              <th style={{ textAlign: "center", padding: "4px 0", color: sc.muted, fontWeight: 400 }}>Strokes</th>
            </tr>
          </thead>
          <tbody>
            {activePlayers.map(p => {
              const rel = getHandicapBase(p, activePlayers, handicapMode);
              const totalStrokes = holes.reduce((sum, h) => sum + strokesFn(p.id, h, activePlayers, course, handicapMode, noPar3TeamGame), 0);
              return (
                <tr key={p.id} style={{ borderBottom: `1px solid ${sc.border}` }}>
                  <td style={{ padding: "6px 0", fontWeight: 600 }}>{p.name}</td>
                  <td style={{ textAlign: "center", color: sc.muted }}>
                    {Number(p.hcp) < 0 ? `+${Math.abs(Number(p.hcp))}` : p.hcp}
                  </td>
                  <td style={{ textAlign: "center", color: sc.muted }}>{rel}</td>
                  <td style={{ textAlign: "center", fontWeight: 700, color: totalStrokes > 0 ? sc.green : sc.muted }}>{totalStrokes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {noPar3TeamGame && <div style={{ fontSize: 12, color: sc.muted, marginTop: 6 }}>* No strokes on par 3s</div>}
      </Section>

      {/* Dot Grid */}
      <Section title={`Handicap Strokes by Hole${isSpread ? " · Spread" : " · Standard"}`}>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ borderCollapse: "collapse", minWidth: 500, fontSize: 12 }}>
            <thead>
              <tr>
                <td style={{ padding: "3px 6px", color: sc.muted, fontSize: 11, minWidth: 60 }}>Hole</td>
                {holes.map(h => (
                  <td key={h} style={{ padding: "3px 4px", textAlign: "center", color: sc.muted, minWidth: 22 }}>{h}</td>
                ))}
              </tr>
              <tr>
                <td style={{ padding: "3px 6px", color: sc.muted, fontSize: 11 }}>Par</td>
                {holes.map(h => (
                  <td key={h} style={{ padding: "3px 4px", textAlign: "center", color: sc.muted }}>{course?.pars?.[h-1] ?? "-"}</td>
                ))}
              </tr>
              <tr style={{ borderBottom: `1px solid ${sc.border}` }}>
                <td style={{ padding: "3px 6px", color: sc.muted, fontSize: 11 }}>HCP</td>
                {holes.map(h => (
                  <td key={h} style={{ padding: "3px 4px", textAlign: "center", color: sc.muted, fontSize: 10 }}>{course?.hcp?.[h-1] ?? "-"}</td>
                ))}
              </tr>
            </thead>
            <tbody>
              {activePlayers.map(p => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${sc.border}` }}>
                  <td style={{ padding: "5px 6px", fontWeight: 600, whiteSpace: "nowrap" }}>
                    {p.name} ({Number(p.hcp) < 0 ? `+${Math.abs(Number(p.hcp))}` : p.hcp})
                  </td>
                  {holes.map(h => {
                    const strokes = strokesFn(p.id, h, activePlayers, course, handicapMode, noPar3TeamGame);
                    const isPar3 = course?.pars?.[h-1] === 3;
                    return (
                      <td key={h} style={{ 
                        padding: "5px 4px", textAlign: "center",
                        background: strokes > 0 ? sc.greenLight : isPar3 && noPar3TeamGame ? "#fef9c3" : "transparent"
                      }}>
                        {strokes > 0 ? (
                          <span style={{ color: sc.green, fontWeight: 700, fontSize: 14 }}>{"•".repeat(strokes)}</span>
                        ) : (
                          <span style={{ color: "#ddd" }}>·</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isSpread && (
          <div style={{ fontSize: 11, color: sc.muted, marginTop: 6 }}>
            Strokes divided evenly across 6-hole segments (1-6, 7-12, 13-18)
          </div>
        )}
      </Section>

      {/* Games Summary */}
      <Section title="Games">
        {enableTeamGame && (
          <GameRow label={`Team Game · ${teamGameFormat === "press" ? "6/6/6 Press" : teamGameFormat === "longshort" ? "Long/Short" : teamGameFormat === "match_fbt" ? "Match Play" : teamGameFormat === "stroke" ? "Stroke" : teamGameFormat}`}>
            <span style={{ color: sc.green, fontWeight: 700 }}>${teamGameUnitAmount}/unit</span>
            {isSpread && <Badge>Spread</Badge>}
            {noPar3TeamGame && <Badge>No Par 3 Strokes</Badge>}
          </GameRow>
        )}
        {matches.map((m, i) => {
          const p1 = players.find(p => p.id === m.p1Id);
          const p2 = players.find(p => p.id === m.p2Id);
          const p3 = players.find(p => p.id === m.p3Id);
          const names = [p1, p2, p3].filter(Boolean).map(p => p.name).join(" · ");
          const type = m.gameType === "ninePoint" ? "9-Point" : m.type === "longshort" ? "Long/Short" : m.type === "standard" ? "Net Holes" : m.type === "match_fbt" ? "Match Play" : m.type;
          return (
            <GameRow key={m.id} label={`${names} · ${type}`}>
              <span style={{ color: sc.green, fontWeight: 700 }}>${m.bet}</span>
              {m.birdieEnabled && <Badge>Birdies ${m.birdieBet}</Badge>}
              {m.noPar3Strokes && <Badge>No Par 3</Badge>}
              {m.toyRule && <Badge>Toy Rule</Badge>}
            </GameRow>
          );
        })}
        {skinsEnabled && (
          <GameRow label="Skins">
            <Badge>On</Badge>
          </GameRow>
        )}
        {!enableTeamGame && matches.length === 0 && !skinsEnabled && (
          <div style={{ color: sc.muted, fontSize: 13 }}>No games configured</div>
        )}
      </Section>

      {/* Round Code */}
      {roundCode && (
        <Section title="Round Code">
          <div style={{ fontSize: 32, fontWeight: 700, color: sc.green, letterSpacing: 4, textAlign: "center", padding: "8px 0" }}>
            {roundCode}
          </div>
          <div style={{ fontSize: 12, color: sc.muted, textAlign: "center" }}>Share this code so others can join and view scores</div>
        </Section>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button onClick={onBack} style={{
          flex: 1, padding: "12px 0", fontSize: 15, fontWeight: 600,
          background: "#fff", color: sc.muted, border: `1px solid ${sc.border}`,
          borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
        }}>← Edit Setup</button>
        <button onClick={onConfirm} style={{
          flex: 2, padding: "12px 0", fontSize: 15, fontWeight: 700,
          background: sc.green, color: "#fff", border: "none",
          borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
        }}>⛳ Start Round ›</button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16, border: `1px solid ${sc.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ background: sc.green, color: "#fff", padding: "8px 12px", fontSize: 12, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
        {title}
      </div>
      <div style={{ padding: "10px 12px" }}>{children}</div>
    </div>
  );
}

function GameRow({ label, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${sc.border}`, fontSize: 13 }}>
      <span style={{ color: sc.ink }}>{label}</span>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>{children}</div>
    </div>
  );
}

function Badge({ children }) {
  return (
    <span style={{ fontSize: 11, padding: "2px 6px", background: "#f0fdf4", color: sc.green, border: `1px solid ${sc.green}`, borderRadius: 4 }}>
      {children}
    </span>
  );
}
