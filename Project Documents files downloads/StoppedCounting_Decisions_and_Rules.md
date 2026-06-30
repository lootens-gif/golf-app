# StoppedCounting — Decisions, Bugs & Rules Reference
*Extracted from full development session transcript — June 2026*

---

## 1. Every Bug Fixed

### Course Library

**Bug: Extra 19th hole on course save (loadCourse off-by-one)**
- **What broke:** When loading a course from the library, `loadCourse` in `SetupScreen.jsx` passed `i + 1` (1-based) to `updateCoursePar/updateCourseHcp`, but those functions use 0-based array indexing. Result: hole 1 data went to index 1, leaving index 0 empty, and a 19th entry was written to index 18.
- **Root cause:** Index mismatch between load function (1-based) and setter functions (0-based).
- **Fix:** Changed `loadCourse` to pass `i` instead of `i + 1` in `SetupScreen.jsx`.
- **Also fixed in SQL:** Existing Westwood data in Supabase had a 19th null-hole entry — trimmed with `array_agg(x) ... limit 18`.

**Bug: Course search required typing before showing results**
- **What broke:** Users had to type at least 2 characters before courses appeared. Biro didn't know he needed to type.
- **Fix:** Auto-trigger search with `%` (all courses) on focus/tab switch. Course field now auto-opens on Setup load if no course is selected.

**Bug: Duplicate course save silently overwrote existing**
- **What broke:** `saveCourseToLibrary` used `upsert` with `onConflict: "name"` — typing "Westwood" would silently replace the real Westwood data.
- **Fix:** Added `checkCourseExists` check before save. If name matches, show yellow warning with "Load existing" option instead of overwriting.

**Bug: `fetchRecentRounds` not filtered by device_id**
- **What broke:** The "Continue a recent round?" restore list showed any device's recent rounds, not just the current device's.
- **Fix:** Added `.eq("device_id", deviceId)` filter to `fetchRecentRounds` in `roundSync.js`.

---

### Press Trigger

**Bug: Global `pressTrigger` not syncing to teamGames objects**
- **What broke:** Tapping Press Trigger 1 or 2 in Setup updated the global `pressTrigger` React state, but each team game object has its own `pressTrigger` field that the engine reads (`game.pressTrigger ?? 1`). These were never synced.
- **Root cause:** Two separate sources of truth. Engine reads `game.pressTrigger`. UI updates `pressTrigger` state. Neither knew about the other.
- **Fix 1:** Button tap now runs `setTeamGames(prev => prev.map(g => ({ ...g, pressTrigger: n })))` alongside `setPressTrigger(n)`.
- **Fix 2:** `createDefaultTeamGame` now includes `pressTrigger: 1` (was `undefined`).
- **Fix 3:** All 3 snapshot restore paths (`applyRoundSnapshot`, `loadRound`, etc.) now also sync `pressTrigger` into `teamGames`.
- **Fix 4:** Template load (`handleLoadTemplate`) also syncs `pressTrigger`.

---

### Birdie Rendering & Payouts

**Bug: `birdieEnabled` missing from 5p and 4p teamGameResults return objects**
- **What broke:** Team game scorecard showed "No Birdies Tracked" even when the birdie toggle was ON. `teamGameResults` had 4 return code paths (5p, 4p, 3p, other) but only 2 included `birdieEnabled`. 5p and 4p (most common modes) always got `undefined` → `false`.
- **Fix:** All 4 return paths in the `teamGames.map()` in App.jsx now include `birdieEnabled: enableTeamGame && birdiesEnabled`.

**Bug: Team game birdie $$ showing in 1v1 column instead of Team column**
- **What broke:** All birdie results went into `ledgerMap[playerId].birdies` which was then combined with `sideMatches` in the display. Team game birdies appeared in the 1v1 column.
- **Fix:** Engine now routes by `source` field on birdie results: `"match-birdie"` → `sideMatches`, `"team-birdie"` → `mainGame`. Legacy entries (no source) stay in `birdies` only (no routing) to avoid breaking existing tests.

