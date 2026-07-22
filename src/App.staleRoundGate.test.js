/**
 * App.staleRoundGate.test.js
 *
 * Regression test for CRITICAL_GUARDS.md Guard #41 (stale-completed-round
 * mount gate).
 *
 * Context: a device reopening a bookmarked URL days after a round finished
 * would silently land back on that finished round as if it were current —
 * confirmed as the likely mechanism behind round 9194 (see Guard #40).
 * Guard #40 already stops that scenario from corrupting real data on
 * write; this guard stops the confusing UX itself: on mount, a completed
 * round (lastHoleSaved >= 18) that hasn't been touched in 24+ hours is
 * gated behind an explicit "Continue to This Round" / "Start Fresh
 * Instead" interstitial instead of silently loading.
 *
 * This file tests getStaleCompletedRoundInfo() in isolation — the pure
 * decision function App.jsx's mount effect calls before deciding whether
 * to gate. It deliberately does NOT attempt to mount the full App
 * component (no existing test harness mocks localStorage/Supabase for
 * App.jsx — App.test.js is a placeholder). The decision logic is where an
 * off-by-one or wrong-fallback bug would actually live, so that's what's
 * covered here.
 *
 * Run with: npm test -- --testPathPattern=staleRoundGate
 */

import { getStaleCompletedRoundInfo } from "./App";

const HOUR = 1000 * 60 * 60;

function isoHoursAgo(hours) {
  return new Date(Date.now() - hours * HOUR).toISOString();
}

describe("getStaleCompletedRoundInfo", () => {
  test("returns null for a round that hasn't reached 18 holes yet, regardless of how old", () => {
    const snapshot = { lastHoleSaved: 12, completedAt: isoHoursAgo(500) };
    expect(getStaleCompletedRoundInfo(snapshot, null)).toBeNull();
  });

  test("returns null for a completed round finished less than 24h ago (the legitimate next-morning score-fix case)", () => {
    const snapshot = { lastHoleSaved: 18, completedAt: isoHoursAgo(10) };
    expect(getStaleCompletedRoundInfo(snapshot, null)).toBeNull();
  });

  test("returns null right up to the threshold (23.9h) — no false positive just under 24h", () => {
    const snapshot = { lastHoleSaved: 18, completedAt: isoHoursAgo(23.9) };
    expect(getStaleCompletedRoundInfo(snapshot, null)).toBeNull();
  });

  test("gates a completed round finished just over 24h ago", () => {
    const snapshot = { lastHoleSaved: 18, completedAt: isoHoursAgo(24.1) };
    const result = getStaleCompletedRoundInfo(snapshot, null);
    expect(result).not.toBeNull();
    expect(result.hoursSince).toBeGreaterThanOrEqual(24);
  });

  test("gates round 9194's actual scenario — completed, untouched for 6 days", () => {
    const snapshot = { lastHoleSaved: 18, completedAt: isoHoursAgo(6 * 24) };
    const result = getStaleCompletedRoundInfo(snapshot, null);
    expect(result).not.toBeNull();
    expect(Math.floor(result.hoursSince / 24)).toBe(6);
  });

  test("falls back to remoteUpdatedAt when the local snapshot has no completedAt (cross-device / pre-fix round)", () => {
    const snapshot = { lastHoleSaved: 18 }; // no completedAt — completed before this fix existed
    const staleRemote = isoHoursAgo(48);
    expect(getStaleCompletedRoundInfo(snapshot, staleRemote)).not.toBeNull();

    const freshRemote = isoHoursAgo(2);
    expect(getStaleCompletedRoundInfo(snapshot, freshRemote)).toBeNull();
  });

  test("prefers the snapshot's own completedAt over remoteUpdatedAt when both are present", () => {
    // completedAt says fresh (2h), remoteUpdatedAt says stale (48h) — the
    // guard's own comment states completedAt is preferred as the more
    // precise signal (remote updated_at reflects ANY write to the row,
    // not specifically completion).
    const snapshot = { lastHoleSaved: 18, completedAt: isoHoursAgo(2) };
    expect(getStaleCompletedRoundInfo(snapshot, isoHoursAgo(48))).toBeNull();
  });

  test("returns null (does not gate) when neither completedAt nor remoteUpdatedAt is available — never guess", () => {
    const snapshot = { lastHoleSaved: 18 };
    expect(getStaleCompletedRoundInfo(snapshot, null)).toBeNull();
  });

  test("returns null for a missing/unusable snapshot", () => {
    expect(getStaleCompletedRoundInfo(null, isoHoursAgo(100))).toBeNull();
    expect(getStaleCompletedRoundInfo(undefined, isoHoursAgo(100))).toBeNull();
  });
});
