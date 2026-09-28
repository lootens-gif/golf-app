import { useState, useEffect, useCallback } from "react";
import { fetchActiveRounds, finalizeRound } from "../lib/roundSync";

const ADMIN_PIN = "1234"; // change this to whatever you want

const sc = {
  green: "#2d6a4f",
  gold: "#b5882a",
  ink: "#1a1a1a",
  muted: "#6b7280",
  border: "#e5e7eb",
};

export default function AdminScreen({ onBack, onJoinAsAdmin, onReportBug, deviceId }) {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("sc-admin-authed") === "true");
  const [pinError, setPinError] = useState(false);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hoursAgo, setHoursAgo] = useState(24);
  const [finalizing, setFinalizing] = useState(null); // round code currently being finalized
  const [expandedVersions, setExpandedVersions] = useState({}); // { [roundCode]: true } — "show earlier versions"

  function handlePin() {
    if (pin === ADMIN_PIN) {
      sessionStorage.setItem("sc-admin-authed", "true");
      setAuthed(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPin("");
    }
  }

  const loadRounds = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchActiveRounds(hoursAgo);
      setRounds(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [hoursAgo]);

  useEffect(() => {
    if (authed) loadRounds();
  }, [authed, loadRounds]);

  // Final records (see finalizeRound/saveRoundRevision in roundSync.js) are
  // just normal rows in the same table, tagged isFinalRecord — split them
  // out here so they attach to their original round's card instead of
  // cluttering this list as their own separate "round." Known limitation
  // (acceptable for this Admin-only v1): if a round drops out of the
  // current hoursAgo window while its final record is still recent, the
  // final record has no original-round card to attach to here and won't
  // be visible until the time window is widened.
  const liveRounds = rounds.filter(r => !r.data?.isFinalRecord);
  const finalVersionsByOriginalCode = {};
  rounds.filter(r => r.data?.isFinalRecord).forEach(r => {
    const originalCode = r.data.originalRoundCode;
    if (!originalCode) return;
    if (!finalVersionsByOriginalCode[originalCode]) finalVersionsByOriginalCode[originalCode] = [];
    finalVersionsByOriginalCode[originalCode].push(r);
  });
  Object.values(finalVersionsByOriginalCode).forEach(versions =>
    versions.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at))
  );

  async function handleFinalize(roundCode, roundData) {
    setFinalizing(roundCode);
    try {
      await finalizeRound(roundCode, roundData, deviceId);
      await loadRounds();
    } catch (e) {
      alert("Could not finalize this round — it may already have a final record. Refresh and check below.");
    } finally {
      setFinalizing(null);
    }
  }

  if (!authed) {
    return (
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "32px 16px", fontFamily: "Georgia, serif" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: sc.muted, fontSize: 14, cursor: "pointer", marginBottom: 24, padding: 0 }}>← Back</button>
        <h2 style={{ color: sc.green, marginBottom: 8 }}>Admin Access</h2>
        <p style={{ fontSize: 13, color: sc.muted, marginBottom: 24 }}>Enter your PIN to continue.</p>

        <input
          type="password"
          value={pin}
          onChange={e => { setPin(e.target.value); setPinError(false); }}
          onKeyDown={e => e.key === "Enter" && handlePin()}
          placeholder="Enter PIN"
          inputMode="numeric"
          style={{ width: "100%", fontSize: 18, padding: "10px 14px", border: `1px solid ${pinError ? "#b3261e" : sc.border}`, borderRadius: 8, boxSizing: "border-box", fontFamily: "inherit", marginBottom: 8 }}
        />
        {pinError && <div style={{ color: "#b3261e", fontSize: 13, marginBottom: 8 }}>Incorrect PIN</div>}
        <button onClick={handlePin} style={{ width: "100%", padding: "12px", fontSize: 15, fontWeight: 700, background: sc.green, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", marginBottom: 20 }}>
          Enter
        </button>

        {/* Escape hatch */}
        <div style={{ borderTop: `1px solid ${sc.border}`, paddingTop: 20, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: sc.muted, marginBottom: 12 }}>Not looking for admin? Found something broken?</div>
          <button
            onClick={() => { onBack(); setTimeout(() => onReportBug?.(), 50); }}
            style={{ fontSize: 14, fontWeight: 600, color: sc.green, background: "transparent", border: `1px solid ${sc.green}`, borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontFamily: "inherit" }}
          >
            🐛 Report a bug instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 16px", fontFamily: "Georgia, serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: sc.muted, fontSize: 14, cursor: "pointer", padding: 0 }}>← Back</button>
        <h2 style={{ color: sc.green, margin: 0, fontSize: 20 }}>🔧 Admin</h2>
        <select value={hoursAgo} onChange={e => setHoursAgo(Number(e.target.value))} style={{ fontSize: 13, padding: "4px 8px", border: `1px solid ${sc.border}`, borderRadius: 6, fontFamily: "inherit" }}>
          <option value={24}>Last 24 hrs</option>
          <option value={48}>Last 48 hrs</option>
          <option value={168}>Last 7 days</option>
          <option value={720}>Last 30 days</option>
        </select>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: sc.muted }}>{loading ? "Loading…" : `${liveRounds.length} round${liveRounds.length !== 1 ? "s" : ""} found`}</div>
        <button onClick={loadRounds} style={{ fontSize: 12, padding: "4px 10px", background: "transparent", border: `1px solid ${sc.border}`, borderRadius: 6, cursor: "pointer", fontFamily: "inherit", color: sc.muted }}>↻ Refresh</button>
      </div>

      {liveRounds.length === 0 && !loading ? (
        <div style={{ textAlign: "center", color: sc.muted, padding: "40px 0", fontSize: 14 }}>No active rounds in this window.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {liveRounds.map(r => {
            const d = r.data || {};
            const players = (d.allPlayers || []).filter(p => p.name && !p.name.match(/^P\d$/)).map(p => p.name);
            const course = d.course?.name || "—";
            const holesPlayed = Object.keys(d.scores || {}).length > 0
              ? Math.max(...Object.keys(d.scores).map(Number))
              : 0;
            const updatedAt = new Date(r.updated_at);
            const minsAgo = Math.round((Date.now() - updatedAt) / 60000);
            // Beyond 24 hours (1440 minutes), show days instead of an
            // ever-growing hour count.
            const timeLabel = minsAgo < 60
              ? `${minsAgo}m ago`
              : minsAgo < 1440
                ? `${Math.round(minsAgo / 60)}h ago`
                : `${Math.round(minsAgo / 1440)}d ago`;
            const isLive = minsAgo < 30;

            // Final Final (Sep 2026): a genuinely separate, permanent
            // record decoupled from this live round's autosave. See
            // roundSync.js finalizeRound/saveRoundRevision.
            const finalVersions = finalVersionsByOriginalCode[r.code] || [];
            const latestFinal = finalVersions[finalVersions.length - 1];
            const earlierVersions = finalVersions.slice(0, -1);
            const isExpanded = !!expandedVersions[r.code];

            return (
              <div key={r.code} style={{ border: `1px solid ${sc.border}`, borderRadius: 12, padding: "12px 14px", background: isLive ? "#f0fdf4" : "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 16, color: sc.ink, fontFamily: "monospace" }}>{r.code}</span>
                    {isLive && <span style={{ marginLeft: 8, fontSize: 11, background: sc.green, color: "#fff", padding: "2px 6px", borderRadius: 10, fontFamily: "sans-serif" }}>LIVE</span>}
                  </div>
                  <span style={{ fontSize: 12, color: sc.muted }}>{timeLabel}</span>
                </div>
                <div style={{ fontSize: 13, color: sc.ink, marginBottom: 4 }}>
                  📍 {course} &nbsp;·&nbsp; Hole {holesPlayed} played
                </div>
                <div style={{ fontSize: 12, color: sc.muted, marginBottom: 10 }}>
                  {players.length > 0 ? players.join(", ") : "No players named"}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={() => onJoinAsAdmin(r.code)}
                    style={{ padding: "6px 14px", fontSize: 13, fontWeight: 600, background: sc.green, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Join as Admin
                  </button>
                  {latestFinal ? (
                    <button
                      onClick={() => onJoinAsAdmin(latestFinal.code)}
                      style={{ padding: "6px 14px", fontSize: 13, fontWeight: 600, background: "#f0fdf4", color: sc.green, border: `1px solid ${sc.green}`, borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      ✓ View final ({latestFinal.code})
                    </button>
                  ) : (
                    <button
                      onClick={() => handleFinalize(r.code, d)}
                      disabled={finalizing === r.code}
                      style={{ padding: "6px 14px", fontSize: 13, fontWeight: 600, background: "transparent", color: sc.ink, border: `1px solid ${sc.border}`, borderRadius: 6, cursor: finalizing === r.code ? "default" : "pointer", fontFamily: "inherit", opacity: finalizing === r.code ? 0.6 : 1 }}
                    >
                      🔒 {finalizing === r.code ? "Finalizing…" : "Finalize round"}
                    </button>
                  )}
                </div>
                {earlierVersions.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <button
                      onClick={() => setExpandedVersions(prev => ({ ...prev, [r.code]: !prev[r.code] }))}
                      style={{ fontSize: 12, color: sc.muted, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                    >
                      {isExpanded ? "▲ Hide" : "▼ Show"} {earlierVersions.length} earlier version{earlierVersions.length !== 1 ? "s" : ""}
                    </button>
                    {isExpanded && (
                      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                        {earlierVersions.map(v => (
                          <button
                            key={v.code}
                            onClick={() => onJoinAsAdmin(v.code)}
                            style={{ textAlign: "left", padding: "4px 8px", fontSize: 12, fontFamily: "monospace", background: "#fafafa", border: `1px solid ${sc.border}`, borderRadius: 4, cursor: "pointer", color: sc.muted }}
                          >
                            {v.code} — {new Date(v.updated_at).toLocaleString()}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