**Bug: Standings double-counting birdies**
- **What broke:** `SettlementSection.jsx` displayed `sideMatches + birdies` for the 1v1 column. But after routing fix, match birdies were ALSO added to `sideMatches`. Result: match birdie $$ counted twice.
- **Fix:** Display now shows `mainGame` for Team column and `sideMatches` for 1v1 column. No `birdies` added separately since routing already puts them in the correct bucket.

**Bug: Team birdie results had no `source`, `holeNumber`, or `matchupId` fields**
- **What broke:** Birdie tag filtering in AuditTrail couldn't identify which entries were team birdies or which matchup they belonged to.
- **Fix:** `buildTeamBirdieResults` now pushes `{ playerId, amount, holeNumber, source: "team-birdie", matchupId: match.label }` on every result entry.

**Bug: Mutual gross birdie (both players birdie same hole) not detected as push**
- **What broke:** `wonBirdieCounts` in `OneVOneScorecard` only checked for Toy Rule net birdie pushes. If both players made gross birdies on the same hole, neither was detected as a push — the first player was still counted as a winner.
- **Fix:** Added check: if opponent also made gross birdie on same hole → neither wins (mutual push), regardless of Toy Rule.

**Bug: Birdie tag showing wrong count in wheel game sub-rows**
- **What broke:** Sub-row birdie tag counted all positive `birdieResults` entries for teamA players, but Jon/Bishale appeared in ALL 3 matchups — so their entries were counted 3× per hole.
- **Fix:** Filter by `matchupId === matchup.label` to count only entries specific to that matchup.

**Bug: Birdie header tag `++$` double sign**
- **What broke:** `formatMoney()` already adds `+` or `-` sign. Code was also prepending `netBirdieDollarsHeader >= 0 ? "+" : ""` before calling `formatMoney`, causing `++$10`.
- **Fix:** Removed redundant sign prefix before `formatMoney()` calls.

---

### 9-Point Scorecard

**Bug: Running dollar totals showing large negatives after 1 hole (sectionAvg used all 9 holes)**
- **What broke:** `sectionAvg` was calculated as `3 × sectionHoles.length` (always 27 for 9 holes). After hole 1, each player's running total was subtracted against 27 expected points, giving -$24/-$22/-$26.
- **Fix:** Count only played holes: `const playedHolesInSection = sectionHoles.filter(h => players.some(p => scores?.[h.hole]?.[p.id] != null)).length`.

**Bug: Leaderboard and scorecard showing different dollar amounts for 9-point**
- **What broke:** Leaderboard used `balancesByPlayerId` from payout transactions (pairwise). Scorecard used net-vs-average. Both are mathematically valid but showed different numbers mid-round (e.g., +$6 vs +$2 after 2 holes).
- **Resolution:** Pairwise transaction math is correct. After 2 holes Josh=8pts, Alan=6pts, Denny=4pts: D pays J $(8-4)×rate, D pays A $(6-4)×rate, A pays J $(8-6)×rate. Both leaderboard and scorecard now use pairwise.

**Bug: 9-point birdie double triggered when ANY player made a gross birdie (anyBirdie)**
- **What broke:** `anyBirdie = birdieDoublePoints && playerIds.some(id => gross < par)` — fired if any player made a gross birdie, even if that player didn't win the hole. Hole 1: Harrison birdie, Jon net tie = 2x fired when it shouldn't.
- **Fix:** Replaced with `winnerMadeGrossBirdie`: multiplier only applies if (1) unique hole winner exists AND (2) the winner's gross score < par.

**Bug: 9-point points display showing double (20 instead of 10)**
- **What broke:** `dollarVal = pts * betAmt` where `pts` already includes the birdie double multiplier from the engine (e.g., 10 for birdie-doubled 5pts). Multiplying by `betAmt` again gave `10 × 2 = 20`.
- **Fix:** Display now shows raw points from `h.pointsByPlayerId[player.id]` directly without multiplying by `betAmt`.

