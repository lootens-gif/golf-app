# StoppedCounting Golf App — Knowledge Base
*Extracted from full development conversation history. For handoff to new Claude sessions.*

---

## Project Overview
- **App:** StoppedCounting — golf betting scorekeeper
- **URL:** https://golf-app-neon.vercel.app/
- **Stack:** React (CRA), Vercel (hosting), Supabase (realtime DB), no backend server
- **Repo:** golf-app_backup_working (Vercel watches main branch, auto-deploys on push)
- **Supabase:** https://nlmyllxhruguifhdondi.supabase.co
- **Anon key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sbXlsbHhocnVndWlmaGRvbmRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NjE2NzcsImV4cCI6MjA5NDMzNzY3N30.ihwKM57Ik8BgwHE_20yLbjzp2egARxs9H3jTrgyeb_w

---

## Key Files
- `src/App.jsx` — main component, all state, all game flow logic
- `src/engine/scoringEngine.js` — all bet/handicap math, exported functions
- `src/components/AuditTrail.jsx` — all scorecard displays (Team, 1v1, Total, 9-point)
- `src/components/MatchList.jsx` — match setup cards in Setup screen
- `src/components/SettlementSection.jsx` — settle up section
- `src/components/PlayerSetupPanel.jsx` — player name/HCP inputs
- `src/components/live/HoleResultCard.jsx` — hole result card on Live screen
- `src/screens/SetupScreen.jsx` — full setup UI
- `src/screens/ResultsScreen.jsx` — results/leaderboard UI
- `src/JoinRound.jsx` — join a shared live round
- `src/lib/supabase.js` — Supabase client
- `src/lib/roundSync.js` — share/join/sync functions

---

## Workflow
1. Edit files in VS Code
2. `npm start` for local testing (auto-reloads, no build needed)
3. `npm run build` to check for ESLint errors before pushing
4. `git add . && git commit -m "description" && git push`
5. Vercel auto-deploys — **no branching, ever again** (branching caused merge conflict disasters)

---

## Section 1: Bugs Fixed

### Bug: Press logic was wrong — only triggered on "going down", not every win/loss
- **Root cause:** Misunderstood the press rule. Assumed press only triggers when a team goes 1 down.
- **Correct rule:** Every win OR loss on the latest active bet triggers a new press starting the next hole. Push = no trigger. Each bet result = 1 unit won/lost.
- **Fix:** Rewrote press tracking in `scoringEngine.js` to fire on any non-push result.
- **File:** `src/engine/scoringEngine.js` — `playPressMatch()`

### Bug: Long/Short — Short started even when Long tied (never closed early)
- **Root cause:** Short was triggered based on hole count, not whether Long actually closed early.
- **Correct rule:** Short ONLY starts if Long closes before hole 18. If Long goes all 18 without closing, no Short is played.
- **Fix:** Added `longDecidedOn` check — Short only begins if Long has a decided hole before 18.
- **File:** `src/engine/scoringEngine.js`

### Bug: Toy/Stan handicap was wrong in team games vs 1v1
- **Root cause:** Toy's handicap is 22 in team games and 23 in all 1v1 matches. This is intentional because at Westwood GC par 3 holes are HCP 15/16/17/18, and using 22 ensures no strokes on par 3s. Using 23 in 1v1 adds one more stroke on the next ranked hole.
- **Fix:** Added separate HCP fields and "No Par 3 Strokes" toggle.
- **Files:** `src/App.jsx`, `src/engine/scoringEngine.js`

### Bug: 1v1 handicap was calculated from all 5 players' lowest, not just the two players in the match
- **Root cause:** Engine was using global lowest handicap player (Tim=8) for all matches.
- **Correct rule:** Handicap for each 1v1 is calculated from the lowest HCP of the TWO players in THAT match only.
- **Fix:** `playIndividualMatch()` now takes the min of p1.hcp and p2.hcp.
- **File:** `src/engine/scoringEngine.js`

