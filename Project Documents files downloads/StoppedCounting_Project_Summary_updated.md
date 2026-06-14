# StoppedCounting — Full Project Summary
*Last updated: June 2026*

---

## Project Overview

**Live URL:** https://golf-app-neon.vercel.app  
**Repo:** golf-app_backup_working (Vercel watching main branch)  
**Stack:** React (create-react-app), Vercel, Supabase, Resend email  
**Supabase:** https://nlmyllxhruguifhdondi.supabase.co  
**Domain reserved:** StoppedCounting.com  

---

## How to Send Files to Claude

Always zip before uploading. Claude works from the full project zip.

```bash
# Full project (send at start of new chat)
zip -r full_project.zip src/ public/ package.json vercel.json

# Single file
zip -j filename.zip src/path/to/file.jsx

# Multiple files
zip -j filename.zip src/App.jsx src/screens/SetupScreen.jsx src/lib/roundSync.js
```

---

## File Locations (NEVER rename files)

| File | Location |
|------|----------|
| App.jsx | src/ |
| JoinRound.jsx | src/ |
| BugReportModal.jsx | src/ |
| QAScreen.jsx | src/ |
| scoringEngine.test.js | src/ |
| scoringEngine.js | src/engine/ |
| SetupScreen.jsx | src/screens/ |
| ResultsScreen.jsx | src/screens/ |
| HistoryScreen.jsx | src/screens/ |
| AdminScreen.jsx | src/screens/ |
| AuditTrail.jsx | src/components/ |
| SettlementSection.jsx | src/components/ |
| MatchList.jsx | src/components/ |
| CourseEditor.jsx | src/components/ |
| ScoreEntryCard.jsx | src/components/live/ |
| HoleResultCard.jsx | src/components/live/ |
| roundSync.js | src/lib/ |
| supabase.js | src/lib/ |
| index.css | src/ |

**CRITICAL:** AuditTrail is at `src/components/AuditTrail.jsx` — NOT `src/AuditTrail.jsx`. Always edit the components/ version.

---

## Deploy

```bash
git add -A && git commit -m "description" && git push
```
Vercel deploys automatically. Safe to push mid-round — active players are unaffected (app runs in memory). Only risk is someone refreshing during the 60-90 second deploy window.

**Commit message tip:** Keep messages short and simple — special characters in commit messages can confuse the shell and cause `dquote>` mode. Use `"fix bug"` not `"fix 9-point header, restore front-9 pts label"`.

---

## Run Tests

```bash
npm test -- --watchAll=false
```
Currently: **112 passing tests**

---

## Key Constants (App.jsx)

```js
STORAGE_KEY = "golf-betting-round-setup-v6"
AUTO_ROUND_KEY = "golf-betting-auto-round-v1"
ROUND_CODE_KEY = "golf-betting-round-code-v1"
IS_JOINER_KEY = "golf-betting-is-joiner-v1"
SAVED_ROUNDS_KEY = "golf-betting-saved-rounds-v1"
LAST_NINE_POINT_PLAYERS_KEY = "golf-betting-last-nine-point-players-v1"
```

---

## Supabase Tables

### rounds
- code, data (JSON snapshot), device_id, save_to_stats, updated_at

### bug_reports
- tester_name, screen, severity, description, round_code, created_at

### courses
- id, name (unique), city, state, pars[], hcp[], created_by, device_id, use_count
- `device_id` added June 2026 for ownership-based edit control

### group_templates
- id (text PK), name, device_id, is_public, use_count, players (jsonb), game_config (jsonb), created_at, updated_at
- RPC: `increment_template_use(template_id text)`

### Edge Functions
- `quick-endpoint` — handles bug reports AND course save/update emails

---

## Supabase SQL to Run on Fresh Setup

