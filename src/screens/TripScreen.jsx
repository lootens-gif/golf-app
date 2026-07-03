import { useState, useEffect, useCallback } from "react";
import { computeSkins, settleSkinsRound } from "../engine/scoringEngine";
import {
  createTrip, fetchMyTrips, fetchTrip,
  saveTripPlayers, fetchTripPlayers,
  saveTripRound, fetchTripRounds,
  saveTripGames, fetchTripGames,
  fetchRoundsByCode, searchCourses,
} from "../lib/roundSync";

const sc = {
  green: "#2d6a4f",
  gold: "#b5882a",
  ink: "#1a1a1a",
  muted: "#6b7280",
  border: "#e5e7eb",
  greenLight: "#f0fdf4",
};

const GAME_TYPES = [
  { key: "low_net", label: "Low Net (Ironhorse)" },
  { key: "skins", label: "Skins" },
  { key: "par3", label: "Par 3s" },
  { key: "doubles", label: "Low Net Doubles" },
  { key: "vegas", label: "Vegas Doubles" },
  { key: "stableford", label: "Modified Stableford" },
  { key: "scramble", label: "Scramble" },
];

const HCP_SOURCES = ["USGA/GHIN", "The Grint", "Golf League (×2+1)", "Ironhorse History", "Manual"];

function Card({ children, style }) {
  return (
    <div style={{
      background: "#fff", border: `1px solid ${sc.border}`, borderRadius: 12,
      padding: 16, marginBottom: 12, boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase",
      color: sc.green, marginBottom: 12, borderBottom: `1px solid ${sc.border}`, paddingBottom: 6,
    }}>{children}</div>
  );
}