### Bug: "Game 0 Complete" fired on hole 1 when no team game was configured
- **Root cause:** `setPendingNextGameIndex` was called with `nextGameIndex` even when no valid game range existed, causing "Game Complete" on hole 1.
- **Fix:** Added check — only trigger Game Complete if `nextGameIndex !== currentGameIndex && nextGameIndex > 0`.
- **File:** `src/App.jsx`

### Bug: Team game guardrail only on "Start Round" button, not on Live/Results nav tabs
- **Root cause:** `goToLive()` and `goToResults()` had no validation.
- **Fix:** Added `hasValidTeamSetup()` function that checks only the CURRENT game (not all future games) and calls it before navigating.
- **File:** `src/App.jsx`

### Bug: 4/4/4 team game blocked by "must equal 18 holes" requirement
- **Root cause:** `startRound()` had `totalHoles !== 18` check.
- **Fix:** Changed to `totalHoles > 18`. Total can be less than 18 (e.g. 4/4/4 = 12 holes), just can't exceed 18.
- **File:** `src/App.jsx`

### Bug: Hole input for team games defaulted to "1" making it hard to change on phone
- **Fix:** Changed `game.holes ?? 1` to `game.holes ?? ""` with `placeholder="#"`. Input now starts blank.
- **File:** `src/screens/SetupScreen.jsx`

### Bug: Changing one team game's hole count affected others
- **Root cause:** Game ranges were being recalculated reactively in a way that caused interdependence.
- **Fix:** Each game's hole count is now stored independently; range is computed from cumulative sum but not written back.
- **File:** `src/App.jsx` — `getTeamGameRange()`

### Bug: `buildBirdieResults` called with wrong arguments in JoinRound
- **Root cause:** JoinRound called `buildBirdieResults(matches, activePlayers, players, scores, course, handicapMode)` with positional args. Function takes a single object.
- **Fix:** Changed to `buildBirdieResults({ matches, matchResults, teamGames, scores, course, ... })`.
- **File:** `src/JoinRound.jsx`

### Bug: JoinRound leaderboard showed wrong/empty values
- **Root cause:** Used `computedResults?.leaderboard` which doesn't exist — `scoreRound` returns `playerLedger`, not `leaderboard`.
- **Fix:** Changed to `buildLeaderboard(computedResults?.playerLedger || [], { players })`.
- **File:** `src/JoinRound.jsx`

### Bug: Realtime subscription in JoinRound not firing
- **Root cause:** Supabase filter syntax `filter: \`code=eq.${code}\`` in `.on()` was not matching correctly.
- **Fix:** Changed to `event: "*"` with no filter, and moved the `code` check into the callback: `if (payload.new?.code === code.toUpperCase() && payload.new?.data)`.
- **File:** `src/lib/roundSync.js`

### Bug: TotalScorecard scorecard symbols used net score instead of gross
- **Root cause:** `ScoreCell` was comparing net score to par for birdie/bogey symbols.
- **Correct rule:** Symbols (green circle = birdie, red square = bogey) are always based on GROSS score. Net is used for match play results but symbols are always gross.
- **Fix:** `ScoreCell` now takes `gross` and `par` separately, uses gross for symbols.
- **File:** `src/components/AuditTrail.jsx`

### Bug: Birdie circles showing in team game scorecards even when birdies were OFF
- **Root cause:** Birdie circle rendering wasn't gated on `game.birdieEnabled`.
- **Fix:** Added `{game.birdieEnabled && <circle>}` check in TeamGameScorecard.
- **File:** `src/components/AuditTrail.jsx`

### Bug: Duplicate "Match Status" sections on Live screen
- **Root cause:** Two separate Match Status sections existed — one inside Hole Result card (current game only) and one standalone card (all games). The standalone card showed zeros for future games, confusing users.
- **Fix:** Kept both but renamed standalone to "Round Match Status" to differentiate purpose. Current Match Status in Hole Result card shows current game only.
- **Files:** `src/App.jsx`, `src/components/live/HoleResultCard.jsx`

