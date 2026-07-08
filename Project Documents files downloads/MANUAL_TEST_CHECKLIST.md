# StoppedCounting — Manual Test Checklist
*Run before every Saturday round. Takes ~10 minutes.*

---

## PRE-ROUND: Load Round 6341 (Wheel Reference Round)

**Setup:** Go to Admin → Last 30 days → find round 6341 → Join as Admin

---

### ✅ CHECK 1 — Round Preview Dot Grid (Spread, noPar3)
*Go to Setup → Start Round → verify Preview screen*

Players: Tim(9), Jon(12), John(22), Lou(18), Stan(23)
Spread mode, noPar3=true, Westwood

**Expected dots:**

| Player | Seg 1 (H1-6) | Seg 2 (H7-12) | Seg 3 (H13-18) | Total |
|--------|-------------|--------------|----------------|-------|
| Tim    | none        | none         | none           | 0     |
| Jon    | H2          | H11          | H14            | 3     |
| John   | H2,H4,H6,H1 | H11,H7,H12,H9,H10 | H14,H16,H18,H13 | 13 |
| Lou    | H2,H4,H6   | H11,H7,H12   | H14,H16,H18    | 9     |
| Stan   | H2,H4,H6,H1 | H11,H7,H12,H9,H10 | H14,H16,H18,H13 | 13 |

