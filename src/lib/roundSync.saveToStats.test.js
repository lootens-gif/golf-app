/**
 * roundSync.saveToStats.test.js
 *
 * Regression test for an unguarded write path found while investigating a
 * real incident: round 9194 (Wolf test round, played and completed July
 * 14) showed an unexplained partial data change in Admin on July 20, with
 * no new round ever actually started.
 *
 * shareRoundWithDevice (the normal live-sync path) already checked, before
 * every write, whether the remote round was further along or already
 * complete with different scores — and refused to overwrite it if so.
 * saveRoundToStats (fired from "Save Round" on the Results screen, or the
 * Round Complete modal) is a second, completely separate upsert to the
 * exact same `rounds` row, with NO such check at all — it just overwrote
 * unconditionally.
 *
 * The theory this closes: a device reopening a bookmarked URL days later
 * can silently auto-restore an old *completed* round (see
 * CRITICAL_GUARDS.md and the AUTO_ROUND_KEY reset gap fixed alongside
 * this). If that device then hits Save/Save-to-stats — an entirely
 * ordinary action for someone who thinks they just finished a round —
 * saveRoundToStats would blow away the real completed data in Supabase
 * with whatever's in local state, no questions asked. This test proves
 * that path is now guarded exactly like shareRoundWithDevice always was.
 *
 * Run with: npm test -- --testPathPattern=saveToStats
 */

jest.mock("./supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { supabase } from "./supabase";
import { saveRoundToStats } from "./roundSync";

// Builds a from() mock supporting both call shapes saveRoundToStats needs:
// the guard's .select("data").eq("id", code).single() read, and the
// eventual .upsert(...) write — in that order, since the guard always
// reads before the write is attempted.
//
// Real Supabase shape, easy to get wrong: .select("data") selects the
// column literally named "data", so the returned ROW is `{ data: <blob> }`.
// The client wraps THAT in the response's own `.data` field too, so a
// found row resolves to `{ data: { data: <blob> }, error: null }` — two
// levels of "data" nesting, not one. Pass the round's snapshot as `blob`
// (or `null` for "no round found yet") and this builds the real shape.
function mockExistingRound(blob, error = null) {
  const upsertMock = jest.fn(() => Promise.resolve({ error: null }));
  supabase.from.mockReturnValue({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: blob ? { data: blob } : null, error }),
      }),
    }),
    upsert: upsertMock,
  });
  return upsertMock;
}

describe("saveRoundToStats", () => {
  test("refuses to overwrite when local is behind the remote round's progress", async () => {
    const upsertMock = mockExistingRound({ lastHoleSaved: 18, scores: { 1: { A: 4 } } });

    await saveRoundToStats("9194", { lastHoleSaved: 5, scores: { 1: { A: 9 } } }, "device-1");

    expect(upsertMock).not.toHaveBeenCalled();
  });

  test("refuses to overwrite a completed remote round whose scores differ from local — the exact round-9194 scenario", async () => {
    const remoteScores = { 1: { A: 4, B: 5 }, 2: { A: 4, B: 4 } };
    const staleLocalScores = { 1: { A: 9, B: 9 }, 2: { A: 4, B: 4 } }; // hole 1 overwritten by a stray test edit

    const upsertMock = mockExistingRound({ lastHoleSaved: 18, scores: remoteScores });

    await saveRoundToStats("9194", { lastHoleSaved: 18, scores: staleLocalScores }, "device-1");

    // This is the assertion that fails without the fix: saveRoundToStats
    // used to upsert unconditionally here, silently clobbering the real
    // completed round's data.
    expect(upsertMock).not.toHaveBeenCalled();
  });

  test("allows the write when there is no existing round yet (a genuinely new code)", async () => {
    const upsertMock = mockExistingRound(null, { code: "PGRST116" });

    await saveRoundToStats("1234", { lastHoleSaved: 3, scores: { 1: { A: 4 } } }, "device-1");

    expect(upsertMock).toHaveBeenCalledTimes(1);
  });

  test("allows the write when local matches the remote exactly (e.g. just flipping the save-to-stats flag on, no real conflict)", async () => {
    const scores = { 1: { A: 4, B: 5 } };
    const upsertMock = mockExistingRound({ lastHoleSaved: 18, scores });

    await saveRoundToStats("9194", { lastHoleSaved: 18, scores }, "device-1");

    expect(upsertMock).toHaveBeenCalledTimes(1);
  });

  test("proceeds with the write if the existence check itself fails (network error) — doesn't block a real save over a connectivity hiccup", async () => {
    supabase.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.reject(new Error("network down")),
        }),
      }),
      upsert: jest.fn(() => Promise.resolve({ error: null })),
    }));

    await expect(
      saveRoundToStats("5555", { lastHoleSaved: 3, scores: {} }, "device-1")
    ).resolves.not.toThrow();
  });
});
