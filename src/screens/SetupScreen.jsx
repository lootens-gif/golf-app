import SettingsPanel from "../components/SettingsPanel";
import PlayerSetupPanel from "../components/PlayerSetupPanel";
import CourseEditor from "../components/CourseEditor";
import MatchList from "../components/MatchList";
import { useEffect, useRef } from "react";
export default function SetupScreen({
  mode,
  handleModeChange,
  handicapMode,
  setHandicapMode,
  players,
  handlePlayerChange,
  saveSetup,
  loadSetup,
  resetSetup,
  saveLastRound,
  loadLastRound,
  savedRoundName,
  setSavedRoundName,
  saveNamedRound,
  savedRounds,
  selectedSavedRoundId,
  setSelectedSavedRoundId,
  loadNamedRound,   
  deleteNamedRound,
  exportSavedRounds,
  importSavedRounds,
  setupMessage,
  course,
  updateCourseName,
  updateCoursePar,
  updateCourseHcp,
  enableTeamGame,
  setEnableTeamGame,
  teamGameUnitAmount,
  setTeamGameUnitAmount,
  pressTrigger,
  setPressTrigger,
  birdiesEnabled,
  setBirdiesEnabled,
  birdieBetAmount,
  setBirdieBetAmount,
  toyRule,
  setToyRule,
  applyPreset,
  setTeamGames,
  teamGames,
  totalHoles,
  getTeamGameRange,
  hasDuplicateSelections,
  getTeamGameSelection,
  renderTeamSelectors,
  expandedGame,
  setExpandedGame,
  modeText,
  addMatch,
  addNinePointMatch,
  matches,
  matchResults,
  birdieResults = [],
  updateMatch,
  removeMatch,
  startRound,
  createDefaultTeamGame,
  focusGameTarget,
  goToLive,
  goToResults,
}) {
    const teamGameRefs = useRef({});
    const primarySetupActionLabel = focusGameTarget ? "Continue Round" : "Start Round";
<div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
  
  <button className="secondary-button" type="button" onClick={goToResults}>
    Results
  </button>
</div>
    const PrimarySetupAction = () => (
    <button
        onClick={startRound}
        className="primary-button"
        style={{ marginTop: 12 }}
    >
        {primarySetupActionLabel}
    </button>
    );

// Do not force-focus selects in Safari; it can lock/dropdown weirdly.
// Scroll to the game only.

    useEffect(() => {
  if (!focusGameTarget) return;

  const el = teamGameRefs.current[focusGameTarget.gameIndex];
  if (!el) return;

  setTimeout(() => {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 0);

}, [focusGameTarget]);
  return (
    <>

   {/* ── 1. PLAYER COUNT ── */}
        <SettingsPanel
          mode={mode}
          setMode={handleModeChange}
          handicapMode={handicapMode}
          setHandicapMode={setHandicapMode}
          
        />

        {/* ── 2. PLAYERS & HANDICAPS ── */}
        <PlayerSetupPanel
          mode={mode}
          players={players}
          onPlayerChange={handlePlayerChange}
          onSaveSetup={saveSetup}
          onLoadSetup={loadSetup}
          onResetSetup={resetSetup}
        />

        {setupMessage && (
          <div style={{ marginBottom: 12, color: "green" }}>
            {setupMessage}
          </div>
        )}

        {/* ── 3. TEAM GAME & BIRDIE BETTING ── */}
        <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Team Game & Birdie Betting</h3>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={enableTeamGame}
                onChange={(e) => setEnableTeamGame(e.target.checked)}
              />
              Enable Team Game
            </label>
          </div>

          {enableTeamGame && (
            <div style={{ marginBottom: 8 }}>
              <label>
                Team Game Unit Amount:
                <input
                  type="number"
                  value={teamGameUnitAmount}
                  onChange={(e) => setTeamGameUnitAmount(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  style={{ marginLeft: 6, width: 70 }}
                />
              </label>

              <div style={{ marginTop: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  Press Trigger:
                  <input
                    type="number"
                    value={pressTrigger}
                    onChange={(e) => setPressTrigger(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    style={{ width: 70 }}
                  />
                </label>
              </div>
            </div>
          )}

          <div style={{ marginTop: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={birdiesEnabled}
                onChange={(e) => setBirdiesEnabled(e.target.checked)}
              />
              Birdies (Gross Side Bet)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
              Birdie Bet:
              <input
                type="number"
                min="0"
                step="1"
                value={birdieBetAmount}
                disabled={!birdiesEnabled}
                onChange={(e) => setBirdieBetAmount(Number(e.target.value || 0))}
                onFocus={(e) => e.target.select()}
                style={{ width: 70 }}
              />
            </label>
            {birdiesEnabled && (
              <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={!!toyRule}
                  onChange={(e) => setToyRule(e.target.checked)}
                />
                Toy Birdies — Net birdie ties Gross birdie
              </label>
            )}
          </div>
        </div>

        {/* ── 4. TEAM GAME SELECTOR ── */}
        {enableTeamGame && (
          <>
            <h3>Team Game Selector</h3>

            <div style={{ marginBottom: 12 }}>
              <strong>Game Hole Setup</strong>

              <div style={{ marginTop: 8, marginBottom: 10 }}>
                <button onClick={() => applyPreset("6-6-6")}>6 / 6 / 6</button>
                <button onClick={() => applyPreset("9-9")} style={{ marginLeft: 8 }}>9 / 9</button>
              </div>

              <div style={{ marginTop: 8, marginBottom: 8 }}>
                <button
                  onClick={() =>
                    setTeamGames((prev) => [
                      ...prev,
                      createDefaultTeamGame(prev.length + 1),
                    ])
                  }
                >
                  Add Team Game
                </button>
              </div>

              {totalHoles !== 18 && (
                <div style={{ color: "red", marginBottom: 10 }}>
                  Total holes must equal 18 (currently {totalHoles})
                </div>
              )}
            </div>

            {teamGames.map((game, index) => {
              const { start, end } = getTeamGameRange(teamGames, index);
              const duplicateError = hasDuplicateSelections(
                getTeamGameSelection(index),
                mode
              );

              return (
                <div
                  key={game.id}
                  ref={(el) => { teamGameRefs.current[index] = el; }}
                  style={{ border: "1px solid #ccc", marginBottom: 12, padding: 12, borderRadius: 8, background: "#fff" }}
                >
                  <div>
                    <strong>Game {index + 1}: Holes {start}-{end}</strong>
                  </div>

                  {index === 0 ? (
                    <>
                      <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                        <label>
                          Holes:
                          <input
                            type="number"
                            min={1}
                            max={18}
                            value={game.holes ?? 1}
                            onChange={(e) => {
                              const value = Number(e.target.value) || 1;
                              setTeamGames((prev) =>
                                prev.map((g, i) => i === index ? { ...g, holes: value } : g)
                              );
                            }}
                            style={{ width: 60, marginLeft: 6 }}
                          />
                        </label>
                        {teamGames.length > 1 && (
                          <button onClick={() => setTeamGames((prev) => prev.filter((_, i) => i !== index))}>
                            Remove Game
                          </button>
                        )}
                      </div>
                      <div style={{ marginTop: 6 }}>
                        {mode === "5p" && "Select Team 1, Team 2, Team 3, and Team 4. Team 1 plays 3 team matches against Teams 2, 3, and 4."}
                        {mode === "4p" && "Select Team 1 and Team 2. One 2v2 match is played for this game."}
                        {mode === "3p" && "Select Team 1 as 2 players and Team 2 as 1 player. One 2v1 match is played for this game."}
                      </div>
                      {renderTeamSelectors(index)}
                      {!duplicateError && <PrimarySetupAction />}
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setExpandedGame(expandedGame === index ? null : index)}
                        style={{ fontSize: 13, marginTop: 8 }}
                      >
                        {expandedGame === index ? "▲ Hide Game " + (index + 1) + " Details" : "▼ Set Up Game " + (index + 1) + " Teams"}
                      </button>
                      {expandedGame === index && (
                        <>
                          <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                            <label>
                              Holes:
                              <input
                                type="number"
                                min={1}
                                max={18}
                                value={game.holes ?? 1}
                                onChange={(e) => {
                                  const value = Number(e.target.value) || 1;
                                  setTeamGames((prev) =>
                                    prev.map((g, i) => i === index ? { ...g, holes: value } : g)
                                  );
                                }}
                                style={{ width: 60, marginLeft: 6 }}
                              />
                            </label>
                            {teamGames.length > 1 && (
                              <button onClick={() => setTeamGames((prev) => prev.filter((_, i) => i !== index))}>
                                Remove Game
                              </button>
                            )}
                          </div>
                          <div style={{ marginTop: 6 }}>
                            {mode === "5p" && "Select Team 1, Team 2, Team 3, and Team 4. Team 1 plays 3 team matches against Teams 2, 3, and 4."}
                            {mode === "4p" && "Select Team 1 and Team 2. One 2v2 match is played for this game."}
                            {mode === "3p" && "Select Team 1 as 2 players and Team 2 as 1 player. One 2v1 match is played for this game."}
                          </div>
                          {renderTeamSelectors(index)}
                          {duplicateError && (
                            <div style={{ marginTop: 8, color: "red" }}>
                              Duplicate players in this game are not allowed.
                            </div>
                          )}
                          {!duplicateError && <PrimarySetupAction />}
                        </>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* ── 5. MATCHES ── */}
        <div style={{ marginBottom: 12 }}>
          <button onClick={addMatch}>Add Match</button>
          {mode === "3p" && (
            <button onClick={addNinePointMatch} style={{ marginLeft: 8 }}>
              Add 9 Point Match
            </button>
          )}
        </div>

        <MatchList
          players={players}
          matches={matches}
          results={matchResults}
          birdieResults={birdieResults}
          onAddMatch={addMatch}
          onUpdateMatch={updateMatch}
          onRemoveMatch={removeMatch}
        />

        {!enableTeamGame && <PrimarySetupAction />}

        {/* ── 6. SAVED ROUNDS ── */}
        <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, marginTop: 16, marginBottom: 12 }}>
          <h3 style={{ marginTop: 0, marginBottom: 10 }}>Saved Rounds</h3>

          {/* Save a new named round */}
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              type="text"
              value={savedRoundName}
              onChange={(e) => setSavedRoundName(e.target.value)}
              placeholder="Round name (e.g. May 9 Westwood)"
              style={{ flex: 1, fontSize: 14, padding: "5px 8px" }}
            />
            <button onClick={saveNamedRound}>Save</button>
          </div>

          {/* Load / delete a saved round */}
          {savedRounds.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
              <select
                value={selectedSavedRoundId}
                onChange={(e) => setSelectedSavedRoundId(e.target.value)}
                style={{ flex: 1, fontSize: 14, padding: "5px 8px" }}
              >
                <option value="">Select a saved round...</option>
                {savedRounds.map((round) => (
                  <option key={round.id} value={round.id}>
                    {round.name}
                  </option>
                ))}
              </select>
              <button onClick={loadNamedRound}>Load</button>
              <button
                onClick={() => {
                  if (window.confirm("Delete this saved round?")) deleteNamedRound();
                }}
                style={{ color: "#b3261e" }}
              >
                Delete
              </button>
            </div>
          )}

          {/* Backup / restore — hidden behind a toggle */}
          <details style={{ marginTop: 4 }}>
            <summary style={{ fontSize: 13, color: "#666", cursor: "pointer" }}>
              Backup &amp; Restore
            </summary>
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <button onClick={exportSavedRounds}>Export All Rounds</button>
              <label style={{ display: "inline-block" }}>
                <span style={{ display: "inline-block", border: "1px solid #ccc", padding: "4px 8px", cursor: "pointer", background: "#f5f5f5", borderRadius: 4, fontSize: 14 }}>
                  Import Rounds
                </span>
                <input type="file" accept="application/json" onChange={importSavedRounds} style={{ display: "none" }} />
              </label>
            </div>
          </details>
        </div>

        <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Course Setup</h3>
          <div style={{ marginBottom: 10 }}>
            <label>
              Course Name:
              <input
                type="text"
                value={course.name || ""}
                onFocus={(e) => e.target.select()}
                onChange={(e) => updateCourseName(e.target.value)}
                style={{ marginLeft: 6 }}
              />
            </label>
          </div>
          <CourseEditor
            course={course}
            onParChange={updateCoursePar}
            onHcpChange={updateCourseHcp}
          />
        </div>

      </>
  );
}
          