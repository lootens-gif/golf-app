# Wolf Golf Game — Requirements Addendum (v2)
*Clarifications to the original Wolf Golf Game Rules & Program Specification, for StoppedCounting integration*
*Compiled June 2026*

This addendum resolves open questions from the original Wolf spec document and adapts it to fit StoppedCounting's existing architecture (Team Game structure, scoring engine, sync model). It should be read alongside the original spec — this doc does not repeat rules that are unchanged. **Team review requested on all items below before build begins.**

---

## 1. Terminology Change

**"Special Rule" (original Section 9) is renamed Super Wolf** throughout the app, code, and all future documentation. This refers to the end-of-round holes where the Wolf assignment is based on who's down the most money rather than standard rotation.

---

## 2. Scorekeeper Model — Single-Device, Live-Tapped ("Hybrid")

**Decision:** Wolf will be scored by **one Scorekeeper device per round**, tapped live hole-by-hole — the same model as the current Team Game "Wheel" format, where one person drives entry for the group.

This replaces two options that were considered and rejected:
- **Full real-time, multi-device enforcement** (every player's phone enforces turn order, Hammer offers sync live across devices) — rejected. This would require live state (open for the entire hole, not just at score entry) to stay correctly synced across up to 5 phones on a golf course — exactly the network conditions that have already caused mid-round sync failures with far simpler score-entry cases. Given on-course reliability is the top priority, this is not worth the risk.
- **Pure after-the-fact entry** (teams/Hammer/Shuck all entered retroactively after the hole, no live interaction) — also rejected, per team feedback that the group wants to tap through decisions live as they happen (partner picks, Shucks, Hammers), not reconstruct them afterward from memory.

**What the Scorekeeper flow looks like, hole by hole:**
1. Tee box screen shows the hole's Wolf (auto-set from rotation, or Super Wolf ranking on 16–18).
2. As each of the 4 other players hits, Scorekeeper taps: **Wolf choice for [Player] → Partner or Pass.**
3. If Partner is tapped and the Shuck toggle is ON: immediately prompt **Accept or Shuck** for that player.
4. If no partner is chosen after all 4 hit → format auto-locks to Lone Wolf.
5. Once format is locked, a **Hammer button** stays available for the rest of the hole (either side can tap it at any point before the next shot, per original spec Section 8B) — Accept doubles and passes the Hammer right to the other side; Reject ends the hole immediately at the pre-Hammer value.
6. If not conceded by Hammer rejection, gross scores are entered at the end like every other game, and the engine computes net scores, winner, points, and dollar swing per the original spec.

**This is all local to one device** — no mid-hole network calls or cross-device coordination required. The phone is simply replacing what one person currently tracks on paper, in real time, as it happens.

---

## 3. Backup / Re-Entry Reliability — Flagged for Exploration

Team feedback raised a real concern: even with a live Scorekeeper flow, the other 4 players won't fully trust a single phone as the only record — historically groups keep some form of paper backup, because without it a lost or crashed round means total data loss with real money on the line.

**This is worth exploring as part of Wolf's build, not just accepted as a permanent limitation:**
- The app already saves hole-by-hole to Supabase as the round progresses (not just at the end) — worth confirming this is granular enough that a crash mid-Wolf-hole doesn't lose more than the single in-progress hole.
- Consider whether Wolf's hole log (`holeLog[]` per original spec Section 14A) should be structured so a full round could be **100% manually re-entered** after the fact if the live device is lost entirely — i.e., is there a simple enough "type in what happened per hole" fallback path that doesn't require reconstructing complex live state?
- This may point to a broader reliability improvement (more bulletproof save/re-entry, independent of Wolf) rather than a Wolf-specific feature. Flagging here so it's tracked, not lost — **not proposing a specific fix yet**, just noting it needs its own scoping conversation.

---

## 4. Data Model Placement

**Decision:** Wolf will be built under the existing **"Wolf — Under Construction"** placeholder already present in the Team Game format options.

This confirms Wolf is a `teamGameFormat` value (alongside `press`, `standard`, `longshort`, `match_fbt`, `stroke`) rather than a standalone `gameType` like 9-point. Given its per-hole dynamic team structure doesn't fit the "fixed teams for a whole segment" shape the other formats share, Wolf's internal per-hole state (wolf index, partner index, format, hammer multiplier, etc. — see original spec Section 14B) will be Wolf-specific, but it plugs into the existing Team Game slot in Setup and Standings.

---

## 5. Handicap Mode Mapping

**Confirmed:** Wolf's two handicap methods map directly onto the app's existing modes:
- Wolf `GROSS` = app's existing `full` handicap mode
- Wolf `NET_DIFFERENTIAL` = app's existing `relative` handicap mode

No new handicap math is needed — `getHandicapStrokes()` is reused as-is.

---

## 6. Standings & Settlement Display

**Running totals (Standings screen):** Wolf's cumulative dollar position per player is calculated the same way as every other Team Game — a running sum of dollars won/lost per hole. **This reuses the existing Team column** in Standings, exactly like the 6/6/6 wheel game does today. No new display logic needed here.

**Final settlement ("who pays whom"):** This is a genuinely new piece. The original spec calls for **zero-out settlement**: the lowest (most negative) player is anchored to $0, and every other player pays the players above them the difference between their zeroed totals. This is a different transaction-generation method than 9-point's pairwise-by-rank settlement (which works off point differentials directly, with no zero-anchor step), and will require its own settlement function. Small in scope, but not a drop-in reuse of existing code.

**Example, for reference:**

| Player | Net Total | Zeroed | Pays |
|---|---|---|---|
| A (lowest) | -$14 | $0 | Receives from all others |
| B | -$7 | $7 | Pays A: $7 |
| C | $0 | $14 | Pays A: $14, B: $7 |
| D | +$5 | $19 | Pays A: $19, B: $12, C: $5 |
| E (highest) | +$13 | $27 | Pays A: $27, B: $20, C: $13, D: $8 |

---

## 7. Player Count

**Confirmed:** Wolf requires **exactly 5 active players**. The Wolf format option in Setup will be **disabled/greyed out** unless exactly 5 players are entered. 3-player and 4-player Wolf are backlogged (see Section 10).

---

## 8. Toggles Confirmed to Apply (Standardization)

The following existing app-wide settings apply to Wolf exactly as they do to other games — no Wolf-specific exceptions:
- **No Par 3 Strokes toggle** — applies to Wolf same as team games generally
- **Max score cap: 9 gross** — same as every other game (keypad/pace-of-play standard)

**Birdies are explicitly backlogged for Wolf v1.** No birdie side-bet layer (Toy Rule, mainGame/sideMatches routing) will be built into Wolf initially, given the game's existing complexity.

---

## 9. Super Wolf Rules (formerly "Section 9 — Special Rule")

### 9A. Rank Display
On the first Super Wolf hole's tee box (hole 16 in the standard 5-player/18-hole case), the app must display a **standings/rank view** — biggest loser at the top — *before* presenting that hole's Wolf assignment. This is a distinct moment in the flow: players need to see the money-down ranking that's about to determine who's Wolf.

### 9B. Super Wolf Hole Count — Parameterized
Rather than hardcoding "holes 16, 17, 18," the number of Super Wolf holes will be **computed** from total holes and player count, so every player gets an equal number of standard-rotation Wolf turns, with Super Wolf absorbing whatever holes are left over.

- 5 players / 18 holes (v1 case): 15 regular rotation holes (3 turns each) + **3 Super Wolf holes**
- Future (backlogged): different player counts or partial rounds would recompute this automatically (e.g., 4 players/18 holes → 16 regular + 2 Super Wolf)

**v1 scope:** Only the 5-player/18-hole case (15+3) needs to work at launch, but the underlying calculation should be built parameterized now rather than hardcoded, since it's cheap to do at build time and expensive to retrofit later.

### 9C. Super Wolf Hitting Order — Three Options
The original spec's binary "Wolf Controls Tee Order" toggle is expanded to a **three-way setting** for how the other 4 players hit during Super Wolf holes:

1. **Standard rotation order** (default/original spec behavior)
2. **Wolf Controls Tee Order** (already in original spec — Super Wolf picks the order)
3. **NEW: Rank order by $$ down** — other 4 players hit in order from most-down to least-down (2nd-most-down hits first, closest-to-even hits right before the Wolf)

In all three modes, **the Wolf always hits last**, unchanged from the original spec.

**Tiebreak:** Ties in $$ down are broken by standard rotation position (same tiebreak rule already used for Super Wolf assignment itself).

**Direction confirmed:** Worst-to-best (most-down hits first among the 4 non-Wolf players).

---

## 10. Backlog (Explicitly Deferred, Not v1)

- Birdies/eagles in Wolf
- Partial rounds (fewer than 18 total holes) — Super Wolf hole count math should still work when this is built, per the parameterized approach in Section 9B
- 3-player and 4-player Wolf modes
- Fully distributed multi-device live play (if ever revisited — not currently planned; see Section 2)
- Bulletproof save / 100% re-entry capability — flagged in Section 3 as worth its own scoping conversation, potentially a broader reliability project beyond Wolf specifically

---

## 11. Summary of Build Scope (v1)

Wolf v1 = a new Team Game format, run by a single live Scorekeeper device (same model as the existing Wheel game), for exactly 5 players, exactly 18 holes, reusing existing handicap and max-score logic, reusing the existing Standings Team column, with one new settlement function (zero-out) and one new Super Wolf sub-flow (rank display + 3-way hitting order + parameterized hole count, hardcoded to 15+3 for now).

No cross-device real-time sync required for the Wolf decision sequence itself — only the same round-level sync the app already does for score entry.
