import { useState } from "react";
import { supabase } from "./lib/supabase";

const sc = {
  green: "#1a5c35",
  greenLight: "#f0f7f3",
  gold: "#b8952a",
  ink: "#1a1a1a",
  muted: "#6b7280",
  border: "#d1d5db",
  red: "#b3261e",
};

const SCREENS = ["Setup", "Live", "Results", "Join", "Other"];
const SEVERITIES = [
  { v: "broken", l: "🔴 Broken", sub: "Can't use the app" },
  { v: "wrong", l: "🟡 Wrong", sub: "Numbers or data incorrect" },
  { v: "ugly", l: "🔵 Looks off", sub: "Visual / layout issue" },
  { v: "idea", l: "💡 Idea", sub: "Suggestion or improvement" },
];

export default function BugReportModal({ screen, roundCode, onClose, onOpenQA }) {
  const [testerName, setTesterName] = useState(() => localStorage.getItem("sc-tester-name") || "");
  const [bugScreen, setBugScreen] = useState(screen || "Live");
  const [severity, setSeverity] = useState("wrong");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!description.trim()) {
      setError("Please describe the issue.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      localStorage.setItem("sc-tester-name", testerName);
      const { error: dbError } = await supabase.from("bug_reports").insert({
        tester_name: testerName.trim() || "Anonymous",
        screen: bugScreen,
        severity,
        description: description.trim(),
        round_code: roundCode || null,
        app_version: "v1",
      });
      if (dbError) throw dbError;
      setSubmitted(true);
    } catch (e) {
      setError("Couldn't submit — check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "#fff", borderRadius: "16px 16px 0 0",
        width: "100%", maxWidth: 480,
        padding: 24, paddingBottom: 36,
        boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        {submitted ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: sc.green, marginBottom: 8 }}>
              Got it — thanks!
            </div>
            <div style={{ fontSize: 14, color: sc.muted, marginBottom: 24 }}>
              Tim will look into it.
            </div>
            <button onClick={onClose} style={{
              background: sc.green, color: "#fff", border: "none",
              borderRadius: 10, padding: "12px 32px", fontSize: 15,
              fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: sc.ink }}>🐛 Report an Issue</div>
              <button onClick={onClose} style={{
                background: "transparent", border: "none", fontSize: 20,
                cursor: "pointer", color: sc.muted, padding: 4,
              }}>✕</button>
            </div>

            {/* Tester name */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: sc.muted, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>
                Your name (optional)
              </label>
              <input
                type="text"
                value={testerName}
                onChange={e => setTesterName(e.target.value)}
                placeholder="e.g. Biro"
                style={{
                  width: "100%", fontSize: 15, padding: "10px 12px",
                  border: `1px solid ${sc.border}`, borderRadius: 8,
                  boxSizing: "border-box", fontFamily: "inherit",
                }}
              />
            </div>

            {/* Screen */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: sc.muted, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>
                Which screen?
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {SCREENS.map(s => (
                  <button key={s} onClick={() => setBugScreen(s)} style={{
                    padding: "7px 14px", fontSize: 13, fontWeight: 600,
                    border: `1px solid ${bugScreen === s ? sc.green : sc.border}`,
                    background: bugScreen === s ? sc.greenLight : "#fff",
                    color: bugScreen === s ? sc.green : sc.ink,
                    borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
                  }}>{s}</button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: sc.muted, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>
                Type of issue
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {SEVERITIES.map(({ v, l, sub }) => (
                  <button key={v} onClick={() => setSeverity(v)} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", fontSize: 14, fontWeight: severity === v ? 600 : 400,
                    border: `1px solid ${severity === v ? sc.green : sc.border}`,
                    background: severity === v ? sc.greenLight : "#fff",
                    color: sc.ink, borderRadius: 8, cursor: "pointer",
                    fontFamily: "inherit", textAlign: "left",
                  }}>
                    <span style={{ fontSize: 16 }}>{l.split(" ")[0]}</span>
                    <div>
                      <div>{l.split(" ").slice(1).join(" ")}</div>
                      <div style={{ fontSize: 11, color: sc.muted }}>{sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: sc.muted, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>
                What happened?
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe what you did and what went wrong..."
                rows={4}
                style={{
                  width: "100%", fontSize: 14, padding: "10px 12px",
                  border: `1px solid ${sc.border}`, borderRadius: 8,
                  resize: "vertical", fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {error && (
              <div style={{ color: sc.red, fontSize: 13, marginBottom: 12 }}>{error}</div>
            )}

            {roundCode && (
              <div style={{ fontSize: 12, color: sc.muted, marginBottom: 12 }}>
                Round code {roundCode} will be included automatically.
              </div>
            )}

            <button
              onClick={submit}
              disabled={submitting}
              style={{
                width: "100%", padding: 14, fontSize: 16, fontWeight: 700,
                background: submitting ? "#ccc" : sc.green, color: "#fff",
                border: "none", borderRadius: 10, cursor: submitting ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {submitting ? "Submitting…" : "Submit Report"}
            </button>

            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button
                onClick={() => { onClose(); }}
                style={{ background: "transparent", border: "none", color: sc.muted, fontSize: 13, cursor: "pointer" }}
              >
                Cancel
              </button>
              <span style={{ color: sc.border, margin: "0 8px" }}>·</span>
              <button
  onClick={() => { onClose(); onOpenQA(); }}
  style={{ background: "transparent", border: "none", color: sc.green, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
>
  Run full QA test →
</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
