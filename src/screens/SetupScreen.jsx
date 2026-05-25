import PlayerSetupPanel from "../components/PlayerSetupPanel";
import CourseEditor from "../components/CourseEditor";
import MatchList from "../components/MatchList";
import { useEffect, useRef, useState } from "react";

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

function AmountInput({ label, value, onChange, disabled, min = 0, step = 1 }) {
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
          min={min}
          step={step}
          disabled={disabled}
          onChange={onChange}
          onFocus={(e) => e.target.select()}
          onClick={(e) => e.target.select()}
          style={{ width: 60, border: "none", padding: "7px 10px", fontSize: 14, fontWeight: 600, color: sc.ink, background: "#fff", outline: "none" }}
        />
      </div>
    </div>
  );
}

function CourseCard({ course, updateCourseName, updateCoursePar, updateCourseHcp, saveCourseToLibrary, searchCourses, players, sc }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saveStatus, setSaveStatus] = useState(""); // "" | "saving" | "saved" | "error"
  const searchTimer = useRef(null);

  function handleSearch(q) {
    const capped = q.replace(/(?:^|\s)\S/g, c => c.toUpperCase());
    setSearchQuery(capped);
    updateCourseName(capped);
    clearTimeout(searchTimer.current);
    if (q.length < 2) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchCourses(q);
        setSearchResults(results);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 400);
  }

  function loadCourse(c) {
    updateCourseName(c.name);
    c.pars.forEach((par, i) => updateCoursePar(i + 1, par));
    c.hcp.forEach((hcp, i) => updateCourseHcp(i + 1, hcp));
    setSearchResults([]);
    setSearchQuery(c.name);
  }

  async function handleSave() {
    if (!course.name) return;
    setSaveStatus("saving");
    try {
      await saveCourseToLibrary(course, "");
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 3000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(""), 3000);
    }
  }

  return (
    <Card>
      <SectionLabel>Course Setup</SectionLabel>

      {/* Search / name input */}
      <div style={{ marginBottom: 8, position: "relative" }}>
        <label style={{ fontSize: 13, color: sc.muted, display: "block", marginBottom: 6 }}>
          Course name — search library or type new
        </label>
        <input
          type="text"
          value={searchQuery || course.name || ""}
          onFocus={(e) => { e.target.select(); if (course.name) setSearchQuery(course.name); }}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search courses or type a name…"
          style={{ width: "100%", fontSize: 15, fontWeight: 600, padding: "9px 12px", border: `1px solid ${sc.border}`, borderRadius: 8, boxSizing: "border-box", fontFamily: "inherit" }}
        />

        {/* Search results dropdown */}
        {searchResults.length > 0 && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: `1px solid ${sc.border}`, borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 100, marginTop: 4 }}>
            {searchResults.map(c => (
              <div key={c.id} onClick={() => loadCourse(c)} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${sc.border}`, fontSize: 14 }}>
                <div style={{ fontWeight: 600, color: sc.ink }}>{c.name}</div>
                <div style={{ fontSize: 11, color: sc.muted }}>{c.city}{c.state ? `, ${c.state}` : ""} · used {c.use_count} time{c.use_count !== 1 ? "s" : ""}</div>
              </div>
            ))}
            <div onClick={() => setSearchResults([])} style={{ padding: "8px 14px", fontSize: 12, color: sc.muted, cursor: "pointer", textAlign: "center" }}>
              Dismiss
            </div>
          </div>
        )}
        {searching && <div style={{ fontSize: 12, color: sc.muted, marginTop: 4 }}>Searching…</div>}
      </div>

      <CourseEditor course={course} onParChange={updateCoursePar} onHcpChange={updateCourseHcp} />

      {/* Save to library button */}
      <button
        onClick={handleSave}
        disabled={!course.name || saveStatus === "saving"}
        style={{
          marginTop: 12, padding: "9px 16px", fontSize: 13, fontWeight: 600,
          background: saveStatus === "saved" ? sc.greenLight : "#fff",
          color: saveStatus === "saved" ? sc.green : saveStatus === "error" ? "#b3261e" : sc.muted,
          border: `1px solid ${saveStatus === "saved" ? sc.green : sc.border}`,
          borderRadius: 8, cursor: course.name ? "pointer" : "not-allowed",
          fontFamily: "inherit",
        }}
      >
        {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "✓ Saved to course library" : saveStatus === "error" ? "Save failed" : "💾 Save course to shared library"}
      </button>
      <div style={{ fontSize: 11, color: sc.muted, marginTop: 4 }}>
        Once saved, anyone can search and load this course.
      </div>
    </Card>
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
  noPar3TeamGame, setNoPar3TeamGame, handicapDistribution, setHandicapDistribution, applyPreset, setTeamGames, teamGames,
  skinsEnabled, setSkinsEnabled, skinsType, setSkinsType,
  skinsGross, setSkinsGross, skinValueAmount, setSkinValueAmount,
  skinCarryover, setSkinCarryover, skinBirdie, setSkinBirdie,
  skinBirdieDoubleCarryover, setSkinBirdieDoubleCarryover,
  potType, setPotType, potDonation, setPotDonation, potBaseUnit, setPotBaseUnit,
  saveCourseToLibrary, searchCourses,
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
           onFocus={(e) => {
            if (!roundName) {
              const today = new Date();
              const monthDay = today.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              const auto = course?.name ? `${monthDay} - ${course.name}` : `${monthDay} Round`;
              setRoundName && setRoundName(auto);
              setTimeout(() => e.target.setSelectionRange(auto.length, auto.length), 0);
            } else {
              setTimeout(() => e.target.setSelectionRange(roundName.length, roundName.length), 0);
            }
          }}
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

        {/* Player count */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 13, color: sc.muted, minWidth: 60 }}>Players</span>
          <div style={{ display: "flex", border: `1px solid ${sc.green}`, borderRadius: 8, overflow: "hidden" }}>
            {["3p", "4p", "5p"].map((m, i) => (
              <button key={m} onClick={() => handleModeChange(m)} style={{
                padding: "7px 16px", border: "none",
                background: mode === m ? sc.green : "#fff",
                color: mode === m ? "#fff" : sc.ink,
                fontWeight: 600, fontSize: 14, cursor: "pointer",
                borderRight: i < 2 ? `1px solid ${sc.border}` : "none",
                fontFamily: "inherit",
              }}>{m === "3p" ? "3" : m === "4p" ? "4" : "5"}</button>
            ))}
          </div>
        </div>

        {/* Handicap mode */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 13, color: sc.muted, minWidth: 60 }}>Strokes</span>
          <div style={{ display: "flex", border: `1px solid ${sc.green}`, borderRadius: 8, overflow: "hidden" }}>
            {[
              { value: "relative", label: "Net (Lowest)" },
              { value: "full", label: "Full HCP" },
            ].map(({ value, label }, i) => (
              <button key={value} onClick={() => setHandicapMode(value)} style={{
                padding: "7px 14px", border: "none",
                background: handicapMode === value ? sc.green : "#fff",
                color: handicapMode === value ? "#fff" : sc.ink,
                fontWeight: 600, fontSize: 13, cursor: "pointer",
                borderRight: i === 0 ? `1px solid ${sc.border}` : "none",
                fontFamily: "inherit",
              }}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <PlayerSetupPanel
            mode={mode} players={players} onPlayerChange={handlePlayerChange}
            onResetSetup={resetSetup}
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
                  {[1, 2].map(n => (
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

          {/* ── SKINS ── */}
          <div style={{ borderTop: `1px solid ${sc.border}`, paddingTop: 14 }}>
            <Toggle
              checked={skinsEnabled}
              onChange={setSkinsEnabled}
              label="Skins"
              sublabel="Side bet — lowest score on a hole wins"
            />
            {skinsEnabled && (
              <div style={{ paddingLeft: 56, marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>

                {/* Net / Gross */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, color: sc.muted, minWidth: 80 }}>Scoring</span>
                  <div style={{ display: "flex", border: `1px solid ${sc.green}`, borderRadius: 8, overflow: "hidden" }}>
                    {[{ v: false, l: "Net" }, { v: true, l: "Gross" }].map(({ v, l }, i) => (
                      <button key={l} onClick={() => setSkinsGross(v)} style={{
                        padding: "6px 16px", border: "none",
                        background: skinsGross === v ? sc.green : "#fff",
                        color: skinsGross === v ? "#fff" : sc.ink,
                        fontWeight: 600, fontSize: 13, cursor: "pointer",
                        borderRight: i === 0 ? `1px solid ${sc.border}` : "none",
                        fontFamily: "inherit",
                      }}>{l}</button>
                    ))}
                  </div>
                </div>

                {/* Type: Per Skin | Pot | TV Skins */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, color: sc.muted, minWidth: 80 }}>Type</span>
                  <div style={{ display: "flex", border: `1px solid ${sc.green}`, borderRadius: 8, overflow: "hidden" }}>
                    {[
                      { v: "value", l: "Per Skin" },
                      { v: "pot", l: "Pot" },
                      { v: "tvskins", l: "TV Skins" },
                    ].map(({ v, l }, i) => (
                      <button key={v} onClick={() => setSkinsType(v)} style={{
                        padding: "6px 12px", border: "none",
                        background: skinsType === v ? sc.green : "#fff",
                        color: skinsType === v ? "#fff" : sc.ink,
                        fontWeight: 600, fontSize: 12, cursor: "pointer",
                        borderRight: i < 2 ? `1px solid ${sc.border}` : "none",
                        fontFamily: "inherit",
                      }}>{l}</button>
                    ))}
                  </div>
                </div>

                {/* PER SKIN options */}
                {skinsType === "value" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <AmountInput
                      label="$ per skin"
                      value={skinValueAmount}
                      onChange={e => setSkinValueAmount(Number(e.target.value || 0))}
                    />
                    <Toggle
                      checked={skinCarryover}
                      onChange={setSkinCarryover}
                      label="Carryover ties"
                      sublabel="Tied hole carries value to next hole"
                    />
                    <Toggle
                      checked={skinBirdie}
                      onChange={setSkinBirdie}
                      label="Birdie doubles"
                      sublabel="Birdie wins double the hole value"
                    />
                    {skinBirdie && (
                      <div style={{ paddingLeft: 56 }}>
                        <div style={{ display: "flex", border: `1px solid ${sc.green}`, borderRadius: 8, overflow: "hidden", width: "fit-content" }}>
                          {[
                            { v: false, l: "Hole only" },
                            { v: true, l: "+ Carryovers" },
                          ].map(({ v, l }, i) => (
                            <button key={l} onClick={() => setSkinBirdieDoubleCarryover(v)} style={{
                              padding: "6px 14px", border: "none",
                              background: skinBirdieDoubleCarryover === v ? sc.green : "#fff",
                              color: skinBirdieDoubleCarryover === v ? "#fff" : sc.ink,
                              fontWeight: 600, fontSize: 12, cursor: "pointer",
                              borderRight: i === 0 ? `1px solid ${sc.border}` : "none",
                              fontFamily: "inherit",
                            }}>{l}</button>
                          ))}
                        </div>
                        <div style={{ fontSize: 11, color: sc.muted, marginTop: 4 }}>
                          {skinBirdieDoubleCarryover
                            ? "Double the hole value including all carryovers"
                            : "Double the base skin value only"}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* POT options — Equal split only */}
                {skinsType === "pot" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <AmountInput
                      label="$ per player"
                      value={potDonation}
                      onChange={e => setPotDonation(Number(e.target.value || 0))}
                    />
                    <div style={{ fontSize: 12, color: sc.muted }}>
                      Total pot: ${(Number(potDonation) || 0) * (players.length || 0)} · divided equally by skins won
                    </div>
                  </div>
                )}

                {/* TV SKINS options */}
                {skinsType === "tvskins" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <AmountInput
                      label="$ base unit"
                      value={potBaseUnit}
                      min={0.5}
                      step={0.5}
                      onChange={e => setPotBaseUnit(Number(e.target.value || 0))}
                    />
                    <div style={{ fontSize: 12, color: sc.muted, background: sc.greenLight, padding: "8px 10px", borderRadius: 8 }}>
                      Front 6: ${potBaseUnit}/hole · Mid 6: ${(Number(potBaseUnit) * 2)}/hole · Back 6: ${(Number(potBaseUnit) * 3)}/hole
                      <br/>Each player antes: ${(Number(potBaseUnit) * 36) || 0} · Carryover built in
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── TEAM GAME SELECTOR ── */}
      {enableTeamGame && (
        <Card>
          <SectionLabel>Team Assignments</SectionLabel>
          <div style={{ fontSize: 12, color: sc.muted, marginBottom: 10, lineHeight: 1.5 }}>
            Each game covers any number of holes — just make sure they add up to 18. Most common formats below, or build your own.
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <OutlineButton onClick={() => applyPreset("6-6-6")}>6 / 6 / 6</OutlineButton>
            <OutlineButton onClick={() => applyPreset("9-9")}>9 / 9</OutlineButton>
            <OutlineButton onClick={() => setTeamGames(prev => [...prev, createDefaultTeamGame(prev.length + 1)])}>
              + Custom
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

          {/* Handicap Distribution — only for 6/6/6 */}
          {teamGames.length === 3 && teamGames.every(g => Number(g.holes) === 6) && (
            <div style={{ marginBottom: 14, padding: "12px 14px", background: "#fafafa", border: "1px solid #d1d5db", borderRadius: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 4 }}>
                Handicap Distribution
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
                Spread strokes evenly across each 6-hole game — avoids one game being unfairly weighted (COD format).
              </div>
              <div style={{ display: "flex", border: "1px solid #1a5c35", borderRadius: 8, overflow: "hidden" }}>
                {[
                  { v: "standard", l: "Standard" },
                  { v: "spread", l: "Spread (2/2/2)" },
                ].map(({ v, l }, i) => (
                  <button key={v} onClick={() => setHandicapDistribution(v)} style={{
                    flex: 1, padding: "8px 12px", border: "none",
                    background: handicapDistribution === v ? "#1a5c35" : "#fff",
                    color: handicapDistribution === v ? "#fff" : "#1a1a1a",
                    fontWeight: 600, fontSize: 13, cursor: "pointer",
                    borderRight: i === 0 ? "1px solid #d1d5db" : "none",
                    fontFamily: "inherit",
                  }}>{l}</button>
                ))}
              </div>
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
      <CourseCard
        course={course}
        updateCourseName={updateCourseName}
        updateCoursePar={updateCoursePar}
        updateCourseHcp={updateCourseHcp}
        saveCourseToLibrary={saveCourseToLibrary}
        searchCourses={searchCourses}
        players={players}
        sc={sc}
      />

      {/* ── SAVED ROUNDS ── */}
      <Card>
        <SectionLabel>Saved Rounds</SectionLabel>
        <div style={{ fontSize: 12, color: sc.muted, marginBottom: 10 }}>
          Save your group setup to reuse next time. <span style={{ color: sc.gold }}>Coming soon: load a previous round without the scores.</span>
        </div>
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