```sql
-- Group templates table
create table if not exists group_templates (
  id            text primary key,
  name          text not null,
  device_id     text not null,
  is_public     boolean default false,
  use_count     integer default 0,
  players       jsonb,
  game_config   jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists group_templates_device_idx on group_templates (device_id);
create index if not exists group_templates_public_idx on group_templates (is_public, use_count desc);

create or replace function increment_template_use(template_id text)
returns void language sql as $$
  update group_templates set use_count = use_count + 1 where id = template_id;
$$;

alter table group_templates disable row level security;

-- Add device_id to courses (if not exists)
alter table courses add column if not exists device_id text;
```

---

## Completed Features

### Core Scoring Engine
- Handicap strokes (relative/full), net scoring, hole results
- Press matches, 9-point game, Long/Short, FBT/Match Play, Stroke play
- Toy Birdies, No Par 3 strokes (team games AND per 1v1 match toggle)
- 112 passing unit tests

### Team Game Formats (June 2026)
- Format dropdown: Press (6/6/6 · 9/9 · Custom) | Net Holes | Long/Short | Match Play (F/B/T) | Stroke Play
- Non-press formats: whole round, single team pairing, uses computeHoleResult for per-hole scoring
- Stroke Play: Low Net (best ball) or Combined (sum both players) toggle
- Match Play: Front/Back/Total segment toggles
- Results display in TeamGameAudit — detects press vs non-press result shape

### Spread Handicap Distribution
- Toggle in Setup (only for 6/6/6 format): Standard | Spread (2/2/2)
- Divides strokes evenly across segments 1-6, 7-12, 13-18

### Group Templates (June 2026)
- Save player names, HCPs, game format, 1v1 pairings as named template
- Private by default (device ID scoped), toggle to make public
- Public templates searchable by anyone
- Load → pre-fills Setup, scores blank, ready to edit and start

### Course Library
- Supabase courses table, search on focus (shows all), tap to load
- Save requires: course name + city + state
- Duplicate name protection
- Update course: owner (same device) = free edit, other device = admin PIN required

### 9-Point Scorecard (June 2026)
- Header in section title bar: rank-ordered net $ (points + birdie side bet)
- Points rows: running net $ shown only on active section (Front 9 until back starts, then Back 9)
- Total Pts line at bottom: raw points per player
- Birdie side bet wired: `source: "nine-point-birdie"` routes to mainGame bucket
- Scorecard filtered to only show players in the match (p1Id/p2Id/p3Id)
- Eagle 3x toggle: sub-toggle under Birdie 2x — if on, eagle = 3x points (15/9/3); if off, falls back to 2x
- Blitz descriptor: shows "(win 9-0-0 when you beat both by 2+)" when enabled

### Birdie Rules
- **1v1:** Toy Birdies = net birdie ties gross birdie (push), no change
- **Team game:** net birdies cancel gross birdies one-for-one across teams (2 gross vs 1 net → 1 bet wins)
- **9-point:** pairwise — each gross birdie collects from each opponent individually; net birdie protects that player only
- Won birdie: green circle; pushed (toy): grey circle; net cover: blue dashed circle

### Sync Stability (June 2026)
- Visibility change refetch: joiner only (host excluded — was causing mid-entry overwrites)
- Score entry guard: `isEnteringScore` ref blocks syncs for 2s after any keypad tap
- 3-second debounce guard: syncs blocked within 3s of any local score change
- Matches guard: stale sync cannot reduce match count (prevents match wipeout)
- Course lock: course never overwritten by background sync once round is in progress

### Admin Screen
- 🔧 nav button → PIN protected (PIN set in AdminScreen.jsx line 6, currently "1234")
- Shows active rounds by time window (1h/4h/12h/24h/48h)
- Join as Admin → loads round with full host access (not view-only)

### Multiplayer / Sync
- 4-digit round code, auto-sync to Supabase (debounced 800ms)
- Realtime subscription + visibility change listener (joiner only)
- 30-second polling — joiner only
- isJoiner persisted to localStorage — survives iOS Safari page reload
- Timestamp guard — stale fetch never overwrites newer local data

### Skins
- Per Skin, Pot, TV Skins modes
- Net/Gross toggle, carryover, birdie doubles