**Bug: 9-point running total showing separate Front 9 / Back 9 amounts instead of full 18**
- **What broke:** `renderSection` used per-section balances (pairwise transactions for that 9 only), so front 9 showed front 9 balance and back 9 showed back 9 balance separately.
- **Fix:** Both sections now show `fullRoundBalances` from `result.payout.balancesByPlayerId` — the full-round cumulative balance from the engine.

---

### Team Game Settlement

**Bug: Solo player in 3-player game paying wrong amount (2v1 settlement)**
- **What broke:** In a 2v1 (Josh/Denny vs Alan), when Josh/Denny won 2 bets at $5 each = $10 dollars, Alan was paying -$10 total instead of -$20. Each winner should receive $10 from Alan.
- **Root cause:** Engine gave Alan `-dollars` (one payout amount) instead of `-dollars × teamACount`.
- **Fix:** `teamBShare = dollars * teamACount / teamBCount`. Alan (solo, teamBCount=1) pays `$10 × 2 / 1 = $20`. Josh and Denny each receive `teamAShare = $10`.

---

### NET Column (Total Scorecard)

**Bug: NET column using betting handicap mode instead of full handicap**
- **What broke:** The NET column in Total Scorecard used whatever `handicapMode` was set for betting (e.g., "relative" = net from lowest). But NET should always show gross minus full course handicap.
- **Fix:** `AuditTrail.jsx` now always uses `'full'` for net strokes in the scorecard NET column regardless of the round's `handicapMode`.

---

### iOS / localStorage Reliability

**Bug: Rounds disappearing when iOS Safari clears localStorage**
- **What broke:** iOS Safari aggressively clears localStorage under memory pressure. Round codes were only generated on "Start Round" tap, so rounds without codes had no Supabase backup.
- **Fix 1:** Round code now generated in `handlePlayerChange` when the first player name is entered (not on "Start Round"). Supabase backup starts earlier.
- **Fix 2:** `fetchRecentRounds` now filters by `device_id` so only the device's own rounds appear.
- **Fix 3:** Recent rounds list now sorted newest first, scrollable (max-height 50vh), and filters out empty rounds (0 holes played).

---

### Group Templates

**Bug: Search Public tab showed nothing without typing**
- **What broke:** Results only rendered when `searchQuery.length >= 1`. Users didn't know they needed to type.
- **Fix:** Auto-trigger search with empty query when switching to Search Public tab. Results display without requiring any typed input.

**Bug: Loading a public template didn't switch to My Templates tab**
- **What broke:** After loading a public template, users were still on the Search Public tab with no obvious way to save it.
- **Fix:** Auto-switch to My Templates tab after loading a public template.

**Bug: Template save didn't include course**
- **What broke:** `buildTemplatePayload` saved players and game config but not the course. Loading a template loaded players but left course blank.
- **Fix:** Added `course` field to `buildTemplatePayload`. `handleLoadTemplate` now calls `setCourse(template.course)` if course exists.

---

### Admin Screen

**Bug: Admin screen holes played count inaccurate**
- **What broke:** `holesPlayed` calculation used wrong logic for the score structure.
- **Fix:** Now uses `Object.keys(d.scores || {}).length` to count hole entries directly.

---

## 2. Design Decisions and WHY

### Score Format: Hole-First (CRITICAL)
- **Decision:** `{ holeNumber: { playerId: score } }` — hole first, player second
- **Why:** Engine's `getRawScore(scores, hole, playerId)` reads `scores[hole][playerId]`. This was set early and everything depends on it. Violating this causes all scores to be null silently.
- **Rule:** Never use player-first format. All tests use hole-first.

### Supabase for Templates: Public/Private Toggle
- **Decision:** Templates stored in Supabase (not localStorage), private by default, creator can toggle public.
- **Why:** localStorage is device-only — Biro can't load Tim's template on his phone. Supabase allows sharing. At small scale (5-10 users), RLS complexity isn't worth it yet.
- **Pattern:** Same as course library — private to device_id, searchable when public.

### Course Ownership: Device-Based, Not Account-Based
- **Decision:** Course creator = `device_id` match. Same device = free edit. Different device = admin PIN required.
- **Why:** No accounts yet. device_id is the only identity signal available. Good enough for small group.