### Bug: Default `teamGameUnitAmount` was `$1` instead of `$5`
- **Fix:** Changed `useState(1)` to `useState(5)` and `setTeamGameUnitAmount(1)` to `setTeamGameUnitAmount(5)` in resetSetup function.
- **File:** `src/App.jsx` lines ~436 and ~1804

### Bug: "Game 1 Complete" scorecard headers showed `++$15` (double plus)
- **Root cause:** `formatMoney()` already adds `+` sign, and the header string also prepended `+`.
- **Fix:** Removed the extra `+` from the header string template.
- **File:** `src/components/AuditTrail.jsx`

### Bug: Multiple 9-point matches could be added
- **Root cause:** No guard on "Add 9 Point Match" button.
- **Fix:** Button hidden if a 9-point match already exists: `!matches.some(m => m.gameType === "ninePoint")`.
- **File:** `src/screens/SetupScreen.jsx`

### Bug: Saved rounds disappearing
- **Root cause:** Safari on iOS aggressively purges localStorage (after 7 days, low storage, clearing history, or private browsing mode).
- **Current mitigation:** Tap Share (📤) before closing the app — saves to Supabase permanently.
- **Planned fix:** Move Save/Load Round to Supabase (cloud save replacing localStorage).

---

## Section 2: Design Decisions and WHY

### No branching workflow
- **Decision:** Never use git branches. Simple file replace → build → push.
- **Why:** Tim has never written code before. Merge conflicts caused hours of wasted debugging and broken files. Simple replace is foolproof.

### Press rule: every win OR loss triggers a new bet
- **Decision:** Not just "going down" — any non-push result on the current bet starts a new bet next hole.
- **Why:** Confirmed by Tim during the May 9 audit. This is how his group plays on paper.

### 1v1 handicap from lowest of TWO players in that match
- **Decision:** Don't use global lowest (Tim=8). Use lowest of the specific pair.
- **Why:** Confirmed by Tim. Moose vs Bish: both 14 HCP, so no strokes for either. Only matches involving Tim use Tim's HCP as the base.

### No Par 3 Strokes toggle (global + per-match)
- **Decision:** Added global toggle for team games, separate toggle per 1v1 match.
- **Why:** Westwood GC par 3s are HCP 15/16/17/18. Some groups don't give strokes on par 3s. This is also why Toy uses 22 HCP in team games (vs 23 in 1v1) — to ensure no par 3 strokes in team games.

### Toy's dual handicap (22 team / 23 all 1v1)
- **Decision:** Toy=22 for all team games, Toy=23 for all 1v1 matches.
- **Why:** 22 from Tim's base (8) = 14 strokes, which are all on non-par-3 holes at Westwood. 23 adds one more stroke in 1v1 matches.
- **INTENTIONAL — even though it looks like a bug.**

### Scorecard symbols on gross, not net
- **Decision:** Green circle/red square based on GROSS score only.
- **Why:** Golf convention. A circled 3 on a par 4 means you physically made a 3. Net is used for match play results but scorecard display is always gross.

### Results screen order
1. Current/Final Results header
2. Leaderboard
3. Scorecards (collapsed, state persists)
4. Settle Up
5. Standings
6. GHIN
- **Why:** Mid-round the most important thing is "where do I stand?" — that's Leaderboard. Scorecards for detail. Settle Up only matters at end.

### "Current Results" vs "Final Results" header
- **Decision:** Shows "Current Results" during round, "Final Results" after hole 18.
- **Why:** Biro's group uses Results screen mid-round as a live scoreboard.

### Auto-generate 1v1 matches button
- **Decision:** Button in Matches section (not automatic). Shows count: "Auto Generate 10 1v1 Matches".
- **Why:** Automatic generation on player entry was too dangerous (could fire mid-round if name changed). Button is intentional action. Confirm dialog if matches already exist.
- **Defaults:** Net Holes, `$teamGameUnitAmount`, Birdies ON with same bet amount.

### Only one 9-point match allowed
- **Decision:** "Add 9 Point Match" button hidden once one exists.
- **Why:** 9-point uses all 3 players — adding a second makes no sense and Biro accidentally created two.

