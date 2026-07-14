import { useMemo, useState } from "react";
import { getSuperWolfHittingOrder, SUPER_WOLF_ORDER_MODES } from "../../engine/scoringEngine";

const sc = {
  green:      "#1a5c35",
  greenLight: "#f0f7f3",
  gold:       "#b8952a",
  ink:        "#1a1a1a",
  muted:      "#6b7280",
  border:     "#d1d5db",
  red:        "#b3261e",
  redLight:   "#fef2f2",
  accent:     "#0a5cff",
  accentLight:"#eaf1ff",
};

const HAMMER_QUICK = [2, 4];
const HAMMER_MORE = [8, 16, 32];

const DEFAULT_WOLF_HOLE_CONFIG = {
  partnerId: null,
  loneWolfDeclared: false,   // declared solo right after own tee shot, before watching others
  blindWolfDeclared: false,  // declared solo before even own tee shot
  shucked: false,
  hammerMultiplier: 1,
  hammerResolution: "played_out", // "played_out" | "rejected"
  concededBy: null,               // "small" | "big" — only set if rejected
  showMoreHammer: false,
  confirmed: false, // true once ANY real Wolf decision was made for this hole — the light hard block checks this before allowing save
};

export function getWolfHoleConfig(wolfHoles, hole) {
  return { ...DEFAULT_WOLF_HOLE_CONFIG, ...(wolfHoles?.[hole] || {}) };
}

/**
 * Light hard block (Tim's call, July 2026): a Wolf hole can't save until
 * SOMETHING was explicitly decided — a partner, Lone/Blind Wolf, or the
 * explicit "Wolf plays alone" confirm button. Distinguishes "confirmed
 * solo is correct" from "nobody looked at this hole at all," since Pack
 * Wolf is the common case (~90%) and an untouched default silently
 * defaulting to solo would usually be wrong, not just occasionally.
 */
export function isWolfHoleConfirmed(wolfHoles, hole) {
  return !!getWolfHoleConfig(wolfHoles, hole).confirmed;
}

/**
 * Derives the Wolf format for a hole from its raw config.
 * Format keys match the engine exactly: "pack" | "solo" | "loneWolf" | "blindWolf" | "shuck".
 * Priority: Blind Wolf > Lone Wolf > Shuck > Pack > Solo (default).
 */
export function getWolfFormat(config) {
  if (config.blindWolfDeclared) return "blindWolf";
  if (config.loneWolfDeclared) return "loneWolf";
  if (config.shucked) return "shuck";
  if (config.partnerId) return "pack";
  return "solo";
}

