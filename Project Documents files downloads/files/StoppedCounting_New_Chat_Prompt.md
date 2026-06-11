# StoppedCounting — New Chat Context
*June 2026*

---

## How to Send Files

```bash
# Full project (send at start of new chat)
zip -r full_project.zip src/ public/ package.json vercel.json

# Single file
zip -j filename.zip src/path/to/file.jsx

# Multiple files
zip -j filename.zip src/App.jsx src/screens/SetupScreen.jsx
```

---

## Project Overview

**App:** StoppedCounting — golf betting scorekeeper  
**Live URL:** https://golf-app-neon.vercel.app  
**Stack:** React (CRA), Vercel, Supabase, Resend  
**Supabase:** https://nlmyllxhruguifhdondi.supabase.co  
**Tests:** 104 passing across 4 suites  
**Deploy:** `git add -A && git commit -m "msg" && git push` (auto-deploys via Vercel)

---

## File Structure

```
src/
├── App.jsx                          (3,757 lines — main app)
├── JoinRound.jsx                    (joiner flow)
├── BugReportModal.jsx
├── scoringEngine.test.js            (104 tests)
├── scoreRound.test.js
├── builders.test.js
├── App.test.js
├── engine/
│   └── scoringEngine.js            (1,636 lines)
├── screens/
│   ├── SetupScreen.jsx             (1,253 lines)
│   ├── ResultsScreen.jsx
│   ├── HistoryScreen.jsx
│   ├── AdminScreen.jsx             (PIN: "1234" line 6)
│   └── TripScreen.jsx              (653 lines — new)
├── components/
│   ├── AuditTrail.jsx              (1,560 lines)
│   ├── SettlementSection.jsx
│   ├── MatchList.jsx
│   └── live/
│       ├── ScoreEntryCard.jsx
│       └── HoleResultCard.jsx
└── lib/
    ├── roundSync.js                (388 lines)
    └── supabase.js
```

---

## Critical Rules for Claude

1. **NEVER rename files** — App.jsx not App_v2.jsx etc.
2. **Score format is HOLE-FIRST:** `{ holeNumber: { playerId: score } }` — critical, never player-first
3. **Run tests before shipping:** `npm test -- --watchAll=false` — must be 104 passing
4. **Admin PIN:** "1234" in AdminScreen.jsx line 6
5. **9-point gold birdie rendering** — intentionally gold, do not change
6. **Birdie $$ routing** — match-birdie → sideMatches, team-birdie → mainGame (both also in birdies bucket)
7. **getLintErrors = build fails** — always check for unused vars before packaging

---

## Supabase Tables

| Table | Purpose |
|-------|---------|
| rounds | All scored rounds — code, data (JSON), device_id, updated_at |
| courses | Course library — name (unique), city, state, pars[], hcp[] |
| group_templates | Saved player/game configs — id, name, device_id, is_public, players, game_config, course |
| bug_reports | Bug submissions |
| trips | Trip master record |
| trip_players | Players on a trip |
| trip_rounds | Rounds within a trip |
| trip_games | Game config per trip |

All tables have RLS enabled with open anon policies.

---

## Key Constants (App.jsx)

```js
STORAGE_KEY = "golf-betting-round-setup-v6"
AUTO_ROUND_KEY = "golf-betting-auto-round-v1"
ROUND_CODE_KEY = "golf-betting-round-code-v1"
IS_JOINER_KEY = "golf-betting-is-joiner-v1"
SAVED_ROUNDS_KEY = "golf-betting-saved-rounds-v1"
```

---

## Completed Features

### Core Scoring
- Handicap strokes (relative/full/net-from-lowest), net scoring, hole results
- Press matches (trigger=1 or 2), 9-point game, Long/Short, FBT/Match Play, Stroke play
- Toy Birdies, No Par 3 strokes (team games AND per 1v1 match toggle)
- Max score cap: 9 gross per hole
- 104 passing unit tests