### Settle Up amounts in black (not red)
- **Decision:** Dollar amounts in Settle Up are black text, not red.
- **Why:** Always paying — red is redundant and adds visual noise.

### Match Status in Hole Result card (not standalone)
- **Decision:** "Current Match Status" lives inside Hole Result card showing current game only.
- **Why:** Biro asked "where do the bets stand?" on hole 4/5. The Hole Result card is the natural place — it shows what just happened and where things stand NOW.

### Press detail format: `Tim/Marc -1 vs Stan/Bish   -2/-1/0/+1 = -1`
- **Decision:** Left side = team names + net total. Right side = each bet's current score with slashes. Then `= netTotal` for clarity.
- **Why:** Biro's group tracks presses on paper exactly this way. Each bet is its own column. The net total on the left is the quick answer; the detail on the right shows how you got there.

### Leaderboard drill-in
- **Decision:** Tap player name in Leaderboard → opens Scorecards section, auto-opens Total Scorecard filtered to that player, scrolls to it.
- **Why:** "Click player X → see player X scorecard only" — quick access to the most useful detail view.

### Share/Join as text buttons (not emoji)
- **Decision:** "Share" and "Join" text buttons instead of 📤 and 👥 emoji.
- **Why:** Emoji looked "wonky" on mobile. Text is unambiguous.

### Round code as 4-digit number (not "GOLF-1234")
- **Decision:** Changed from `GOLF-${num}` to just `${num}` (e.g. "2847").
- **Why:** Simpler to share verbally, easier to type on mobile.

### Anyone with the code can read AND write
- **Decision:** No read-only restriction on joined sessions.
- **Why:** Trust model — "your group knows the code, you trust each other." Enables each player to enter their own score from their own phone.

### 9-point birdie doubles points (not a side bet)
- **Decision:** `birdieDoublePoints` toggle in 9-point match doubles all hole points when any player makes a gross birdie. Blitz is NOT doubled.
- **Why:** In 9-point, birdies double the point distribution (5/3/1 → 10/6/2). Eagles count as birdies for this purpose (confirmed by Biro). Blitz stays as-is (9/0/0).
- **Rule:** ANY player's gross birdie doubles — once only per hole regardless of how many players birdie.

### 4/4/4 support (partial rounds)
- **Decision:** Total holes ≤ 18 allowed. Total doesn't need to equal 18. Running total displayed ("12 / 18 holes configured"). Starting hole is always 1.
- **Why:** Biro's group sometimes plays 4/4/4 when short on time. Starting on a hole other than 1 is a future feature (rarely needed).

---

## Section 3: Validations and Guards Added

### Start Round validation
- Team Game enabled → at least one game configured with holes > 0
- Team Game enabled → current game has valid team selections
- Total holes > 18 → blocked with error
- `hasValidTeamSetup()` checks only CURRENT game, not future games

### Nav tab validation (Live/Results buttons)
- Same `hasValidTeamSetup()` check runs when tapping Live or Results
- If team game enabled but current game teams not set → alert, stay on Setup

### 9-point match guard
- "Add 9 Point Match" hidden if one already exists
- Guard: `!matches.some(m => m.gameType === "ninePoint")`

### Hole advancement guard
- `pendingNextGameIndex` only set if `nextGameIndex !== currentGameIndex && nextGameIndex > 0`
- Prevents "Game 0 Complete" firing on hole 1 with no team game configured

### Auto-generate confirm
- If matches already exist when Auto Generate is tapped → `window.confirm()` before replacing

---

## Section 4: Features Explicitly Deferred

### Branching/Git branches — NEVER AGAIN
- Caused merge conflicts that took hours to resolve
- Simple file replace is the workflow forever

### Starting hole other than hole 1
- Biro asked for "start on hole 5 for last 12 holes"
- Deferred — 4/4/4 happens rarely enough that starting on hole 1 is acceptable
- Would require significant rework of hole range logic

