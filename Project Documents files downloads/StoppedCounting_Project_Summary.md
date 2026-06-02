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

---

## Deploy

```bash
git add -A && git commit -m "description" && git push
```
Vercel deploys automatically. Safe to push mid-round — active players are unaffected (app runs in memory). Only risk is someone refreshing during the 60-90 second deploy window.

---

## Run Tests

```bash
npm test -- --testPathPattern=scoringEngine
```
Currently: **70 passing tests**

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
- 70 passing unit tests

### Spread Handicap Distribution
- Toggle in Setup (only for 6/6/6 format): Standard | Spread (2/2/2)
- Divides strokes evenly across segments 1-6, 7-12, 13-18
- Remainder goes to segments with globally hardest holes
- Works for 3, 4, 5 player modes

### Group Templates (June 2026)
- Save player names, HCPs, game format, 1v1 pairings as named template
- Private by default (device ID scoped), toggle to make public
- Public templates searchable by anyone
- Load → pre-fills Setup, scores blank, ready to edit and start
- Update in place (owner = no PIN, other device = admin PIN required)
- Search Public tab auto-loads all public templates on open
- Loading a public template switches to My Templates tab automatically

### Course Library
- Supabase courses table, search on focus (shows all), tap to load
- Save requires: course name + city + state
- Duplicate name protection — warns and offers to load existing instead of overwriting
- Update course: owner (same device) = free edit, other device = admin PIN required
- Bug fixed June 2026: load index was off-by-one causing 19th hole on save
- `device_id` stored on save for ownership

### Admin Screen
- 🔧 nav button → PIN protected (PIN set in AdminScreen.jsx line 6, currently "1234")
- Shows active rounds by time window (1h/4h/12h/24h/48h)
- Each round shows: code, LIVE badge, course, holes played, player names, time ago
- Join as Admin → loads round with full host access (not view-only)
- PIN screen has escape hatch: "🐛 Report a bug instead" → opens bug modal

### Birdie Rendering (June 2026)
- Won birdie: green circle outline (no fill)
- Pushed birdie (toy rule): grey circle outline
- Net birdie cover (toy rule): blue dashed circle
- Standings: BIRDS column removed, birdie $$ included in 1v1 total
- Match header: shows birdie-adjusted total + 🐦+N net birdies won
- Summary line format: `🐦 Toy Birdies — (1 net) birdies included in total match result. Jon Biro +2  Stan Toy +1`
- Four states: No Birdies Tracked / No Birdies Made / All Pushed Nothing Paid / paid summary
- 9-point scorecard birdie rendering intentionally left gold (different visual purpose)

### Branding & UI
- Renamed to StoppedCounting, green/gold Georgia serif header
- Setup: card layout, button toggles, iOS-style switches
- Score entry: ‹ Hole N › nav, auto-advance, score labels, color-coded keypad
- Player label shows: Tim (6) • — name, total HCP strokes, dot if stroke on current hole
- Auto-capitalize: player names, course name, round name

### Multiplayer / Sync
- 4-digit round code, auto-sync to Supabase (debounced 800ms)
- Realtime subscription + visibility change listener
- 30-second polling — joiner only
- isJoiner persisted to localStorage — survives iOS Safari page reload
- Joiner always lands on Results screen
- skipScreen=true on all polling/visibility fetches
- Timestamp guard — stale fetch never overwrites newer local data

### Skins
- Per Skin, Pot, TV Skins modes
- Net/Gross toggle, carryover, birdie doubles
- Full skins support in JoinRound.jsx

### 9-Point Scorecard
- Points section first (money first)
- Dollar values per hole, color coded
- Net $ shown as +X or -X (zero-sum)

### Round Lifecycle
- Round Complete modal after Save Hole 18
- "Save This Round" only appears when complete
- Auto-save to localStorage every 800ms when round code exists
- "Continue a recent round?" modal on fresh load

### Bug Reporting
- 🐛 button → slide-up modal
- Pre-fills tester name from localStorage OR Player 1 name
- Submits to Supabase bug_reports table
- Email notification to lootens@yahoo.com

### History & Stats
- HistoryScreen: saved rounds list + cumulative money leaderboard
- Cloud restore chain: localStorage → saved code → Supabase fetchRound

### Press Trigger Fix (June 2026)
- Bug: global pressTrigger state wasn't syncing to individual teamGames objects
- Fix: pressing trigger button now updates both global state AND all teamGames simultaneously

---

## Known Bugs / Active Issues

- ⬜ Bug 3 — Match 1 disappearing mid-round — cannot reproduce, watching
- ⬜ Score entry flashing — reduced (polling is joiner-only) but not fully resolved
- ⬜ Joiner sync reliability — improved but iOS Safari still occasionally drops

---

## Feature Backlog (Prioritized)

### Near Term
- ⬜ Trip Setup Screen (multi-round, Josh use case) — see Josh section below
- ⬜ Par 3s game (lives inside Trip Setup)
- ⬜ Expand beyond 5 player limit (UI constraint only, engine handles any number)
- ⬜ Low Net leaderboard UI
- ⬜ History from Supabase (cumulative stats)

