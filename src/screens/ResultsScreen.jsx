import React, { useState, useEffect, useRef } from "react";
import SettlementSection from "../components/SettlementSection";
import AuditTrail from "../components/AuditTrail";
import { getHandicapStrokes } from "../engine/scoringEngine";

const SCORECARD_OPEN_KEY = "results-scorecard-open";

const sc = {
  green:      "#1a5c35",
  greenLight: "#f0f7f3",
  gold:       "#b8952a",
  goldLight:  "#fdf8ee",
  ink:        "#1a1a1a",
  muted:      "#6b7280",
  border:     "#d1d5db",
  red:        "#b3261e",
  card:       "#ffffff",
};

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

function fmt(amount) {
  const n = Number(amount ?? 0);
  if (n > 0) return { str: `+$${n.toFixed(2)}`, color: sc.green };
  if (n < 0) return { str: `-$${Math.abs(n).toFixed(2)}`, color: sc.red };
  return { str: "Even", color: sc.muted };
}

export default function ResultsScreen({
  players, leaderboard, computedResults, roundSummaryRows = [],
  enableTeamGame, scores = {}, course, matches = [], matchResults = [],
  birdieResults = [], teamGames = [], teamGameResults = [],
  getTeamGameSelection, handicapMode, teamGameUnitAmount,
  noPar3TeamGame = false, goToLive, backToSetup, onUpdateScore,
  onSaveRound, roundName, savedRounds = [],
  skinsResults, skinsEnabled, skinsConfig,
  getHandicapStrokesFn, isJoiner = false, onRefresh, segmentBirdieAmounts = {},
}) {
  const [showAuditTrail, setShowAuditTrail] = useState(() => {
    try { return window.localStorage.getItem(SCORECARD_OPEN_KEY) === "open"; } catch { return false; }
  });
  const [drillPlayerId, setDrillPlayerId] = useState(null);
  const scorecardRef = useRef(null);
  const [saveRoundName, setSaveRoundName] = useState("");
  const [roundSaved, setRoundSaved] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [expandedSkinHole, setExpandedSkinHole] = useState(null);

  // Check if this round is already saved
  const isAlreadySaved = savedRounds.some(r => r.data?.roundName === roundName && roundName);

  useEffect(() => {
    // Pre-fill save name from roundName prop
    if (roundName) setSaveRoundName(roundName);
  }, [roundName]);

  useEffect(() => {
    try { window.localStorage.setItem(SCORECARD_OPEN_KEY, showAuditTrail ? "open" : "closed"); } catch {}
  }, [showAuditTrail]);

  const holesWithScores = Object.keys(scores).filter(h => {
    const holeScores = scores[h] || {};
    return players.some(p => Number.isFinite(holeScores[p.id]));
  }).length;
  const roundComplete = holesWithScores >= 18;

  const grossNetRows = players.map((player) => {
    const frontGross = Array.from({ length: 9 }, (_, i) => i + 1).reduce((sum, hole) => { const v = Number(scores?.[hole]?.[player.id]); return Number.isFinite(v) ? sum + v : sum; }, 0);
    const backGross = Array.from({ length: 9 }, (_, i) => i + 10).reduce((sum, hole) => { const v = Number(scores?.[hole]?.[player.id]); return Number.isFinite(v) ? sum + v : sum; }, 0);
    const totalGross = frontGross + backGross;
    const net = totalGross - Number(player.hcp || 0);
    return { player, frontGross, backGross, totalGross, net };
  });

  const sortedPlayers = [...players].sort((a, b) => Number(leaderboard[b.id] ?? 0) - Number(leaderboard[a.id] ?? 0));
  const totalWon = players.reduce((sum, p) => { const a = Number(leaderboard[p.id] ?? 0); return a > 0 ? sum + a : sum; }, 0);

  return (
    <div style={{ fontFamily: "'Georgia', serif" }}>

      {/* JOINER REFRESH BANNER */}
      {isJoiner && onRefresh && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "#f0f7f3", border: "1px solid #c3ddd0", borderRadius: 8,
          padding: "8px 12px", marginBottom: 12,
        }}>
          <span style={{ fontSize: 12, color: "#1a5c35", fontWeight: 500 }}>
            👁 Viewing live — syncs every 30 seconds
          </span>
          <button
            onClick={onRefresh}
            style={{
              background: "#1a5c35", color: "#fff", border: "none",
              borderRadius: 6, padding: "5px 12px", fontSize: 12,
              fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            ↻ Refresh now
          </button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: sc.ink }}>
          {roundComplete ? "Final Results" : "Live Results"}
        </h2>
        {!roundComplete && (
          <span style={{ fontSize: 11, background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d", borderRadius: 20, padding: "3px 10px", fontWeight: 600 }}>
            In Progress
          </span>
        )}
      </div>

      {/* LEADERBOARD */}
      <Card style={{ borderTop: `3px solid ${sc.green}` }}>
        <SectionLabel>Leaderboard{course?.name ? ` · ${course.name}` : ""}{roundName ? ` · ${roundName}` : ""}</SectionLabel>
        <div style={{ fontSize: 12, color: sc.muted, marginBottom: 10 }}>Tap a name to see their scorecard</div>
        {sortedPlayers.map((player, i) => {
          const amount = Number(leaderboard[player.id] ?? 0);
          const { str, color } = fmt(amount);
          const isSelected = drillPlayerId === player.id;
          return (
            <div key={player.id} onClick={() => { setDrillPlayerId(player.id); setShowAuditTrail(true); setTimeout(() => scorecardRef.current?.scrollIntoView({ behavior: "smooth" }), 100); }}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", marginBottom: 6, borderRadius: 8, background: isSelected ? sc.greenLight : i === 0 && amount > 0 ? sc.goldLight : "#fafafa", border: `1px solid ${isSelected ? sc.green : sc.border}`, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: i === 0 && amount > 0 ? sc.gold : sc.border, color: i === 0 && amount > 0 ? "#fff" : sc.muted, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: 16, fontWeight: 600, color: sc.ink }}>{player.name}</span>
              </div>
              <span style={{ fontSize: 17, fontWeight: 800, color }}>{str}</span>
            </div>
          );
        })}
        <div style={{ marginTop: 10, padding: "8px 12px", background: sc.greenLight, borderRadius: 8, fontSize: 12, color: sc.green, fontWeight: 600, display: "flex", justifyContent: "space-between" }}>
          <span>Money in play</span>
          <span>${totalWon.toFixed(2)} won = ${totalWon.toFixed(2)} lost ✓</span>
        </div>
      </Card>

      {/* SKINS RESULTS */}
      {skinsEnabled && skinsResults && (
        <Card style={{ borderTop: `3px solid ${sc.gold}` }}>
          <SectionLabel>🏆 Skins</SectionLabel>

          {/* Per-player summary */}
          <div style={{ marginBottom: 14 }}>
            {[...players]
              .sort((a, b) => (skinsResults.ledger[b.id] || 0) - (skinsResults.ledger[a.id] || 0))
              .map(player => {
                const net = skinsResults.ledger[player.id] || 0;
                const skinsWon = skinsResults.skinsWon?.[player.id] || 0;
                const { str, color } = fmt(net);
                return (
                  <div key={player.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 10px", marginBottom: 6, borderRadius: 8,
                    background: net > 0 ? sc.goldLight : net < 0 ? "#fef2f2" : "#fafafa",
                    border: `1px solid ${net > 0 ? "#fcd34d" : net < 0 ? "#fecaca" : sc.border}`,
                  }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: sc.ink }}>{player.name}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 12, color: sc.muted }}>
                        {skinsWon} skin{skinsWon !== 1 ? "s" : ""}
                      </span>
                      <span style={{ fontSize: 16, fontWeight: 800, color }}>{str}</span>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Hole-by-hole — winners only */}
          {(() => {
            const hasCarryover = skinsConfig?.skinCarryover || skinsConfig?.skinsType === "tvskins";
            const isNet = !skinsConfig?.skinsGross;
            const winnerHoles = (skinsResults.holeResults || []).filter(h => h.winnerId);

            if (winnerHoles.length === 0) return (
              <div style={{ fontSize: 13, color: sc.muted, fontStyle: "italic" }}>No skins won yet</div>
            );

            return (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: sc.muted, marginBottom: 8 }}>
                  Winners
                </div>
                {winnerHoles.map(h => {
                  const winnerName = players.find(p => p.id === h.winnerId)?.name || "–";
                  const par = course?.pars?.[h.hole - 1] ?? 4;
                  const winnerRaw = scores?.[h.hole]?.[h.winnerId];
                  const winnerStrokes = isNet ? getHandicapStrokes(h.winnerId, h.hole, players, course, handicapMode) : 0;
                  const winnerNet = winnerRaw != null ? Number(winnerRaw) - winnerStrokes : null;
                  const isGrossBirdie = winnerRaw != null && Number(winnerRaw) <= par - 1;
                  const isNetBirdie = isNet && winnerNet != null && winnerNet <= par - 1;
                  const isPerSkin = skinsConfig?.skinsType === "value";
                  const isPot = skinsConfig?.skinsType === "pot";
                  const isTvSkins = skinsConfig?.skinsType === "tvskins";
                  const showBirdie = isPerSkin && (isGrossBirdie || isNetBirdie);
                  const birdieLabel = isGrossBirdie ? "Birdie" : "Net Birdie";

                  // Score color
                  const scoreColor = (score, p) => {
                    const d = score - p;
                    if (d <= -1) return "#1a5c35";
                    if (d === 0) return "#6b7280";
                    return "#b3261e";
                  };

                  const isExpanded = expandedSkinHole === h.hole;

                  return (
                    <div key={h.hole} style={{ marginBottom: 8 }}>
                      {/* Winner row — tappable */}
                      <div
                        onClick={() => setExpandedSkinHole(isExpanded ? null : h.hole)}
                        style={{
                          display: "flex", alignItems: "center",
                          padding: "10px 12px", borderRadius: isExpanded ? "10px 10px 0 0" : 10,
                          background: sc.goldLight, border: `1px solid #fcd34d`,
                          cursor: "pointer", userSelect: "none", gap: 0,
                        }}
                      >
                        {/* Hole number — fixed width */}
                        <span style={{ fontSize: 12, fontWeight: 700, color: sc.muted, width: 52, flexShrink: 0 }}>
                          Hole {h.hole}
                        </span>

                        {/* Winner name — flex grows */}
                        <span style={{ flex: 1, fontWeight: 600, color: sc.ink, fontSize: 14, marginRight: 8 }}>
                          {winnerName}
                        </span>

                        {/* Score circle — fixed width so all align */}
                        <div style={{ width: 32, display: "flex", justifyContent: "center", flexShrink: 0 }}>
                          {winnerRaw != null && (
                            <span style={{
                              width: 28, height: 28, borderRadius: "50%",
                              background: sc.green, color: "#fff",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 13, fontWeight: 800,
                            }}>
                              {winnerRaw}{isNet && winnerStrokes > 0 ? "•" : ""}
                            </span>
                          )}
                        </div>

                        {/* Birdie label — fixed width, only for Per Skin */}
                        <div style={{ width: 90, flexShrink: 0, marginLeft: 6 }}>
                          {showBirdie && (
                            <span style={{ fontSize: 11, color: sc.green, fontWeight: 700 }}>
                              {birdieLabel}{h.birdiDoubled ? " ×2" : ""}
                            </span>
                          )}
                        </div>

                        {/* Value — fixed width */}
                        <div style={{ width: 36, textAlign: "right", flexShrink: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: sc.ink }}>
                            {isPot ? "✓" : isTvSkins ? `$${h.value}` : `$${h.value}`}
                          </span>
                        </div>

                        {/* Carry — only if relevant */}
                        {hasCarryover && (
                          <div style={{ width: 56, textAlign: "right", flexShrink: 0 }}>
                            {h.carryover > 0 && (
                              <span style={{ fontSize: 10, color: sc.muted }}>+{h.carryover} carry</span>
                            )}
                          </div>
                        )}

                        {/* Expand chevron */}
                        <span style={{ fontSize: 11, color: sc.muted, marginLeft: 6 }}>{isExpanded ? "▲" : "▼"}</span>
                      </div>

                      {/* Expanded — all player scores */}
                      {isExpanded && (
                        <div style={{
                          background: "#fff", border: `1px solid #fcd34d`,
                          borderTop: "none", borderRadius: "0 0 10px 10px",
                          padding: "10px 12px",
                        }}>
                          {players.map(player => {
                            const raw = scores?.[h.hole]?.[player.id];
                            if (raw == null) return null;
                            const strokes = isNet ? getHandicapStrokes(player.id, h.hole, players, course, handicapMode) : 0;
                            const isWinner = player.id === h.winnerId;
                            const color = scoreColor(Number(raw), par);
                            const diff = Number(raw) - par;
                            const diffLabel = diff === 0 ? "Par" : diff === -1 ? "Birdie" : diff <= -2 ? "Eagle" : diff === 1 ? "Bogey" : `+${diff}`;

                            return (
                              <div key={player.id} style={{
                                display: "flex", justifyContent: "space-between", alignItems: "center",
                                padding: "5px 0",
                                borderBottom: `1px solid ${sc.border}`,
                              }}>
                                <span style={{ fontSize: 13, fontWeight: isWinner ? 700 : 400, color: sc.ink }}>
                                  {player.name}
                                </span>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: 11, color: sc.muted }}>{diffLabel}</span>
                                  <span style={{
                                    width: 26, height: 26, borderRadius: "50%",
                                    background: isWinner ? sc.green : "transparent",
                                    border: isWinner ? "none" : `1px solid ${sc.border}`,
                                    color: isWinner ? "#fff" : color,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 13, fontWeight: 700,
                                  }}>
                                    {raw}{isNet && strokes > 0 ? "•" : ""}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {skinsResults.totalPot != null && (
            <div style={{ marginTop: 12, padding: "8px 12px", background: sc.greenLight, borderRadius: 8, fontSize: 12, color: sc.green, fontWeight: 600 }}>
              Total pot: ${skinsResults.totalPot.toFixed(2)}
              {skinsResults.valuePerSkin ? ` · $${skinsResults.valuePerSkin.toFixed(2)} per skin` : ""}
            </div>
          )}
        </Card>
      )}

      {/* SAVE THIS ROUND */}
      {onSaveRound && roundComplete && (
        <Card style={{ borderTop: `3px solid ${sc.gold}`, background: sc.goldLight }}>
          {roundSaved || isAlreadySaved ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: sc.green }}>
                Round saved — find it in Setup › Saved Rounds
              </span>
            </div>
          ) : showSaveForm ? (
            <div>
              <SectionLabel>Save This Round</SectionLabel>
              <input
                type="text"
                value={saveRoundName}
                onChange={e => setSaveRoundName(e.target.value)}
                placeholder="Round name"
                style={{
                  width: "100%", fontSize: 15, fontWeight: 600,
                  padding: "10px 12px", border: `1px solid ${sc.border}`,
                  borderRadius: 8, background: "#fff", color: sc.ink,
                  fontFamily: "inherit", boxSizing: "border-box", marginBottom: 12,
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => {
                    const ok = onSaveRound(saveRoundName);
                    if (ok !== false) { setRoundSaved(true); setShowSaveForm(false); }
                  }}
                  style={{
                    flex: 1, padding: 12, fontSize: 15, fontWeight: 700,
                    background: sc.green, color: "#fff", border: "none",
                    borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Save Round 💾
                </button>
                <button
                  onClick={() => setShowSaveForm(false)}
                  style={{
                    padding: "12px 16px", fontSize: 14, background: "transparent",
                    color: sc.muted, border: `1px solid ${sc.border}`,
                    borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: sc.ink }}>💾 Save This Round</div>
                <div style={{ fontSize: 12, color: sc.muted, marginTop: 2 }}>
                  {roundName || "Add to your Saved Rounds for future reference"}
                </div>
              </div>
              <button
                onClick={() => setShowSaveForm(true)}
                style={{
                  padding: "9px 16px", fontSize: 13, fontWeight: 600,
                  background: sc.gold, color: "#fff", border: "none",
                  borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Save
              </button>
            </div>
          )}
        </Card>
      )}

      {/* SCORECARDS TOGGLE */}
      <div ref={scorecardRef} onClick={() => setShowAuditTrail(v => !v)}
        style={{ marginBottom: 12, padding: "12px 16px", borderRadius: 10, border: `1px solid ${sc.border}`, background: showAuditTrail ? sc.green : "#fafafa", color: showAuditTrail ? "#fff" : sc.ink, fontWeight: 600, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
        <span>Scorecards & Match Detail</span>
        <span>{showAuditTrail ? "▲" : "▼"}</span>
      </div>

      {showAuditTrail && (
        <AuditTrail
          players={players} matches={matches} matchResults={matchResults}
          birdieResults={birdieResults} teamGames={teamGames} teamGameResults={enableTeamGame ? teamGameResults : []}
          getTeamGameSelection={getTeamGameSelection} scores={scores} course={course}
          handicapMode={handicapMode} teamGameUnitAmount={teamGameUnitAmount}
          noPar3TeamGame={noPar3TeamGame} goToLive={goToLive} onUpdateScore={onUpdateScore}
          drillPlayerId={drillPlayerId}
          getHandicapStrokesFn={getHandicapStrokesFn}
          segmentBirdieAmounts={segmentBirdieAmounts}
        />
      )}

      {/* SETTLE UP */}
      <SettlementSection
        playerLedger={computedResults.playerLedger} tabs={computedResults.tabs}
        players={players} roundSummaryRows={roundSummaryRows} enableTeamGame={enableTeamGame}
      />

      {/* GHIN */}
      <Card>
        <SectionLabel>Gross / Net for GHIN{course?.name ? ` · ${course.name}` : ""}</SectionLabel>
        {grossNetRows.map(({ player, frontGross, backGross, totalGross, net }) => (
          <div key={player.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${sc.border}`, fontSize: 14 }}>
            <span style={{ fontWeight: 600, color: sc.ink, minWidth: 80, maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player.name}</span>
            <span style={{ color: sc.muted, fontSize: 12, whiteSpace: "nowrap" }}>{frontGross}+{backGross}=<strong style={{ color: sc.ink }}>{totalGross}</strong></span>
            <span style={{ background: sc.greenLight, color: sc.green, fontWeight: 700, fontSize: 13, padding: "3px 10px", borderRadius: 20 }}>Net {net}</span>
          </div>
        ))}
      </Card>

    </div>
  );
}
