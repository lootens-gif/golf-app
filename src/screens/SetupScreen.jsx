import PlayerSetupPanel from "../components/PlayerSetupPanel";
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

function AmountInput({ label, value, onChange, disabled, min = 0, step = 1, inputRef }) {
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
          ref={inputRef}
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

function CourseCard({ course, updateCourseName, updateCoursePar, updateCourseHcp, saveCourseToLibrary, searchCourses, checkCourseExists, updateCourseInLibrary, deleteCourseFromLibrary, incrementCourseUse, deviceId, players, sc, roundName, setRoundName, roundInProgress }) {
  const [allCourses, setAllCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState("recent"); // "recent" | "az" | "state"
  const [saveStatus, setSaveStatus] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveCity, setSaveCity] = useState("");
  const [saveState, setSaveState] = useState("");
  const [duplicateCourse, setDuplicateCourse] = useState(null);
  const [loadedCourse, setLoadedCourse] = useState(null);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [updatePin, setUpdatePin] = useState("");
  const [updateStatus, setUpdateStatus] = useState("");
  const [showList, setShowList] = useState(false);
  const [courseMode, setCourseMode] = useState("list"); // "list" | "add" | "edit"
  const [editPars, setEditPars] = useState(Array(18).fill(4));
  const [editHcps, setEditHcps] = useState(Array(18).fill(0));
  const [editName, setEditName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editSaveStatus, setEditSaveStatus] = useState("");

  const savedBy = players?.[0]?.name && players[0].name !== "P1" ? players[0].name : "Anonymous";

  // Load all courses once on mount
  useEffect(() => {
    searchCourses("%").then(r => setAllCourses(r || [])).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredCourses = allCourses.filter(c =>
    !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.city || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.state || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [sortDir, setSortDir] = useState("asc"); // "asc" | "desc"

  function handleSortMode(mode) {
    if (sortMode === mode) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortMode(mode);
      setSortDir("asc");
    }
  }

  const sortedCourses = [...filteredCourses].sort((a, b) => {
    let cmp = 0;
    if (sortMode === "az") cmp = a.name.localeCompare(b.name);
    else if (sortMode === "state") cmp = (a.state || "").localeCompare(b.state || "") || a.name.localeCompare(b.name);
    else cmp = (b.use_count || 0) - (a.use_count || 0); // recent: high use_count first
    return sortDir === "asc" ? cmp : -cmp;
  });

  function loadCourse(c) {
    updateCourseName(c.name);
    c.pars.forEach((par, i) => updateCoursePar(i, par));
    c.hcp.forEach((hcp, i) => updateCourseHcp(i, hcp));
    setLoadedCourse(c);
    setDuplicateCourse(null);
    setShowList(false);
    setSearchQuery("");
    if (c.id && typeof incrementCourseUse === "function") {
      incrementCourseUse(c.id).catch(() => {});
      // Optimistically bump local list so Recent sort reflects it immediately
      setAllCourses(prev => prev.map(course => course.id === c.id ? { ...course, use_count: (course.use_count || 0) + 1 } : course));
    }
    if (typeof setRoundName === "function") {
      const today = new Date();
      const monthDay = today.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const suggested = `${monthDay} - ${c.name}`;
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
      if (e.message === "not_owner") { setUpdateStatus("pin"); }
      else { setUpdateStatus("error"); setTimeout(() => setUpdateStatus(""), 3000); }
    }
  }

  async function handleSave() {
    if (!course.name || !saveCity.trim() || !saveState.trim()) return;
    setSaveStatus("saving");
    try {
      const existing = await checkCourseExists(course.name);
      if (existing) { setDuplicateCourse(existing); setShowSaveForm(false); setSaveStatus(""); return; }
      await saveCourseToLibrary({ ...course, city: saveCity.trim(), state: saveState.trim() }, savedBy);
      setSaveStatus("saved");
      // Refresh list
      searchCourses("%").then(r => setAllCourses(r || [])).catch(() => {});
      setTimeout(() => setSaveStatus(""), 3000);
    } catch { setSaveStatus("error"); setTimeout(() => setSaveStatus(""), 3000); }
  }

  const SortBtn = ({ mode, label }) => {
    const active = sortMode === mode;
    const arrow = active ? (sortDir === "asc" ? " ↑" : " ↓") : "";
    return (
      <button onClick={() => handleSortMode(mode)} style={{
        flex: 1, fontSize: 13, padding: "7px 0", borderRadius: 8,
        border: active ? `1px solid ${sc.green}` : `1px solid ${sc.border}`,
        background: active ? "#f0fdf4" : "#fff",
        color: active ? sc.green : sc.muted,
        cursor: "pointer", fontFamily: "inherit", fontWeight: active ? 600 : 400,
      }}>{label}{arrow}</button>
    );
  };

  return (
    <Card>
      <SectionLabel>Course Setup</SectionLabel>

      {/* ADD NEW or EDIT EXISTING course grid */}
      {(courseMode === "add" || courseMode === "edit") && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: sc.green, marginBottom: 10 }}>
            {courseMode === "add" ? "Add New Course" : `Edit: ${editName}`}
          </div>

          {/* Course name */}
          <input
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            placeholder="Course Name *"
            style={{ width: "100%", fontSize: 14, padding: "8px 10px", border: `1px solid ${sc.border}`, borderRadius: 6, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 10 }}
          />

          {/* City / State */}
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input type="text" value={editCity} onChange={e => setEditCity(e.target.value)} placeholder="City *"
              style={{ flex: 1, fontSize: 13, padding: "8px 10px", border: `1px solid ${sc.border}`, borderRadius: 6, fontFamily: "inherit" }} />
            <input type="text" value={editState} onChange={e => setEditState(e.target.value.toUpperCase())} placeholder="ST *" maxLength={2}
              style={{ width: 50, fontSize: 13, padding: "8px 10px", border: `1px solid ${sc.border}`, borderRadius: 6, fontFamily: "inherit", textTransform: "uppercase" }} />
          </div>

          {/* Hole grid */}
          <div style={{ overflowX: "scroll", WebkitOverflowScrolling: "touch", marginBottom: 10 }}>
            <table style={{ borderCollapse: "collapse", fontSize: 12, minWidth: 400 }}>
              <thead>
                <tr>
                  <td style={{ padding: "4px 6px", fontWeight: 700, color: sc.muted, minWidth: 36 }}></td>
                  {Array.from({length: 18}, (_, i) => (
                    <td key={i} style={{ padding: "4px 4px", textAlign: "center", color: sc.muted, minWidth: 28, fontWeight: 600 }}>{i + 1}</td>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "4px 6px", fontWeight: 700, color: sc.ink }}>Par</td>
                  {editPars.map((par, i) => (
                    <td key={i} style={{ padding: "2px" }}>
                      <input
                        type="number" min="3" max="5"
                        value={par}
                        onChange={e => setEditPars(prev => { const n = [...prev]; n[i] = Number(e.target.value); return n; })}
                        style={{ width: 28, textAlign: "center", fontSize: 12, padding: "4px 2px", border: `1px solid ${sc.border}`, borderRadius: 4, fontFamily: "inherit" }}
                      />
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: "4px 6px", fontWeight: 700, color: sc.ink }}>HCP</td>
                  {editHcps.map((hcp, i) => (
                    <td key={i} style={{ padding: "2px" }}>
                      <input
                        type="number" min="1" max="18"
                        value={hcp}
                        onChange={e => setEditHcps(prev => { const n = [...prev]; n[i] = Number(e.target.value); return n; })}
                        style={{ width: 28, textAlign: "center", fontSize: 12, padding: "4px 2px", border: `1px solid ${sc.border}`, borderRadius: 4, fontFamily: "inherit" }}
                      />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {editSaveStatus === "saved" && <div style={{ fontSize: 13, color: sc.green, fontWeight: 600, marginBottom: 8 }}>✓ Course saved to library</div>}
          {editSaveStatus === "error" && <div style={{ fontSize: 13, color: "#b3261e", marginBottom: 8 }}>Save failed — try again</div>}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={async () => {
                if (!editName.trim() || !editCity.trim() || !editState.trim()) {
                  alert("Course name, city, and state are required.");
                  return;
                }
                setEditSaveStatus("saving");
                try {
                  if (courseMode === "add") {
                    await saveCourseToLibrary({ name: editName.trim(), pars: editPars, hcp: editHcps, city: editCity.trim(), state: editState.trim() }, savedBy);
                  } else {
                    const pin = window.prompt("Admin PIN to update this course:");
                    if (!pin) { setEditSaveStatus(""); return; }
                    await updateCourseInLibrary(loadedCourse.id, { name: editName.trim(), pars: editPars, hcp: editHcps, city: editCity.trim(), state: editState.trim() }, deviceId, pin);
                    // Reload the updated course
                    updateCourseName(editName.trim());
                    editPars.forEach((par, i) => updateCoursePar(i, par));
                    editHcps.forEach((hcp, i) => updateCourseHcp(i, hcp));
                  }
                  setEditSaveStatus("saved");
                  searchCourses("%").then(r => setAllCourses(r || [])).catch(() => {});
                  setTimeout(() => { setEditSaveStatus(""); setCourseMode("list"); }, 1500);
                } catch (e) {
                  setEditSaveStatus("error");
                }
              }}
              disabled={editSaveStatus === "saving"}
              style={{ flex: 2, padding: "10px 0", fontSize: 14, fontWeight: 700, background: sc.green, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}
            >
              {editSaveStatus === "saving" ? "Saving…" : courseMode === "add" ? "Save to Library" : "Update in Library"}
            </button>
            <button
              onClick={() => { setCourseMode("list"); setEditSaveStatus(""); }}
              style={{ flex: 1, padding: "10px 0", fontSize: 14, background: "#fff", color: sc.muted, border: `1px solid ${sc.border}`, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}
            >Cancel</button>
          </div>
        </div>
      )}

      {/* Normal course mode */}
      {courseMode === "list" && (<>

      {/* Locked during round */}
      {roundInProgress && course?.name ? (
        <div style={{ padding: "12px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, fontSize: 15, color: "#166534", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          <span>🔒</span>
          <div>
            <div>{course.name}</div>
            {course.city && <div style={{ fontSize: 12, fontWeight: 400, opacity: 0.8 }}>{course.city}{course.state ? `, ${course.state}` : ""} · locked during round</div>}
          </div>
        </div>
      ) : loadedCourse && !showList ? (
        <>
          {/* Course selected — show green banner */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#166534" }}>{course.name}</div>
              {loadedCourse.city && <div style={{ fontSize: 13, color: "#166534", opacity: 0.8 }}>{loadedCourse.city}{loadedCourse.state ? `, ${loadedCourse.state}` : ""} · Par {(loadedCourse.pars || []).reduce((s,p) => s + Number(p||0), 0) || ""}</div>}
            </div>
            <button onClick={() => setShowList(true)} style={{ fontSize: 13, padding: "6px 14px", borderRadius: 8, border: "1px solid #86efac", background: "transparent", color: "#166534", cursor: "pointer", fontFamily: "inherit" }}>Change</button>
          </div>

          {/* Update / Delete */}
          {updateStatus === "saved" ? (
            <div style={{ fontSize: 13, color: sc.green, fontWeight: 600, marginBottom: 8 }}>✓ Course updated in library</div>
          ) : updateStatus === "error" ? (
            <div style={{ fontSize: 13, color: "#b3261e", marginBottom: 8 }}>Update failed — try again</div>
          ) : (updateStatus === "pin" || showUpdateConfirm) ? (
            <div style={{ padding: 12, background: "#f9fafb", border: `1px solid ${sc.border}`, borderRadius: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: sc.ink, marginBottom: 8 }}>
                {updateStatus === "pin" ? "Admin PIN required to update this course" : `Update "${loadedCourse.name}" in the shared library?`}
              </div>
              {updateStatus === "pin" && (
                <input type="password" value={updatePin} onChange={e => setUpdatePin(e.target.value)} onKeyDown={e => e.key === "Enter" && handleUpdate(updatePin)} placeholder="Admin PIN" inputMode="numeric"
                  style={{ width: "100%", fontSize: 15, padding: "8px 12px", border: `1px solid ${sc.border}`, borderRadius: 6, boxSizing: "border-box", fontFamily: "inherit", marginBottom: 8 }} />
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handleUpdate(updateStatus === "pin" ? updatePin : "")} disabled={updateStatus === "saving"}
                  style={{ flex: 1, padding: "8px 12px", fontSize: 13, fontWeight: 700, background: sc.green, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}>
                  {updateStatus === "saving" ? "Saving…" : "Confirm Update"}
                </button>
                <button onClick={() => { setShowUpdateConfirm(false); setUpdateStatus(""); setUpdatePin(""); }}
                  style={{ padding: "8px 12px", fontSize: 13, background: "transparent", color: sc.muted, border: `1px solid ${sc.border}`, borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowUpdateConfirm(true)}
              style={{ marginBottom: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, background: "#fff", color: sc.gold, border: `1px solid ${sc.gold}`, borderRadius: 8, cursor: "pointer", fontFamily: "inherit", width: "100%" }}>
              ✏️ Update "{loadedCourse.name}" in library
            </button>
          )}

          <button onClick={async () => {
            const pin = window.prompt("Admin PIN to delete this course:");
            if (!pin) return;
            if (!window.confirm(`Delete "${loadedCourse.name}" from the library? This cannot be undone.`)) return;
            try {
              await deleteCourseFromLibrary(loadedCourse.id, deviceId, pin);
              setLoadedCourse(null); updateCourseName(""); setShowList(true);
              searchCourses("%").then(r => setAllCourses(r || [])).catch(() => {});
            } catch (e) {
              window.alert(e.message === "not_owner" ? "You don't have permission to delete this course." : "Delete failed.");
            }
          }} style={{ marginBottom: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, background: "#fff", color: "#b3261e", border: "1px solid #b3261e", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", width: "100%" }}>
            🗑️ Delete "{loadedCourse.name}" from library
          </button>
        </>
      ) : (
        <>
          {/* Course list picker */}
          {!course.name && (
            <div style={{ marginBottom: 10, padding: "10px 12px", background: "#fef9c3", border: "1px solid #f59e0b", borderRadius: 8, fontSize: 13, color: "#92400e", fontWeight: 600 }}>
              ⛳ Select a course to get started
            </div>
          )}

          {/* Search */}
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search courses…"
            style={{ width: "100%", fontSize: 16, padding: "10px 12px", border: `1px solid ${sc.border}`, borderRadius: 8, boxSizing: "border-box", fontFamily: "inherit", marginBottom: 8 }}
          />

          {/* Sort toggle */}
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <SortBtn mode="recent" label="Recent" />
            <SortBtn mode="az" label="A–Z" />
            <SortBtn mode="state" label="State" />
          </div>

          {/* Course list */}
          <div style={{ border: `1px solid ${sc.border}`, borderRadius: 8, overflow: "hidden", maxHeight: 320, overflowY: "auto" }}>
            {sortedCourses.length === 0 ? (
              <div style={{ padding: "16px 14px", fontSize: 14, color: sc.muted, textAlign: "center" }}>No courses found</div>
            ) : (() => {
              let lastState = null;
              return sortedCourses.map((c, i) => {
                const showStateHeader = sortMode === "state" && c.state !== lastState;
                if (showStateHeader) lastState = c.state;
                const isLast = i === sortedCourses.length - 1;
                return (
                  <div key={c.id}>
                    {showStateHeader && (
                      <div style={{ padding: "5px 14px", background: "#f9fafb", fontSize: 11, fontWeight: 600, color: sc.muted, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: `1px solid ${sc.border}` }}>
                        {c.state}
                      </div>
                    )}
                    <div onClick={() => loadCourse(c)} style={{ padding: "13px 14px", borderBottom: isLast ? "none" : `1px solid ${sc.border}`, cursor: "pointer", WebkitTapHighlightColor: "rgba(0,0,0,0.05)" }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: sc.ink }}>{c.name}</div>
                      <div style={{ fontSize: 13, color: sc.muted }}>{c.city}{c.state ? `, ${c.state}` : ""} · Par {(c.pars || []).reduce((s,p) => s + Number(p||0), 0) || "?"}</div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {/* Cancel / back if changing */}
          {showList && loadedCourse && (
            <button onClick={() => { setShowList(false); setSearchQuery(""); }} style={{ marginTop: 8, width: "100%", padding: "9px 0", fontSize: 13, color: sc.muted, background: "transparent", border: `1px solid ${sc.border}`, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
          )}
        </>
      )}

      {/* Duplicate warning */}
      {duplicateCourse && (
        <div style={{ marginTop: 12, padding: 12, background: "#fffbeb", border: "1px solid #f59e0b", borderRadius: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#92400e", marginBottom: 6 }}>⚠️ "{duplicateCourse.name}" already exists in the library</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { loadCourse(duplicateCourse); setDuplicateCourse(null); }}
              style={{ flex: 1, padding: "7px 12px", fontSize: 13, fontWeight: 600, background: sc.green, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}>Load existing</button>
            <button onClick={() => setDuplicateCourse(null)}
              style={{ padding: "7px 12px", fontSize: 13, background: "transparent", color: sc.muted, border: `1px solid ${sc.border}`, borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Save to library */}
      {!roundInProgress && (
        <>
          {saveStatus === "saved" ? (
            <div style={{ marginTop: 12, fontSize: 13, color: sc.green, fontWeight: 600 }}>✓ Saved to course library</div>
          ) : saveStatus === "error" ? (
            <div style={{ marginTop: 12, fontSize: 13, color: "#b3261e" }}>Save failed — try again</div>
          ) : showSaveForm ? (
            <div style={{ marginTop: 12, padding: 12, background: "#f9fafb", border: `1px solid ${sc.border}`, borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: sc.ink }}>Save to shared library</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input type="text" value={saveCity} onChange={e => setSaveCity(e.target.value)} placeholder="City *"
                  style={{ flex: 1, fontSize: 13, padding: "8px 10px", border: `1px solid ${sc.border}`, borderRadius: 6, fontFamily: "inherit" }} />
                <input type="text" value={saveState} onChange={e => setSaveState(e.target.value.toUpperCase())} placeholder="ST *" maxLength={2}
                  style={{ width: 50, fontSize: 13, padding: "8px 10px", border: `1px solid ${sc.border}`, borderRadius: 6, fontFamily: "inherit", textTransform: "uppercase" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleSave} disabled={!saveCity.trim() || !saveState.trim() || saveStatus === "saving"}
                  style={{ flex: 1, padding: "8px 12px", fontSize: 13, fontWeight: 700, background: sc.green, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", opacity: (!saveCity.trim() || !saveState.trim()) ? 0.5 : 1 }}>
                  {saveStatus === "saving" ? "Saving…" : "Save"}
                </button>
                <button onClick={() => setShowSaveForm(false)}
                  style={{ padding: "8px 12px", fontSize: 13, background: "transparent", color: sc.muted, border: `1px solid ${sc.border}`, borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowSaveForm(true)} disabled={!course.name}
              style={{ marginTop: 12, padding: "9px 16px", fontSize: 13, fontWeight: 600, background: "#fff", color: sc.muted, border: `1px solid ${sc.border}`, borderRadius: 8, cursor: course.name ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
              💾 Save course to shared library
            </button>
          )}
          <div style={{ fontSize: 11, color: sc.muted, marginTop: 4 }}>Once saved, anyone can search and load this course.</div>
        </>
      )}

      {/* Add / Edit buttons */}
      {!roundInProgress && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button
            onClick={() => {
              setEditName("");
              setEditCity("");
              setEditState("");
              setEditPars(Array(18).fill(4));
              setEditHcps(Array.from({length: 18}, (_, i) => i + 1));
              setCourseMode("add");
            }}
            style={{ flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 600, background: "#fff", color: sc.green, border: `1px solid ${sc.green}`, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}
          >+ Add New Course</button>
          {loadedCourse && (
            <button
              onClick={() => {
                setEditName(loadedCourse.name || "");
                setEditCity(loadedCourse.city || "");
                setEditState(loadedCourse.state || "");
                setEditPars([...(loadedCourse.pars || Array(18).fill(4))]);
                setEditHcps([...(loadedCourse.hcp || Array.from({length: 18}, (_, i) => i + 1))]);
                setCourseMode("edit");
              }}
              style={{ flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 600, background: "#fff", color: sc.gold, border: `1px solid ${sc.gold}`, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}
            >✏️ Edit Course</button>
          )}
        </div>
      )}

      </>)}
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
  saveCourseToLibrary, searchCourses, checkCourseExists, updateCourseInLibrary, deleteCourseFromLibrary, incrementCourseUse, deviceId,
  totalHoles, getTeamGameRange, hasDuplicateSelections, getTeamGameSelection,
  renderTeamSelectors, expandedGame, setExpandedGame, modeText,
  addMatch, addNinePointMatch, autoCreateMatches, matches, matchResults,
  birdieResults = [], updateMatch, removeMatch, startRound,
  createDefaultTeamGame, focusGameTarget, goToLive, goToResults,
  roundName, setRoundName,
  myTemplates = [], templateStatus = "", onSaveTemplate, onLoadTemplate, onDeleteTemplate, onToggleTemplateVisibility, onUpdateTemplate, onSearchTemplates, onLoadMyTemplates,
  loadedTemplate, setLoadedTemplate,
  lastHoleSaved = null,
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
    setExpandedGame(focusGameTarget.gameIndex);
    const el = teamGameRefs.current[focusGameTarget.gameIndex];
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, [focusGameTarget, setExpandedGame]);

  const betAmountRef = useRef(null);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customHoles, setCustomHoles] = useState(18);
  const [customSegments, setCustomSegments] = useState(null);
  const [customStartHole, setCustomStartHole] = useState(1);
  useEffect(() => {
    if (enableTeamGame) {
      setTimeout(() => { betAmountRef.current?.focus(); betAmountRef.current?.select(); }, 100);
    }
  }, [enableTeamGame]);

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
              wolf: "Dollar value per point",
            }[teamGameFormat] || "Unit bet";

            return (
              <div style={{ paddingLeft: 56, display: "flex", flexDirection: "column", gap: 12 }}>
                <AmountInput
                  label={betLabel}
                  value={teamGameUnitAmount}
                  inputRef={betAmountRef}
                  onChange={(e) => {
                    setTeamGameUnitAmount(e.target.value);
                    // Always sync birdie bet to match unit bet
                    setTeamMatchConfig(prev => ({ ...prev, teamBirdieBetAmount: Number(e.target.value) || 5 }));
                  }}
                />

                {/* Birdie side bet for team game — not shown for Wolf, whose
                    birdie/eagle/albatross multiplier is baked directly into
                    its own scoring (like 9-Point's birdieDoublePoints), not
                    a separate side bet feeding the shared Birds column. */}
                {teamGameFormat !== "wolf" && (
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
                )}
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {[
                { value: "press", label: "Press" },
                { value: "standard", label: "Net Holes" },
                { value: "longshort", label: "Long/Short" },
                { value: "match_fbt", label: "Match Play" },
                { value: "stroke", label: "Stroke" },
                { value: "wolf", label: "Wolf" },
              ].map(opt => {
                const active = (teamGameFormat || "press") === opt.value;
                const wolfBlocked = opt.value === "wolf" && mode !== "5p";
                if (wolfBlocked) {
                  return (
                    <button
                      key={opt.value}
                      disabled
                      title="Wolf requires exactly 5 players"
                      style={{
                        padding: "9px 6px", fontSize: 13, fontWeight: 400,
                        border: `1px dashed ${sc.border}`,
                        background: "#f9fafb",
                        color: "#bbb",
                        borderRadius: 8, cursor: "not-allowed", fontFamily: "inherit",
                      }}
                    >
                      {opt.label}
                      <div style={{ fontSize: 9, marginTop: 1 }}>needs 5 players</div>
                    </button>
                  );
                }
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setTeamGameFormat(opt.value);
                      if (opt.value === "press") {
                        setTeamGames(prev => [
                          { ...createDefaultTeamGame(1), teams: prev[0]?.teams || {} },
                          { ...createDefaultTeamGame(2), teams: prev[1]?.teams || {} },
                          { ...createDefaultTeamGame(3), teams: prev[2]?.teams || {} },
                        ]);
                      } else {
                        setTeamGames(prev => [{ ...createDefaultTeamGame(1), teams: prev[0]?.teams || {} }]);
                      }
                    }}
                    style={{
                      padding: "9px 6px", fontSize: 13, fontWeight: active ? 700 : 400,
                      border: active ? `1px solid ${sc.green}` : `1px solid ${sc.border}`,
                      background: active ? "#f0fdf4" : "#fff",
                      color: active ? sc.green : sc.muted,
                      borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {teamGameFormat === "press" && (
              <div style={{ fontSize: 11, color: sc.muted, marginTop: 6 }}>
                6/6/6 · 9/9 · or custom holes per segment below
              </div>
            )}
          </div>

          {(teamGameFormat === "press" || !teamGameFormat) && (<>
          <div style={{ fontSize: 12, color: sc.muted, marginBottom: 10, lineHeight: 1.5 }}>
            Each game covers any number of holes — just make sure they add up to 18. Most common formats below, or build your own.
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <OutlineButton onClick={() => { applyPreset("6-6-6"); setShowCustomPicker(false); }}>6 / 6 / 6</OutlineButton>
            <OutlineButton onClick={() => { applyPreset("9-9"); setShowCustomPicker(false); }}>9 / 9</OutlineButton>
            <OutlineButton onClick={() => setShowCustomPicker(v => !v)}>
              + Custom
            </OutlineButton>
          </div>

          {showCustomPicker && (() => {
            const divisorsOf = (n) => {
              const opts = [];
              for (let d = 2; d <= n; d++) {
                if (n % d === 0) opts.push(d);
              }
              return opts;
            };
            const segmentOptions = divisorsOf(customHoles).filter(d => customHoles / d >= 1);
            const maxStart = 19 - customHoles;
            return (
              <div style={{ padding: 14, background: "#f9fafb", border: `1px solid ${sc.border}`, borderRadius: 8, marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: sc.ink }}>Build Custom Press</div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: sc.muted, marginBottom: 6 }}>How many holes to play?</div>
                  <input
                    type="number"
                    min={2}
                    max={18}
                    value={customHoles}
                    onChange={(e) => {
                      const v = Math.max(2, Math.min(18, Number(e.target.value) || 18));
                      setCustomHoles(v);
                      setCustomSegments(null);
                      setCustomStartHole(1);
                    }}
                    style={{ width: 70, fontSize: 15, padding: "6px 10px", border: `1px solid ${sc.border}`, borderRadius: 6, fontFamily: "inherit" }}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: sc.muted, marginBottom: 6 }}>How many segments?</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {segmentOptions.map(n => (
                      <button
                        key={n}
                        onClick={() => setCustomSegments(n)}
                        style={{
                          padding: "7px 14px", fontSize: 13, fontWeight: customSegments === n ? 700 : 400,
                          border: customSegments === n ? `1px solid ${sc.green}` : `1px solid ${sc.border}`,
                          background: customSegments === n ? "#f0fdf4" : "#fff",
                          color: customSegments === n ? sc.green : sc.muted,
                          borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                        }}
                      >
                        {n} × {customHoles / n}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: sc.muted, marginBottom: 6 }}>Starting hole</div>
                  <input
                    type="number"
                    min={1}
                    max={maxStart}
                    value={customStartHole}
                    onChange={(e) => setCustomStartHole(Math.max(1, Math.min(maxStart, Number(e.target.value) || 1)))}
                    style={{ width: 70, fontSize: 15, padding: "6px 10px", border: `1px solid ${sc.border}`, borderRadius: 6, fontFamily: "inherit" }}
                  />
                  <span style={{ fontSize: 12, color: sc.muted, marginLeft: 8 }}>
                    Plays holes {customStartHole}–{customStartHole + customHoles - 1}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    disabled={!customSegments}
                    onClick={() => {
                      const perSegment = customHoles / customSegments;
                      const games = Array.from({ length: customSegments }, (_, i) =>
                        i === 0
                          ? { ...createDefaultTeamGame(i + 1), holes: perSegment, startHole: customStartHole }
                          : { ...createDefaultTeamGame(i + 1), holes: perSegment }
                      );
                      setTeamGames(games);
                      setShowCustomPicker(false);
                    }}
                    style={{
                      flex: 1, padding: "9px 14px", fontSize: 13, fontWeight: 700,
                      background: customSegments ? sc.green : "#ccc", color: "#fff", border: "none",
                      borderRadius: 8, cursor: customSegments ? "pointer" : "not-allowed", fontFamily: "inherit",
                    }}
                  >
                    Create {customSegments || "?"} Games
                  </button>
                  <button
                    onClick={() => setShowCustomPicker(false)}
                    style={{ padding: "9px 14px", fontSize: 13, background: "transparent", color: sc.muted, border: `1px solid ${sc.border}`, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            );
          })()}

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: sc.ink, whiteSpace: "nowrap" }}>Press Rules</span>
            <div style={{ display: "flex", border: `1px solid ${sc.green}`, borderRadius: 8, overflow: "hidden" }}>
              {[{ n: 1, l: "1 Down" }, { n: 2, l: "2 Down" }].map(({ n, l }, i) => (
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
            <span style={{ fontSize: 12, color: sc.muted }}>Auto Press</span>
          </div>

          {teamGameFormat === "press" && totalHoles > 0 && (
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

          {/* Handicap Distribution — for press format */}
          {(!teamGameFormat || teamGameFormat === "press") && (
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

          {/* Spread overflow warning */}
          {handicapDistribution === "spread" && (() => {
            const validPlayers = players.filter(p => p.name && !p.name.match(/^P\d+$/) && p.hcp != null && Number.isFinite(p.hcp));
            if (!validPlayers.length) return null;
            const minHcp = Math.min(...validPlayers.map(p => p.hcp));

            const warnings = noPar3TeamGame ? [] : validPlayers.map(p => {
              const totalStrokes = handicapMode === "full"
                ? Number(p.hcp)
                : Math.max(0, Number(p.hcp) - minHcp);
              if (totalStrokes <= 18) return null;
              const extra = totalStrokes - 18;
              return `⚠️ ${p.name} (HCP ${p.hcp < 0 ? `+${Math.abs(p.hcp)}` : p.hcp}) — ${extra} stroke${extra > 1 ? "s" : ""} above 18 will be applied as double strokes on the hardest holes. ${p.name} might want to consider a lesson. 🏌️`;
            }).filter(Boolean);

            if (warnings.length === 0) return null;
            return (
              <div style={{ marginBottom: 14, padding: "10px 12px", background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 8, fontSize: 13, color: "#92400e" }}>
                {warnings.map((w, i) => <div key={i} style={{ marginBottom: i < warnings.length-1 ? 6 : 0 }}>{w}</div>)}
              </div>
            );
          })()}

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
                {((!focusGameTarget && index === 0) || expandedGame === index) && (
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
          {teamGameFormat && teamGameFormat !== "press" && teamGameFormat !== "wolf" && (
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

          {/* Wolf-specific options — teams are picked live per-hole, not here */}
          {teamGameFormat === "wolf" && (
            <div>
              <div style={{ fontSize: 12, color: sc.muted, marginBottom: 14, lineHeight: 1.5 }}>
                Whole round · 18 holes · 5 players · teams picked live each hole by the Scorekeeper. Dollar Value Per Point and No Par 3 Strokes are the shared fields above — same as every other format.
              </div>

              {/* Wolf Style */}
              <div style={{ borderBottom: `1px solid ${sc.border}`, paddingBottom: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: sc.ink, marginBottom: 6 }}>Wolf Style</div>
                <div style={{ fontSize: 12, color: sc.muted, marginBottom: 6 }}>Controls the payout multiplier for Lone Wolf and Blind Wolf</div>
                <select
                  value={teamMatchConfig.wolfStyle || "harrison"}
                  onChange={(e) => setTeamMatchConfig(prev => ({ ...prev, wolfStyle: e.target.value }))}
                  style={{ padding: "6px 8px", border: `1px solid ${sc.border}`, borderRadius: 6, fontSize: 13, fontFamily: "inherit", width: "100%" }}
                >
                  <option value="harrison">Harrison Wolf — Wolf 1x · Lone Wolf 2x · Blind Wolf 3x (symmetric)</option>
                  <option value="classic">Classic Wolf — Wolf 4x/1x · Blind Wolf 12x/3x (asymmetric win/lose)</option>
                </select>
              </div>

              {/* Settlement Style */}
              <div style={{ borderBottom: `1px solid ${sc.border}`, paddingBottom: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: sc.ink, marginBottom: 6 }}>Payout Style</div>
                <div style={{ fontSize: 12, color: sc.muted, marginBottom: 6 }}>Only matters on a Pack Wolf hole (partner picked) — no difference when going alone</div>
                <select
                  value={teamMatchConfig.wolfSettlementStyle || "pairwise"}
                  onChange={(e) => setTeamMatchConfig(prev => ({ ...prev, wolfSettlementStyle: e.target.value }))}
                  style={{ padding: "6px 8px", border: `1px solid ${sc.border}`, borderRadius: 6, fontSize: 13, fontFamily: "inherit", width: "100%" }}
                >
                  <option value="pairwise">Pay Each Winner — every loser pays every winner in full</option>
                  <option value="pooled">Split the Pot — losers pay in, winners split it evenly</option>
                </select>
                {teamMatchConfig.wolfSettlementStyle === "pooled" && (
                  <div style={{ fontSize: 11, color: "#b45309", marginTop: 8 }}>
                    Split the Pot can produce uneven cents on a Pack Wolf hole. The app will suggest the two nearest clean dollar amounts when you enter a bet that doesn't divide evenly.
                  </div>
                )}
              </div>

              {/* Hammer Rule */}
              <div style={{ borderTop: `1px solid ${sc.border}`, paddingTop: 12, marginBottom: 12 }}>
                <Toggle
                  checked={!!teamMatchConfig.wolfHammerEnabled}
                  onChange={(val) => setTeamMatchConfig(prev => ({ ...prev, wolfHammerEnabled: val }))}
                  label="Hammer Rule"
                  sublabel="Either side can double the hole's value mid-hole"
                />
              </div>

              {/* Hammer Sweep (internal key stays wolfAddAHammer) */}
              <div style={{ borderTop: `1px solid ${sc.border}`, paddingTop: 12, marginBottom: 12 }}>
                <Toggle
                  checked={!!teamMatchConfig.wolfAddAHammer}
                  onChange={(val) => setTeamMatchConfig(prev => ({ ...prev, wolfAddAHammer: val }))}
                  label="Auto Hammer Sweep"
                  sublabel="Auto-double if the winning side individually beat everyone on the losing side"
                />
                {teamMatchConfig.wolfAddAHammer && (
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 10, paddingLeft: 56 }}>
                    <input type="checkbox" checked={!!teamMatchConfig.wolfAddAHammerHammerHolesOnly}
                      onChange={(e) => setTeamMatchConfig(prev => ({ ...prev, wolfAddAHammerHammerHolesOnly: e.target.checked }))}
                      style={{ width: 16, height: 16, accentColor: sc.green }} />
                    <span style={{ fontSize: 13, color: sc.muted }}>Apply to Hammer holes only</span>
                  </label>
                )}
                {teamMatchConfig.wolfAddAHammer && teamMatchConfig.wolfAddAHammerHammerHolesOnly && !teamMatchConfig.wolfHammerEnabled && (
                  <div style={{ fontSize: 11, color: "#b45309", marginTop: 8, paddingLeft: 56 }}>
                    Hammer Rule is off, so no hole can be a Hammer hole — this bonus won't fire.
                  </div>
                )}
              </div>

              {/* Carryover on Push */}
              <div style={{ borderTop: `1px solid ${sc.border}`, paddingTop: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: sc.ink, marginBottom: 6 }}>Carryover on Push</div>
                <select
                  value={teamMatchConfig.wolfCarryoverMode || "off"}
                  onChange={(e) => setTeamMatchConfig(prev => ({ ...prev, wolfCarryoverMode: e.target.value }))}
                  style={{ padding: "6px 8px", border: `1px solid ${sc.border}`, borderRadius: 6, fontSize: 13, fontFamily: "inherit", width: "100%" }}
                >
                  <option value="off">Off</option>
                  <option value="value_only">Point Value Only</option>
                  <option value="value_and_hammers">Point Value + Hammers</option>
                </select>

                {teamMatchConfig.wolfCarryoverMode && teamMatchConfig.wolfCarryoverMode !== "off" && (
                  <div style={{ marginTop: 10 }}>
                    <Toggle
                      checked={!!teamMatchConfig.wolfLimitCarryover}
                      onChange={(val) => setTeamMatchConfig(prev => ({ ...prev, wolfLimitCarryover: val }))}
                      label="Limit Carryover"
                      sublabel="Cap how many pushes in a row can stack"
                    />
                    {teamMatchConfig.wolfLimitCarryover && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, paddingLeft: 56 }}>
                        <span style={{ fontSize: 13, color: sc.ink }}>Max stacked pushes</span>
                        <button
                          onClick={() => setTeamMatchConfig(prev => ({ ...prev, wolfMaxCarryover: Math.max(1, (Number(prev.wolfMaxCarryover) || 2) - 1) }))}
                          style={{ width: 28, height: 28, border: `1px solid ${sc.border}`, borderRadius: 6, background: "#fff", cursor: "pointer", fontFamily: "inherit" }}
                        >–</button>
                        <span style={{ fontSize: 14, fontWeight: 600, minWidth: 16, textAlign: "center" }}>
                          {teamMatchConfig.wolfMaxCarryover || 2}
                        </span>
                        <button
                          onClick={() => setTeamMatchConfig(prev => ({ ...prev, wolfMaxCarryover: (Number(prev.wolfMaxCarryover) || 2) + 1 }))}
                          style={{ width: 28, height: 28, border: `1px solid ${sc.border}`, borderRadius: 6, background: "#fff", cursor: "pointer", fontFamily: "inherit" }}
                        >+</button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Birdie/Eagle/Albatross Multiplier */}
              <div style={{ borderTop: `1px solid ${sc.border}`, paddingTop: 12, marginBottom: 12 }}>
                <Toggle
                  checked={!!teamMatchConfig.wolfBirdieMultiplierEnabled}
                  onChange={(val) => setTeamMatchConfig(prev => ({ ...prev, wolfBirdieMultiplierEnabled: val }))}
                  label="Birdie / Eagle / Albatross Multiplier"
                  sublabel="Doubles / triples / quadruples the hole's bet — applies to every hole, including Super Wolf"
                />
              </div>

              {/* Super Wolf Hitting Order Mode */}
              <div style={{ borderTop: `1px solid ${sc.border}`, paddingTop: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: sc.ink, marginBottom: 6 }}>Super Wolf Hitting Order</div>
                <div style={{ fontSize: 12, color: sc.muted, marginBottom: 6 }}>Chosen once here — applies the same way at holes 16, 17, and 18</div>
                <select
                  value={teamMatchConfig.wolfSuperWolfOrderMode || "standard"}
                  onChange={(e) => setTeamMatchConfig(prev => ({ ...prev, wolfSuperWolfOrderMode: e.target.value }))}
                  style={{ padding: "6px 8px", border: `1px solid ${sc.border}`, borderRadius: 6, fontSize: 13, fontFamily: "inherit", width: "100%" }}
                >
                  <option value="standard">Standard rotation order</option>
                  <option value="wolf_controls">Super Wolf controls the order</option>
                  <option value="rank_by_deficit">Rank order by $$ down</option>
                </select>
              </div>

              {/* Wolf Hits Last */}
              <div style={{ borderTop: `1px solid ${sc.border}`, paddingTop: 12, marginBottom: 12 }}>
                <Toggle
                  checked={!!teamMatchConfig.wolfHitsLast}
                  onChange={(val) => setTeamMatchConfig(prev => ({ ...prev, wolfHitsLast: val }))}
                  label="Wolf Hits Last"
                  sublabel="Default is Wolf hits first — turn on for the traditional last-to-hit variant"
                />
              </div>

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
        incrementCourseUse={incrementCourseUse}
        deviceId={deviceId}
        searchCourses={searchCourses}
        players={players}
        sc={sc}
        roundName={roundName}
        setRoundName={setRoundName}
        roundInProgress={lastHoleSaved != null}
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