### Round Lifecycle
- Round Complete modal after Save Hole 18
- Course required before Start Round
- Unnamed player warning checks active players only (not unused P4/P5 slots)

---

## Known Bugs / Active Issues

- ⬜ Bug 3 — Match 1 disappearing mid-round — cannot reproduce, watching
- ⬜ Score entry auto-advance inconsistency across fields
- ⬜ iOS Safari localStorage — improved with early round code generation, monitor

---

## Feature Backlog (Prioritized)

### Near Term — Course Entry UX
- ⬜ CourseEditor redesign: par = 3 tap buttons (3/4/5) per hole, HCP = 18-button pad (used numbers greyed/removed), hole-by-hole nav with prev/next, auto-advance when both selected
- ⬜ Slope/Rating fields: show in CourseEditor but clearly optional (greyed placeholder)
- ⬜ Round name: keep but visually de-emphasize (auto-fill is enough for 95% of users)

### Near Term — Setup Flow
- ⬜ Templates shown first for return users, "Start Fresh" option below
- ⬜ Collapse advanced options (slope/rating, handicap mode) behind toggle
- ⬜ First-time user demo mode / sample round (bigger project — see Product Strategy)

### 1v1 Game Types
- ⬜ Press option for 1v1 match type (currently team game only)

### Josh / Trip Games
- ⬜ Low Net Par 3s (filter par 3 holes, cumulative net, 1/2/3 place payout)
- ⬜ Low Net Doubles (2-man blind draw, best net ball)
- ⬜ Vegas Doubles (combine scores lower-digit-first, 99 if ≥10)
- ⬜ Modified Stableford (points per hole vs net par, confirm scale with Josh)
- ⬜ Scramble (Round 2 only, $10 entry)
- ⬜ Ironhorse History (cumulative gross stroke play across all rounds/years)
- ⬜ Multi-group / Trip Setup — 4+ foursomes, one master leaderboard
- ⬜ Blind draw team assignment (random pairing generator)
- ⬜ Handicap self-service (pre-trip link, players enter own index)
- ⬜ USGA course handicap calculator (Index × Slope/113 + Course Rating - Par)
- ⬜ Scorecard photo → auto-extract course pars/HCPs/slope/rating via Claude API
- ⬜ Score export (CSV/spreadsheet) — Josh requested
- ⬜ Pre-generate round codes night before (Golf Genius model)

### Phase 2 (Player Accounts)
- ⬜ Player IDs (phone/Apple/Google sign-in)
- ⬜ Smart group suggestions: "these 5 players played together before, use that format?"
- ⬜ Cross-device sync by identity
- ⬜ Multi-year handicap tracking

### Phase 3 (Monetization)
- ⬜ Free tier: basic scoring + join round (course + players + start)
- ⬜ Pro tier ($5-10/mo): templates, history, smart suggestions, birdies/skins, team games
- ⬜ Club tier: Josh use case — multi-group, trip management, leaderboards

---

## Product Strategy Notes

### UX Philosophy (decided June 2026)
- **Setup should be 3 steps:** Who's playing + course → Games → Start Round
- **Return users:** Show templates first, "Start Fresh" below. One tap to load, one tap to start.
- **New users:** Minimum to start = course + players + one match. Everything else optional/discoverable.
- **Advanced options** (slope/rating, handicap mode, round name): collapsed by default, toggle to show
- **Group Templates** are the intended fast path for returning users — needs to be more prominent

### First-Time User Problem
- App is powerful but complex — new users handed the URL need guidance
- **Demo mode / sample round** needed: show what the app does before entering any data
- Could be a pre-loaded round they can explore, or a quick onboarding walkthrough
- This is a bigger project — design before building

### Monetization Timing
- Several club contacts and an assistant pro are already using/evaluating the app
- Phase B (setup restructure) may need to happen sooner than expected
- Design setup restructure with Pro tier in mind so it doesn't need to be redone
- Free vs Pro split: Free = score a round; Pro = everything that makes it better

