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
  applyPreset,
  setTeamGames,
  teamGames,
  totalHoles,
  getTeamGameRange,
  hasDuplicateSelections,
  getTeamGameSelection,
  renderTeamSelectors,
  modeText,
  addMatch,
  addNinePointMatch,
  matches,
  matchResults,
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

        <SettingsPanel
          mode={mode}
          setMode={handleModeChange}
          handicapMode={handicapMode}
          setHandicapMode={setHandicapMode}
        />

        <PlayerSetupPanel
          mode={mode}
          players={players}
          onPlayerChange={handlePlayerChange}
          onSaveSetup={saveSetup}
          onLoadSetup={loadSetup}
          onResetSetup={resetSetup}
        />

        <div style={{ marginBottom: 12 }}>
          <button onClick={saveLastRound} style={{ marginRight: 8 }}>
            Save Last Round
          </button>

          <button onClick={loadLastRound}>Load Last Round</button>
        </div>

        <div style={{ border: "1px solid gray", padding: 10, marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Saved Test Rounds</h3>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <input
              type="text"
              value={savedRoundName}
              onChange={(e) => setSavedRoundName(e.target.value)}
              placeholder="Enter round name"
              style={{ minWidth: 220 }}
            />

            <button onClick={saveNamedRound}>Save Named Round</button>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={selectedSavedRoundId}
              onChange={(e) => setSelectedSavedRoundId(e.target.value)}
              style={{ minWidth: 260 }}
            >
              <option value="">Select saved round</option>
              {savedRounds.map((round) => (
                <option key={round.id} value={round.id}>
                  {round.name}
                </option>
              ))}
            </select>

            <button onClick={loadNamedRound}>Load Named Round</button>
            <button onClick={deleteNamedRound}>Delete Named Round</button>
            <button onClick={exportSavedRounds}>Export Saved Rounds</button>

<label style={{ display: "inline-block" }}>
  <span
    style={{
      display: "inline-block",
      border: "1px solid gray",
      padding: "2px 6px",
      cursor: "pointer",
      background: "#eee",
    }}
  >
    Import Saved Rounds
  </span>
  <input
    type="file"
    accept="application/json"
    onChange={importSavedRounds}
    style={{ display: "none" }}
  />
</label>
          </div>
        </div>

        {setupMessage && (
          <div style={{ marginBottom: 12, color: "green" }}>
            {setupMessage}
          </div>
        )}

        <div style={{ border: "1px solid gray", padding: 10, marginBottom: 12 }}>
          <h3>Course Setup</h3>

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

       <div style={{ border: "1px solid gray", padding: 10, marginBottom: 12 }}>
  <h3>Team Game & Birdie Betting</h3>

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
/>
  </label>
</div>

<div style={{ marginTop: 8 }}>

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


</div>

{!enableTeamGame && (
  <button
    onClick={startRound}
    className="primary-button"
    style={{ marginTop: 12 }}
  >
    Start Round
  </button>
)}

        </div>

        {enableTeamGame && (
  <>
    <h3>Team Game Selector</h3>

    <div style={{ marginBottom: 12 }}>
          <strong>Game Hole Setup</strong>

          <div style={{ marginTop: 8, marginBottom: 10 }}>
            <button onClick={() => applyPreset("6-6-6")}>6 / 6 / 6</button>

            <button onClick={() => applyPreset("9-9")} style={{ marginLeft: 8 }}>
              9 / 9
            </button>
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

        {enableTeamGame && (
         <>
       {teamGames.map((game, index) => {
          const { start, end } = getTeamGameRange(teamGames, index);
          const duplicateError = hasDuplicateSelections(
            getTeamGameSelection(index),
            mode
          );

          return (
  <div
    key={game.id}
    ref={(el) => {
      teamGameRefs.current[index] = el;
    }}
    style={{
  border: "1px solid #ccc",
  marginBottom: 12,
  padding: 12,
  borderRadius: 8,
  background: "#fff",
}}
  >
              <div>
                <strong>
                  Game {index + 1}: Holes {start}-{end}
                </strong>
              </div>

              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
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
                        prev.map((g, i) =>
                          i === index ? { ...g, holes: value } : g
                        )
                      );
                    }}
                    style={{ width: 60, marginLeft: 6 }}
                  />
                </label>



                {teamGames.length > 1 && (
                  <button
                    onClick={() =>
                      setTeamGames((prev) => prev.filter((_, i) => i !== index))
                    }
                  >
                    Remove Game
                  </button>
                )}
              </div>

              <div style={{ marginTop: 6 }}>
                {mode === "5p" &&
                  "Select Team 1, Team 2, Team 3, and Team 4. Team 1 plays 3 team matches against Teams 2, 3, and 4."}
                {mode === "4p" &&
                  "Select Team 1 and Team 2. One 2v2 match is played for this game."}
                {mode === "3p" &&
                  "Select Team 1 as 2 players and Team 2 as 1 player. One 2v1 match is played for this game."}
              </div>

              {renderTeamSelectors(index)}

              {duplicateError && (
                <div style={{ marginTop: 8, color: "red" }}>
                  Duplicate players in this game are not allowed.
                </div>
              )}
              {!duplicateError && (
  <PrimarySetupAction />
)}
            </div>
          );
        })}

    

  </>
)}            </>
            )}

        <div style={{ marginBottom: 12 }}>
          <button onClick={addMatch}>Add Match</button>

          <button onClick={addNinePointMatch} style={{ marginLeft: 8 }}>
            Add 9 Point Match
          </button>
        </div>

        <MatchList
          players={players}
          matches={matches}
          results={matchResults}
          onAddMatch={addMatch}
          onUpdateMatch={updateMatch}
          onRemoveMatch={removeMatch}
        />

       
      </>
  );
}