### 9-Point Game
- 3-player format, 5/3/1 points per hole
- Birdie double: 2x ONLY if unique hole winner made a gross birdie (not net)
- Eagle detected separately (double concentric circle rendering)
- Eagle multiplier pending Biro confirmation (currently same 2x as birdie)
- Pairwise transaction settlement (last pays everyone above)
- Leaderboard and scorecard use same math — confirmed consistent
- Gross birdie = green circle, eagle = double circle on 9-point scorecard
- Running net $ right-aligned by initial (H +$42 / J -$18 / B -$24)
- Total Pts shown above birdie summary

### Team Game (6/6/6 wheel)
- 3/4/5 player modes, wheel format
- Birdie routing: team birdies → mainGame, match birdies → sideMatches
- Solo player in 3-player game pays each winner individually (2v1 formula fixed)
- Birdie tag on match rows: 🐦+1 = +$30
- Outer header: 🐦+N (+$Xea) net birdies for wheel team
- birdieEnabled correctly set on all 4 return paths (5p/4p/3p/other)
- matchupId on team birdie results for per-matchup filtering

### Birdie Rendering (1v1)
- Won birdie: green circle outline
- Pushed birdie (toy rule): grey circle outline
- Net birdie cover: blue dashed circle
- Header: 🐦+N if net positive, 🐦 if tracked but net 0, nothing if none made
- Summary: 4 states (No Tracked / No Made / All Pushed / paid summary)

### Group Templates
- Save/load/update/delete
- Public/private toggle, searchable by anyone
- Course saved in template — loads course + pars + HCPs
- Search Public tab auto-loads all on open (no typing required)
- Existing Biro templates updated with Westwood course via SQL

### Course Library
- Supabase courses table, search auto-opens on focus (shows all)
- No default course — all users select from library
- Duplicate name protection, update with device ownership
- Auto-fills round name on course load: "Jun 6 - Ocean Course"
- Auto-open search on Setup when no course loaded

### Admin Screen (🔧 nav)
- PIN protected (AdminScreen.jsx line 6: "1234")
- Shows active rounds with ✅ COMPLETE / LIVE badges
- Hole count, round name, course, time ago
- Join as Admin = full host access
- Bug report escape hatch on PIN screen

### Trip Setup Screen (🏌️ → "Trip" nav)
- Trip List → Setup → Leaderboard flow
- Setup: name, players (name/HCP index/source), rounds (course search, tee, slope, rating, round code), games (toggle, entry fee, payout places 1-4, payout % editable)
- Games: Low Net, Skins, Par 3s, Doubles, Vegas, Stableford, Scramble
- Low Net leaderboard with projected payouts
- Round codes link scored rounds to trip
- Supabase: trips, trip_players, trip_rounds, trip_games

### Multiplayer / Sync
- 4-digit round code, auto-sync to Supabase (debounced 800ms)
- **Round code generated when first player name entered** (not on Start Round) — protects against iOS localStorage loss
- Realtime subscription + visibility change listener + 30s polling (joiner only)
- isJoiner persisted to localStorage
- Recent rounds: filtered by device_id, newest first, scrollable, empty rounds filtered
- Supabase fallback restore when localStorage cleared

### UX Improvements
- Warn before creating duplicate round if scores exist
- Warn if unnamed players (P1, P2) before starting
- Auto-advance inconsistency reduced
- Round name auto-fills on course load

### Skins
- Per Skin, Pot, TV Skins modes
- Net/Gross toggle, carryover, birdie doubles

### Standings
- TEAM column includes team game birdies
- 1V1 column includes match birdies
- No separate BIRDS column
- NET column always uses full handicap (not betting mode)

---

## Scoring Engine Key Functions