### Admin PIN: Hard-coded in File
- **Decision:** Admin PIN is `"1234"` defined as constant in `AdminScreen.jsx` line 6.
- **Why:** No need for a config UI at this scale. Easy to change by editing the file. Keeps code simple.

### Team Game Birdies: Separate Bucket, No BIRDS Column
- **Decision:** Birdies route to `mainGame` (team) or `sideMatches` (1v1) in the ledger. No separate BIRDS column in standings.
- **Why:** Biro liked the removed BIRDS column because birdies showed in 1v1 (accidentally, due to a bug). When the bug was fixed, the column was left removed — it added noise without adding clarity. The $ amounts speak for themselves.
- **CRITICAL:** Do NOT add birdie amounts back into the display columns separately — they're already included in mainGame/sideMatches.

### 9-Point Gold Birdie Rendering: Intentional
- **Decision:** 9-point scorecard birdie circles are gold/yellow, not green.
- **Why:** The 9-point scorecard has heavy color coding (green for winner, red for loser, yellow for second). Green birdie circles would visually conflict with the winner coloring. Gold was intentional for contrast.
- **Rule:** Do NOT change 9-point birdie circle color. The 1v1 scorecard uses green circles; 9-point uses gold. Different screens, different color contexts.

### 9-Point Birdie Double: Winner-Only Rule
- **Decision:** The 2x birdie multiplier only fires when (1) there is a unique hole winner AND (2) that winner's gross score < par.
- **Why confirmed by Biro:** On hole 1, Harrison had a gross birdie but tied on net with Jon → no 2x. The multiplier rewards winning with a birdie, not just making one.

### No Default Course (Removed Westwood Default)
- **Decision:** Removed the hardcoded Westwood default in `createDefaultCourse()`. All users must select from library.
- **Why:** Westwood was hardcoded for Biro's convenience but confused Josh (no Westwood at Kiawah). The auto-open course search makes selection just as easy. Group Templates solve the Biro case — loading his template restores Westwood automatically.

### Round Code Generated Early
- **Decision:** Generate round code when first player name is entered, not when "Start Round" is tapped.
- **Why:** iOS Safari can clear localStorage at any time. Generating the code early means Supabase backup starts before scoring begins, preventing data loss if the app is killed.

### Settle-Up: Pool Model for Josh
- **Decision:** Josh's trip uses a pool model ($45/player, Josh pays winners from pool). App shows who won what per game; Josh handles Venmo manually.
- **Why:** Cross-player Venmo is complex at 24 players. Josh's current workflow: collect $45 each, pay out from pool. The app doesn't need to generate payment instructions — just accurate settlement amounts per game.

### Trip Architecture: Pre-Generated Round Codes (Golf Genius Model)
- **Decision:** Josh creates trip in Trip Setup → generates round codes night before → players receive code on scorecard → enter code to start scoring.
- **Why:** Same pattern as Golf Genius (industry standard). Enables 4 foursomes to score simultaneously without coordinator involvement. Trip leaderboard pulls all codes automatically.

### AuditSection: noStorage for Inner Match Sections
- **Decision:** Inner match sections (each individual matchup within a team game) do not persist open/closed state to localStorage.
- **Why:** Root cause of "expands too far" bug — once opened, localStorage remembered the state and auto-expanded every subsequent visit. Outer section (Team Game / 1v1 Matches) still persists.

---

## 3. Guards and Validations Added

### Before Starting a Round
- **Unnamed players warning:** If any player has a placeholder name (P1, P2 etc.), warns before starting: "2 players have no name. Continue anyway?"
- **Duplicate round warning:** If scores exist but no round code, warns before creating a new one: "You have scores entered but no active round code. Starting now will create a new round."
- **Team game hours check:** Cannot start if total team game holes exceed 18 or equal 0.
- **Duplicate player guard:** Team selectors block the same player appearing in two teams (shows red warning).

