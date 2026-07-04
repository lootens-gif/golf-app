# StoppedCounting — Critical Guards & Known Landmines
*Last updated: June 2026*

---

## CRITICAL GUARDS — Never Remove or Change Without Understanding Why

### 1. Press Holes Validation (App.jsx — startRound)
**Guard:** `totalHoles > 18` and `totalHoles === 0` checks apply to **press format only**
**Why:** Press (6/6/6) had a bug where segments could add up to holes 19, 20+ and score those phantom holes. The >18 guard prevents it.
**Critical:** Non-press formats (Long/Short, Match Play, Stroke, Net Holes) do NOT use this guard — they always cover holes 1-18 regardless of the `holes` field on teamGames.

### 2. matchup.result Is Not Always An Array (App.jsx, AuditTrail.jsx, scoringEngine.js)
**Guard:** `getMatchUnits(result)` helper — always use this, never do `result.reduce()` or `result.filter()` directly on matchup.result
**Why:** Press format = result is an ARRAY of bet objects. Non-press formats (Long/Short, Match Play, Stroke) = result is an OBJECT with `{type, total, segments}`. Calling `.reduce()` on an object crashes the app with blank screen.
**Files:** App.jsx (4 places), AuditTrail.jsx (2 places), DebugPanel.jsx (2 places), scoringEngine.js (1 place)

### 3. Course Lock During Round (App.jsx — applyRoundSnapshot)
**Guard:** `if (round.course && (!skipScreen || !roundInProgress)) setCourse(round.course)`
**Why:** Background sync was overwriting the selected course mid-round. Once a round is in progress (lastHoleSaved != null or scores exist), course must never be overwritten by sync.
**Related:** CourseCard useEffect must NOT call `handleSearch("")` on mount — that clears course name via `updateCourseName("")`.

### 4. CourseCard handleSearch Must Not Clear Course Name (SetupScreen.jsx)
**Guard:** `if (q !== "") updateCourseName(capped)` — never call updateCourseName with empty string
**Why:** Old code called `handleSearch("")` on mount which called `updateCourseName("")` clearing the course name on every SetupScreen mount — including team transition at holes 6/7 and 12/13.

### 5. justRestoredRef — Restore Must Not Overwrite Itself (App.jsx)
**Guard:** `justRestoredRef.current = true` before `setAutoRestoreComplete(true)`, skips first AUTO_ROUND_KEY write
**Why:** After `applyRoundSnapshot`, React state updates are batched but not immediately committed. The useEffect that writes `buildCurrentRoundSnapshot()` to localStorage fired 250ms later with stale state (screen="setup", bet=$5, empty teams) — overwriting the good restored data. On next refresh, this bad snapshot was loaded.

### 6. Relative Handicap Uses Only Match Players (scoringEngine.js)
**Guard:** Pass only `matchPlayers` (2 players for 1v1, 3 for 9-point) to `getHandicapBase` and `isNetBirdie`
**Why:** In relative mode, `getHandicapBase` finds the minimum HCP across ALL players to set the baseline. Passing the full 5-player array made Lootens (HCP 8) the baseline for a Cahill/Toy match, giving both 14-15 strokes instead of 0 and 1.

### 7. Spread Handicap Only For Team Games (scoringEngine.js, App.jsx)
**Guard:** `getHandicapStrokesFn` spread override applies to team game calculations ONLY — 1v1 matches always use standard `getHandicapStrokes`
**Why:** Spread distributes strokes evenly across 6-hole segments, not by hole difficulty. 1v1 matches were getting spread strokes applied which put dots on wrong holes and broke net birdie calculations.
**Also:** TotalScorecard always uses `getHandicapStrokesFn={null}` (standard) — never pass the spread function to it.

### 8. Birdie Routing (scoringEngine.js, App.jsx)
**Guard:** 
- match-birdie → `sideMatches` bucket only
- team-birdie → `birdies` bucket only (NOT mainGame — causes double count in standings)
- nine-point-birdie → `mainGame` bucket
**Why:** Team birdies were polluting the `mainGame` bucket before team game match settlement ran, corrupting the Standings TEAM column.

### 9. Matches Guard — Stale Sync Cannot Reduce Match Count (App.jsx)
**Guard:** `skipScreen && round.matches.length < prev.length ? prev : round.matches`
**Why:** Background sync with an older snapshot was wiping matches that had been added locally during the round.

### 10. Segment Birdie Amounts Filter By Hole Range Only (App.jsx)
**Guard:** `segmentBirdieAmounts` computed in App.jsx filtering by hole range ONLY — not by matchup label
**Why:** Matchup labels ("Team 1 vs Team 2") are IDENTICAL across all 3 press segments. Filtering by label picked up birdies from all segments, tripling the amounts. Hole ranges are unique per segment.