### 1v1 Game Types
- ⬜ Press option for 1v1 match type (currently press only works for team games)

### Josh / Trip Games
- ⬜ Low Net Par 3s (filter par 3 holes, cumulative net score, 1st/2nd/3rd payout 55/30/10 or confirm with Josh)
- ⬜ Low Net Doubles (2-man best net ball, blind draw teams)
- ⬜ Vegas Doubles (combine net scores: lower digit first, e.g. 3+5=35; if ≥10 = 99)
- ⬜ Modified Stableford (points vs net score vs par, confirm scale with Josh)
- ⬜ Scramble (Round 2 only, $10 entry)
- ⬜ Ironhorse History (cumulative gross stroke play across all rounds/years)
- ⬜ Multi-group / Trip Setup — 4 foursomes, one master leaderboard (biggest missing piece for Josh)
- ⬜ Blind draw team assignment (random pairing generator)
- ⬜ Handicap self-service (pre-trip link, players enter own index)
- ⬜ USGA course handicap calculator (Index × Slope/113 + Course Rating - Par)
- ⬜ Scorecard photo → auto-extract course pars/HCPs/slope/rating via Claude API

### Phase 2 (Player Accounts)
- ⬜ Player IDs (phone/Apple/Google)
- ⬜ Smart group suggestions from history
- ⬜ Cross-device sync by identity

### Phase 3 (Monetization)
- ⬜ Free: basic scoring + join
- ⬜ Pro ($5-10/mo): templates, history, smart suggestions
- ⬜ Club tier: Josh use case — multi-group, trip management

---

## Josh Fryback — Trip Golf Context

**Contact:** Connected through Tim's golf network  
**Course:** Ironhorse Golf Club  
**Trip:** Annual, 4 rounds, 16-20 players, 4 foursomes simultaneously  
**Currently uses:** Macro-driven Excel spreadsheet  
**Tested:** May 2026 trip — sent Tim a round code mid-round  
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

### Trip Setup Architecture (Planned)
- `trips` table — id, name, device_id, created_at
- `trip_players` — trip_id, name, hcp_index, hcp_source, submitted_by
- `trip_rounds` — trip_id, round_number, course_id, tee_name, slope, rating, par, round_code
- `trip_games` — trip_id, game configs, entry fees, payout structure
- Course handicap formula: `round((Index × Slope / 113) + (Course Rating - Par))`
- Self-entry link: `golf-app-neon.vercel.app/join-trip/TRIPCODE`
- Each foursome gets own round code, all tied to Trip
- Trip leaderboard aggregates all foursomes in real-time

### Josh's 2025 Players (19 players)
Fryback Joshua (19), Schuble Greg (15), Lax Rodney (17), Brown Gerry (18), Martin Jake (17), Wildt Jeff (19), DeWitt Paul (13), Bitter Matthew (33), Fox John (25), Kilgore Dan (18), Bitter Tim (17), Shriner Jared (13), Treadway Joe (5), Johnson Rex (38), Kauffman Randy (18), Lee Nate (29), Patterson Andrew (13), Fryback Justin (17), Coutinho Rian (21)

---

## Tim's Group (COD Group)

Regular players:
- Jon Biro (HCP 12)
- Stan Toy (HCP 23)
- Bishale Patel (HCP 13)
- John Cahill (HCP 21)
- Tim Lootens (HCP 8)

Regular games: 5-player mode, Long/Short for Tim vs others, Toy Birdies rule ON, 6/6/6 team game

Courses: Westwood (Westwood TX), Generals

**Biro note:** Tends to find edge cases by doing unexpected things. Always test with him before considering something "done."

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

// Results
buildBirdieResults({ matches, matchResults, teamGames, teamGameResults, scores, course, birdiesEnabled, birdieBetAmount, toyRule, players, handicapMode })
scoreRound({ players, course, scores, matches, teamGames, handicapMode, birdiesEnabled, birdieBetAmount, skinsEnabled, ... })

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
2. **Always zip for delivery** — one zip per task, include all changed files
3. **Score format is hole-first:** `{ holeNumber: { playerId: score } }` not `{ playerId: { holeNumber: score } }`
4. **Test before shipping** — run `npm test -- --testPathPattern=scoringEngine` and confirm all pass
5. **Lint errors = build fails** — check for unused vars, missing deps
6. **9-point scorecard birdie rendering** — intentionally gold, do not change
7. **Admin PIN** — "1234", change in AdminScreen.jsx line 6
8. **Press trigger** — for team games only currently; 1v1 press is on the backlog
9. **Birdie $$ in standings** — birdies bucket kept separate in engine, displayed combined with sideMatches in UI (do not fold into engine sideMatches — causes double count)
10. **Supabase scores format** — `getRawScore(scores, hole, playerId)` expects `scores[hole][playerId]`