export default function WolfHoleCard({
  currentHole,
  players = [],          // rotation-order active players (5)
  wolfHoles = {},         // { [hole]: config }
  onUpdateWolfHole,       // (hole, updates) => void
  hammerEnabled = false,
  isSuperWolf = false,
  overrideWolfId = null,       // Super Wolf: who's actually Wolf this hole (from standings, not rotation)
  rankedStandings = null,      // Super Wolf: [{playerId, standing}, ...] worst to best
  superWolfBetAmount = null,   // Super Wolf: this hole's free-form bet amount
  onChangeSuperWolfBetAmount,  // Super Wolf: (hole, amount) => void
  teamGameUnitAmount = 5,      // the round's base bet — used for the "Standard" preset
  hittingOrderMode = "standard", // Super Wolf: one of SUPER_WOLF_ORDER_MODES, from Setup
}) {
  const [showCustomKeypad, setShowCustomKeypad] = useState(false);
  const wolfIndex = useMemo(() => {
    if (!players.length) return 0;
    return (currentHole - 1) % players.length;
  }, [currentHole, players.length]);

  const wolf = isSuperWolf
    ? (overrideWolfId ? players.find((p) => p.id === overrideWolfId) : null)
    : players[wolfIndex];
  const others = wolf ? players.filter((p) => p.id !== wolf.id) : players;
  const config = getWolfHoleConfig(wolfHoles, currentHole);
  const format = getWolfFormat(config);
  const declaredSolo = config.loneWolfDeclared || config.blindWolfDeclared;

  if (players.length !== 5) {
    return (
      <div style={{ background: sc.redLight, border: `1px solid ${sc.red}`, borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 13, color: sc.red }}>
        Wolf needs exactly 5 active players to show hole details.
      </div>
    );
  }
  if (!wolf) {
    return (
      <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 13, color: "#92400e" }}>
        Can't assign Super Wolf yet — finish scoring holes 1-15 first so there's a standing to rank.
      </div>
    );
  }

  const update = (updates) => onUpdateWolfHole(currentHole, updates);
  const partner = config.partnerId ? players.find((p) => p.id === config.partnerId) : null;
  const nameOf = (id) => players.find((p) => p.id === id)?.name || id;

  // Super Wolf bet presets — rankedStandings[0] is always the worst-off
  // player (the one who just became Super Wolf), so "full/half down"
  // pulls straight from what's already shown on screen, no math for the
  // user. Everything here is rounded to a whole dollar — a decimal bet
  // amount was a real, confirmed bug (payouts came out in cents).
  const worstDeficit = rankedStandings?.length ? Math.abs(rankedStandings[0].standing) : 0;
  // Full/Half Down show the REAL number, cents and all — nobody's
  // negotiating a bet at the tee, this is just "make me whole" pulled
  // straight from the standings. Only Standard and Custom stay whole
  // dollars, since those ARE something a person actually says out loud.
  const fullDownAmount = worstDeficit ? Math.round(worstDeficit * 100) / 100 : null;
  const halfDownAmount = worstDeficit ? Math.round((worstDeficit / 2) * 100) / 100 : null;
  const standardBase = Math.round(Number(teamGameUnitAmount) || 0) || null;
  const currentAmount = superWolfBetAmount != null && superWolfBetAmount !== "" ? Number(superWolfBetAmount) : null;
  // Which multiple of the standard bet the CURRENT stored value matches, IF
  // it's actually one this cycle button could have produced (1x, 2x, or
  // 3x). Any other divisible value — a stale Custom entry, leftover test
  // data, anything — is NOT "Standard was tapped N times," it just
  // happens to divide evenly. Treating every divisible value as a valid
  // multiple was a real bug: a leftover $990 with a $5 base read as
  // "198x Standard" instead of correctly starting fresh at 1x.
  const derivedMultiple = standardBase && currentAmount != null && currentAmount % standardBase === 0
    ? currentAmount / standardBase
    : 0;
  const currentStandardMultiple = (derivedMultiple >= 1 && derivedMultiple <= 3) ? derivedMultiple : 0;
  const setBetAmount = (amount) => {
    setShowCustomKeypad(false);
    onChangeSuperWolfBetAmount?.(currentHole, String(amount));
  };
  const tapStandard = () => {
    const nextMultiple = currentStandardMultiple >= 1 && currentStandardMultiple < 3 ? currentStandardMultiple + 1 : 1;
    setBetAmount(standardBase * nextMultiple);
  };

  // Hitting order is purely informational — it never affects money, since
  // scores get entered after the fact either way. Standard and Rank By
  // Deficit are fully computed, no input needed. Wolf Controls needs the
  // Scorekeeper to tap in the order Super Wolf actually calls out at the
  // tee, so it's stored per-hole and can be changed by tapping again.
  const otherFourIds = others.map((p) => p.id);
  const rotationOrderIds = players.map((p) => p.id);
  const wolfStandingsMap = {};
  (rankedStandings || []).forEach((r) => { wolfStandingsMap[r.playerId] = r.standing; });
  const manualOrder = config.superWolfManualOrder || null;
  const hittingOrder = isSuperWolf
    ? getSuperWolfHittingOrder(hittingOrderMode, otherFourIds, {
        rotationOrder: rotationOrderIds, wolfStandings: wolfStandingsMap, manualOrder,
      })
    : null;
  const tapManualOrderPlayer = (playerId) => {
    const current = config.superWolfManualOrder || [];
    const next = current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId];
    update({ superWolfManualOrder: next });
  };

  const declareButton = (key, label, sublabel) => {
    const active = config[key];
    return (
      <button
        onClick={() => update(
          active
            ? { [key]: false, confirmed: false }
            : {
                loneWolfDeclared: false,
                blindWolfDeclared: false,
                [key]: true,
                partnerId: null,
                shucked: false,
                confirmed: true,
              }
        )}
        style={{
          padding: "8px 6px", fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
          borderRadius: 8, textAlign: "center",
          border: active ? `1px solid ${sc.accent}` : `1px dashed ${sc.border}`,
          background: active ? sc.accentLight : "#fafafa",
          color: active ? sc.accent : sc.muted,
        }}
      >
        {active ? `✓ ${label}` : label}
        <div style={{ fontSize: 9, fontWeight: active ? 700 : 400, marginTop: 1 }}>
          {active ? "tap to undo" : sublabel}
        </div>
      </button>
    );
  };

  return (
    <div style={{ background: "#fff", border: `1px solid ${sc.border}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
      {isSuperWolf && (
        <div style={{ background: sc.redLight, border: `1px solid ${sc.red}`, borderRadius: 8, padding: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: sc.red, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Super Wolf — standings before this hole
          </div>
          {rankedStandings && rankedStandings.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              {rankedStandings.map((r, i) => (
                <div key={r.playerId} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0", fontWeight: i === 0 ? 700 : 400 }}>
                  <span style={{ color: sc.ink }}>{i === 0 ? "🐺 " : ""}{nameOf(r.playerId)}</span>
                  <span style={{ color: r.standing < 0 ? sc.red : r.standing > 0 ? sc.green : sc.muted }}>
                    {r.standing < 0 ? `-$${Math.abs(r.standing).toFixed(2)}` : r.standing > 0 ? `+$${r.standing.toFixed(2)}` : "$0.00"}
                  </span>
                </div>
              ))}
            </div>
          )}
          <label style={{ display: "block", fontSize: 12, color: sc.ink, marginBottom: 4 }}>
            Dollar value for this hole
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, marginBottom: showCustomKeypad ? 10 : 0 }}>
            {[
              { key: "full", label: "Full down", amount: fullDownAmount },
              { key: "half", label: "Half down", amount: halfDownAmount },
            ].map(({ key, label, amount }) => {
              const active = amount != null && currentAmount === amount;
              return (
                <button
                  key={key}
                  disabled={amount == null}
                  onClick={() => setBetAmount(amount)}
                  style={{
                    padding: "10px 6px", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                    cursor: amount == null ? "default" : "pointer", borderRadius: 8, textAlign: "center",
                    border: active ? `1px solid ${sc.accent}` : `1px solid ${sc.border}`,
                    background: active ? sc.accentLight : "#fff",
                    color: amount == null ? sc.muted : active ? sc.accent : sc.ink,
                    opacity: amount == null ? 0.5 : 1,
                  }}
                >
                  {label}{amount != null ? ` · $${amount.toFixed(2)}` : ""}
                </button>
              );
            })}
            <button
              disabled={!standardBase}
              onClick={tapStandard}
              style={{
                padding: "10px 6px", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                cursor: standardBase ? "pointer" : "default", borderRadius: 8, textAlign: "center",
                border: currentStandardMultiple > 0 ? `1px solid ${sc.accent}` : `1px solid ${sc.border}`,
                background: currentStandardMultiple > 0 ? sc.accentLight : "#fff",
                color: !standardBase ? sc.muted : currentStandardMultiple > 0 ? sc.accent : sc.ink,
                opacity: standardBase ? 1 : 0.5,
              }}
            >
              {currentStandardMultiple > 1 ? `${currentStandardMultiple}x Standard` : "Standard"}
              {standardBase ? ` · $${standardBase * (currentStandardMultiple || 1)}` : ""}
              <div style={{ fontSize: 9, fontWeight: 400, marginTop: 1 }}>tap again for 2x, 3x</div>
            </button>
            <button
              onClick={() => {
                const opening = !showCustomKeypad;
                // Clear whatever a previous preset tap already stored, so
                // Custom always starts blank instead of forcing a backspace
                // before you can type a fresh number.
                if (opening) onChangeSuperWolfBetAmount?.(currentHole, "");
                setShowCustomKeypad(opening);
              }}
              style={{
                padding: "10px 6px", fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
                borderRadius: 8, textAlign: "center",
                border: showCustomKeypad ? `1px solid ${sc.accent}` : `1px solid ${sc.border}`,
                background: showCustomKeypad ? sc.accentLight : "#fff",
                color: showCustomKeypad ? sc.accent : sc.ink,
              }}
            >
              Custom{currentAmount != null && currentStandardMultiple === 0 && currentAmount !== fullDownAmount && currentAmount !== halfDownAmount ? ` · $${currentAmount}` : ""}
            </button>
          </div>

          {showCustomKeypad && (
            <div>
              <div style={{ textAlign: "center", fontSize: 24, fontWeight: 700, color: sc.ink, padding: "8px 0", background: "#fff", borderRadius: 8, marginBottom: 8, border: `1px solid ${sc.border}` }}>
                ${superWolfBetAmount || "0"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      const next = (superWolfBetAmount || "") + String(num);
                      onChangeSuperWolfBetAmount?.(currentHole, String(Math.round(Number(next)) || 0));
                    }}
                    style={{
                      padding: "14px 8px", fontSize: 20, fontWeight: 700,
                      border: `1px solid ${sc.border}`, borderRadius: 10,
                      background: "#fff", color: sc.ink, cursor: "pointer", lineHeight: 1, fontFamily: "inherit",
                    }}
                  >{num}</button>
                ))}
                <button
                  type="button"
                  onClick={() => onChangeSuperWolfBetAmount?.(currentHole, "")}
                  style={{
                    padding: "14px 8px", fontSize: 13, fontWeight: 700,
                    border: `1px solid ${sc.border}`, borderRadius: 10,
                    background: "#fafafa", color: sc.muted, cursor: "pointer", fontFamily: "inherit",
                  }}
                >Clear</button>
                <button
                  type="button"
                  onClick={() => {
                    const next = (superWolfBetAmount || "") + "0";
                    onChangeSuperWolfBetAmount?.(currentHole, String(Math.round(Number(next)) || 0));
                  }}
                  style={{
                    padding: "14px 8px", fontSize: 20, fontWeight: 700,
                    border: `1px solid ${sc.border}`, borderRadius: 10,
                    background: "#fff", color: sc.ink, cursor: "pointer", lineHeight: 1, fontFamily: "inherit",
                  }}
                >0</button>
                <button
                  type="button"
                  onClick={() => {
                    const str = String(superWolfBetAmount || "");
                    onChangeSuperWolfBetAmount?.(currentHole, str.slice(0, -1));
                  }}
                  style={{
                    padding: "14px 8px", fontSize: 16, fontWeight: 700,
                    border: `1px solid ${sc.border}`, borderRadius: 10,
                    background: "#fafafa", color: sc.muted, cursor: "pointer", fontFamily: "inherit",
                  }}
                >⌫</button>
              </div>
            </div>
          )}

          <div style={{ borderTop: `1px solid ${sc.red}`, marginTop: 12, paddingTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: sc.red, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Hitting order (doesn't affect money)
            </div>
            {hittingOrderMode === SUPER_WOLF_ORDER_MODES.WOLF_CONTROLS ? (
              <>
                <div style={{ fontSize: 12, color: sc.ink, marginBottom: 8 }}>
                  Tap in the order Super Wolf calls out, one at a time.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                  {others.map((p) => {
                    const position = (manualOrder || []).indexOf(p.id);
                    const tapped = position !== -1;
                    return (
                      <button
                        key={p.id}
                        onClick={() => tapManualOrderPlayer(p.id)}
                        style={{
                          padding: "10px 6px", fontSize: 13, fontWeight: tapped ? 600 : 400, fontFamily: "inherit",
                          cursor: "pointer", borderRadius: 8, textAlign: "center",
                          border: tapped ? `1.5px solid ${sc.red}` : `1px solid ${sc.border}`,
                          background: tapped ? sc.redLight : "#fff",
                          color: tapped ? sc.red : sc.ink,
                        }}
                      >
                        {tapped ? `${position + 1}. ` : ""}{p.name}
                      </button>
                    );
                  })}
                </div>
                {(!manualOrder || manualOrder.length < 4) && (
                  <div style={{ fontSize: 11, color: sc.muted, marginTop: 6 }}>
                    {4 - (manualOrder || []).length} more to tap.
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 13, color: sc.ink }}>
                {(hittingOrder || []).map((id, i) => `${i + 1}. ${nameOf(id)}`).join("  ·  ")}
              </div>
            )}
          </div>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: sc.ink }}>Hole {currentHole} — Wolf</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: sc.green }}>{wolf.name}</div>
      </div>

      {/* Declare solo — two distinct tiers, based on WHEN it's declared */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
        {declareButton("loneWolfDeclared", "Lone Wolf", "after own shot")}
        {declareButton("blindWolfDeclared", "Blind Wolf", "before own shot")}
      </div>

      {!declaredSolo && (
        <>
          <div style={{ fontSize: 12, color: sc.muted, marginBottom: 6 }}>Partner</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, marginBottom: 6 }}>
            {others.map((p) => {
              const selected = config.partnerId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => update({ partnerId: selected ? null : p.id, shucked: false, confirmed: true })}
                  style={{
                    padding: "10px 0", fontSize: 13, fontWeight: selected ? 600 : 400,
                    borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                    border: selected ? `1.5px solid ${sc.accent}` : `1px solid ${sc.border}`,
                    background: selected ? sc.accentLight : "#fff",
                    color: selected ? sc.accent : sc.ink,
                  }}
                >
                  {p.name}
                </button>
              );
            })}
          </div>

          {!config.partnerId && (
            <button
              onClick={() => update({ confirmed: true })}
              style={{
                width: "100%", padding: "9px 0", fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
                borderRadius: 8, marginBottom: 10, textAlign: "center",
                border: config.confirmed ? `1px solid ${sc.accent}` : `1px dashed ${sc.border}`,
                background: config.confirmed ? sc.accentLight : "#fafafa",
                color: config.confirmed ? sc.accent : sc.muted,
              }}
            >
              {config.confirmed ? "✓ Confirmed — Solo Wolf" : "No partner — confirm Solo Wolf"}
            </button>
          )}

          {config.partnerId && (
            <div
              onClick={() => update({ shucked: !config.shucked, confirmed: true })}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: config.shucked ? sc.redLight : "#fafafa",
                borderRadius: 8, padding: "8px 12px", marginBottom: 12, cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 13, color: config.shucked ? sc.red : sc.muted, fontWeight: config.shucked ? 600 : 400 }}>
                {partner?.name} shucked
              </span>
              <div
                style={{
                  width: 40, height: 24, borderRadius: 12, position: "relative",
                  background: config.shucked ? sc.red : "#d1d5db",
                }}
              >
                <span style={{
                  position: "absolute", top: 2, width: 18, height: 18, borderRadius: "50%", background: "#fff",
                  left: config.shucked ? 18 : 2, transition: "left 0.15s",
                }} />
              </div>
            </div>
          )}
        </>
      )}

      {/* Format summary — tier name only, no multiplier shown here since
          the actual $ multiplier depends on Wolf Style (Harrison vs.
          Classic), which is a Setup-level choice, not per-hole. */}
      <div style={{ fontSize: 11, color: sc.muted, marginBottom: hammerEnabled ? 12 : 0, paddingTop: 8, borderTop: `1px solid ${sc.border}` }}>
        {format === "blindWolf" && `${wolf.name} — Blind Wolf · 1v4`}
        {format === "loneWolf" && `${wolf.name} — Lone Wolf · 1v4`}
        {format === "shuck" && `${partner?.name || "Partner"} shucked ${wolf.name} · Wolf plays alone vs. everyone, 1v4`}
        {format === "pack" && partner && `Pack Wolf · ${wolf.name} + ${partner.name} vs. the other 3`}
        {format === "solo" && `${wolf.name} — Solo Wolf · 1v4`}
      </div>

      {/* Hammer entry */}
      {hammerEnabled && (
        <div>
          <div style={{ fontSize: 12, color: sc.muted, marginBottom: 6 }}>Hammer</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: config.hammerMultiplier > 1 ? 10 : 0 }}>
            {HAMMER_QUICK.map((m) => (
              <button
                key={m}
                onClick={() => update({ hammerMultiplier: config.hammerMultiplier === m ? 1 : m, showMoreHammer: false })}
                style={{
                  padding: "10px 0", fontSize: 13, fontWeight: config.hammerMultiplier === m ? 600 : 400,
                  borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                  border: config.hammerMultiplier === m ? `1.5px solid ${sc.accent}` : `1px solid ${sc.border}`,
                  background: config.hammerMultiplier === m ? sc.accentLight : "#fff",
                  color: config.hammerMultiplier === m ? sc.accent : sc.ink,
                }}
              >
                {m}x
              </button>
            ))}
            <button
              onClick={() => update({ showMoreHammer: !config.showMoreHammer })}
              style={{
                padding: "10px 0", fontSize: 13, borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                border: HAMMER_MORE.includes(config.hammerMultiplier) ? `1.5px solid ${sc.accent}` : `1px solid ${sc.border}`,
                background: HAMMER_MORE.includes(config.hammerMultiplier) ? sc.accentLight : "#fff",
                color: HAMMER_MORE.includes(config.hammerMultiplier) ? sc.accent : sc.ink,
              }}
            >
              {HAMMER_MORE.includes(config.hammerMultiplier) ? `${config.hammerMultiplier}x` : "More"}
            </button>
          </div>

          {config.showMoreHammer && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 10 }}>
              {HAMMER_MORE.map((m) => (
                <button
                  key={m}
                  onClick={() => update({ hammerMultiplier: m, showMoreHammer: false })}
                  style={{
                    padding: "8px 0", fontSize: 12, borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                    border: config.hammerMultiplier === m ? `1.5px solid ${sc.accent}` : `1px solid ${sc.border}`,
                    background: config.hammerMultiplier === m ? sc.accentLight : "#fff",
                    color: config.hammerMultiplier === m ? sc.accent : sc.ink,
                  }}
                >
                  {m}x
                </button>
              ))}
            </div>
          )}

          {config.hammerMultiplier > 1 && (
            <div style={{ borderTop: `1px solid ${sc.border}`, paddingTop: 10 }}>
              <div style={{ fontSize: 12, color: sc.muted, marginBottom: 6 }}>How did it end?</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                <button
                  onClick={() => update({ hammerResolution: "played_out", concededBy: null })}
                  style={{
                    padding: "9px 0", fontSize: 12, fontWeight: config.hammerResolution === "played_out" ? 600 : 400,
                    borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                    border: config.hammerResolution === "played_out" ? `1.5px solid ${sc.accent}` : `1px solid ${sc.border}`,
                    background: config.hammerResolution === "played_out" ? sc.accentLight : "#fff",
                    color: config.hammerResolution === "played_out" ? sc.accent : sc.ink,
                  }}
                >
                  Played out
                </button>
                <button
                  onClick={() => update({ hammerResolution: "rejected" })}
                  style={{
                    padding: "9px 0", fontSize: 12, fontWeight: config.hammerResolution === "rejected" ? 600 : 400,
                    borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                    border: config.hammerResolution === "rejected" ? `1.5px solid ${sc.red}` : `1px solid ${sc.border}`,
                    background: config.hammerResolution === "rejected" ? sc.redLight : "#fff",
                    color: config.hammerResolution === "rejected" ? sc.red : sc.ink,
                  }}
                >
                  Rejected
                </button>
              </div>

              {config.hammerResolution === "rejected" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, marginTop: 8 }}>
                  <button
                    onClick={() => update({ concededBy: "small" })}
                    style={{
                      padding: "8px 0", fontSize: 12, borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                      border: config.concededBy === "small" ? `1.5px solid ${sc.red}` : `1px solid ${sc.border}`,
                      background: config.concededBy === "small" ? sc.redLight : "#fff",
                      color: config.concededBy === "small" ? sc.red : sc.ink,
                    }}
                  >
                    {wolf.name}{partner ? ` + ${partner.name}` : ""} conceded
                  </button>
                  <button
                    onClick={() => update({ concededBy: "big" })}
                    style={{
                      padding: "8px 0", fontSize: 12, borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                      border: config.concededBy === "big" ? `1.5px solid ${sc.red}` : `1px solid ${sc.border}`,
                      background: config.concededBy === "big" ? sc.redLight : "#fff",
                      color: config.concededBy === "big" ? sc.red : sc.ink,
                    }}
                  >
                    Opponents conceded
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