### Wolf format
- Much more complex than any current game — dynamic team selection per hole, hammer, multipliers
- Deferred indefinitely — would be used more than 4/4/4 but still rarely

### Snapshot share link (non-realtime)
- Decided against — went straight to real-time Supabase sharing
- Not worth building a half-measure

### Read-only join mode
- Initially planned but removed — anyone with code can edit
- Trust model: your group knows the code

### Per-player birdie tracking in team game headers
- Decided just showing win/loss is enough in the header; drill in for detail

---

## Section 5: Intentional Behaviors That Look Like Bugs

### Toy/Stan HCP 22 in team games, 23 in 1v1
- **NOT a bug.** Dual handicap is intentional — 22 ensures no par 3 strokes in team games at Westwood. 23 used in all 1v1.

### Press fires on both wins AND losses
- **NOT a bug.** Every non-push result on the current bet starts a new bet. Not just "going down."

### Long/Short: Short doesn't start if Long ties after 18
- **NOT a bug.** Short ONLY starts if Long closes EARLY (before hole 18). Long going all 18 = no Short.

### Birdie circles on scorecard even if no birdies made
- Fixed — circles only show if `birdieEnabled` is true for that match/game.

### `getOneVOneGameTypeLabel` function removed from AuditTrail
- **Intentional.** Game type (Net Holes, Long/Short) removed from 1v1 headers to save space. Still visible when scorecard is expanded.

### Team game standings show cumulative across ALL games
- **Intentional.** Team Game Standing on Live screen shows running net bets across ALL completed and in-progress games, not just current game.

---

## Section 6: Scoring Rules from Biro/Tim

### Westwood GC Setup
- **Course:** Westwood GC, Blue Tees
- **Par 3 holes (by HCP rank):** HCP 15=H15, 16=H16, 17=H17, 18=H8
- **No Par 3 Strokes rule:** Common at Westwood — strokes are NOT given on par 3 holes even if HCP ranking says you'd get one

### May 9 Verified Round Results
**Players:** Tim HCP 8, Biro HCP 12, Moose HCP 14, Bish HCP 14, Stan/Toy HCP 22 (team) / 23 (1v1)

**Team Game Totals (verified):**
| Player | G1 | G2 | G3 | Total |
|---|---|---|---|---|
| Tim | -$35 | -$10 | +$15 | -$30 |
| Biro | -$25 | -$10 | -$5 | -$40 |
| Moose | +$45 | -$10 | -$15 | +$20 |
| Bish | +$45 | +$35 | -$10 | +$70 |
| Stan | -$30 | -$5 | +$15 | -$20 |

**1v1 Totals (matches + birdies):**
| Player | Matches | Birdies | Total |
|---|---|---|---|
| Tim | -$25 | $0 | -$25 |
| Biro | -$20 | -$20 | -$40 |
| Moose | +$5 | +$20 | +$25 |
| Bish | +$78 | +$14 | +$92 |
| Stan | -$38 | -$14 | -$52 |

**Grand Total:** Tim -$55, Biro -$80, Moose +$45, Bish +$162, Stan -$72

**Saturday paper corrections (all to Bish):**
- Tim pays Bish $10
- Biro pays Bish $20
- Moose pays Bish $10
- Stan pays Bish $5

### Net Holes payout rule
- **NOT flat $X for the match.** Pays $X per hole won.
- Example: Net -2 holes at $5/bet = -$10, not -$5.

### Toy Birdie rule
- When enabled: a NET birdie covers/ties a GROSS birdie (defensive only)
- NOT standard birdie — it's a special rule unique to this group
- Named after Stan/Toy who benefited from the rule

### 9-point scoring
- Standard: 5/3/1 (1st/2nd/3rd)
- Tie for 1st: 4/4/1
- Tie for 2nd: 5/2/2
- All tie: 3/3/3
- Blitz: one player wins by 2+ strokes over both others → 9/0/0
- Birdie doubles: any gross birdie doubles all points (blitz excluded)
- Eagles count as birdies for doubling purposes