### Smart Groups (Phase 2 prerequisite)
- Tim's group of 6-10 plays same formats but different subsets each day
- Ideal UX: select who's playing today → app suggests format based on history
- Requires player accounts (identity) — can't do this with device IDs alone
- Templates fill the gap for now

---

## Josh Fryback — Trip Golf Context

**Contact:** Connected through Tim's golf network  
**Course:** Ironhorse Golf Club (Kansas)  
**Trip:** Annual, 4 rounds, ~24 players, 6 foursomes simultaneously  
**Currently uses:** Macro-driven Excel spreadsheet  
**Tested:** Kiawah trip June 2026 — 3 complete rounds (Ocean, Osprey, Oak Point)  
**Next trip:** Memorial Day weekend 2027 (Ironhorse KC)  
**Key pain:** Settlement after each round (10-20 min manual work)  

### Ironhorse Course Data
```
Pars: 4,4,5,3,4,3,4,5,4 | 4,4,5,4,3,4,3,4,4 (Par 71)
HCPs: 3,13,17,7,5,11,9,15,1 | 4,16,10,6,12,14,18,8,2
Par 3 holes: 4, 6, 14, 16
White tees: rounds 1, 3, 4
```

### His 8 Game Types
| Game | Status | Notes |
|------|--------|-------|
| Low Net Stroke Play | ✅ Works | Cumulative 4 rounds |
| Low Net Skins | ✅ Works | Ties = full skin each, no carryover, 75/25 |
| Low Net Par 3s | ⬜ Build | Filter par 3 holes, cumulative net, 1/2/3 place payout |
| Low Net Doubles | ⬜ Build | 2-man blind draw, best net ball |
| Vegas Doubles | ⬜ Build | Combine scores lower-digit-first, 99 if ≥10 |
| Modified Stableford | ⬜ Build | Points per hole vs net par |
| Scramble | ⬜ Build | Round 2 only, $10 entry |
| Ironhorse History | ⬜ Build | Multi-year cumulative stroke play |

### Vegas Doubles Formula
```js
function vegasScore(net1, net2) {
  if (net1 >= 10 || net2 >= 10) return 99;
  const low = Math.min(net1, net2);
  const high = Math.max(net1, net2);
  return low * 10 + high; // lower Vegas score wins
}
```

### Josh's Payout Structure
- Pool model: ~24 players × $5/game = $120 pot per game
- Payout: 50% / 25% / 16.7% / 8.3% (4 places)
- Ties: combine places and split equally

### Pending Josh Call Topics
1. Doubles/Vegas pairings — same as foursome or separate blind draw?
2. Foursome reshuffling — same all 4 rounds or new draw each round?
3. Stableford points scale (eagle/birdie/par/bogey/double values)
4. Live leaderboard — manual refresh OK?
5. Mixed tees — how does he want to enter per-player tee selection?
6. Course setup trouble at Kiawah — did auto-open course search help?

---

## Tim's Group (COD Group)

Regular players:
- Jon Biro (HCP 12) — power user, finds edge cases
- Stan Toy (HCP 23)
- Bishale Patel (HCP 13)
- John Cahill (HCP 21)
- Tim Lootens (HCP 8) — developer

Regular games: 5-player mode, Long/Short for Tim vs others, Toy Birdies rule ON, 6/6/6 team game  
Courses: Westwood (Westwood TX), Generals  
**Biro note:** Always test with him before considering something "done."

---

## Scoring Engine Key Functions

