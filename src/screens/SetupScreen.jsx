import SettingsPanel from "../components/SettingsPanel";
import PlayerSetupPanel from "../components/PlayerSetupPanel";
import CourseEditor from "../components/CourseEditor";
import MatchList from "../components/MatchList";
import { useEffect, useRef } from "react";

const sc = {
  green:      "#1a5c35",
  greenLight: "#f0f7f3",
  greenMid:   "#2d7a4f",
  gold:       "#b8952a",
  goldLight:  "#fdf8ee",
  ink:        "#1a1a1a",
  muted:      "#6b7280",
  border:     "#d1d5db",
  card:       "#ffffff",
  bg:         "#f7f8f6",
};

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: sc.card,
      border: `1px solid ${sc.border}`,
      borderRadius: 12,
      padding: "16px",
      marginBottom: 14,
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "1.5px",
      textTransform: "uppercase",
      color: sc.muted,
      marginBottom: 12,
      paddingBottom: 8,
      borderBottom: `1px solid ${sc.border}`,
    }}>
      {children}
    </div>
  );
}

function GreenButton({ onClick, children, disabled, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? "#ccc" : sc.green,
        color: "#fff",
        border: "none",
        borderRadius: 8,
        padding: "11px 20px",
        fontSize: 14,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function OutlineButton({ onClick, children, disabled, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "transparent",
        color: disabled ? sc.muted : sc.green,
        border: `1px solid ${disabled ? sc.border : sc.green}`,
        borderRadius: 8,
        padding: "9px 16px",
        fontSize: 13,
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontFamily: "inherit",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Toggle({ checked, onChange, label, sublabel }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", userSelect: "none" }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          background: checked ? sc.green : "#d1d5db",
          position: "relative",
          transition: "background 0.2s",
          flexShrink: 0,
          cursor: "pointer",
        }}
      >
        <div style={{
          position: "absolute",
          top: 2,
          left: checked ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: sc.ink }}>{label}</div>
        {sublabel && <div style={{ fontSize: 12, color: sc.muted, marginTop: 1 }}>{sublabel}</div>}
      </div>
    </label>
  );
}

function AmountInput({ label, value, onChange, disabled }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 13, color: disabled ? sc.muted : sc.ink, minWidth: 110 }}>{label}</span>
      <div style={{
        display: "flex",
        alignItems: "center",
        border: `1px solid ${disabled ? sc.border : sc.green}`,
        borderRadius: 8,
        overflow: "hidden",
        opacity: disabled ? 0.5 : 1,
      }}>
        <span style={{ padding: "7px 10px", background: sc.greenLight, color: sc.green, fontWeight: 600, fontSize: 13 }}>$</span>
        <input
          type="number"
          value={value}
          disabled={disabled}
          onChange={onChange}
          onFocus={(e) => e.target.select()}
          style={{ width: 60, border: "none", padding: "7px 10px", fontSize: 14, fontWeight: 600, color: sc.ink, background: "#fff", outline: "none" }}
        />
      </div>
    </div>
  );
}