```js
// Handicap
getHandicapStrokes(playerId, hole, players, course, handicapMode)
getNetScore(playerId, hole, players, course, scores, handicapMode)

// Match
computeHoleResult({ hole, teamA, teamB, players, course, scores, handicapMode })
playPressMatch({ teamA, teamB, start, end, trigger, context })

// 9-Point
getNinePointHoleStatus(playerIds, hole, players, course, scores, handicapMode, birdieDoublePoints, blitzEnabled)
getNinePointPayout(totalsByPlayerId, dollarsPerPoint)
getNinePointMatchSummary(playerIds, players, course, scores, handicapMode, birdieDoublePoints, start, end, dollarsPerPoint)

// Birdies
buildBirdieResults({ matches, matchResults, teamGames, teamGameResults, scores, course, birdiesEnabled, birdieBetAmount, toyRule, players, handicapMode })
buildTeamBirdieResults(teamGames, teamGameResults, scores, course, getTeamGameSelection, birdieBetAmount, toyRule, players, handicapMode)

// Settlement
scoreRound(round, { players, course, scores, matches, matchResults, teamGames, teamGameResults, birdieResults, handicapMode, ... })
buildLeaderboard(ledger, { players })
```

---

## roundSync.js Key Functions

```js
// Rounds
generateRoundCode()
fetchRound(code)
shareRoundWithDevice(roundCode, data, deviceId)
fetchRecentRounds(deviceId)        // filtered by device_id, newest first
saveRoundToStats(code, data, deviceId)

// Courses
saveCourseToLibrary(course, createdBy, deviceId)
searchCourses(query)               // pass "%" to get all
checkCourseExists(name)
updateCourseInLibrary(courseId, course, deviceId, adminPin)

// Templates
saveTemplate(template, deviceId)
fetchMyTemplates(deviceId)
searchTemplates(query)             // public only
incrementTemplateUse(templateId)
deleteTemplate(templateId, deviceId)

// Admin
fetchActiveRounds(hoursAgo = 4)

// Trips
createTrip(trip, deviceId)
fetchMyTrips(deviceId)
fetchTrip(tripId)
saveTripPlayers(tripId, players)
fetchTripPlayers(tripId)
saveTripRound(round)
fetchTripRounds(tripId)
saveTripGames(tripId, games)
fetchTripGames(tripId)
fetchRoundsByCode(codes)
```

---

## Courses in Library

- Westwood (Westwood, TX) — Biro's home course
- Generals (TX)
- Pebble Beach Golf Links (CA)
- Spyglass Hill Golf Course (CA)
- Kiawah Island Ocean Course (SC) — HCPs from actual scorecard
- Osprey Point Kiawah Island (SC)
- Oak Point Kiawah Island (SC)
- Ironhorse Golf Club (KS) — Josh's annual trip course

---

## Regular Users

### Biro's Group (COD Group)
- **Jon Biro** (HCP 12) — power user, finds edge cases
- **Stan Toy** (HCP 23)
- **Bishale Patel** (HCP 13)
- **John Cahill** (HCP 21)
- **Tim Lootens** (HCP 8) — developer
- Home course: Westwood TX
- Games: 5-player, Long/Short, Toy Birdies rule ON, 6/6/6 team game, 9-point

### Josh Fryback — Annual Ironhorse Trip
- **Contact:** Connected through Tim
- **Trip:** Annual, ~24 players, 4 rounds, 6 foursomes
- **Currently uses:** Excel spreadsheet
- **Tested app:** Kiawah trip June 2026 — 3 complete rounds (Ocean, Osprey, Oak Point)
- **Next trip:** Memorial Day weekend 2027 (Ironhorse KC)

**Josh's 8 Games:**
| Game | Status | Notes |
|------|--------|-------|
| Low Net (Ironhorse) | ⬜ Trip LB | Cumulative 4 rounds |
| Low Net Skins | ⬜ Trip LB | Net, no carryover |
| Low Net Par 3s | ⬜ Build | Filter par 3 holes, cumulative |
| Low Net Doubles | ⬜ Build | 2-man blind draw best ball |
| Vegas Doubles | ⬜ Build | Lower digit first scoring |
| Modified Stableford | ⬜ Build | Points vs net par |
| Scramble | ⬜ Build | Round 2 only, standalone |
| Ironhorse History | ⬜ Build | Multi-year cumulative |

**Josh's Payout Structure:**
- Pool model: ~24 players × $5/game = $120 pot per game
- Payout: 50% / 25% / 16.7% / 8.3% (4 places)
- Ties: combine places and split equally
- Josh pays out from pool (no cross-player Venmo)

