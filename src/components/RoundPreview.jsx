import { getSpreadHandicapStrokes, getHandicapStrokes } from "../engine/scoringEngine";

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

function fmtHcp(hcp) {
  const n = Number(hcp);
  return n < 0 ? `+${Math.abs(n)}` : String(n);
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

  // Split into two 9s for better mobile display
  const front = holes.slice(0, 9);
  const back = holes.slice(9, 18);

  function renderDotSection(label, sectionHoles) {
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: sc.muted, marginBottom: 6, letterSpacing: 0.5 }}>{label}</div>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 280 }}>
            <thead>
              <tr>
                <td style={{ fontSize: 12, color: sc.muted, padding: "2px 4px", minWidth: 55 }}>Hole</td>
                {sectionHoles.map(h => (
                  <td key={h} style={{ textAlign: "center", fontSize: 13, color: sc.muted, padding: "2px 4px", minWidth: 28 }}>{h}</td>
                ))}
              </tr>
              <tr>
                <td style={{ fontSize: 11, color: sc.muted, padding: "2px 4px" }}>Par</td>
                {sectionHoles.map(h => (
                  <td key={h} style={{ textAlign: "center", fontSize: 12, color: sc.muted, padding: "2px 4px" }}>{course?.pars?.[h-1] ?? "-"}</td>
                ))}
              </tr>
              <tr style={{ borderBottom: `2px solid ${sc.border}` }}>
                <td style={{ fontSize: 11, color: sc.muted, padding: "2px 4px" }}>HCP</td>
                {sectionHoles.map(h => (
                  <td key={h} style={{ textAlign: "center", fontSize: 11, color: sc.muted, padding: "2px 4px" }}>{course?.hcp?.[h-1] ?? "-"}</td>
                ))}
              </tr>
            </thead>
            <tbody>
              {activePlayers.map(p => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${sc.border}` }}>
                  <td style={{ padding: "6px 4px", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                    {p.name} <span style={{ fontWeight: 400, color: sc.muted }}>({fmtHcp(p.hcp)})</span>
                  </td>
                  {sectionHoles.map(h => {
                    const strokes = strokesFn(p.id, h, activePlayers, course, handicapMode, noPar3TeamGame);
                    const isPar3 = course?.pars?.[h-1] === 3;
                    const suppressed = isPar3 && noPar3TeamGame;
                    return (
                      <td key={h} style={{
                        textAlign: "center", padding: "6px 4px",
                        background: strokes > 0 ? sc.greenLight : suppressed ? "#fef9c3" : "transparent",
                      }}>
                        {strokes > 0 ? (
                          <span style={{ color: sc.green, fontWeight: 900, fontSize: 18, lineHeight: 1 }}>{"•".repeat(strokes)}</span>
                        ) : (
                          <span style={{ color: "#e5e7eb", fontSize: 12 }}>·</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

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
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${sc.border}` }}>
              <th style={{ textAlign: "left", padding: "4px 0", color: sc.muted, fontWeight: 400 }}>Player</th>
              <th style={{ textAlign: "center", padding: "4px 0", color: sc.muted, fontWeight: 400 }}>HCP</th>
              <th style={{ textAlign: "center", padding: "4px 0", color: sc.muted, fontWeight: 400 }}>Strokes</th>
            </tr>
          </thead>
          <tbody>
            {activePlayers.map(p => {
              const totalStrokes = holes.reduce((sum, h) =>
                sum + strokesFn(p.id, h, activePlayers, course, handicapMode, noPar3TeamGame), 0);
              return (
                <tr key={p.id} style={{ borderBottom: `1px solid ${sc.border}` }}>
                  <td style={{ padding: "8px 0", fontWeight: 600 }}>{p.name}</td>
                  <td style={{ textAlign: "center", color: sc.muted }}>{fmtHcp(p.hcp)}</td>
                  <td style={{ textAlign: "center", fontWeight: 700, fontSize: 16,
                    color: totalStrokes > 0 ? sc.green : sc.muted }}>
                    {totalStrokes}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {noPar3TeamGame && <div style={{ fontSize: 12, color: sc.muted, marginTop: 6 }}>* No strokes on par 3s (yellow)</div>}
        {isSpread && <div style={{ fontSize: 12, color: sc.green, marginTop: 4, fontWeight: 600 }}>⚡ Spread: strokes divided evenly across each 6-hole segment</div>}
      </Section>

      {/* Dot Grid — split Front/Back */}
      <Section title={`Handicap Strokes${isSpread ? " · Spread" : " · Standard"}`}>
        {renderDotSection("Front 9", front)}
        {renderDotSection("Back 9", back)}
      </Section>

      {/* Games Summary */}
      <Section title="Games">
        {enableTeamGame && (
          <GameRow label={`Team Game · ${
            teamGameFormat === "press" ? "6/6/6 Press" :
            teamGameFormat === "longshort" ? "Long/Short" :
            teamGameFormat === "match_fbt" ? "Match Play" :
            teamGameFormat === "stroke" ? "Stroke" :
            teamGameFormat === "standard" ? "Net Holes" : teamGameFormat
          }`}>
            <span style={{ color: sc.green, fontWeight: 700 }}>${teamGameUnitAmount}/unit</span>
            {isSpread && <Badge>Spread</Badge>}
            {noPar3TeamGame && <Badge>No Par 3</Badge>}
          </GameRow>
        )}
        {matches.map((m, i) => {
          const p1 = players.find(p => p.id === m.p1Id);
          const p2 = players.find(p => p.id === m.p2Id);
          const p3 = players.find(p => p.id === m.p3Id);
          const names = [p1, p2, p3].filter(Boolean).map(p => p.name).join(" · ");
          const type = m.gameType === "ninePoint" ? "9-Point" :
            m.type === "longshort" ? "Long/Short" :
            m.type === "standard" ? "Net Holes" :
            m.type === "match_fbt" ? "Match Play" : m.type;
          return (
            <GameRow key={m.id} label={`${names} · ${type}`}>
              <span style={{ color: sc.green, fontWeight: 700 }}>${m.bet}</span>
              {m.birdieEnabled && <Badge>🐦 ${m.birdieBet}</Badge>}
              {m.noPar3Strokes && <Badge>No Par 3</Badge>}
              {m.toyRule && <Badge>Toy</Badge>}
            </GameRow>
          );
        })}
        {skinsEnabled && <GameRow label="Skins"><Badge>On</Badge></GameRow>}
        {!enableTeamGame && matches.length === 0 && !skinsEnabled && (
          <div style={{ color: sc.muted, fontSize: 13 }}>No games configured</div>
        )}
      </Section>

      {/* Round Code */}
      {roundCode && (
        <Section title="Round Code — Share to Join">
          <div style={{ fontSize: 40, fontWeight: 700, color: sc.green, letterSpacing: 6, textAlign: "center", padding: "10px 0" }}>
            {roundCode}
          </div>
        </Section>
      )}

      {/* Buttons */}
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button onClick={onBack} style={{
          flex: 1, padding: "14px 0", fontSize: 15, fontWeight: 600,
          background: "#fff", color: sc.muted, border: `1px solid ${sc.border}`,
          borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
        }}>← Edit Setup</button>
        <button onClick={onConfirm} style={{
          flex: 2, padding: "14px 0", fontSize: 16, fontWeight: 700,
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
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${sc.border}`, fontSize: 13 }}>
      <span style={{ color: sc.ink }}>{label}</span>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>{children}</div>
    </div>
  );
}

function Badge({ children }) {
  return (
    <span style={{ fontSize: 11, padding: "2px 6px", background: sc.greenLight, color: sc.green, border: `1px solid ${sc.green}`, borderRadius: 4 }}>
      {children}
    </span>
  );
}