### Team Assignment Guard
- **Behavior:** Before advancing from hole 6 to 7 (game 0→1) or hole 12 to 13 (game 1→2), checks if next segment has valid team assignments. If not, shows team assignment modal.
- **Known issue:** Guard fires for 4p and 5p transitions but 3-player mode transition (hole 6→7) has an edge case — the `nextGameIndex > 0` condition was removed but 3p may still not prompt correctly in all cases.

### Course Save Duplicate Protection
- Checks `checkCourseExists(name)` before saving a new course. If name already exists, shows yellow warning with Load existing option. Does not allow silent overwrite.

### Course Update Ownership
- Update button only appears when a course was loaded from the library (`loadedCourse` state set).
- Same device as creator → free update (no PIN).
- Different device → requires admin PIN.

### Max Score Cap: 9
- All score entry capped at 9 gross per hole. Built into ScoreEntryCard.

---

## 4. Features Explicitly NOT Built or Deferred

### Par 3s Game (Deferred)
- **Status:** Discussed architecture, not built. Cumulative net on par 3 holes only, across all rounds of a trip. 75/25 payout.
- **Why deferred:** Trip leaderboard architecture needed first. Josh's trip is the primary use case.

### 1v1 Press (Deferred)
- **Status:** Not built. Press trigger in Setup only applies to team games.
- **Why:** Press in 1v1 matches requires wiring `playPressMatch` into `computeStandardMatch`. Low priority for current users — Biro's group uses team game press more than 1v1 press.

### Vegas Doubles (Deferred)
- **Status:** Formula known (`low × 10 + high`, 99 if either ≥ 10), not built.
- **Why:** Waiting on Josh call to confirm team pairing logic across rounds.

### Modified Stableford (Deferred)
- **Status:** Not built. Need exact points scale from Josh (eagle/birdie/par/bogey/double values).

### Scramble Scoring (Deferred)
- **Status:** Confirmed as standalone game that does NOT feed individual leaderboards. Not built.

### Multi-Year Handicap History (Deferred)
- **Status:** Josh's #4 HCP source, most time-consuming to build. Deferred to Phase 2.

### Player Accounts / Auth (Phase 2)
- **Decision:** Deliberately not built. Device ID is sufficient for current scale.
- **Why:** Auth complexity not worth it yet. When accounts exist, templates/courses/history become private to the creator automatically.

### Export Round to CSV (Deferred)
- **Status:** Josh requested. Not built. Score data structure is in Supabase — extraction query exists.

### Real-time Multiplayer on Trip Leaderboard (Deferred)
- **Decision:** Manual refresh (poll on button tap), not automatic websocket updates.
- **Why:** Josh confirmed refresh-on-tap is acceptable for trip leaderboard. Real-time adds complexity without meaningful benefit at 4 foursomes scale.

### Tee Selection Per Player (Deferred)
- **Status:** Stored as "Default Tees" on trip round, not per-player. Per-player tee needed for USGA course handicap calculator.
- **Why:** Josh's mixed tees (seniors moving up) is a real need but the handicap calculator hasn't been built yet.

---

## 5. Behaviors Confirmed as Intentional

### `fetchRecentRounds` Shows All Recent Rounds (Before Fix)
- **Was:** Showed any device's recent rounds. **Now fixed** to filter by device_id. But if `device_id` is null on old rounds, they won't appear in restore list — this is acceptable.

### Joiner Always Lands on Results Screen
- **Intentional:** When joining with a round code, `setScreen("results")` not `"live"`. Joiners are watchers, not scorers.

### `skipScreen=true` on Polling/Visibility Fetches
- **Intentional:** Prevents joiners from being kicked back to setup when a fresh sync occurs.

### Timestamp Guard on Supabase Restore
- **Intentional:** `if (remote.savedAt > local.savedAt) apply` — stale fetch never overwrites newer local data. Prevents sync race conditions.

### 9-Point Scorecard Shows Total Pts at Bottom
- **Intentional:** Biro asked for this. "Total Pts: Bishale 78 Harrison 72 Jon 66" appears above the birdie summary.

