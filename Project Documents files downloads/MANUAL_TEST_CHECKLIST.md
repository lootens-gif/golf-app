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