### 11. Score Format Is Hole-First (everywhere)
**Guard:** `scores[holeNumber][playerId]` — NEVER `scores[playerId][holeNumber]`
**Why:** Every function in the scoring engine and rendering assumes hole-first. Inverting this breaks all score lookups silently.

### 12. Visibility Change Refetch — Joiner Only (App.jsx)
**Guard:** Visibility change listener triggers refetch for joiners ONLY — host is excluded
**Why:** Host was getting mid-entry score overwrites when they switched tabs and came back. Stale Supabase data was overwriting scores being entered.

### 13. isEnteringScore Ref Blocks Syncs (App.jsx, ScoreEntryCard.jsx)
**Guard:** `isEnteringScore.current` blocks syncs for 2s after any keypad tap
**Why:** Score entry sync collisions were causing score loss on slow connections.

---

## POSSIBLY CRITICAL — Needs Verification

### A. teamGames teams Field Preservation On Format Change
When switching team game format (e.g. Long/Short → Match Play), teams must be preserved. `setTeamGames(prev => [...])` using `prev[i]?.teams` to carry over selections.
*Not sure if there's an edge case where reset IS correct.*

### B. 9-Point Gold Birdie Rendering
Gold filled circle = birdie that triggered points doubling in 9-point game. Green circle = regular birdie. Do NOT standardize to green everywhere — the gold has semantic meaning.
*Documented in project summary but worth flagging here.*

### C. roundSync.js searchCourses Has No LIMIT
Removed `.limit(10)` from searchCourses query. If course library grows to 100+ courses this could be slow. May need pagination or limit+search eventually.

### D. teamGameUnitAmount Stored As String vs Number
`if (typeof round.teamGameUnitAmount === "number")` check was failing when value stored as string "10" vs number 10. Fixed to `Number(round.teamGameUnitAmount)` but worth watching for other numeric state that might have same issue.

### E. getHandicapBase With Empty/Falsy HCP
`Number(player.hcp) || 0` — player with HCP=0 (legitimate) and player with HCP="" (not set) both return 0. This means unset HCP players are treated as scratch. May be correct behavior but could cause confusion if someone forgets to set HCP.

### F. Background Sync TeamGames Teams Guard
`skipScreen && !hasRestoredTeams` prevents stale sync overwriting team selections. But the logic checks if incoming has no teams AND local has teams. Edge case: what if teams ARE in the sync but are wrong (from a different session)?

### G. Stale /src/AuditTrail.jsx File
There is a stale `src/AuditTrail.jsx` (wrong location). The correct file is `src/components/AuditTrail.jsx`. The stale file is not imported anywhere but could cause confusion. Should be deleted but hasn't been to avoid any risk.

### H. Press Custom Starting Hole
Press format validates totalHoles ≤ 18 but has no "starting hole" field. A custom 5/5/5 press starting on hole 4 can't be configured. Holes 1-3 would be unscored. This is a known gap — not a guard but a missing feature that could cause scoring confusion.

### I. Plus Handicap Storage
Plus handicaps stored as negative numbers (-3 = +3 handicap). `getHandicapBase` uses `Math.max(0, playerHcp - low)` which handles this correctly. But anywhere that displays HCP must check `if (hcp < 0) show "+{abs}"` — not just `{hcp}`.

### J. Non-Press Team Game totalHoles
For non-press formats, `teamGames[0].holes` defaults to 6 (from press default). `totalHoles` = 6 for these formats. The holes validation now skips non-press, but any OTHER code that reads `totalHoles` for non-press may get wrong values. Check before adding new logic that uses `totalHoles`.


---

## ADDITIONAL CRITICAL GUARDS — From Earlier Session History (June 2026, pre-this-session)

### 14. getSpreadHandicapStrokes Does NOT Accept noPar3Strokes
**Guard:** `getSpreadHandicapStrokes(playerId, hole, players, course, handicapMode)` — 5 params only, no noPar3Strokes
**Why:** Any code calling the spread function must check `noPar3Strokes && par === 3` BEFORE calling it, never expect the function itself to handle it. Confirmed correct in `getNetScore` (scoringEngine.js) and `formatScoreWithStrokeDots` (AuditTrail.jsx) — any NEW code calling spread must replicate this pattern.

### 15. context.players vs activePlayers — Don't Mix Them Up
**Guard:** `context.players` = full players array (scoring engine relative HCP baseline). `activePlayers` = filtered/active subset (display).
**Why:** `getSpreadHandicapStrokes` needs the FULL players array to find the correct lowest HCP for relative mode. Passing `activePlayers` instead of `context.players` can silently produce wrong relative baseline if any players are filtered out.