```js
// Handicap
getHandicapStrokes(playerId, hole, players, course, handicapMode)
getSpreadHandicapStrokes(playerId, hole, players, course, handicapMode)
getNetScore(playerId, hole, players, course, scores, handicapMode)

// Match computation
computeHoleResult({ hole, teamA, teamB, players, course, scores, handicapMode })
playPressMatch({ teamA, teamB, start, end, trigger, context })
playIndividualMatch({ match, players, course, scores, handicapMode })
playTeamMatch(match, context)  // non-press team formats

// 9-Point
getNinePointHoleStatus(playerIds, hole, players, course, scores, handicapMode, birdieDoublePoints, blitzEnabled)
scoreNinePointHole(playerIds, hole, ..., birdieDoublePoints, eagleTriplePoints)
getNinePointMatchSummary(playerIds, players, course, scores, handicapMode, blitzEnabled, dollarsPerPoint, holeCount, noPar3Strokes, birdieDoublePoints, eagleTriplePoints)

// Birdies
buildBirdieResults({ matches, matchResults, teamGames, teamGameResults, scores, course, birdiesEnabled, birdieBetAmount, toyRule, players, handicapMode })
buildTeamBirdieResults(teamGames, teamGameResults, scores, course, getTeamGameSelection, birdieBetAmount, toyRule, players, handicapMode)
buildNinePointBirdieResults(matchResults, scores, course, toyRule, players, handicapMode)

// Results
scoreRound(round, { players, course, scores, matches, matchResults, teamGames, teamGameResults, birdieResults, handicapMode, ... })
buildLeaderboard(ledger, { players })

// Scores format: { holeNumber: { playerId: score } }
// Example: { 1: { p1: 5, p2: 4 }, 2: { p1: 3, p2: 4 } }
```

---

## roundSync.js Key Functions

```js
// Rounds
generateRoundCode()
fetchRound(code)
shareRoundWithDevice(roundCode, data, deviceId)
fetchRecentRounds(deviceId)
saveRoundToStats(code, data, deviceId)
fetchStatsRounds(deviceId)
getDeviceId()

// Courses
saveCourseToLibrary(course, createdBy, deviceId)
searchCourses(query)  // pass "%" to get all
checkCourseExists(name)
updateCourseInLibrary(courseId, course, deviceId, adminPin)

// Templates
saveTemplate(template, deviceId)
fetchMyTemplates(deviceId)
searchTemplates(query)
incrementTemplateUse(templateId)
deleteTemplate(templateId, deviceId)

// Admin
fetchActiveRounds(hoursAgo = 4)

// Trips
createTrip(trip, deviceId)
fetchMyTrips(deviceId)
fetchTrip(tripId)
saveTripPlayers(tripId, players)
fetchTripRounds(tripId)
saveTripGames(tripId, games)
fetchRoundsByCode(codes)
```

---

## Admin Screen

- Nav button: 🔧
- PIN: defined in `src/screens/AdminScreen.jsx` line 6 as `const ADMIN_PIN = "1234"`
- Change PIN by editing that constant
- Session-persisted (sessionStorage) — re-enter on new browser session
- Escape hatch on PIN screen → opens bug report modal

---

## Critical Instructions for Claude

1. **NEVER rename files** — App.jsx not App_new.jsx, App_v2.jsx etc.
2. **AuditTrail lives in src/components/** — always edit `src/components/AuditTrail.jsx`, never `src/AuditTrail.jsx`
3. **Always zip for delivery** — one zip per task, include all changed files
4. **Score format is hole-first:** `{ holeNumber: { playerId: score } }` not `{ playerId: { holeNumber: score } }`
5. **Test before shipping** — run `npm test -- --watchAll=false` and confirm all pass (currently 112)
6. **Build before shipping** — run `npm run build` and confirm no lint errors
7. **Lint errors = build fails** — check for unused vars, missing deps
8. **9-point scorecard birdie rendering** — intentionally gold, do not change
9. **Admin PIN** — "1234", change in AdminScreen.jsx line 6
10. **Press trigger** — for team games only currently; 1v1 press is on the backlog
11. **Birdie $$ routing** — match-birdie → sideMatches, team-birdie → mainGame, nine-point-birdie → mainGame (do not fold into engine sideMatches — causes double count)
12. **Supabase scores format** — `getRawScore(scores, hole, playerId)` expects `scores[hole][playerId]`
13. **teamGameFormat state** — "press" | "standard" | "longshort" | "match_fbt" | "stroke"; non-press uses playTeamMatch() not playPressMatch()
14. **Course lock during sync** — course is never overwritten by background sync once round is in progress (lastHoleSaved !== null or scores exist)