### Standing Card: No `+` Before Points
- **Intentional:** Points are always positive in 9-point (5+3+1=9 every hole). The `+` prefix was removed from the standing card as redundant.

### Press Trigger Only for Team Games (NOT 1v1)
- **Intentional (current state):** The `pressTrigger` UI setting in Setup only affects team game wheel matches. 1v1 press is on the backlog. Biro's group uses team game press; 1v1 press is secondary.

### NET Column Always Full Handicap
- **Intentional:** The NET column in Total Scorecard always uses full course handicap (gross - full HCP strokes) regardless of what betting handicap mode (relative/full) was selected. Betting mode only affects who gets strokes vs whom in competition.

### `birdiesEnabled` Uses Global Toggle (Not Per-Game)
- **Intentional:** There is no per-team-game birdie toggle in Setup — one global birdie toggle applies to all team games. The per-game `game.birdieEnabled` in teamGameResults reflects `enableTeamGame && birdiesEnabled`.

### Scramble Does Not Feed Individual Leaderboards
- **Confirmed by logic (pending Josh call):** Scramble uses a team score — can't attribute individual stats. Standalone game only.

### `AuditSection` Outer Sections Persist State to localStorage
- **Intentional:** "Team Game" and "1v1 Matches" section open/close states ARE persisted to localStorage. Inner match sections are NOT (see noStorage fix). This gives consistent top-level UX while preventing the "everything auto-expands" bug.

---

## 6. Scoring Rule Clarifications

### From Biro

**Toy Rule (net birdie push):**
- Rule: If opponent makes a net birdie on a hole where you made a gross birdie, it's a push — neither player wins the birdie bet.
- Applicable to: 1v1 matches with Toy Rule toggle ON.
- Does NOT apply to: Team game birdies (no Toy Rule in team game context).

**Birdie double in 9-point:**
- Current: Birdie = 2x points (5→10, 3→6, 1→2).
- Eagle: Currently also 2x (same as birdie). Eagle multiplier (3x?) PENDING Biro confirmation.
- Rule confirmed: 2x only fires if the UNIQUE hole winner made a gross birdie. Tie for first = no multiplier regardless.

**Eagle in 1v1 birdie bet:**
- PENDING Biro confirmation. Does eagle = 2x birdie payout, or same as birdie?

**Mutual gross birdie = push:**
- Confirmed behavior: If both players make gross birdies on the same hole in a 1v1 match, it's a push — neither wins the birdie bet.

**Eagle rendering:**
- Added: Double concentric green circles (inner + outer ring) for eagle in 9-point scorecard when `birdieDoublePoints` is ON.

### From Josh

**Max score per hole: 9 gross**
- Rule: Regardless of handicap, max score entered is 9. Pace of play rule. App already enforces this.

**Handicap source priority:**
1. USGA/GHIN index
2. Company golf league index × 2 + 1
3. Alternate tracking device
4. Calculated from past 3 years of Ironhorse trip (holes adjusted for max scores)

**Payout structure (confirmed from spreadsheet analysis):**
- Standard: 50% / 25% / 16.7% / 8.3% for 4 places
- Ties: Combine place amounts and split equally
- Pool model: Total pot = players × entry fee. Josh pays from pool.

**Scramble:**
- Round 2 only at Ironhorse trip.
- Standalone — does NOT feed individual games.
- Team payout: 1st place all 4 players each get $40, 2nd place all 4 get $20.

**Par 3 game (confirmed from spreadsheet):**
- Cumulative net score on all par 3 holes across all 4 rounds.
- Payout: 1st $60 (50%), 2nd $30 (25%), 3rd tie split $15 each.

**Live leaderboard:**
- Pull-on-refresh is acceptable. No need for real-time websockets.

**Pool settlement:**
- Josh collects $45/player upfront. Pays from pool after trip. No cross-player Venmo.

---

## 7. Warnings — Things to Remember

### Score Format Can Never Change
- **Warning:** The hole-first score format `{ holeNumber: { playerId: score } }` is baked into the engine, tests, and Supabase data. Changing it would break everything. Tests verify this format. Never assume player-first.