### 16. context useMemo Must Run BEFORE teamGameResults
**Guard:** The `context` useMemo (around line 490 in App.jsx) must be defined before `teamGameResults` computation (around line 1195)
**Why:** `teamGameResults` is a plain `.map()`, not memoized — it runs every render and reads `context.getHandicapStrokesFn`. If `context` were ever moved below `teamGameResults` in the file, spread handicap would silently break (would just use stale/wrong function reference).

### 17. isJoiner Must Be Persisted to localStorage
**Guard:** `golf-betting-is-joiner-v1` key — set on join, restored on app load, cleared on reset/"Start my own round"
**Why:** iOS Safari aggressively reloads pages when backgrounded, wiping all React state. Without this, every time a joiner locked their phone the Setup button un-dimmed, polling stopped, and sync broke — looked like the app forgot they were a joiner.

### 18. skipScreen=true On All Background Syncs
**Guard:** Polling, visibility-change refetch, and manual silent refresh must call `applyRoundSnapshot(data, msg, true)` — explicit user navigation (Start Round, Join, tapping nav) uses `skipScreen=false` (default)
**Why:** Without this, every 30-second poll or visibility change would jump the user to whatever screen the snapshot says (usually the host's screen), interrupting joiners mid-scorecard-review.

### 19. Timestamp Guard on Supabase Fetches
**Guard:** Only apply a fetched snapshot if `result.updated_at > lastSyncedAt.current`
**Why:** Without this, a stale Supabase fetch (slow connection, race condition) can overwrite fresher local data — a score entered seconds ago could revert to an older value.

### 20. 30-Second Polling Is Joiner-Only
**Guard:** `if (!roundCode || !isJoiner) return;` at the top of the polling useEffect
**Why:** Host already has Realtime + 800ms autosave. Polling on host caused visible screen flash during active score entry. Joiners need polling as a fallback since Realtime subscriptions reliably drop on iOS Safari.

### 21. isUsableRoundSnapshot Required Fields
**Guard:** Any round snapshot (saved, demo, restored) MUST have all of: `allPlayers` (array), `course` (object), `scores` (object), `teamGames` (array), `matches` (array) — or it's silently rejected
**Why:** A demo/preset snapshot missing `teamGames` or `matches` arrays gets rejected with no visible error — looks like "nothing happened" when loading it.

### 22. TeamGameAudit Must Receive Gated teamGameResults
**Guard:** Always pass `enableTeamGame ? teamGameResults : []` to AuditTrail/TeamGameAudit — never the raw array
**Why:** The internal `if (!teamGameResults?.length) return null` guard only works if the caller properly gates the array first. Passing the raw populated array shows the Team Game section even when team game is toggled off.

### 23. birdieEnabled Must Be Explicitly Included in teamGameResults Objects
**Guard:** Both return paths in the `teamGameResults.map()` (normal and duplicateError) must include `birdieEnabled: enableTeamGame && birdiesEnabled`
**Why:** AuditTrail reads `game.birdieEnabled` to decide whether to show gold circles. If omitted from the returned object it's `undefined` — circles never render even with birdies on.

---

## UPDATED — Possibly Critical (Unresolved From Earlier History)

### K. Realtime Subscription May Never Actually Work for Host
`syncChannel` state was set to `useState(null)` but apparently never assigned the actual channel object in some version of the code. Cleanup `if (syncChannel) unsubscribeFromRound(syncChannel)` would never fire. **Needs verification in current codebase** — check if this was ever fixed or if polling/visibility-listener are silently doing all the real work.

### L. "Continue Recent Round?" Modal Has No Device Filter
Modal fetches last 5 rounds from Supabase globally — no `device_id` filter confirmed. Could show a different user's rounds in the modal. **Needs verification** — check `fetchRecentRounds` implementation.

### M. Group Templates Table Schema
Need to confirm current schema matches: `id, name, device_id, is_public, players (jsonb), game_config (jsonb), created_at, updated_at` with RLS and `increment_template_use` RPC — this was build IN this session (changes throughout) so should already exist, but worth a one-time Supabase check.


---

## ADDITIONAL CRITICAL GUARDS — From Decisions & Rules Doc

### 24. loadCourse Uses 0-Based Indexing, Not 1-Based
**Guard:** `loadCourse` in SetupScreen.jsx must pass `i` (not `i + 1`) to `updateCoursePar`/`updateCourseHcp`
**Why:** Those setter functions use 0-based array indexing. Passing 1-based `i+1` caused hole 1 data to land on index 1 (hole 2's slot), leaving index 0 empty and writing a phantom 19th entry. This corrupted saved Westwood course data in Supabase (required SQL trim with `array_agg(x) limit 18`).

### 25. pressTrigger Has Two Sources of Truth — Must Stay Synced
**Guard:** Global `pressTrigger` React state AND each `teamGames[i].pressTrigger` field must be kept in sync on every update path
**Why:** Engine reads `game.pressTrigger ?? 1` (per-game field). UI's Press Trigger button only updated the global state. Tapping Trigger 1 or 2 did nothing because the engine never saw it. Must sync on: button tap, `createDefaultTeamGame`, all snapshot restore paths, and template load.

### 26. Birdie Source Field Is Required for Ledger Routing
**Guard:** ANY new birdie result type MUST include a `source` field (`"match-birdie"`, `"team-birdie"`, `"nine-point-birdie"`, etc.)
**Why:** Ledger routing depends entirely on `source`. Legacy entries with no `source` are NOT routed — they sit in the `birdies` bucket only and won't show correctly in Team/1v1 standings columns. Adding a new birdie type without a source field will silently misroute or double-count it.

### 27. NET Column Always Uses Full Handicap (Never Betting Mode)
**Guard:** Total Scorecard NET column must always compute strokes with `'full'` handicap mode, regardless of what `handicapMode` (relative/full) is selected for betting
**Why:** NET column shows "what would this player actually shoot net" — a universal reference independent of how strokes are allocated between competitors for betting purposes. Confusing these two concepts breaks the NET column's meaning.

### 28. AuditSection Inner Match Rows Must NOT Persist Open/Close State
**Guard:** Inner match sections (each individual 1v1/team matchup within a game) use `noStorage` — do not persist expand/collapse to localStorage. Outer sections (Team Game, 1v1 Matches) DO persist.
**Why:** Root cause of "everything auto-expands" bug — once a user opened an inner match, localStorage remembered it open forever and it auto-expanded on every future visit, eventually showing all matches expanded by default.

### 29. fetchRecentRounds Requires device_id Filter
**Guard:** `fetchRecentRounds` and similar restore-list queries MUST filter `.eq("device_id", deviceId)`
**Why:** Without this filter, the "Continue a recent round?" list shows ANY device's recent rounds — could expose a different user's in-progress round data. This was flagged as unconfirmed/uncertain in earlier history (item L) — CONFIRMED FIXED per this doc, but worth a spot-check since regressions have happened before with this exact pattern.

### 30. buildBirdieResults and buildTeamBirdieResults Take a Single Object Argument
**Guard:** `buildBirdieResults({ matches, matchResults, scores, course, ... })` — NEVER positional args like `buildBirdieResults(matches, players, scores, ...)`
**Why:** Wrong calling convention silently passes garbage into the function (JS doesn't error on wrong arg count) and produces empty or wrong birdie results with no error thrown. Caught this exact bug in JoinRound.jsx once already.

### 31. scoreRound Returns playerLedger, Never leaderboard
**Guard:** To get the leaderboard, call `buildLeaderboard(computedResults.playerLedger, { players })` — `computedResults.leaderboard` does not exist
**Why:** Caused JoinRound leaderboard to show empty/wrong values when someone assumed the wrong field name existed on the return object.


---

## NEW — Future Enhancements Identified This Session

### Per-Device Course "Recent" Sort
Currently `use_count` is global (shared across all users). Considered per-device tracking for more personalized "Recent" sort but deferred — global is sufficient at current scale (2 main user groups, ~15 courses). Revisit if course library grows or user base diversifies significantly.


### 32. Spread Handicap + noPar3Strokes Must Flow Through ALL Best Ball Functions
**Guard:** Every function that computes best ball or net scores for team games MUST receive BOTH `getHandicapStrokesFn` AND `noPar3Strokes`:
- `getBestBallPlayer` (App.jsx) — must pass both to `getTeamNetScore`
- `getBestBallScoreDisplay` (App.jsx) — must pass both to `getBestBallPlayer` and `formatScoreWithStrokeDots`
- `CompletedTeamGameScorecard` (App.jsx) — must receive `noPar3Strokes` as prop and pass to all child calls
- `getBestBallWinner` (AuditTrail.jsx) — must pass `noPar3Strokes` to `getNetScore`
- `formatScoreWithStrokeDots` (both App.jsx and AuditTrail.jsx) — must pass `noPar3Strokes` to spread fn
**Why:** Without `noPar3Strokes`, the spread function builds wrong quota distribution (includes par 3 holes in the eligible pool). Without `getHandicapStrokesFn`, it uses standard HCP instead of spread. Both cause wrong best ball winner selection AND wrong dot display.
**This bug has occurred 3+ times. Do not remove these parameters.**
