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

function CourseCard({ course, updateCourseName, updateCoursePar, updateCourseHcp, saveCourseToLibrary, searchCourses, checkCourseExists, updateCourseInLibrary, deleteCourseFromLibrary, deviceId, players, sc, roundName, setRoundName }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saveStatus, setSaveStatus] = useState(""); // "" | "saving" | "saved" | "error"
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveCity, setSaveCity] = useState("");
  const [saveState, setSaveState] = useState("");
  const [duplicateCourse, setDuplicateCourse] = useState(null); // existing course with same name
  const [loadedCourse, setLoadedCourse] = useState(null); // course loaded from library
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [updatePin, setUpdatePin] = useState("");
  const [updateStatus, setUpdateStatus] = useState(""); // "" | "saving" | "saved" | "error" | "pin"
  const searchTimer = useRef(null);
  const inputRef = useRef(null);

  // Auto-open search if no course loaded yet
  useEffect(() => {
    if (!course.name || course.name === "Westwood") {
      handleSearch("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Get Player 1 name for "Saved by"
  const savedBy = players?.[0]?.name && players[0].name !== "P1" ? players[0].name : "Anonymous";

  function handleSearch(q) {
    const capped = q.replace(/(?:^|\s)\S/g, c => c.toUpperCase());
    setSearchQuery(capped);
    updateCourseName(capped);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchCourses(q || "%");
        setSearchResults(results);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, q.length === 0 ? 100 : 400);
  }


  function loadCourse(c) {
    updateCourseName(c.name);
    c.pars.forEach((par, i) => updateCoursePar(i, par));
    c.hcp.forEach((hcp, i) => updateCourseHcp(i, hcp));
    setSearchResults([]);
    setSearchQuery(c.name);
    setLoadedCourse(c);
    setDuplicateCourse(null);
    // Auto-suggest round name if not already set
    if (typeof setRoundName === "function") {
      const today = new Date();
      const monthDay = today.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const suggested = `${monthDay} - ${c.name}`;
      // Only auto-set if round name is empty or was previously auto-generated
      setRoundName(prev => (!prev || prev.match(/^[A-Z][a-z]+ \d+ - /)) ? suggested : prev);
    }
  }

  async function handleUpdate(adminPin) {
    if (!loadedCourse?.id) return;
    setUpdateStatus("saving");
    try {
      await updateCourseInLibrary(loadedCourse.id, { ...course }, deviceId, adminPin || "");
      setUpdateStatus("saved");
      setShowUpdateConfirm(false);
      setUpdatePin("");
      setTimeout(() => setUpdateStatus(""), 3000);
    } catch (e) {
      if (e.message === "not_owner") {
        setUpdateStatus("pin");
      } else {
        setUpdateStatus("error");
        setTimeout(() => setUpdateStatus(""), 3000);
      }
    }
  }

  async function handleSave() {
    if (!course.name || !saveCity.trim() || !saveState.trim()) return;
    setSaveStatus("saving");
    try {
      const existing = await checkCourseExists(course.name);
      if (existing) {
        setDuplicateCourse(existing);
        setShowSaveForm(false);
        setSaveStatus("");
        return;
      }
      await saveCourseToLibrary({ ...course, city: saveCity.trim(), state: saveState.trim() }, savedBy);
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

      {/* Prompt when no course loaded */}
      {!loadedCourse && !course.name && (
        <div style={{ marginBottom: 10, padding: "10px 12px", background: "#fef9c3", border: "1px solid #f59e0b", borderRadius: 8, fontSize: 13, color: "#92400e", fontWeight: 600 }}>
          ⛳ Select a course from the library below to get started
        </div>
      )}

      {/* Search / name input */}
      <div style={{ marginBottom: 8, position: "relative" }}>
        <label style={{ fontSize: 13, color: sc.muted, display: "block", marginBottom: 6 }}>
          Course name — search library or type new
        </label>
        <input
          ref={inputRef}
          type="text"
          value={searchQuery || course.name || ""}
          onFocus={(e) => { e.target.select(); if (course.name) setSearchQuery(course.name); handleSearch(searchQuery || course.name || ""); }}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search courses or type a name…"
          style={{ width: "100%", fontSize: 15, fontWeight: 600, padding: "9px 12px", border: `1px solid ${loadedCourse ? sc.green : sc.border}`, borderRadius: 8, boxSizing: "border-box", fontFamily: "inherit" }}
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

      {!loadedCourse && <CourseEditor course={course} onParChange={updateCoursePar} onHcpChange={updateCourseHcp} />}

      {/* Duplicate course warning */}
      {duplicateCourse && (
        <div style={{ marginTop: 12, padding: 12, background: "#fffbeb", border: "1px solid #f59e0b", borderRadius: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#92400e", marginBottom: 6 }}>
            ⚠️ "{duplicateCourse.name}" already exists in the library
          </div>
          <div style={{ fontSize: 12, color: "#92400e", marginBottom: 10 }}>
            {duplicateCourse.city}{duplicateCourse.state ? `, ${duplicateCourse.state}` : ""}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { loadCourse(duplicateCourse); setDuplicateCourse(null); }} style={{
              flex: 1, padding: "7px 12px", fontSize: 13, fontWeight: 600,
              background: sc.green, color: "#fff", border: "none", borderRadius: 6,
              cursor: "pointer", fontFamily: "inherit",
            }}>Load existing</button>
            <button onClick={() => setDuplicateCourse(null)} style={{
              padding: "7px 12px", fontSize: 13, background: "transparent",
              color: sc.muted, border: `1px solid ${sc.border}`, borderRadius: 6,
              cursor: "pointer", fontFamily: "inherit",
            }}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Update loaded course */}
      {loadedCourse && (
        <div style={{ marginTop: 12 }}>
          {updateStatus === "saved" ? (
            <div style={{ fontSize: 13, color: sc.green, fontWeight: 600 }}>✓ Course updated in library</div>
          ) : updateStatus === "error" ? (
            <div style={{ fontSize: 13, color: "#b3261e" }}>Update failed — try again</div>
          ) : updateStatus === "pin" || showUpdateConfirm ? (
            <div style={{ padding: 12, background: "#f9fafb", border: `1px solid ${sc.border}`, borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: sc.ink, marginBottom: 8 }}>
                {updateStatus === "pin" ? "Admin PIN required to update this course" : `Update "${loadedCourse.name}" in the shared library?`}
              </div>
              {updateStatus === "pin" && (
                <input
                  type="password"
                  value={updatePin}
                  onChange={e => setUpdatePin(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleUpdate(updatePin)}
                  placeholder="Admin PIN"
                  inputMode="numeric"
                  style={{ width: "100%", fontSize: 15, padding: "8px 12px", border: `1px solid ${sc.border}`, borderRadius: 6, boxSizing: "border-box", fontFamily: "inherit", marginBottom: 8 }}
                />
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handleUpdate(updateStatus === "pin" ? updatePin : "")} disabled={updateStatus === "saving"} style={{
                  flex: 1, padding: "8px 12px", fontSize: 13, fontWeight: 700,
                  background: sc.green, color: "#fff", border: "none", borderRadius: 6,
                  cursor: "pointer", fontFamily: "inherit",
                }}>{updateStatus === "saving" ? "Saving…" : "Confirm Update"}</button>
                <button onClick={() => { setShowUpdateConfirm(false); setUpdateStatus(""); setUpdatePin(""); }} style={{
                  padding: "8px 12px", fontSize: 13, background: "transparent",
                  color: sc.muted, border: `1px solid ${sc.border}`, borderRadius: 6,
                  cursor: "pointer", fontFamily: "inherit",
                }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowUpdateConfirm(true)} style={{
              marginBottom: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600,
              background: "#fff", color: sc.gold, border: `1px solid ${sc.gold}`,
              borderRadius: 8, cursor: "pointer", fontFamily: "inherit", width: "100%",
            }}>✏️ Update "{loadedCourse.name}" in library</button>
          )}
          {loadedCourse && (
            <button onClick={async () => {
              const pin = window.prompt("Admin PIN to delete this course:");
              if (!pin) return;
              if (!window.confirm(`Delete "${loadedCourse.name}" from the library? This cannot be undone.`)) return;
              try {
                const deletedName = loadedCourse.name;
                await deleteCourseFromLibrary(loadedCourse.id, deviceId, pin);
                setLoadedCourse(null);
                updateCourseName("");
                setSearchQuery("");
                const results = await searchCourses("%");
                setSearchResults(results || []);
                window.alert(`"${deletedName}" deleted.`);
              } catch (e) {
                window.alert(e.message === "not_owner" ? "You don't have permission to delete this course." : "Delete failed.");
              }
            }} style={{
              marginBottom: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600,
              background: "#fff", color: "#b3261e", border: "1px solid #b3261e",
              borderRadius: 8, cursor: "pointer", fontFamily: "inherit", width: "100%",
            }}>🗑️ Delete "{loadedCourse.name}" from library</button>
          )}
        </div>
      )}

      {/* Save to library */}
      {saveStatus === "saved" ? (
        <div style={{ marginTop: 12, fontSize: 13, color: sc.green, fontWeight: 600 }}>✓ Saved to course library</div>
      ) : saveStatus === "error" ? (
        <div style={{ marginTop: 12, fontSize: 13, color: "#b3261e" }}>Save failed — try again</div>
      ) : showSaveForm ? (
        <div style={{ marginTop: 12, padding: 12, background: "#f9fafb", border: `1px solid ${sc.border}`, borderRadius: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: sc.ink }}>Save to shared library</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              type="text"
              value={saveCity}
              onChange={e => setSaveCity(e.target.value)}
              placeholder="City *"
              style={{ flex: 1, fontSize: 13, padding: "8px 10px", border: `1px solid ${sc.border}`, borderRadius: 6, fontFamily: "inherit" }}
            />
            <input
              type="text"
              value={saveState}
              onChange={e => setSaveState(e.target.value.toUpperCase())}
              placeholder="ST *"
              maxLength={2}
              style={{ width: 50, fontSize: 13, padding: "8px 10px", border: `1px solid ${sc.border}`, borderRadius: 6, fontFamily: "inherit", textTransform: "uppercase" }}
            />
          </div>
          <div style={{ fontSize: 11, color: sc.muted, marginBottom: 8 }}>Saved by: {savedBy}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleSave}
              disabled={!saveCity.trim() || !saveState.trim() || saveStatus === "saving"}
              style={{ flex: 1, padding: "8px 12px", fontSize: 13, fontWeight: 700, background: sc.green, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", opacity: (!saveCity.trim() || !saveState.trim()) ? 0.5 : 1 }}
            >
              {saveStatus === "saving" ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setShowSaveForm(false)}
              style={{ padding: "8px 12px", fontSize: 13, background: "transparent", color: sc.muted, border: `1px solid ${sc.border}`, borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowSaveForm(true)}
          disabled={!course.name}
          style={{
            marginTop: 12, padding: "9px 16px", fontSize: 13, fontWeight: 600,
            background: "#fff", color: sc.muted,
            border: `1px solid ${sc.border}`,
            borderRadius: 8, cursor: course.name ? "pointer" : "not-allowed",
            fontFamily: "inherit",
          }}
        >
          💾 Save course to shared library
        </button>
      )}
      <div style={{ fontSize: 11, color: sc.muted, marginTop: 4 }}>
        Once saved, anyone can search and load this course.
      </div>
    </Card>
  );
}

function GroupTemplatesCard({ myTemplates, templateStatus, onSaveTemplate, onLoadTemplate, onDeleteTemplate, onToggleTemplateVisibility, onUpdateTemplate, onSearchTemplates, onLoadMyTemplates, sc }) {
  const [view, setView] = useState("mine"); // "mine" | "search"
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmUpdateId, setConfirmUpdateId] = useState(null);
  const searchTimer = useRef(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  function handleOpen() {
    if (!hasLoaded) {
      onLoadMyTemplates?.();
      setHasLoaded(true);
    }
  }

  function handleSearch(q) {
    setSearchQuery(q);
    clearTimeout(searchTimer.current);
    if (q.length < 1) {
      // Load all public templates when field is empty
      searchTimer.current = setTimeout(async () => {
        setSearching(true);
        try {
          const results = await onSearchTemplates("%");
          setSearchResults(results);
        } catch(e) {
          console.error("Template search error:", e);
          setSearchResults([]);
        }
        finally { setSearching(false); }
      }, 200);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await onSearchTemplates(q);
        setSearchResults(results);
      } catch(e) {
        console.error("Template search error:", e);
        setSearchResults([]);
      }
      finally { setSearching(false); }
    }, 400);
  }

  async function handleSave() {
    if (!templateName.trim()) return;
    await onSaveTemplate?.(templateName, isPublic);
    setTemplateName("");
    setShowSaveForm(false);
    onLoadMyTemplates?.();
  }

  return (
    <Card>
      <SectionLabel>Group Templates</SectionLabel>
      <div style={{ fontSize: 12, color: sc.muted, marginBottom: 12 }}>
        Save your players, handicaps, and game format to reuse next round.
      </div>

      {/* Tab toggle */}
      <div style={{ display: "flex", border: `1px solid ${sc.green}`, borderRadius: 8, overflow: "hidden", marginBottom: 14 }}>
        {[{ v: "mine", l: "My Templates" }, { v: "search", l: "Search Public" }].map(({ v, l }, i) => (
          <button key={v} onClick={() => {
            setView(v);
            if (v === "mine" && !hasLoaded) handleOpen();
            if (v === "search" && searchResults.length === 0) handleSearch("");
          }} style={{
            flex: 1, padding: "8px", border: "none",
            background: view === v ? sc.green : "#fff",
            color: view === v ? "#fff" : sc.ink,
            fontWeight: 600, fontSize: 13, cursor: "pointer",
            borderRight: i === 0 ? `1px solid ${sc.border}` : "none",
            fontFamily: "inherit",
          }}>{l}</button>
        ))}
      </div>

      {/* My Templates */}
      {view === "mine" && (
        <div>
          {myTemplates.length === 0 ? (
            <div style={{ fontSize: 13, color: sc.muted, padding: "10px 0", textAlign: "center" }}>
              No saved templates yet — save your first one below.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {myTemplates.map(t => (
                <div key={t.id} style={{
                  border: `1px solid ${sc.border}`, borderRadius: 10, padding: "10px 12px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: sc.ink }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: sc.muted, marginTop: 2 }}>
                      {(t.players || []).filter(p => p.name && p.name !== `P${(t.players||[]).indexOf(p)+1}`).map(p => p.name).join(", ") || "No players"}
                      {t.is_public ? " · 🌐 Public" : " · 🔒 Private"}
                      {t.use_count > 0 ? ` · used ${t.use_count}×` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button onClick={() => onLoadTemplate?.(t)} style={{
                      padding: "6px 12px", fontSize: 12, fontWeight: 600,
                      background: sc.green, color: "#fff", border: "none",
                      borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                    }}>Load</button>
                    {confirmUpdateId === t.id ? (
                      <>
                        <button onClick={() => { onUpdateTemplate?.(t); setConfirmUpdateId(null); }} style={{
                          padding: "6px 10px", fontSize: 12, fontWeight: 600,
                          background: sc.gold, color: "#fff", border: "none",
                          borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                        }}>Confirm?</button>
                        <button onClick={() => setConfirmUpdateId(null)} style={{
                          padding: "6px 10px", fontSize: 12, background: "transparent",
                          color: sc.muted, border: `1px solid ${sc.border}`,
                          borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                        }}>Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmUpdateId(t.id)} title="Overwrite with current setup" style={{
                        padding: "6px 10px", fontSize: 12, fontWeight: 600,
                        background: "transparent", color: sc.gold,
                        border: `1px solid ${sc.gold}`,
                        borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                      }}>Update</button>
                    )}
                    <button
                      onClick={() => onToggleTemplateVisibility?.(t)}
                      title={t.is_public ? "Make private" : "Make public"}
                      style={{
                        padding: "6px 10px", fontSize: 13, background: "transparent",
                        border: `1px solid ${sc.border}`, borderRadius: 6,
                        cursor: "pointer", fontFamily: "inherit", lineHeight: 1,
                      }}
                    >{t.is_public ? "🌐" : "🔒"}</button>
                    {confirmDeleteId === t.id ? (
                      <>
                        <button onClick={() => { onDeleteTemplate?.(t.id); setConfirmDeleteId(null); }} style={{
                          padding: "6px 10px", fontSize: 12, fontWeight: 600,
                          background: "#b3261e", color: "#fff", border: "none",
                          borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                        }}>Delete?</button>
                        <button onClick={() => setConfirmDeleteId(null)} style={{
                          padding: "6px 10px", fontSize: 12, background: "transparent",
                          color: sc.muted, border: `1px solid ${sc.border}`,
                          borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                        }}>Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmDeleteId(t.id)} style={{
                        padding: "6px 10px", fontSize: 12, background: "transparent",
                        color: "#b3261e", border: "1px solid #b3261e",
                        borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                      }}>✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Save form */}
          {showSaveForm ? (
            <div style={{ padding: 12, background: "#f9fafb", border: `1px solid ${sc.border}`, borderRadius: 8, marginTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: sc.ink }}>Save current setup as template</div>
              <input
                type="text"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder="Template name (e.g. Tuesday Crew)"
                style={{ width: "100%", fontSize: 14, padding: "9px 12px", border: `1px solid ${sc.border}`, borderRadius: 8, boxSizing: "border-box", fontFamily: "inherit", marginBottom: 10 }}
              />
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 12, fontSize: 13, color: sc.muted }}>
                <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: sc.green }} />
                Make public — anyone can search and load this template
              </label>
              {templateStatus === "saved" && <div style={{ fontSize: 13, color: sc.green, fontWeight: 600, marginBottom: 8 }}>✓ Template saved!</div>}
              {templateStatus === "error" && <div style={{ fontSize: 13, color: "#b3261e", marginBottom: 8 }}>Save failed — try again</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleSave} disabled={!templateName.trim() || templateStatus === "saving"} style={{
                  flex: 1, padding: "9px 12px", fontSize: 13, fontWeight: 700,
                  background: sc.green, color: "#fff", border: "none",
                  borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                  opacity: !templateName.trim() ? 0.5 : 1,
                }}>{templateStatus === "saving" ? "Saving…" : "Save Template"}</button>
                <button onClick={() => setShowSaveForm(false)} style={{
                  padding: "9px 12px", fontSize: 13, background: "transparent",
                  color: sc.muted, border: `1px solid ${sc.border}`,
                  borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowSaveForm(true)} style={{
              width: "100%", marginTop: 4, padding: "10px 16px", fontSize: 13, fontWeight: 600,
              background: "#fff", color: sc.green, border: `1px solid ${sc.green}`,
              borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
            }}>💾 Save Current Setup as Template</button>
          )}
        </div>
      )}

      {/* Search Public */}
      {view === "search" && (
        <div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search public templates…"
            style={{ width: "100%", fontSize: 14, padding: "9px 12px", border: `1px solid ${sc.border}`, borderRadius: 8, boxSizing: "border-box", fontFamily: "inherit", marginBottom: 4 }}
          />
          <div style={{ fontSize: 11, color: sc.muted, marginBottom: 8 }}>Load a template to apply it — then save your own copy under My Templates.</div>
          {searching && <div style={{ fontSize: 12, color: sc.muted, marginBottom: 8 }}>Searching…</div>}
          {searchResults.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {searchResults.map(t => (
                <div key={t.id} style={{
                  border: `1px solid ${sc.border}`, borderRadius: 10, padding: "10px 12px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: sc.ink }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: sc.muted, marginTop: 2 }}>
                      {(t.players || []).filter(p => p.name && p.name !== `P${(t.players||[]).indexOf(p)+1}`).map(p => p.name).join(", ") || "—"}
                      {t.use_count > 0 ? ` · used ${t.use_count}×` : ""}
                    </div>
                  </div>
                  <button onClick={() => { onLoadTemplate?.(t); setView("mine"); if (!hasLoaded) { onLoadMyTemplates?.(); setHasLoaded(true); } }} style={{
                    padding: "6px 12px", fontSize: 12, fontWeight: 600,
                    background: sc.green, color: "#fff", border: "none",
                    borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                  }}>Load</button>
                </div>
              ))}
            </div>
          ) : !searching ? (
            <div style={{ fontSize: 13, color: sc.muted, textAlign: "center", padding: "10px 0" }}>No public templates found.</div>
          ) : null}
        </div>
      )}
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
  enableTeamGame, setEnableTeamGame, teamGameFormat, setTeamGameFormat, teamMatchConfig, setTeamMatchConfig,
  teamGameUnitAmount, setTeamGameUnitAmount,
  pressTrigger, setPressTrigger,
  noPar3TeamGame, setNoPar3TeamGame, handicapDistribution, setHandicapDistribution, applyPreset, setTeamGames, teamGames,
  skinsEnabled, setSkinsEnabled, skinsType, setSkinsType,
  skinsGross, setSkinsGross, skinValueAmount, setSkinValueAmount,
  skinCarryover, setSkinCarryover, skinBirdie, setSkinBirdie,
  skinBirdieDoubleCarryover, setSkinBirdieDoubleCarryover,
  potType, setPotType, potDonation, setPotDonation, potBaseUnit, setPotBaseUnit,
  saveCourseToLibrary, searchCourses, checkCourseExists, updateCourseInLibrary, deleteCourseFromLibrary, deviceId,
  totalHoles, getTeamGameRange, hasDuplicateSelections, getTeamGameSelection,
  renderTeamSelectors, expandedGame, setExpandedGame, modeText,
  addMatch, addNinePointMatch, autoCreateMatches, matches, matchResults,
  birdieResults = [], updateMatch, removeMatch, startRound,
  createDefaultTeamGame, focusGameTarget, goToLive, goToResults,
  roundName, setRoundName,
  myTemplates = [], templateStatus = "", onSaveTemplate, onLoadTemplate, onDeleteTemplate, onToggleTemplateVisibility, onUpdateTemplate, onSearchTemplates, onLoadMyTemplates,
  loadedTemplate, setLoadedTemplate,
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

      {/* ── TEMPLATE FIRST FLOW ── */}
      {loadedTemplate ? (
        /* Ready to Start summary */
        <Card style={{ background: sc.greenLight, border: `1px solid #c3ddd0` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: sc.green, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Group Loaded</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: sc.ink }}>{loadedTemplate.name}</div>
            </div>
            <button onClick={() => setLoadedTemplate(null)} style={{
              padding: "6px 12px", fontSize: 12, background: "transparent",
              color: sc.muted, border: `1px solid ${sc.border}`, borderRadius: 6,
              cursor: "pointer", fontFamily: "inherit",
            }}>Edit</button>
          </div>

          {/* Summary */}
          <div style={{ fontSize: 13, color: sc.ink, display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
            {course?.name && (
              <div>⛳ {course.name}{course.city ? ` · ${course.city}` : ""}</div>
            )}
            <div>👥 {players.filter(p => p.name && !p.name.match(/^P\d+$/)).map(p => p.name).join(", ") || "No players set"}</div>
            {enableTeamGame && (
              <div>🏌️ Team Game · {
                { press: "Press", standard: "Net Holes", longshort: "Long/Short", match_fbt: "Match Play", stroke: "Stroke Play" }[teamGameFormat] || teamGameFormat
              } · ${teamGameUnitAmount}/bet</div>
            )}
            {matches.length > 0 && (
              <div>🎯 {matches.length} 1v1 match{matches.length > 1 ? "es" : ""}</div>
            )}
          </div>

          <PrimarySetupAction />

          <button onClick={() => { setLoadedTemplate(null); }} style={{
            width: "100%", marginTop: 8, padding: "9px", fontSize: 13,
            background: "transparent", color: sc.muted,
            border: `1px solid ${sc.border}`, borderRadius: 8,
            cursor: "pointer", fontFamily: "inherit",
          }}>Start Fresh instead</button>
        </Card>
      ) : (
        /* Template picker — show at top when no template loaded */
        <Card>
          <SectionLabel>Your Groups</SectionLabel>
          {myTemplates.length === 0 ? (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ fontSize: 14, color: sc.ink, fontWeight: 600, marginBottom: 6 }}>No saved groups yet</div>
              <div style={{ fontSize: 12, color: sc.muted, marginBottom: 12 }}>
                After setup, save your players and games as a group to start instantly next time.
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 }}>
              {myTemplates.map(t => (
                <button key={t.id} onClick={() => onLoadTemplate?.(t)} style={{
                  width: "100%", padding: "12px 14px", textAlign: "left",
                  border: `1px solid ${sc.border}`, borderRadius: 10,
                  background: "white", cursor: "pointer", fontFamily: "inherit",
                }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: sc.ink }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: sc.muted, marginTop: 3 }}>
                    {(t.players || []).filter(p => p.name && !p.name.match(/^P\d+$/)).map(p => p.name).join(", ") || "No players"}
                    {t.use_count > 0 ? ` · used ${t.use_count}×` : ""}
                  </div>
                </button>
              ))}
            </div>
          )}
          <div style={{ fontSize: 12, color: sc.muted, textAlign: "center", marginTop: 8 }}>
            ↓ Or fill in the details below to start fresh
          </div>
        </Card>
      )}

      {/* Hide full setup form when template is loaded (show only when editing or fresh) */}
      {!loadedTemplate && (<>

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

      {/* ── GAMES ── */}
      <Card>
        <SectionLabel>Games</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          <Toggle
            checked={enableTeamGame}
            onChange={setEnableTeamGame}
            label="Team Game"
            sublabel="Team vs team — press, match play, stroke and more"
          />

          {enableTeamGame && (() => {
            const betLabel = {
              press: "Bet per hole won",
              standard: "Bet per net hole won",
              longshort: "Long bet value",
              match_fbt: "Bet per segment",
              stroke: "Bet per stroke differential",
            }[teamGameFormat] || "Unit bet";

            return (
              <div style={{ paddingLeft: 56, display: "flex", flexDirection: "column", gap: 12 }}>
                <AmountInput
                  label={betLabel}
                  value={teamGameUnitAmount}
                  onChange={(e) => {
                    setTeamGameUnitAmount(e.target.value);
                    // Auto-sync birdie bet to match unit bet
                    if (!teamMatchConfig.teamBirdiesEnabled) {
                      setTeamMatchConfig(prev => ({ ...prev, teamBirdieBetAmount: Number(e.target.value) || 5 }));
                    }
                  }}
                />

                {/* Birdie side bet for team game */}
                <div style={{ borderTop: `1px solid ${sc.border}`, paddingTop: 12 }}>
                  <Toggle
                    checked={teamMatchConfig.teamBirdiesEnabled}
                    onChange={(val) => {
                      setTeamMatchConfig(prev => ({
                        ...prev,
                        teamBirdiesEnabled: val,
                        teamBirdieBetAmount: val ? (Number(teamGameUnitAmount) || 5) : prev.teamBirdieBetAmount,
                      }));
                    }}
                    label="Birdie Side Bet"
                    sublabel="Gross birdies pay out between teams"
                  />
                  {teamMatchConfig.teamBirdiesEnabled && (
                    <div style={{ paddingLeft: 56, marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                      <AmountInput
                        label="Birdie pays"
                        value={teamMatchConfig.teamBirdieBetAmount}
                        onChange={(e) => setTeamMatchConfig(prev => ({ ...prev, teamBirdieBetAmount: Number(e.target.value || 0) }))}
                      />
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                        <input type="checkbox" checked={!!teamMatchConfig.teamToyRule}
                          onChange={(e) => setTeamMatchConfig(prev => ({ ...prev, teamToyRule: e.target.checked }))}
                          style={{ width: 16, height: 16, accentColor: sc.green }} />
                        <span style={{ fontSize: 13, color: sc.muted }}>Toy Birdies — net birdie ties gross birdie</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* No par 3 strokes */}
                <div style={{ borderTop: `1px solid ${sc.border}`, paddingTop: 12 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={!!noPar3TeamGame} onChange={(e) => setNoPar3TeamGame(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: sc.green }} />
                    <span style={{ fontSize: 13, color: sc.muted }}>No handicap strokes on par 3s</span>
                  </label>
                </div>
              </div>
            );
          })()}

        </div>
      </Card>

      {/* ── SIDE BETS ── */}
      <Card>
        <SectionLabel>Side Bets</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* ── SKINS ── */}
          <Toggle
            checked={skinsEnabled}
            onChange={setSkinsEnabled}
            label="Skins"
            sublabel="Lowest score on a hole wins — open to all players"
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

              {/* POT options */}
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
      </Card>

      {/* ── TEAM GAME SELECTOR ── */}
      {enableTeamGame && (
        <Card>
          <SectionLabel>Team Assignments</SectionLabel>

          {/* Format selector */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: sc.muted, marginBottom: 6 }}>Team Game Format</div>
            <select
              value={teamGameFormat || "press"}
              onChange={(e) => {
                setTeamGameFormat(e.target.value);
                if (e.target.value === "press") {
                  setTeamGames([createDefaultTeamGame(1), createDefaultTeamGame(2), createDefaultTeamGame(3)]);
                } else {
                  setTeamGames([createDefaultTeamGame(1)]);
                }
              }}
              style={{ padding: "8px 10px", border: `1px solid ${sc.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", width: "100%" }}
            >
              <option value="press">Press (6/6/6 · 9/9 · Custom)</option>
              <option value="standard">Net Holes</option>
              <option value="longshort">Long / Short</option>
              <option value="match_fbt">Match Play (F/B/T)</option>
              <option value="stroke">Stroke Play</option>
            </select>
          </div>

          {(teamGameFormat === "press" || !teamGameFormat) && (<>
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

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: sc.ink, whiteSpace: "nowrap" }}>Press Rules</span>
            <div style={{ display: "flex", border: `1px solid ${sc.green}`, borderRadius: 8, overflow: "hidden" }}>
              {[{ n: 1, l: "1 Downs" }, { n: 2, l: "2 Downs" }].map(({ n, l }, i) => (
                <button key={n} onClick={() => {
                  setPressTrigger(n);
                  setTeamGames(prev => prev.map(g => ({ ...g, pressTrigger: n })));
                }} style={{
                  padding: "7px 14px", border: "none",
                  background: Number(pressTrigger) === n ? sc.green : "#fff",
                  color: Number(pressTrigger) === n ? "#fff" : sc.ink,
                  fontWeight: 600, fontSize: 13, cursor: "pointer",
                  borderRight: i === 0 ? `1px solid ${sc.border}` : "none",
                  whiteSpace: "nowrap",
                }}>{l}</button>
              ))}
            </div>
            <span style={{ fontSize: 12, color: sc.muted }}>Auto Presses</span>
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
                {handicapDistribution === "spread"
                  ? "Spread strokes evenly across each 6-hole game — avoids one game being unfairly weighted (COD format)."
                  : "Handicap strokes applied in rank order across all 18 holes — strokes fall where they fall on the scorecard."}
              </div>
              <div style={{ display: "flex", border: "1px solid #1a5c35", borderRadius: 8, overflow: "hidden" }}>
                {[
                  { v: "standard", l: "Standard" },
                  { v: "spread", l: "Spread" },
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
          </>)}

          {/* Non-press formats: single team pairing + format options */}
          {teamGameFormat && teamGameFormat !== "press" && (
            <div>
              <div style={{ fontSize: 12, color: sc.muted, marginBottom: 10 }}>
                Whole round · 18 holes · one team matchup
              </div>
              {renderTeamSelectors(0)}

              {/* Match Play options */}
              {teamGameFormat === "match_fbt" && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Segments</div>
                  {[
                    { key: "matchPlayFront", label: "Front 9" },
                    { key: "matchPlayBack", label: "Back 9" },
                    { key: "matchPlayTotal", label: "Total 18" },
                  ].map(({ key, label }) => (
                    <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 13 }}>
                      <input type="checkbox" checked={!!teamMatchConfig[key]}
                        onChange={(e) => setTeamMatchConfig(prev => ({ ...prev, [key]: e.target.checked }))} />
                      {label}
                    </label>
                  ))}
                </div>
              )}

              {/* Stroke Play options */}
              {teamGameFormat === "stroke" && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Stroke Options</div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 13 }}>
                    <input type="checkbox" checked={!!teamMatchConfig.strokeCombined}
                      onChange={(e) => setTeamMatchConfig(prev => ({ ...prev, strokeCombined: e.target.checked }))} />
                    Combined score (sum both players) vs Low Net (best ball)
                  </label>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Scoring</div>
                  <select value={teamMatchConfig.strokeScoring || "net"}
                    onChange={(e) => setTeamMatchConfig(prev => ({ ...prev, strokeScoring: e.target.value }))}
                    style={{ padding: "6px 8px", border: `1px solid ${sc.border}`, borderRadius: 6, fontSize: 13, fontFamily: "inherit", marginBottom: 8 }}>
                    <option value="net">Net</option>
                    <option value="gross">Gross</option>
                  </select>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Payout</div>
                  <select value={teamMatchConfig.strokePayoutMode || "winloss"}
                    onChange={(e) => setTeamMatchConfig(prev => ({ ...prev, strokePayoutMode: e.target.value }))}
                    style={{ padding: "6px 8px", border: `1px solid ${sc.border}`, borderRadius: 6, fontSize: 13, fontFamily: "inherit", marginBottom: 8 }}>
                    <option value="winloss">Win / Loss</option>
                    <option value="differential">By Stroke Differential</option>
                  </select>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Segments</div>
                  {[
                    { key: "strokeFront", label: "Front 9" },
                    { key: "strokeBack", label: "Back 9" },
                    { key: "strokeTotal", label: "Total 18" },
                  ].map(({ key, label }) => (
                    <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 13 }}>
                      <input type="checkbox" checked={!!teamMatchConfig[key]}
                        onChange={(e) => setTeamMatchConfig(prev => ({ ...prev, [key]: e.target.checked }))} />
                      {label}
                    </label>
                  ))}
                </div>
              )}
              <PrimarySetupAction />
            </div>
          )}
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

      {/* ── SAVE AS GROUP ── */}
      <GroupTemplatesCard
        myTemplates={myTemplates}
        templateStatus={templateStatus}
        onSaveTemplate={onSaveTemplate}
        onLoadTemplate={(t) => { onLoadTemplate?.(t); }}
        onDeleteTemplate={onDeleteTemplate}
        onToggleTemplateVisibility={onToggleTemplateVisibility}
        onUpdateTemplate={onUpdateTemplate}
        onSearchTemplates={onSearchTemplates}
        onLoadMyTemplates={onLoadMyTemplates}
        sc={sc}
      />

      {/* ── COURSE ── */}
      <CourseCard
        course={course}
        updateCourseName={updateCourseName}
        updateCoursePar={updateCoursePar}
        updateCourseHcp={updateCourseHcp}
        saveCourseToLibrary={saveCourseToLibrary}
        checkCourseExists={checkCourseExists}
        updateCourseInLibrary={updateCourseInLibrary}
        deleteCourseFromLibrary={deleteCourseFromLibrary}
        deviceId={deviceId}
        searchCourses={searchCourses}
        players={players}
        sc={sc}
        roundName={roundName}
        setRoundName={setRoundName}
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

      </>)} {/* end !loadedTemplate */}

    </div>
  );
}
