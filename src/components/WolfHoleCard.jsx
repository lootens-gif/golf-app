import { useMemo } from "react";

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
  blindDeclared: false,
  shucked: false,
  hammerMultiplier: 1,
  hammerResolution: "played_out", // "played_out" | "rejected"
  concededBy: null,               // "small" | "big" — only set if rejected
  showMoreHammer: false,
};

export function getWolfHoleConfig(wolfHoles, hole) {
  return { ...DEFAULT_WOLF_HOLE_CONFIG, ...(wolfHoles?.[hole] || {}) };
}

/**
 * Derives the Wolf format for a hole from its raw config.
 * Mirrors the priority order in the spec: Blind Lone Wolf > Shuck > Pack Wolf > Lone Wolf.
 */
export function getWolfFormat(config) {
  if (config.blindDeclared) return "blind";
  if (config.shucked) return "shuck";
  if (config.partnerId) return "pack";
  return "lone";
}

export default function WolfHoleCard({
  currentHole,
  players = [],          // rotation-order active players (5)
  wolfHoles = {},         // { [hole]: config }
  onUpdateWolfHole,       // (hole, updates) => void
  hammerEnabled = false,
}) {
  const wolfIndex = useMemo(() => {
    if (!players.length) return 0;
    return (currentHole - 1) % players.length;
  }, [currentHole, players.length]);

  const wolf = players[wolfIndex];
  const others = players.filter((_, i) => i !== wolfIndex);
  const config = getWolfHoleConfig(wolfHoles, currentHole);
  const format = getWolfFormat(config);

  if (!wolf || players.length !== 5) {
    return (
      <div style={{ background: sc.redLight, border: `1px solid ${sc.red}`, borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 13, color: sc.red }}>
        Wolf needs exactly 5 active players to show hole details.
      </div>
    );
  }

  const update = (updates) => onUpdateWolfHole(currentHole, updates);

  const partner = config.partnerId ? players.find((p) => p.id === config.partnerId) : null;

  return (
    <div style={{ background: "#fff", border: `1px solid ${sc.border}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: sc.ink }}>Hole {currentHole} — Wolf</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: sc.green }}>{wolf.name}</div>
      </div>

      {/* Blind Lone Wolf declare */}
      <button
        onClick={() => update(
          config.blindDeclared
            ? { blindDeclared: false }
            : { blindDeclared: true, partnerId: null, shucked: false }
        )}
        style={{
          width: "100%", padding: "8px 10px", marginBottom: 12,
          fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
          borderRadius: 8,
          border: config.blindDeclared ? `1px solid ${sc.accent}` : `1px dashed ${sc.border}`,
          background: config.blindDeclared ? sc.accentLight : "#fafafa",
          color: config.blindDeclared ? sc.accent : sc.muted,
        }}
      >
        {config.blindDeclared ? "✓ Blind Lone Wolf declared — tap to undo" : "Declare Blind Lone Wolf (before anyone hits)"}
      </button>

      {!config.blindDeclared && (
        <>
          <div style={{ fontSize: 12, color: sc.muted, marginBottom: 6 }}>Partner</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, marginBottom: 10 }}>
            {others.map((p) => {
              const selected = config.partnerId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => update({ partnerId: selected ? null : p.id, shucked: false })}
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

          {config.partnerId && (
            <div
              onClick={() => update({ shucked: !config.shucked })}
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

      {/* Format summary */}
      <div style={{ fontSize: 11, color: sc.muted, marginBottom: hammerEnabled ? 12 : 0, paddingTop: 8, borderTop: `1px solid ${sc.border}` }}>
        {format === "blind" && "Blind Lone Wolf · 1v4 · 3x"}
        {format === "shuck" && `${partner?.name || "Partner"} shucked · playing alone vs. everyone else · 2x`}
        {format === "pack" && partner && `Pack Wolf · ${wolf.name} + ${partner.name} vs. the other 3`}
        {format === "lone" && "Lone Wolf · 1v4"}
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
