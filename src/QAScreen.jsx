import { useState } from "react";
import { supabase } from "./lib/supabase";

const sc = {
  green: "#1a5c35",
  greenLight: "#f0f7f3",
  gold: "#b8952a",
  goldLight: "#fdf8ee",
  ink: "#1a1a1a",
  muted: "#6b7280",
  border: "#d1d5db",
  red: "#b3261e",
  redLight: "#fef2f2",
};

const SCENARIOS = [
  {
    id: "s1", priority: "critical", label: "Start a round & get a code",
    sub: "Core multiplayer flow",
    steps: [
      "Open the app and go to Setup",
      "Fill in player names and handicaps",
      "Optionally type a Round Name — or leave it blank",
      "Tap Start Round",
    ],
    expect: "A large green 4-digit code appears on the Live screen. The round name auto-fills if you left it blank.",
    ifFail: "Screenshot the screen and note what you see instead of the code.",
  },
  {
    id: "s2", priority: "critical", label: "Join a round from another device",
    sub: "The whole point of the app",
    steps: [
      "Get the 4-digit code from whoever started the round",
      "Tap Join in the top nav",
      "Enter the code and tap Join",
    ],
    expect: "You see the live results screen — same players and scores as the host.",
    ifFail: "Note the exact code you used. Screenshot the error.",
  },
  {
    id: "s3", priority: "critical", label: "Live score sync",
    sub: "Enter a score — does the other device update?",
    steps: [
      "Device 1 (host): enter scores for Hole 1 and tap Save Hole",
      "Device 2 (you): watch the results screen",
    ],
    expect: "Within a few seconds, scores and money update on Device 2 — no refresh needed.",
    ifFail: "Note how long you waited. Try pulling down to refresh — does it then show?",
  },
  {
    id: "s4", priority: "important", label: "Round Complete modal",
    sub: "After saving Hole 18",
    steps: [
      "Enter scores for all 18 holes",
      "Tap Save Hole 18",
    ],
    expect: "A modal appears with 🏁 Round Complete, a pre-filled round name, Save Round & See Results and Edit Hole 18 buttons.",
    ifFail: "Note whether the modal appears at all, and what the Save button does.",
  },
  {
    id: "s5", priority: "important", label: "Save This Round on Results",
    sub: "For rounds not saved via modal",
    steps: [
      "Go to Results screen without saving (tap Results in nav during a round)",
      "Look for the gold Save This Round card",
      "Tap Save, enter a name, confirm",
    ],
    expect: "Shows ✅ Round saved — find it in Setup › Saved Rounds.",
    ifFail: "Screenshot the Results screen.",
  },
  {
    id: "s6", priority: "important", label: "Skins — Per Skin",
    sub: "Basic skin value with carryover",
    steps: [
      "In Setup, enable Skins → Per Skin → $5 per skin → Carryover ON",
      "Play a few holes — win one outright, tie a couple",
      "Go to Results → Skins card",
    ],
    expect: "Winners section shows only holes won (tied holes hidden). Tap a hole to see all player scores.",
    ifFail: "Note which holes show incorrectly.",
  },
  {
    id: "s7", priority: "important", label: "Skins — Pot",
    sub: "Equal split by skins won",
    steps: [
      "In Setup, enable Skins → Pot → $10 per player",
      "Play a round",
      "Check Results → Skins card",
    ],
    expect: "Total pot = $10 × number of players. Pot ÷ skins won = per skin value. Money sums to $0.",
    ifFail: "Note the pot total and player amounts shown.",
  },
  {
    id: "s8", priority: "important", label: "Money adds up to zero",
    sub: "No phantom money",
    steps: [
      "Enter scores for at least 9 holes",
      "Go to Results → Standings table",
      "Add up all player totals",
    ],
    expect: "All amounts sum to exactly $0 — what one player wins, others lose.",
    ifFail: "Screenshot the Standings table with the amounts shown.",
  },
  {
    id: "s9", priority: "polish", label: "Reset All generates new code",
    sub: "Fresh round = fresh code",
    steps: [
      "Start a round — note the 4-digit code",
      "Go to Setup → scroll down → tap Reset All → confirm",
    ],
    expect: "A different 4-digit code appears. The old round name is cleared.",
    ifFail: "Note whether the code changed or stayed the same.",
  },
  {
    id: "s10", priority: "polish", label: "App works on your phone",
    sub: "Layout, buttons, score entry",
    steps: [
      "Run through the full flow on your phone (not desktop)",
      "Check: score entry buttons are big enough to tap",
      "Check: nothing overflows or gets cut off sideways",
      "Check: nav buttons all fit on one line",
    ],
    expect: "Everything usable with thumbs. Nothing looks broken or cut off.",
    ifFail: "Screenshot the problem area.",
  },
];