**Critical holes to verify:**
- [ ] Lou H6 has a dot ← This failed in production (Jul 4 2026)
- [ ] Lou H9 does NOT have a dot (standard would give one, spread doesn't)
- [ ] Tim has ZERO dots
- [ ] All par 3s (H3,H8,H15,H17) are yellow, no dots

---

### ✅ CHECK 2 — Total Scorecard Dots Match Preview
*Results → Total Scorecard · Westwood · Spread*

- [ ] HCP row label shows "HCP·Spr" (not just "HCP")
- [ ] Lou's dots match Check 1 exactly (H2,H4,H6,H7,H11,H12,H14,H16,H18)
- [ ] Tim has zero dots
- [ ] Dots are green circles on correct holes

---

### ✅ CHECK 3 — Team Game Scorecard Dots Match
*Results → Team Game → Holes 1-6 → Scorecard View*

Game 1 teams: Jon+Stan vs Tim+John
- [ ] Best ball shown has correct dot if that player has a stroke
- [ ] H6: if Lou (not in game 1) — check game 3 instead where Lou plays
- [ ] Dots in team scorecard match Preview screen for those players

---

### ✅ CHECK 4 — Leaderboard $$ Match Settle Up
*Results → Leaderboard (top) vs Settle Up (bottom)*

- [ ] Leaderboard total for each player matches their Settle Up amount
- [ ] Money in play: won = lost (shown in green checkmark row)
- [ ] Example: if Tim shows +$30 in leaderboard, he should receive $30 total in Settle Up

---

### ✅ CHECK 5 — Standings Match Leaderboard
*Results → Standings section*

- [ ] TEAM column + 1V1 column + BIRDS column = TOTAL column for each player
- [ ] TOTAL matches Leaderboard amount

---

### ✅ CHECK 6 — Refresh Test (Spread Preservation)
*On Results screen → Refresh browser*

- [ ] Lands on Results screen (not Setup)
- [ ] Spread mode still selected (not reset to Standard)
- [ ] Same dot amounts as before refresh
- [ ] Bet amount unchanged

---

## PRE-ROUND: Quick 9-Point Check (if playing 9-point)

Load any recent 9-point round or use round 7552 (Tim/Mike/Mark, 10 holes)

- [ ] Every hole sums to exactly 9 points (or 18 if birdie double fired)
- [ ] Leaderboard $$ = (points won - points lost) × bet amount
- [ ] Money balances: total won = total lost

---

## ON COURSE: Score Entry Verification

After entering hole 1 scores:
- [ ] Supabase sync indicator shows ✓ (not spinning)
- [ ] If network lost: re-enter last hole after reconnecting and verify sync catches up

After hole 9:
- [ ] Back 9 section appears in Live screen
- [ ] Running totals reset correctly for each match type

After hole 18:
- [ ] Round Complete modal appears
- [ ] Email confirmation received
- [ ] Results screen shows all 18 holes

---

## KNOWN PRODUCTION BUGS (Monitor)

| Bug | Date | Status |
|-----|------|--------|
| Lou H6 missing spread dot | Jul 4 2026 | Fixed 140 |
| Spread reset to Standard on refresh | Jul 5 2026 | Fixed 143 |
| 8 holes lost (7552) | Jul 5 2026 | Mitigated 145 — monitor |
| Trip save 409 conflict | Jul 5 2026 | Backlog |

---

## AUTOMATED TESTS (run before any deploy)

```bash
npm test -- --watchAll=false
```

Must show: **156 passing, 0 failing**

Key test coverage:
- Spread dots correct for all 5 players (tests 28-34, 39-42)
- Lou H6 specifically (test 33)
- Press 1-down and 2-down balance to zero (tests 43-47)
- Long/Short result structure (tests 48-50)
- Match Play F/B/T segments (tests 51-52)
- Full wheel settlement balances (test 53)
- 9-point always sums to 9 (test 38)
- 9-point birdie double fires only for winner (test 55)
- 9-point blitz gives 9/0/0 (test 56)

---

## ON-COURSE DECISION TREE

### When something looks wrong mid-round:

**Step 1 — Tap "Dots" on Live screen**
- Preview dots correct → engine is right → trust $$ results
- "Hey guys — preview dots are correct, any other dot differences are cosmetic. Let's verify the team results like we always do."
- Preview dots wrong → go to Step 2

**Step 2 — Try to fix in Setup**
- Check: Spread on/off? noPar3 on/off? Correct HCPs?
- Fix and re-check Preview
- Dots now correct → back to round
- Dots still wrong → Step 3

**Step 3 — Paper is source of truth**
- Note which player/holes are affected
- Keep playing, track affected holes on paper
- After round: use Admin screen to compare
- Report bug with round code

---

## REAL SANITY CHECKS (what actually catches problems)

**"Money in = money lost ✓"** — always true, useless as a check. Ignore it.

**What actually matters:**
1. **Preview dots correct** — most important, catches stroke bugs
2. **"Does this feel right?"** — human check: "there's no way Stan beat Tim on that hole, Tim had a 4 and Stan had a 6"
3. **Specific player amounts make sense** — "Biro lost $40, does that feel right given how he played?"
4. **One-hole spot check** — for one hole you can verify: Tim net 4, Jon net 5 → Tim wins → check app shows Tim winning that hole

**The app's job is to get #1 right. #2-4 are your group's gut check.**


---

## AUTOMATED TEST COVERAGE (178 tests)

Run: `npm test -- --watchAll=false` — must show **178 passing, 0 failing**

### What Tests Cover

**Spread Dots (11 tests: 28-34, 39-42)**
- All 5 players in round 6341 get correct holes
- Lou H6 specifically (the July 4 production bug)
- Standard vs spread give different holes confirmed
- Spread by segment counts correct (3/3/3, 4/5/4 uneven split)

**noPar3 Cap (2 tests: 57-58)**
- Standard mode caps at 14 eligible holes when noPar3=true
- Par 3 holes always return 0

**High HCP / Edge Cases (7 tests: 59-65)**
- 19 relative strokes → double dot on HCP1 when noPar3=OFF
- 19 strokes + noPar3=ON → capped at 14, no double dots ever
- 36 relative strokes both ways
- Full HCP vs relative give different totals
- Spread in full HCP mode distributes evenly

**Relative Mode (3 tests: 67-69)**
- Lowest player always gets 0 strokes
- All same HCP → everyone gets 0
- Plus handicap (stored as negative number) works correctly

**Stroke Distribution (3 tests: 70-72)**
- Strokes go to hardest holes first (HCP rank order)
- Spread per-segment counts exact
- Uneven spread extra dot goes to correct segment

**Press Trigger (5 tests: 43-47)**
- 1-down fires earlier than 2-down
- Both trigger modes balance to zero $$

**Format Settlement (12 tests: 48-56, 73-75)**
- Long/Short: structure correct, no Short when Long tied all 18
- Match Play F/B/T: 3 segments, $$ balances
- Full wheel settlement (round 6341 data) balances
- Net Holes $$ balances
- 9-point always sums to 9 points per hole
- 9-point birdie double fires only for winner, gives 18 points
- 9-point blitz gives 9/0/0
- Birdie results don't create money from nowhere

**Play Even (3 tests: 76-78)**
- No strokes applied when Play Even checked
- Different result from standard (strokes) match
- Money balances to zero

**Non-Press Team Game (4 tests: 24-27)**
- All non-press formats (Long/Short, Match Play, Stroke) don't crash
- Result object (not array) handled correctly everywhere

**9-Point Real Data Round 7552 (4 tests: 35-38)**
- Money balances with real scores
- Points sum to 9 every hole
- Hole 1 correct winner verified

**Original Foundation (23 tests: 1-23)**
- Basic scoring, handicap calculation, settlement

### What Tests Do NOT Cover
- Rendering / component prop wiring (the July 4 dot bug source)
- Supabase sync behavior and score loss
- UI interactions and screen navigation
- Cross-screen $$ matching (leaderboard vs settle up)
- iOS Safari specific behavior

**These gaps are covered by the Manual Checklist above.**