// ── TRIP LIST VIEW ────────────────────────────────────────────────────────────
function TripListView({ deviceId, onSelect, onCreate }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyTrips(deviceId).then(setTrips).finally(() => setLoading(false));
  }, [deviceId]);

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: sc.green, fontFamily: "Georgia, serif" }}>🏌️ Trips</h2>
        <button onClick={onCreate} style={{
          padding: "8px 16px", fontSize: 13, fontWeight: 700,
          background: sc.green, color: "#fff", border: "none", borderRadius: 8,
          cursor: "pointer", fontFamily: "inherit",
        }}>+ New Trip</button>
      </div>

      {loading ? (
        <div style={{ color: sc.muted, fontSize: 14, textAlign: "center", padding: 40 }}>Loading…</div>
      ) : trips.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", color: sc.muted, fontSize: 14, padding: 24 }}>
            No trips yet. Create one to get started.
          </div>
        </Card>
      ) : (
        trips.map(t => (
          <Card key={t.id} style={{ cursor: "pointer" }} onClick={() => onSelect(t)}>
            <div style={{ fontWeight: 700, fontSize: 16, color: sc.ink, marginBottom: 4 }}>{t.name}</div>
            <div style={{ fontSize: 12, color: sc.muted }}>
              Created {new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

// ── TRIP SETUP VIEW ───────────────────────────────────────────────────────────
function TripSetupView({ deviceId, trip, onBack, onSaved }) {
  const isNew = !trip?.id;
  const [tripName, setTripName] = useState(trip?.name || "");
  const [players, setPlayers] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [games, setGames] = useState(GAME_TYPES.map(g => ({
    id: `game-${g.key}`,
    game_type: g.key,
    entry_fee: g.key === "scramble" ? 10 : 5,
    payout_places: 4,
    payout_pcts: [50, 25, 16.7, 8.3],
    enabled: ["low_net", "skins", "par3"].includes(g.key),
  })));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [courseResults, setCourseResults] = useState([]);
  const [activeRoundIdx, setActiveRoundIdx] = useState(null);

  // Load existing data
  useEffect(() => {
    if (!trip?.id) return;
    fetchTripPlayers(trip.id).then(setPlayers);
    fetchTripRounds(trip.id).then(setRounds);
    fetchTripGames(trip.id).then(data => {
      if (data.length) setGames(data);
    });
  }, [trip?.id]);

  function addPlayer() {
    setPlayers(prev => [...prev, {
      id: `tp-${Date.now()}`,
      name: "",
      hcp_index: "",
      hcp_source: "USGA/GHIN",
    }]);
  }

  function updatePlayer(idx, field, value) {
    setPlayers(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  }

  function removePlayer(idx) {
    setPlayers(prev => prev.filter((_, i) => i !== idx));
  }

  function addRound() {
    setRounds(prev => [...prev, {
      id: `tr-${Date.now()}`,
      round_number: prev.length + 1,
      course_name: "",
      tee_name: "",
      slope: "",
      rating: "",
      par: 72,
      round_code: "",
    }]);
    setActiveRoundIdx(rounds.length);
  }

  function updateRound(idx, field, value) {
    setRounds(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }

  function removeRound(idx) {
    setRounds(prev => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, round_number: i + 1 })));
    setActiveRoundIdx(null);
  }

  function updateGame(idx, field, value) {
    setGames(prev => prev.map((g, i) => i === idx ? { ...g, [field]: value } : g));
  }

  async function searchCourse(q) {
    try {
      const results = await searchCourses(q || "%");
      setCourseResults(results);
    } catch { setCourseResults([]); }
  }

  async function handleSave() {
    if (!tripName.trim()) { setStatus("Trip name required"); return; }
    setSaving(true);
    setStatus("");
    try {
      let tripId = trip?.id;
      if (!tripId) {
        const newTrip = await createTrip({
          id: `trip-${Date.now()}`,
          name: tripName.trim(),
        }, deviceId);
        tripId = newTrip.id;
      }
      await Promise.all([
        saveTripPlayers(tripId, players.filter(p => p.name.trim())),
        ...rounds.map(r => saveTripRound({ ...r, trip_id: tripId })),
        saveTripGames(tripId, games.filter(g => g.enabled)),
      ]);
      setStatus("Saved!");
      setTimeout(() => setStatus(""), 2000);
      onSaved?.(tripId);
    } catch (e) {
      setStatus("Save failed — try again");
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  const totalPot = (players.filter(p => p.name.trim()).length || 0);

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "16px", fontFamily: "Georgia, serif" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: sc.muted, fontSize: 14, cursor: "pointer", marginBottom: 16, padding: 0 }}>← Back</button>

      <h2 style={{ color: sc.green, marginBottom: 16, margin: "0 0 16px" }}>
        {isNew ? "New Trip" : "Edit Trip"}
      </h2>

      {/* Trip Name */}
      <Card>
        <SectionLabel>Trip Name</SectionLabel>
        <input
          type="text"
          value={tripName}
          onChange={e => setTripName(e.target.value)}
          placeholder="e.g. Ironhorse 2026, Kiawah Trip"
          style={{ width: "100%", fontSize: 16, fontWeight: 600, padding: "10px 12px", border: `1px solid ${sc.border}`, borderRadius: 8, boxSizing: "border-box", fontFamily: "inherit" }}
        />
      </Card>

      {/* Players */}
      <Card>
        <SectionLabel>Players ({players.length})</SectionLabel>
        {players.map((p, i) => (
          <div key={p.id} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <input
              type="text"
              value={p.name}
              onChange={e => updatePlayer(i, "name", e.target.value)}
              placeholder={`Player ${i + 1} name`}
              style={{ flex: 2, fontSize: 14, padding: "8px 10px", border: `1px solid ${sc.border}`, borderRadius: 6, fontFamily: "inherit" }}
            />
            <input
              type="number"
              value={p.hcp_index}
              onChange={e => updatePlayer(i, "hcp_index", e.target.value)}
              placeholder="HCP"
              style={{ width: 60, fontSize: 14, padding: "8px 10px", border: `1px solid ${sc.border}`, borderRadius: 6, fontFamily: "inherit" }}
            />
            <select
              value={p.hcp_source}
              onChange={e => updatePlayer(i, "hcp_source", e.target.value)}
              style={{ flex: 1, fontSize: 12, padding: "8px 6px", border: `1px solid ${sc.border}`, borderRadius: 6, fontFamily: "inherit" }}
            >
              {HCP_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={() => removePlayer(i)} style={{
              padding: "6px 10px", fontSize: 13, color: "#b3261e",
              background: "transparent", border: `1px solid #b3261e`, borderRadius: 6, cursor: "pointer",
            }}>✕</button>
          </div>
        ))}
        <button onClick={addPlayer} style={{
          width: "100%", padding: "9px", fontSize: 13, fontWeight: 600,
          background: "#fff", color: sc.green, border: `1px solid ${sc.green}`,
          borderRadius: 8, cursor: "pointer", fontFamily: "inherit", marginTop: 4,
        }}>+ Add Player</button>
      </Card>

      {/* Rounds */}
      <Card>
        <SectionLabel>Rounds ({rounds.length})</SectionLabel>
        {rounds.map((r, i) => (
          <div key={r.id} style={{ marginBottom: 12, border: `1px solid ${sc.border}`, borderRadius: 8, overflow: "hidden" }}>
            <div
              onClick={() => setActiveRoundIdx(activeRoundIdx === i ? null : i)}
              style={{ padding: "10px 12px", background: sc.greenLight, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span style={{ fontWeight: 600, fontSize: 14, color: sc.ink }}>
                Round {r.round_number}{r.course_name ? ` — ${r.course_name}` : ""}
              </span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {r.round_code && <span style={{ fontSize: 11, background: sc.green, color: "#fff", padding: "2px 6px", borderRadius: 10 }}>{r.round_code}</span>}
                <span style={{ fontSize: 12, color: sc.muted }}>{activeRoundIdx === i ? "▲" : "▼"}</span>
              </div>
            </div>

            {activeRoundIdx === i && (
              <div style={{ padding: 12 }}>
                {/* Course search */}
                <div style={{ marginBottom: 10, position: "relative" }}>
                  <label style={{ fontSize: 12, color: sc.muted, display: "block", marginBottom: 4 }}>Course</label>
                  <input
                    type="text"
                    value={r.course_name || ""}
                    onChange={e => { updateRound(i, "course_name", e.target.value); searchCourse(e.target.value); }}
                    onFocus={() => searchCourse("")}
                    placeholder="Tap to search courses…"
                    style={{ width: "100%", fontSize: 14, padding: "8px 10px", border: `1px solid ${sc.border}`, borderRadius: 6, boxSizing: "border-box", fontFamily: "inherit" }}
                  />
                  {courseResults.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: `1px solid ${sc.border}`, borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 100, marginTop: 2, maxHeight: 200, overflowY: "auto" }}>
                      {courseResults.map(c => (
                        <div key={c.id} onClick={() => {
                          updateRound(i, "course_name", c.name);
                          updateRound(i, "par", c.pars?.reduce((s, p) => s + p, 0) || 72);
                          setCourseResults([]);
                        }} style={{ padding: "8px 12px", cursor: "pointer", borderBottom: `1px solid ${sc.border}`, fontSize: 13 }}>
                          {c.name} <span style={{ color: sc.muted, fontSize: 11 }}>{c.city}{c.state ? `, ${c.state}` : ""}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, color: sc.muted, display: "block", marginBottom: 4 }}>Default Tees</label>
                    <input type="text" value={r.tee_name} onChange={e => updateRound(i, "tee_name", e.target.value)} placeholder="Blue, White…" style={{ width: "100%", fontSize: 13, padding: "7px 8px", border: `1px solid ${sc.border}`, borderRadius: 6, boxSizing: "border-box", fontFamily: "inherit" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: sc.muted, display: "block", marginBottom: 4 }}>Slope</label>
                    <input type="number" value={r.slope} onChange={e => updateRound(i, "slope", e.target.value)} placeholder="113" style={{ width: "100%", fontSize: 13, padding: "7px 8px", border: `1px solid ${sc.border}`, borderRadius: 6, boxSizing: "border-box", fontFamily: "inherit" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: sc.muted, display: "block", marginBottom: 4 }}>Rating</label>
                    <input type="number" value={r.rating} onChange={e => updateRound(i, "rating", e.target.value)} placeholder="72.0" step="0.1" style={{ width: "100%", fontSize: 13, padding: "7px 8px", border: `1px solid ${sc.border}`, borderRadius: 6, boxSizing: "border-box", fontFamily: "inherit" }} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, color: sc.muted, display: "block", marginBottom: 4 }}>Round Code — from the scoring session for this round (e.g. 9084)</label>
                  <input type="text" value={r.round_code} onChange={e => updateRound(i, "round_code", e.target.value.toUpperCase())} placeholder="4-digit code from scoring app" maxLength={4} style={{ width: "100%", fontSize: 14, fontWeight: 700, padding: "8px 10px", border: `1px solid ${sc.border}`, borderRadius: 6, boxSizing: "border-box", fontFamily: "monospace" }} />
                  <div style={{ fontSize: 11, color: sc.muted, marginTop: 3 }}>Enter this after the round is scored — links scores to this trip automatically</div>
                </div>

                <button onClick={() => removeRound(i)} style={{ marginTop: 10, fontSize: 12, color: "#b3261e", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>Remove round</button>
              </div>
            )}
          </div>
        ))}
        <button onClick={addRound} style={{
          width: "100%", padding: "9px", fontSize: 13, fontWeight: 600,
          background: "#fff", color: sc.green, border: `1px solid ${sc.green}`,
          borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
        }}>+ Add Round</button>
      </Card>

      {/* Games */}
      <Card>
        <SectionLabel>Games & Entry Fees</SectionLabel>
        <div style={{ fontSize: 12, color: sc.muted, marginBottom: 12 }}>
          {totalPot} players · pot per game = players × entry fee
        </div>
        {GAME_TYPES.map((gt, i) => {
          const game = games[i];
          const pot = totalPot * Number(game.entry_fee || 0);
          return (
            <div key={gt.key} style={{ marginBottom: 12, padding: 12, border: `1px solid ${game.enabled ? sc.green : sc.border}`, borderRadius: 8, background: game.enabled ? sc.greenLight : "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: game.enabled ? 10 : 0 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
                  <input type="checkbox" checked={game.enabled} onChange={e => updateGame(i, "enabled", e.target.checked)} style={{ width: 16, height: 16, accentColor: sc.green }} />
                  {gt.label}
                </label>
                {game.enabled && pot > 0 && <span style={{ fontSize: 12, color: sc.green, fontWeight: 600 }}>${pot.toFixed(0)} pot</span>}
              </div>

              {game.enabled && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, color: sc.muted, display: "block", marginBottom: 3 }}>Entry fee/player ($)</label>
                    <input type="number" value={game.entry_fee} onChange={e => updateGame(i, "entry_fee", Number(e.target.value))} min="0" step="1" style={{ width: "100%", fontSize: 14, padding: "7px 8px", border: `1px solid ${sc.border}`, borderRadius: 6, boxSizing: "border-box", fontFamily: "inherit" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: sc.muted, display: "block", marginBottom: 3 }}>Payout places</label>
                    <select value={game.payout_places} onChange={e => {
                      const n = Number(e.target.value);
                      const pcts = n === 1 ? [100] : n === 2 ? [75, 25] : n === 3 ? [60, 30, 10] : [50, 25, 16.7, 8.3];
                      updateGame(i, "payout_places", n);
                      updateGame(i, "payout_pcts", pcts);
                    }} style={{ width: "100%", fontSize: 14, padding: "7px 8px", border: `1px solid ${sc.border}`, borderRadius: 6, fontFamily: "inherit" }}>
                      {[1,2,3,4].map(n => <option key={n} value={n}>{n} place{n > 1 ? "s" : ""}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: "1/-1" }}>
                    <label style={{ fontSize: 11, color: sc.muted, display: "block", marginBottom: 3 }}>Payout % (1st, 2nd, 3rd, 4th)</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      {game.payout_pcts.map((pct, pi) => (
                        <input key={pi} type="number" value={pct} onChange={e => {
                          const newPcts = [...game.payout_pcts];
                          newPcts[pi] = Number(e.target.value);
                          updateGame(i, "payout_pcts", newPcts);
                        }} min="0" max="100" style={{ flex: 1, fontSize: 13, padding: "6px 6px", border: `1px solid ${sc.border}`, borderRadius: 6, textAlign: "center", fontFamily: "inherit" }} />
                      ))}
                    </div>
                    {Math.round(game.payout_pcts.reduce((s,p) => s+p, 0)) !== 100 && (
                      <div style={{ fontSize: 11, color: "#b3261e", marginTop: 3 }}>⚠️ Percentages should sum to 100</div>
                    )}
                    {pot > 0 && (
                      <div style={{ fontSize: 11, color: sc.muted, marginTop: 4 }}>
                        Payouts: {game.payout_pcts.map((pct, pi) => `${pi+1}st $${(pot * pct / 100).toFixed(0)}`).join(" · ")}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </Card>

      {/* Save */}
      <button onClick={handleSave} disabled={saving} style={{
        width: "100%", padding: "14px", fontSize: 15, fontWeight: 700,
        background: sc.green, color: "#fff", border: "none", borderRadius: 10,
        cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", marginBottom: 8,
        opacity: saving ? 0.7 : 1,
      }}>{saving ? "Saving…" : "Save Trip"}</button>
      {status && <div style={{ textAlign: "center", fontSize: 13, color: status.includes("fail") ? "#b3261e" : sc.green, fontWeight: 600 }}>{status}</div>}
    </div>
  );
}

// ── TRIP LEADERBOARD VIEW ─────────────────────────────────────────────────────
function TripLeaderboardView({ trip, onBack, onEdit }) {
  const [rounds, setRounds] = useState([]);
  const [games, setGames] = useState([]);
  const [players, setPlayers] = useState([]);
  const [roundData, setRoundData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("low_net");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, r, g] = await Promise.all([
        fetchTripPlayers(trip.id),
        fetchTripRounds(trip.id),
        fetchTripGames(trip.id),
      ]);
      setPlayers(p);
      setRounds(r);
      setGames(g);
      const codes = r.map(rnd => rnd.round_code).filter(Boolean);
      if (codes.length) {
        const data = await fetchRoundsByCode(codes);
        setRoundData(data);
      }
    } finally {
      setLoading(false);
    }
  }, [trip.id]);

  useEffect(() => { load(); }, [load]);

  // Build Low Net leaderboard
  const lowNetLeaderboard = (() => {
    if (!players.length || !roundData.length) return [];
    return players.map(player => {
      let totalNet = 0;
      let holesPlayed = 0;
      rounds.forEach(round => {
        const rd = roundData.find(r => r.code === round.round_code);
        if (!rd?.data) return;
        const allPlayers = rd.data.allPlayers || [];
        // Match by name
        const rPlayer = allPlayers.find(p => p.name?.toLowerCase() === player.name?.toLowerCase());
        if (!rPlayer) return;
        const scores = rd.data.scores || {};
        const course = rd.data.course || {};
        // Calculate net score
        Object.entries(scores).forEach(([hole, holeScores]) => {
          const gross = holeScores[rPlayer.id];
          if (gross == null) return;
          const hcp = rPlayer.hcp || 0;
          // Simple net: gross - strokes received on this hole
          const courseHcpArr = course.hcp || [];
          const holeHcp = courseHcpArr[Number(hole) - 1] || 18;
          const strokes = Math.floor(hcp / 18) + (holeHcp <= (hcp % 18) ? 1 : 0);
          const net = gross - strokes;
          totalNet += net;
          holesPlayed++;
        });
      });
      return { ...player, totalNet, holesPlayed };
    }).filter(p => p.holesPlayed > 0).sort((a, b) => a.totalNet - b.totalNet);
  })();

  // Build Skins leaderboard — merge scores from all round codes
  const skinsLeaderboard = (() => {
    if (!players.length || !roundData.length) return { holeResults: [], playerTotals: [] };

    // Use trip player index as canonical ID
    const tripPlayers = players.map((p, i) => ({
      id: `trip-${i}`,
      name: p.name,
      hcp: Number(p.hcp_index) || 0,
    }));

    // Merge scores across all rounds — for each hole, find each trip player's score
    const mergedScores = {};
    const mergedCourse = { pars: Array(18).fill(4), hcp: Array(18).fill(0) };

    rounds.forEach(round => {
      const rd = roundData.find(r => r.code === round.round_code);
      if (!rd?.data) return;
      const rdCourse = rd.data.course || {};
      const rdScores = rd.data.scores || {};
      const rdPlayers = rd.data.allPlayers || [];

      // Use course from first round that has one
      if (rdCourse.pars?.length) {
        mergedCourse.pars = rdCourse.pars;
        mergedCourse.hcp = rdCourse.hcp || mergedCourse.hcp;
      }

      // Map round player IDs to trip player IDs by name match
      Object.entries(rdScores).forEach(([hole, holeScores]) => {
        const h = Number(hole);
        if (!mergedScores[h]) mergedScores[h] = {};
        Object.entries(holeScores).forEach(([rdPlayerId, score]) => {
          const rdPlayer = rdPlayers.find(p => p.id === rdPlayerId);
          if (!rdPlayer) return;
          const tripPlayer = tripPlayers.find(tp =>
            tp.name.toLowerCase() === rdPlayer.name?.toLowerCase()
          );
          if (!tripPlayer) return;
          mergedScores[h][tripPlayer.id] = score;
        });
      });
    });

    // Get skins config from trip games
    const skinsGame = games.find(g => g.game_type === "skins" && g.enabled);
    const skinsConfig = {
      skinsType: "pot",
      skinsGross: false,
      skinValueAmount: 5,
      skinCarryover: false,
      skinBirdie: false,
      skinBirdieDoubleCarryover: false,
      potDonation: 5,
      potType: "nocarryover",
      potBaseUnit: 1,
      ...(skinsGame?.config || {}),
    };

    try {
      const result = settleSkinsRound({
        players: tripPlayers,
        scores: mergedScores,
        course: mergedCourse,
        handicapMode: "full",
        skinsConfig,
      });

      const holeResults = result.holeResults || [];
      const playerTotals = tripPlayers.map(p => ({
        name: p.name,
        skinsWon: result.skinsWon?.[p.id] || 0,
        net: result.ledger?.[p.id] || 0,
      })).sort((a, b) => b.skinsWon - a.skinsWon || b.net - a.net);

      return { holeResults, playerTotals, totalPot: result.totalPot || 0, valuePerSkin: result.valuePerSkin || 0 };
    } catch (e) {
      return { holeResults: [], playerTotals: [], totalPot: 0, valuePerSkin: 0 };
    }
  })();

  const enabledGames = games.filter(g => g.enabled);
  const activeGame = enabledGames.find(g => g.game_type === view) || enabledGames[0];

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "16px", fontFamily: "Georgia, serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: sc.muted, fontSize: 14, cursor: "pointer", padding: 0 }}>← Trips</button>
        <h2 style={{ margin: 0, color: sc.green, fontSize: 18 }}>{trip.name}</h2>
        <button onClick={onEdit} style={{ background: "none", border: `1px solid ${sc.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: sc.muted }}>Edit</button>
      </div>

      {/* Round codes summary */}
      <Card style={{ marginBottom: 12 }}>
        <SectionLabel>Rounds</SectionLabel>
        {rounds.length === 0 ? (
          <div style={{ color: sc.muted, fontSize: 13 }}>No rounds added yet — edit trip to add rounds.</div>
        ) : (
          rounds.map(r => {
            const rd = roundData.find(d => d.code === r.round_code);
            const holesPlayed = rd ? Object.keys(rd.data?.scores || {}).length : 0;
            return (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, padding: "8px 10px", background: "#f9fafb", borderRadius: 6 }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>Round {r.round_number}</span>
                  {r.course_name && <span style={{ fontSize: 12, color: sc.muted, marginLeft: 8 }}>{r.course_name}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {r.round_code && <span style={{ fontFamily: "monospace", fontSize: 12, color: sc.ink }}>{r.round_code}</span>}
                  {holesPlayed >= 18
                    ? <span style={{ fontSize: 11, background: "#137333", color: "#fff", padding: "2px 6px", borderRadius: 10 }}>✅</span>
                    : holesPlayed > 0
                    ? <span style={{ fontSize: 11, color: sc.muted }}>{holesPlayed}/18</span>
                    : <span style={{ fontSize: 11, color: sc.muted }}>No scores</span>
                  }
                </div>
              </div>
            );
          })
        )}
      </Card>

      {/* Game tabs */}
      {enabledGames.length > 0 && (
        <div style={{ display: "flex", overflowX: "auto", gap: 8, marginBottom: 12, paddingBottom: 4 }}>
          {enabledGames.map(g => {
            const label = GAME_TYPES.find(gt => gt.key === g.game_type)?.label || g.game_type;
            return (
              <button key={g.game_type} onClick={() => setView(g.game_type)} style={{
                padding: "7px 14px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                background: view === g.game_type ? sc.green : "#fff",
                color: view === g.game_type ? "#fff" : sc.ink,
                border: `1px solid ${view === g.game_type ? sc.green : sc.border}`,
                borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
              }}>{label}</button>
            );
          })}
        </div>
      )}

      {/* Low Net leaderboard */}
      {view === "low_net" && (
        <Card>
          <SectionLabel>Low Net — Cumulative</SectionLabel>
          {loading ? (
            <div style={{ color: sc.muted, fontSize: 13, textAlign: "center", padding: 20 }}>Loading scores…</div>
          ) : lowNetLeaderboard.length === 0 ? (
            <div style={{ color: sc.muted, fontSize: 13, textAlign: "center", padding: 20 }}>No scores yet — link round codes to see standings.</div>
          ) : (
            lowNetLeaderboard.map((p, i) => {
              const vsLeader = i === 0 ? null : p.totalNet - lowNetLeaderboard[0].totalNet;
              return (
                <div key={p.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 0", borderBottom: i < lowNetLeaderboard.length - 1 ? `1px solid ${sc.border}` : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                      background: i === 0 ? "#b5882a" : "#e5e7eb", color: i === 0 ? "#fff" : sc.ink,
                      fontWeight: 700, fontSize: 13,
                    }}>{i + 1}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: sc.muted }}>{p.holesPlayed} holes · HCP {p.hcp_index}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: sc.green }}>{p.totalNet}</div>
                    {vsLeader !== null && <div style={{ fontSize: 11, color: sc.muted }}>+{vsLeader}</div>}
                  </div>
                </div>
              );
            })
          )}

          {/* Payout preview */}
          {activeGame && lowNetLeaderboard.length > 0 && (() => {
            const pot = players.filter(p => p.name).length * Number(activeGame.entry_fee || 0);
            if (!pot) return null;
            return (
              <div style={{ marginTop: 12, padding: 10, background: "#f9fafb", borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: sc.muted, textTransform: "uppercase", marginBottom: 6 }}>Projected Payouts (${pot} pot)</div>
                {activeGame.payout_pcts.slice(0, Math.min(activeGame.payout_places, lowNetLeaderboard.length)).map((pct, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
                    <span style={{ color: sc.muted }}>{i + 1}{["st","nd","rd","th"][i] || "th"} — {lowNetLeaderboard[i]?.name}</span>
                    <span style={{ fontWeight: 600, color: sc.green }}>${(pot * pct / 100).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </Card>
      )}

      {/* Other games - coming soon */}
      {view === "skins" && (
        <Card>
          <SectionLabel>Skins — Net</SectionLabel>
          {loading ? (
            <div style={{ color: sc.muted, fontSize: 13, textAlign: "center", padding: 20 }}>Loading scores…</div>
          ) : skinsLeaderboard.playerTotals.length === 0 ? (
            <div style={{ color: sc.muted, fontSize: 13, textAlign: "center", padding: 20 }}>No scores yet.</div>
          ) : (
            <>
              {/* Hole by hole results */}
              <div style={{ marginBottom: 14 }}>
                {skinsLeaderboard.holeResults.map(h => (
                  <div key={h.hole} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${sc.border}`, fontSize: 13 }}>
                    <span style={{ color: sc.muted }}>Hole {h.hole}</span>
                    {h.winnerId ? (
                      <span style={{ fontWeight: 700, color: sc.green }}>
                        {players[parseInt(h.winnerId.replace("trip-", ""))]?.name || h.winnerId}
                        {h.carryover > 0 ? ` (carried ${h.carryover})` : ""}
                      </span>
                    ) : (
                      <span style={{ color: sc.muted }}>{h.tied ? "Tied" : "Incomplete"}{h.carryover > 0 ? ` · ${h.carryover} carried` : ""}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Pot summary */}
              {skinsLeaderboard.totalPot > 0 && (
                <div style={{ fontSize: 13, color: sc.muted, marginBottom: 10, padding: "8px 0", borderBottom: `1px solid ${sc.border}` }}>
                  Total pot: <strong style={{ color: sc.ink }}>${skinsLeaderboard.totalPot.toFixed(2)}</strong>
                  {skinsLeaderboard.valuePerSkin > 0 && (
                    <span> · ${skinsLeaderboard.valuePerSkin.toFixed(2)} per skin</span>
                  )}
                </div>
              )}

              {/* Player totals */}
              <SectionLabel>Skins Won</SectionLabel>
              {skinsLeaderboard.playerTotals.map((p, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < skinsLeaderboard.playerTotals.length - 1 ? `1px solid ${sc.border}` : "none", fontSize: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 24, height: 24, borderRadius: "50%", background: i === 0 ? sc.gold : "#e5e7eb", color: i === 0 ? "#fff" : sc.ink, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{i + 1}</span>
                    <span style={{ fontWeight: p.skinsWon > 0 ? 700 : 400 }}>{p.name}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontWeight: 700, color: p.skinsWon > 0 ? sc.green : sc.muted }}>{p.skinsWon} skin{p.skinsWon !== 1 ? "s" : ""}</span>
                    <span style={{ fontSize: 12, color: p.net >= 0 ? sc.green : "#b3261e", marginLeft: 8 }}>{p.net >= 0 ? `+$${p.net.toFixed(2)}` : `-$${Math.abs(p.net).toFixed(2)}`}</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </Card>
      )}

      {view !== "low_net" && view !== "skins" && (
        <Card>
          <SectionLabel>{GAME_TYPES.find(g => g.key === view)?.label}</SectionLabel>
          <div style={{ color: sc.muted, fontSize: 13, textAlign: "center", padding: 24 }}>
            Leaderboard coming soon for this game type.
          </div>
        </Card>
      )}

      <button onClick={load} style={{
        width: "100%", padding: "10px", fontSize: 13, fontWeight: 600,
        background: "#fff", color: sc.green, border: `1px solid ${sc.green}`,
        borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
      }}>↻ Refresh Scores</button>
    </div>
  );
}

// ── MAIN TRIP SCREEN ──────────────────────────────────────────────────────────
export default function TripScreen({ deviceId, onBack }) {
  const [view, setView] = useState("list"); // list | setup | leaderboard
  const [selectedTrip, setSelectedTrip] = useState(null);

  if (view === "setup") {
    return (
      <TripSetupView
        deviceId={deviceId}
        trip={selectedTrip}
        onBack={() => { setView("list"); setSelectedTrip(null); }}
        onSaved={async (tripId) => {
          const t = await fetchTrip(tripId);
          setSelectedTrip(t);
          setView("leaderboard");
        }}
      />
    );
  }

  if (view === "leaderboard") {
    return (
      <TripLeaderboardView
        trip={selectedTrip}
        onBack={() => { setView("list"); setSelectedTrip(null); }}
        onEdit={() => setView("setup")}
      />
    );
  }

  return (
    <TripListView
      deviceId={deviceId}
      onSelect={t => { setSelectedTrip(t); setView("leaderboard"); }}
      onCreate={() => { setSelectedTrip(null); setView("setup"); }}
    />
  );
}