export default function SetupScreen({
  mode, handleModeChange, handicapMode, setHandicapMode,
  players, handlePlayerChange, saveSetup, loadSetup, resetSetup,
  saveLastRound, loadLastRound, savedRoundName, setSavedRoundName,
  saveNamedRound, savedRounds, selectedSavedRoundId, setSelectedSavedRoundId,
  loadNamedRound, deleteNamedRound, exportSavedRounds, importSavedRounds,
  setupMessage, course, updateCourseName, updateCoursePar, updateCourseHcp,
  enableTeamGame, setEnableTeamGame, teamGameUnitAmount, setTeamGameUnitAmount,
  pressTrigger, setPressTrigger, birdiesEnabled, setBirdiesEnabled,
  birdieBetAmount, setBirdieBetAmount, toyRule, setToyRule,
  noPar3TeamGame, setNoPar3TeamGame, applyPreset, setTeamGames, teamGames,
  totalHoles, getTeamGameRange, hasDuplicateSelections, getTeamGameSelection,
  renderTeamSelectors, expandedGame, setExpandedGame, modeText,
  addMatch, addNinePointMatch, autoCreateMatches, matches, matchResults,
  birdieResults = [], updateMatch, removeMatch, startRound,
  createDefaultTeamGame, focusGameTarget, goToLive, goToResults,
  roundName, setRoundName,
}) {
  const teamGameRefs = useRef({});
  const hasNinePoint = matches.some(m => m.gameType === "ninePoint");
  const primarySetupActionLabel = focusGameTarget ? "Continue Round ›" : "Start Round ›";

  const PrimarySetupAction = () => (
    <GreenButton
      onClick={startRound}
      style={{ width: "100%", marginTop: 16, padding: "14px 20px", fontSize: 16, borderRadius: 10 }}
    >
      ⛳ {primarySetupActionLabel}
    </GreenButton>
  );

  useEffect(() => {
    if (!focusGameTarget) return;
    const el = teamGameRefs.current[focusGameTarget.gameIndex];
    if (!el) return;
    setTimeout(() => { el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 0);
  }, [focusGameTarget]);

  return (
    <div style={{ fontFamily: "'Georgia', serif" }}>

      {/* ── ROUND NAME ── */}
      <Card style={{ background: sc.greenLight, border: "1px solid #c3ddd0" }}>
        <SectionLabel>Round Name</SectionLabel>
        <input
          type="text"
          value={roundName || ""}
          onChange={e => setRoundName && setRoundName(e.target.value)}
          placeholder={(() => {
            const today = new Date();
            const monthDay = today.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            return course?.name ? `${monthDay} - ${course.name}` : `${monthDay} Round`;
          })()}
          style={{
            width: "100%", fontSize: 16, fontWeight: 600, padding: "10px 12px",
            border: "1px solid #c3ddd0", borderRadius: 8, background: "#fff",
            color: sc.ink, fontFamily: "inherit", boxSizing: "border-box",
          }}
        />
      </Card>

      {/* ── PLAYERS ── */}
      <Card>
        <SectionLabel>Players & Handicaps</SectionLabel>
        <SettingsPanel
          mode={mode} setMode={handleModeChange}
          handicapMode={handicapMode} setHandicapMode={setHandicapMode}
        />
        <div style={{ marginTop: 12 }}>
          <PlayerSetupPanel
            mode={mode} players={players} onPlayerChange={handlePlayerChange}
            onSaveSetup={saveSetup} onLoadSetup={loadSetup} onResetSetup={resetSetup}
            onAutoCreateMatches={autoCreateMatches} teamGameUnitAmount={teamGameUnitAmount}
          />
        </div>
      </Card>

      {setupMessage && (
        <div style={{ marginBottom: 12, color: sc.green, fontWeight: 500, fontSize: 14, padding: "10px 14px", background: sc.greenLight, borderRadius: 8 }}>
          {setupMessage}
        </div>
      )}

      {/* ── BETTING ── */}
      <Card>
        <SectionLabel>Betting Setup</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          <Toggle
            checked={enableTeamGame}
            onChange={setEnableTeamGame}
            label="Team Game"
            sublabel="Wheel format — 9 games across 18 holes"
          />

          {enableTeamGame && (
            <div style={{ paddingLeft: 56, display: "flex", flexDirection: "column", gap: 12 }}>
              <AmountInput
                label="Unit bet"
                value={teamGameUnitAmount}
                onChange={(e) => setTeamGameUnitAmount(e.target.value)}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, color: sc.ink, minWidth: 110 }}>Press trigger</span>
                <div style={{ display: "flex", border: `1px solid ${sc.green}`, borderRadius: 8, overflow: "hidden" }}>
                  {[1, 2, 3].map(n => (
                    <button key={n} onClick={() => setPressTrigger(n)} style={{
                      padding: "7px 16px", border: "none",
                      background: Number(pressTrigger) === n ? sc.green : "#fff",
                      color: Number(pressTrigger) === n ? "#fff" : sc.ink,
                      fontWeight: 600, fontSize: 14, cursor: "pointer",
                      borderRight: n < 3 ? `1px solid ${sc.border}` : "none",
                    }}>{n}</button>
                  ))}
                </div>
                <span style={{ fontSize: 12, color: sc.muted }}>down</span>
              </div>
            </div>
          )}

          <div style={{ borderTop: `1px solid ${sc.border}`, paddingTop: 14 }}>
            <Toggle
              checked={birdiesEnabled}
              onChange={(val) => {
                setBirdiesEnabled(val);
                if (val && (!birdieBetAmount || birdieBetAmount === 0)) {
                  setBirdieBetAmount(Number(teamGameUnitAmount) || 5);
                }
              }}
              label="Birdie Side Bet"
              sublabel="Gross birdies pay out to the group"
            />
            {birdiesEnabled && (
              <div style={{ paddingLeft: 56, marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                <AmountInput
                  label="Birdie pays"
                  value={birdieBetAmount}
                  onChange={(e) => setBirdieBetAmount(Number(e.target.value || 0))}
                />
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!toyRule} onChange={(e) => setToyRule(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: sc.green }} />
                  <span style={{ fontSize: 13, color: sc.muted }}>Toy rule — net birdie ties gross birdie</span>
                </label>
              </div>
            )}
          </div>

          <div style={{ borderTop: `1px solid ${sc.border}`, paddingTop: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={!!noPar3TeamGame} onChange={(e) => setNoPar3TeamGame(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: sc.green }} />
              <span style={{ fontSize: 13, color: sc.muted }}>No handicap strokes on par 3s (team games)</span>
            </label>
          </div>
        </div>
      </Card>

      {/* ── TEAM GAME SELECTOR ── */}
      {enableTeamGame && (
        <Card>
          <SectionLabel>Team Assignments</SectionLabel>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <OutlineButton onClick={() => applyPreset("6-6-6")}>6 / 6 / 6</OutlineButton>
            <OutlineButton onClick={() => applyPreset("9-9")}>9 / 9</OutlineButton>
            <OutlineButton onClick={() => setTeamGames(prev => [...prev, createDefaultTeamGame(prev.length + 1)])}>
              + Add Game
            </OutlineButton>
          </div>

          {totalHoles > 0 && (
            <div style={{
              fontSize: 13, fontWeight: 600, marginBottom: 14, padding: "8px 12px", borderRadius: 8,
              color: totalHoles > 18 ? "#b3261e" : totalHoles === 18 ? sc.green : sc.muted,
              background: totalHoles > 18 ? "#fdecea" : totalHoles === 18 ? sc.greenLight : "#f5f5f5",
            }}>
              {totalHoles > 18 ? `⚠️ Total exceeds 18 holes (${totalHoles})`
                : totalHoles === 18 ? `✓ All 18 holes configured`
                : `${totalHoles} / 18 holes configured`}
            </div>
          )}

          {teamGames.map((game, index) => {
            const { start, end } = getTeamGameRange(teamGames, index);
            const duplicateError = hasDuplicateSelections(getTeamGameSelection(index), mode);
            return (
              <div key={game.id} ref={(el) => { teamGameRefs.current[index] = el; }}
                style={{ border: `1px solid ${sc.border}`, borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
                <div style={{ background: sc.green, color: "#fff", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Game {index + 1} · Holes {start}–{end}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    {index !== 0 && (
                      <button onClick={() => setExpandedGame(expandedGame === index ? null : index)}
                        style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>
                        {expandedGame === index ? "▲ Hide" : "▼ Edit"}
                      </button>
                    )}
                    {teamGames.length > 1 && (
                      <button onClick={() => setTeamGames(prev => prev.filter((_, i) => i !== index))}
                        style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                {(index === 0 || expandedGame === index) && (
                  <div style={{ padding: 14 }}>
                    <label style={{ fontSize: 13, color: sc.muted, display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      Holes:
                      <input type="number" min={1} max={18} value={game.holes ?? ""} placeholder="#"
                        onChange={(e) => {
                          const raw = e.target.value;
                          const value = raw === "" ? "" : Math.min(18, Math.max(1, Number(raw)));
                          setTeamGames(prev => prev.map((g, i) => i === index ? { ...g, holes: value } : g));
                        }}
                        style={{ width: 55, padding: "6px 8px", border: `1px solid ${sc.border}`, borderRadius: 6, fontSize: 14 }}
                      />
                    </label>
                    <div style={{ fontSize: 12, color: sc.muted, marginBottom: 10 }}>
                      {mode === "5p" && "Team 1 plays 3 matches against Teams 2, 3, and 4"}
                      {mode === "4p" && "Team 1 vs Team 2 — one 2v2 match"}
                      {mode === "3p" && "Team 1 (2 players) vs Team 2 (1 player)"}
                    </div>
                    {renderTeamSelectors(index)}
                    {duplicateError && (
                      <div style={{ color: "#b3261e", fontSize: 13, marginTop: 8 }}>
                        ⚠️ Duplicate players — each player can only be in one team
                      </div>
                    )}
                    {!duplicateError && <PrimarySetupAction />}
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}

      {/* ── 1V1 MATCHES ── */}
      <Card>
        <SectionLabel>1v1 Matches</SectionLabel>
        {players.length >= 2 && (
          <div style={{ marginBottom: 12 }}>
            <GreenButton onClick={autoCreateMatches} style={{ width: "100%", marginBottom: 6 }}>
              Auto-Generate {(players.length * (players.length - 1)) / 2} Matches
            </GreenButton>
            <div style={{ fontSize: 11, color: sc.muted, textAlign: "center" }}>
              Net holes · ${Number(teamGameUnitAmount) || 5}/match · with birdies
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <OutlineButton onClick={addMatch}>+ Add Match</OutlineButton>
          {mode === "3p" && (
            <OutlineButton
              onClick={hasNinePoint ? undefined : addNinePointMatch}
              disabled={hasNinePoint}
            >
              {hasNinePoint ? "9-Point Added ✓" : "+ 9 Point Match"}
            </OutlineButton>
          )}
        </div>
        {matches.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <MatchList
              players={players} matches={matches} results={matchResults}
              birdieResults={birdieResults} onAddMatch={addMatch}
              onUpdateMatch={updateMatch} onRemoveMatch={removeMatch}
            />
          </div>
        )}
        {!enableTeamGame && <PrimarySetupAction />}
      </Card>

      {/* ── COURSE ── */}
      <Card>
        <SectionLabel>Course Setup</SectionLabel>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, color: sc.muted, display: "block", marginBottom: 6 }}>Course name</label>
          <input
            type="text" value={course.name || ""} onFocus={(e) => e.target.select()}
            onChange={(e) => updateCourseName(e.target.value)} placeholder="e.g. Westwood"
            style={{ width: "100%", fontSize: 15, fontWeight: 600, padding: "9px 12px", border: `1px solid ${sc.border}`, borderRadius: 8, boxSizing: "border-box", fontFamily: "inherit" }}
          />
        </div>
        <CourseEditor course={course} onParChange={updateCoursePar} onHcpChange={updateCourseHcp} />
      </Card>

      {/* ── SAVED ROUNDS ── */}
      <Card>
        <SectionLabel>Saved Rounds</SectionLabel>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input type="text" value={savedRoundName} onChange={(e) => setSavedRoundName(e.target.value)}
            placeholder="Name this setup to save it"
            style={{ flex: 1, fontSize: 14, padding: "9px 12px", border: `1px solid ${sc.border}`, borderRadius: 8 }} />
          <GreenButton onClick={saveNamedRound}>Save</GreenButton>
        </div>
        {savedRounds.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
            <select value={selectedSavedRoundId} onChange={(e) => setSelectedSavedRoundId(e.target.value)}
              style={{ flex: 1, fontSize: 14, padding: "9px 12px", border: `1px solid ${sc.border}`, borderRadius: 8 }}>
              <option value="">Load a saved round…</option>
              {savedRounds.map((round) => (
                <option key={round.id} value={round.id}>{round.name}</option>
              ))}
            </select>
            <OutlineButton onClick={loadNamedRound}>Load</OutlineButton>
            <OutlineButton onClick={() => { if (window.confirm("Delete this saved round?")) deleteNamedRound(); }}
              style={{ color: "#b3261e", borderColor: "#b3261e" }}>
              Delete
            </OutlineButton>
          </div>
        )}
        <details style={{ marginTop: 4 }}>
          <summary style={{ fontSize: 13, color: sc.muted, cursor: "pointer" }}>Backup &amp; Restore</summary>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <OutlineButton onClick={exportSavedRounds}>Export All</OutlineButton>
            <label style={{ display: "inline-block" }}>
              <span style={{ display: "inline-block", border: `1px solid ${sc.green}`, color: sc.green, padding: "9px 16px", cursor: "pointer", borderRadius: 8, fontSize: 13, fontWeight: 500 }}>
                Import Rounds
              </span>
              <input type="file" accept="application/json" onChange={importSavedRounds} style={{ display: "none" }} />
            </label>
          </div>
        </details>
      </Card>

    </div>
  );
}