const PRIORITY_COLORS = {
  critical: { bg: "#fef2f2", border: "#fecaca", tag: "#b3261e", tagBg: "#fef2f2", label: "Critical" },
  important: { bg: sc.goldLight, border: "#fcd34d", tag: "#92400e", tagBg: "#fef3c7", label: "Important" },
  polish: { bg: sc.greenLight, border: "#c3ddd0", tag: sc.green, tagBg: sc.greenLight, label: "Polish" },
};

export default function QAScreen({ onBack, roundCode }) {
  const [results, setResults] = useState({});
  const [expanded, setExpanded] = useState({});
  const [testerName, setTesterName] = useState(() => localStorage.getItem("sc-tester-name") || "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notes, setNotes] = useState("");

  const passes = Object.values(results).filter(v => v === "pass").length;
  const fails = Object.values(results).filter(v => v === "fail").length;
  const total = SCENARIOS.length;
  const pct = passes + fails > 0 ? Math.round((passes / (passes + fails)) * 100) : null;

  function mark(id, result) {
    setResults(prev => ({ ...prev, [id]: result }));
    if (result === "fail") {
      setExpanded(prev => ({ ...prev, [id]: true }));
    }
  }

  function toggle(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  async function submitResults() {
    setSubmitting(true);
    try {
      localStorage.setItem("sc-tester-name", testerName);
      const failedScenarios = SCENARIOS
        .filter(s => results[s.id] === "fail")
        .map(s => s.label)
        .join(", ");

      await supabase.from("bug_reports").insert({
        tester_name: testerName.trim() || "Anonymous",
        screen: "QA Guide",
        severity: fails > 0 ? "wrong" : "idea",
        description: `QA Run: ${passes}/${passes + fails} passed.\n${failedScenarios ? `Failed: ${failedScenarios}\n` : ""}${notes ? `Notes: ${notes}` : ""}`,
        round_code: roundCode || null,
        app_version: "v1",
      });
      setSubmitted(true);
    } catch {
      alert("Couldn't submit — check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ fontFamily: "'Georgia', serif", paddingBottom: 100 }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: "transparent", border: "none", color: sc.muted, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 8, fontFamily: "inherit" }}>
          ← Back to app
        </button>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: sc.green }}>
          ⛳ QA Testing Guide
        </h2>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: sc.muted }}>
          Work through each scenario, tap ✓ or ✗, then submit your results at the bottom.
        </p>
      </div>

      {/* Tester name */}
      <div style={{ background: "#fff", border: `1px solid ${sc.border}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: sc.muted, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>
          Your name
        </label>
        <input
          type="text"
          value={testerName}
          onChange={e => setTesterName(e.target.value)}
          placeholder="e.g. Biro"
          style={{ width: "100%", fontSize: 15, padding: "9px 12px", border: `1px solid ${sc.border}`, borderRadius: 8, boxSizing: "border-box", fontFamily: "inherit" }}
        />
      </div>

      {/* Scenarios */}
      {SCENARIOS.map(scenario => {
        const { tag, tagBg, label: priorityLabel } = PRIORITY_COLORS[scenario.priority];
        const result = results[scenario.id];
        const isOpen = expanded[scenario.id];

        return (
          <div key={scenario.id} style={{
            background: "#fff",
            border: `1px solid ${result === "fail" ? "#fecaca" : result === "pass" ? "#c3ddd0" : sc.border}`,
            borderTop: `3px solid ${result === "fail" ? sc.red : result === "pass" ? sc.green : tag}`,
            borderRadius: 10, marginBottom: 12, overflow: "hidden",
          }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px" }}>
              <div style={{ flex: 1, cursor: "pointer" }} onClick={() => toggle(scenario.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, background: tagBg, color: tag, padding: "2px 8px", borderRadius: 20, letterSpacing: "0.5px" }}>
                    {priorityLabel}
                  </span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: sc.ink }}>{scenario.label}</div>
                <div style={{ fontSize: 12, color: sc.muted, marginTop: 2 }}>{scenario.sub}</div>
              </div>

              {/* Pass/Fail buttons */}
              <div style={{ display: "flex", gap: 6, flexShrink: 0, marginTop: 2 }}>
                <button onClick={() => mark(scenario.id, "pass")} style={{
                  width: 36, height: 36, borderRadius: "50%", border: "none",
                  background: result === "pass" ? sc.green : sc.greenLight,
                  color: result === "pass" ? "#fff" : sc.green,
                  fontSize: 16, cursor: "pointer", fontWeight: 700,
                }}>✓</button>
                <button onClick={() => mark(scenario.id, "fail")} style={{
                  width: 36, height: 36, borderRadius: "50%", border: "none",
                  background: result === "fail" ? sc.red : "#fef2f2",
                  color: result === "fail" ? "#fff" : sc.red,
                  fontSize: 16, cursor: "pointer", fontWeight: 700,
                }}>✗</button>
              </div>
            </div>

            {/* Expanded steps */}
            {isOpen && (
              <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${sc.border}` }}>
                <div style={{ paddingTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: sc.muted, marginBottom: 8 }}>Steps</div>
                  {scenario.steps.map((step, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 14 }}>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", background: sc.green, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                      <span style={{ color: sc.ink, lineHeight: 1.5 }}>{step}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: sc.greenLight, borderLeft: `3px solid ${sc.green}`, borderRadius: "0 8px 8px 0", padding: "8px 12px", margin: "10px 0", fontSize: 13, color: "#1a4a2e" }}>
                  <strong style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 3, color: sc.green }}>Expected</strong>
                  {scenario.expect}
                </div>
                {result === "fail" && (
                  <div style={{ background: "#fef2f2", borderLeft: `3px solid ${sc.red}`, borderRadius: "0 8px 8px 0", padding: "8px 12px", fontSize: 13, color: "#7a1a1a" }}>
                    <strong style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 3, color: sc.red }}>If it failed</strong>
                    {scenario.ifFail}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Notes */}
      <div style={{ background: "#fff", border: `1px solid ${sc.border}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: sc.muted, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>
          Any other notes?
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Anything else to flag, suggest, or mention..."
          rows={3}
          style={{ width: "100%", fontSize: 14, padding: "9px 12px", border: `1px solid ${sc.border}`, borderRadius: 8, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
        />
      </div>

      {submitted ? (
        <div style={{ textAlign: "center", padding: 24, background: sc.greenLight, borderRadius: 10 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: sc.green }}>Results submitted!</div>
          <div style={{ fontSize: 14, color: sc.muted, marginTop: 4 }}>Tim can see your results in the dashboard.</div>
        </div>
      ) : (
        <button
          onClick={submitResults}
          disabled={submitting || (passes + fails === 0)}
          style={{
            width: "100%", padding: 16, fontSize: 16, fontWeight: 700,
            background: passes + fails === 0 ? "#e5e7eb" : sc.green,
            color: passes + fails === 0 ? sc.muted : "#fff",
            border: "none", borderRadius: 10,
            cursor: passes + fails === 0 ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {submitting ? "Submitting…" : `Submit Results (${passes + fails}/${total} completed)`}
        </button>
      )}

      {/* Sticky footer */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: sc.ink, color: "#fff",
        display: "flex", justifyContent: "space-around",
        padding: "12px 16px", zIndex: 100,
      }}>
        {[
          { num: passes, color: "#4ade80", label: "Passed" },
          { num: fails, color: "#f87171", label: "Failed" },
          { num: total - passes - fails, color: "#9ca3af", label: "Remaining" },
          { num: pct !== null ? `${pct}%` : "–", color: "#facc15", label: "Pass rate" },
        ].map(({ num, color, label }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{num}</div>
            <div style={{ fontSize: 10, opacity: 0.65, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