### Admin PIN is Not Secure
- **Warning:** "1234" in `AdminScreen.jsx` line 6. It's a speed bump, not real security. At current scale this is fine. If app goes public, this needs changing.

### Vercel Deploy is Safe Mid-Round
- **Warning given:** Pushing to main triggers Vercel rebuild (60-90 seconds). Active rounds are in localStorage/memory on users' devices — they are unaffected. The only risk is someone refreshing during the 60-90 second build window. Safe to deploy while rounds are active.

### `fetchRecentRounds` Device ID Filtering Requires Device ID on Round
- **Warning:** Rounds only appear in the restore list if they have a matching `device_id` in Supabase. Rounds saved before `shareRoundWithDevice` was added don't have `device_id` — they won't appear. This is expected, not a bug.

### TripScreen Lint: ESLint Blocks Builds
- **Warning pattern:** TripScreen.jsx had `formatMoney`, `par`, and `pars` declared but never used. ESLint treats these as errors and blocks Vercel build. Always run `npm test` or check for unused vars before pushing any new file.

### Group Templates Need `course` Column in Supabase
- **Warning:** When we added course to `buildTemplatePayload`, the `group_templates` table didn't have a `course` column. Required SQL: `alter table group_templates add column if not exists course jsonb`. Existing templates were backfilled with Westwood.

### `buildTeamBirdieResults` Skips if `amount = 0`
- **Warning:** If `birdieBetAmount` is 0 or null, no team birdie results are generated. This can cause the birdie section to silently show nothing. Always verify `birdieBetAmount` is set when debugging missing team birdies.

### iOS Safari localStorage is Unreliable
- **Warning:** iOS Safari clears localStorage under memory pressure or when the user clears browser data. The early round code generation and Supabase fallback help but cannot guarantee 100% restore. Users should be told: enter at least one player name before leaving the app, as that's when Supabase backup begins.

### 9-Point is 3-Player Only
- **Warning:** `getNinePointHoleStatus` requires exactly 3 players. Engine validates this. Do not attempt to use 9-point with 2 or 4 players — it will return an error result.

### Team Birdie Source Field Required for Routing
- **Warning:** The ledger routing (`match-birdie` → sideMatches, `team-birdie` → mainGame) depends entirely on the `source` field on birdie result entries. Legacy entries with no `source` field are NOT routed — they stay in `birdies` bucket only. If a new birdie result type is added, it MUST include `source`.

### Supabase RLS: Disable vs Open Policy
- **Warning:** We disabled RLS on some tables early in development, then re-enabled with open anon policies. The approach used is: `enable row level security` + `create policy "Allow all" for all to anon using (true) with check (true)`. This satisfies Supabase's security warnings while keeping full anon access for the app.

---

## ⚠️ Uncertain Items (Flagged)

1. **Team assignment guard for 3-player mode** — The `nextGameIndex > 0` condition was removed but it's unclear if the guard reliably fires for the 3p mode hole 6→7 transition. Needs explicit testing with a 3-player round.

2. **Eagle multiplier in 9-point** — Currently 2x same as birdie. Biro was asked, answer pending. May need to be 3x.

3. **Eagle in 1v1 birdie bet** — Does eagle = 2x birdie payout (4x total vs par)? Pending Biro.

4. **Josh's doubles/Vegas team pairings** — It's unclear if doubles teams are always the same as foursomes or a separate blind draw each round. This determines whether the Trip Setup needs a separate pairing input per round.

5. **`sectionAvg` fix interaction with back 9 display** — The fix changed `sectionAvg` to count played holes only. This was confirmed working mid-round. However there's a separate issue where the display showed per-9 balances instead of full-18. Both were fixed independently — confirm they don't conflict at the back 9 / full round boundary.

6. **TripScreen Low Net leaderboard player matching** — Currently matches trip players to round players by name (case-insensitive). This could fail silently if Josh enters "Fryback, Joshua" in the trip but "Josh" in the round. Needs testing with real Josh data.