### Tim vs all — Long/Short matches
- All matches involving Tim use Long/Short format ($10 Long, $5 Short)
- No birdies tracked in Tim's matches
- Long = 18-hole match play. Short only starts if Long closes early.

---

## Section 7: Warnings to Remember

### localStorage is not reliable for round storage
- Safari iOS purges localStorage aggressively (7-day idle, low storage, history clear)
- Biro lost a saved round because of this
- **Always tap Share before closing the app** until cloud save is built

### Default values in localStorage override useState defaults
- When you change a default (e.g. $1 → $5), existing users won't see it because localStorage loads the old value
- Must also update the reset function (`resetSetup`) and any `setXxx(1)` calls
- **Planned fix:** Schema version system — when version changes, reset specific fields

### No branching — ever
- Previous attempt at feature branching caused merge conflicts that took hours to fix
- Tim has no prior coding experience — simple file replace is the only safe workflow

### Vercel auto-builds on push to main
- `npm run build` locally is only needed to check for ESLint errors before pushing
- `npm start` for local dev (no build needed, auto-reloads)

### ESLint errors block Vercel deployment
- Warnings are OK, errors block deployment
- Most common: unused variables (`no-unused-vars`) and undefined variables (`no-undef`)
- After any code change, check for these before pushing

### `getTeamGameRange` and `hasDuplicateSelections` are NOT exported from scoringEngine
- They are local functions in `App.jsx`
- If needed in `JoinRound.jsx` or elsewhere, must be inlined (copied locally)

### `buildBirdieResults` takes a SINGLE OBJECT argument, not positional args
- Correct: `buildBirdieResults({ matches, matchResults, scores, ... })`
- Wrong: `buildBirdieResults(matches, players, scores, ...)`

### `scoreRound` returns `playerLedger`, NOT `leaderboard`
- To get the leaderboard object by player ID: `buildLeaderboard(computedResults.playerLedger, { players })`

### Supabase Realtime filter syntax
- Filter in `.on()` callback query is unreliable for `postgres_changes`
- Use `event: "*"` with no filter and check `payload.new?.code` in the callback

---

## Section 8: Currently Building (as of handoff)

### Full multiplayer / cloud save (Option B)
- **Decision:** "Start Round" generates code + saves to Supabase automatically
- Round name field in Setup (auto-defaults to "May 19 - Westwood" if blank)
- Any score entry → auto-pushes to Supabase → all joined phones update
- Anyone with code can read AND write
- Rounds permanent in Supabase (feeds history/analytics later)
- Save/Load Round reads/writes Supabase (replacing localStorage)

**Files uploaded for this build:** `realtime_v2.zip` containing `src/App.jsx`, `src/JoinRound.jsx`, `src/lib/roundSync.js`

---

## Section 9: Feature Backlog (Priority Order)

1. **Full multiplayer / cloud save** — currently building
2. **Real-time subscription** — verify fix is working (changed to `event: "*"`)
3. **Schema version** — prevent default value reversion on localStorage reload
4. **"X up after 9" callout** in Results screen header rows
5. **Skins tracking** — any number of players, carried skins, works with existing games
6. **Remote/scorecard games** — players in different groups, sync via code
7. **Round history & analytics** — who's up this year?
8. **Wolf format** — complex, deferred
9. **Starting hole other than 1** — for 4/4/4 starting mid-round
10. **Drill-in from Standings** — tap player in Standings → their breakdown

---

## Section 10: People

- **Tim Lootens** — owner/developer, no prior coding experience, 70+ deployments since April 10
- **Jon Biro** — former CFO, head of customer focus group, toughest critic, now biggest advocate. Independent paper audit confirmed all app numbers were correct.
- **Moose (Mark)** — player HCP 14
- **Bish (Bishal Patel)** — player HCP 14, shot net 65 on May 9, won $162
- **Stan/Toy** — player HCP 22 (team) / 23 (1v1)
- **Westwood GC** — home course, Blue Tees

---

*Generated from full conversation history. ~340 turns, ~70 deployments, ~6 weeks of development.*