**Vegas Formula:**
```js
function vegasScore(net1, net2) {
  if (net1 >= 10 || net2 >= 10) return 99;
  const low = Math.min(net1, net2);
  const high = Math.max(net1, net2);
  return low * 10 + high; // lower Vegas score wins
}
```

**Ironhorse Course (Pars/HCPs):**
```
Pars: 4,4,5,3,4,3,4,5,4 | 4,4,5,4,3,4,3,4,4 (Par 71)
HCPs: 3,13,17,7,5,11,9,15,1 | 4,16,10,6,12,14,18,8,2
Par 3 holes: 4, 6, 14, 16
```

---

## Pending Biro Clarifications

1. **Eagle in 1v1 birdie bet** — does eagle = 2x birdie payout (4x), 1x (same as birdie), or something else?
2. **Eagle in 9-point** — does eagle = 3x points (15/9/3) or stay 2x (10/6/2)?
3. **Bug 3 display** — confirm current layout (H +$42 / J -$18 / B -$24 + per-hole points + Total Pts) works for him

---

## Feature Backlog (Prioritized)

### Near Term
- ⬜ Eagle multiplier in 9-point (pending Biro — 2x or 3x?)
- ⬜ Eagle in 1v1 birdie bet (pending Biro)
- ⬜ Trip leaderboard: Pre-generate round codes night before (Josh Golf Genius model)
- ⬜ Trip leaderboard: Par 3s, Skins tabs
- ⬜ Expand beyond 5 players (Josh needs 24+)
- ⬜ Auto-advance consistency in score entry fields
- ⬜ Score export (CSV/spreadsheet) — Josh requested

### Trip Games to Build
- ⬜ Low Net Par 3s engine (filter par 3 holes, cumulative net)
- ⬜ Low Net Doubles (2-man best net ball)
- ⬜ Vegas Doubles engine
- ⬜ Modified Stableford engine (confirm points scale with Josh)
- ⬜ Scramble scoring (standalone, Round 2 only for Josh)
- ⬜ Ironhorse History (multi-year cumulative)

### Trip Architecture
- ⬜ Pre-generate round codes in Trip Setup (night before workflow)
- ⬜ Per-player tee selection (slope/rating per player for handicap calc)
- ⬜ USGA course handicap calculator (Index × Slope/113 + Rating - Par)
- ⬜ Blind draw team assignment generator
- ⬜ Trip Admin view (all foursomes, all rounds at once)
- ⬜ Doubles/Vegas pairing entry per round

### Player Features
- ⬜ 1v1 press option (currently team game only)
- ⬜ History from Supabase (cumulative stats)
- ⬜ Multi-year handicap tracking (Josh #4 HCP source)
- ⬜ Handicap self-entry link for trip players

### Phase 2 (Accounts)
- ⬜ Player IDs (phone/Apple/Google)
- ⬜ Smart group suggestions from history
- ⬜ Cross-device sync by identity

### Phase 3 (Monetization)
- ⬜ Free: basic scoring + join
- ⬜ Pro ($5-10/mo): templates, history, smart suggestions
- ⬜ Club tier: Josh use case — multi-group, trip management

---

## Pending Josh Call Topics

**Kiawah Trip Feedback:**
1. Course setup trouble — saw 3 abandoned rounds, did auto-open course search help?
2. P4/P5 unnamed players — who were they?
3. Team game payouts — 3-player, Alan -$20 (was -$10, now fixed)
4. Overall biggest friction point

**Trip Setup Architecture:**
1. Doubles/Vegas pairings — same as foursome or separate blind draw?
2. Foursome reshuffling — same all 4 rounds or new draw each round?
3. Stableford points scale (eagle/birdie/par/bogey/double values)
4. Live leaderboard — manual refresh OK?
5. Pre-generating round codes — confirm Golf Genius model works for him
6. Mixed tees — how does he want to enter per-player tee selection?

---

## Known Bugs / Watch List

- ⬜ Team assignment guard for 3-player mode segment transitions (holes 6→7, 12→13)
- ⬜ iOS Safari localStorage — improved with early round code generation, monitor
- ⬜ Score entry auto-advance inconsistency across fields
