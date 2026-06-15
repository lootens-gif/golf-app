import { useState, useEffect } from "react";
import { fetchActiveRounds } from "../lib/roundSync";

const ADMIN_PIN = "1234"; // change this to whatever you want

const sc = {
  green: "#2d6a4f",
  gold: "#b5882a",
  ink: "#1a1a1a",
  muted: "#6b7280",
  border: "#e5e7eb",
};

export default function AdminScreen({ onBack, onJoinAsAdmin, onReportBug }) {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("sc-admin-authed") === "true");
  const [pinError, setPinError] = useState(false);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hoursAgo, setHoursAgo] = useState(4);

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

  async function loadRounds() {
    setLoading(true);
    try {
      const data = await fetchActiveRounds(hoursAgo);
      setRounds(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authed) loadRounds();
  }, [authed, hoursAgo]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <option value={1}>Last 1 hr</option>
          <option value={4}>Last 4 hrs</option>
          <option value={12}>Last 12 hrs</option>
          <option value={24}>Last 24 hrs</option>
          <option value={48}>Last 48 hrs</option>
        </select>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: sc.muted }}>{loading ? "Loading…" : `${rounds.length} round${rounds.length !== 1 ? "s" : ""} found`}</div>
        <button onClick={loadRounds} style={{ fontSize: 12, padding: "4px 10px", background: "transparent", border: `1px solid ${sc.border}`, borderRadius: 6, cursor: "pointer", fontFamily: "inherit", color: sc.muted }}>↻ Refresh</button>
      </div>

      {rounds.length === 0 && !loading ? (
        <div style={{ textAlign: "center", color: sc.muted, padding: "40px 0", fontSize: 14 }}>No active rounds in this window.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rounds.map(r => {
            const d = r.data || {};
            const players = (d.allPlayers || []).filter(p => p.name && !p.name.match(/^P\d$/)).map(p => p.name);
            const course = d.course?.name || "—";
            const holesPlayed = Object.keys(d.scores || {}).length > 0
              ? Math.max(...Object.keys(d.scores).map(Number))
              : 0;
            const updatedAt = new Date(r.updated_at);
            const minsAgo = Math.round((Date.now() - updatedAt) / 60000);
            const timeLabel = minsAgo < 60 ? `${minsAgo}m ago` : `${Math.round(minsAgo / 60)}h ago`;
            const isLive = minsAgo < 30;

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
                <button
                  onClick={() => onJoinAsAdmin(r.code)}
                  style={{ padding: "6px 14px", fontSize: 13, fontWeight: 600, background: sc.green, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}
                >
                  Join as Admin
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
