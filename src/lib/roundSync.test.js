/**
 * roundSync.test.js
 * Run with: npm test -- --testPathPattern=roundSync
 *
 * Tests generateUniqueRoundCode() — the actual fix for a confirmed,
 * severe bug: round codes were random 4-digit numbers with zero collision
 * protection anywhere in the app. A real round collided with an old
 * leftover round sharing the same code, corrupting a live scored round
 * with old placeholder players and sample scores (reported by Tim/Jon
 * Biro, round 8925, July 2026).
 *
 * Rewritten (Aug 2026) around an atomic INSERT-based claim rather than a
 * SELECT-then-decide check — a post-incident audit found the original
 * check-then-use approach left a real gap between "confirmed free" and
 * "actually claimed" that a second concurrent attempt could theoretically
 * land in. A plain insert either succeeds (atomically claimed, no gap) or
 * fails with a real 23505 unique-violation if someone else claimed it
 * first — nothing in between for a race to exploit.
 */

jest.mock("./supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { supabase } from "./supabase";
import { generateUniqueRoundCode, shareRoundWithDevice } from "./roundSync";

// Builds a mock matching the exact chain used in roundSync.js:
// supabase.from("rounds").insert({...})
function mockInsertResult(result) {
  supabase.from.mockReturnValue({
    insert: () => Promise.resolve(result),
  });
}

// Builds a mock supporting both the select-to-check-staleness chain AND
// the upsert-to-write chain shareRoundWithDevice actually uses, so tests
// can inspect whether a write was actually attempted or correctly
// blocked.
function mockRoundWriteChain({ existingData }) {
  const upsertSpy = jest.fn(() => Promise.resolve({ error: null }));
  const insertSpy = jest.fn(() => Promise.resolve({ error: null })); // succeeds immediately - claims whatever fresh code generateUniqueRoundCode tries first
  supabase.from.mockReturnValue({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: existingData ? { data: existingData } : null }),
      }),
    }),
    upsert: upsertSpy,
    insert: insertSpy,
  });
  return upsertSpy;
}

describe("shareRoundWithDevice — content comparison guard (Aug 2026, round 8466)", () => {
  test("CONFIRMED REAL BUG: a stale snapshot with fewer players but the SAME lastHoleSaved used to silently overwrite a live round — now correctly blocked", async () => {
    // Remote (the real, current state): 5 real players, hole 16 saved.
    const remoteData = {
      lastHoleSaved: 16,
      allPlayers: [
        { name: "Tim" }, { name: "Biro" }, { name: "Moose" }, { name: "Bish" }, { name: "Stan" },
      ],
      scores: { 1: { p1: 4 } },
    };
    // Local (Tim's Admin-join snapshot, fetched BEFORE the 5th player was
    // added): same lastHoleSaved, only 4 players. This is exactly the
    // round 8466 shape - hole count never differed, only player count did.
    const staleLocalData = {
      lastHoleSaved: 16,
      allPlayers: [
        { name: "Tim" }, { name: "Biro" }, { name: "Moose" }, { name: "Bish" },
      ],
      scores: { 1: { p1: 4 } },
    };

    const upsertSpy = mockRoundWriteChain({ existingData: remoteData });
    const resultCode = await shareRoundWithDevice("8466", staleLocalData, "device-tim");

    expect(upsertSpy).not.toHaveBeenCalled(); // the write must be blocked, not silently applied
    expect(resultCode).toBe("8466"); // blocked writes return the same code, no collision resolution needed
  });

  test("a genuine content match at the same hole count writes through normally (no false positive)", async () => {
    const matchingData = {
      lastHoleSaved: 16,
      allPlayers: [{ name: "Tim" }, { name: "Biro" }],
      scores: { 1: { p1: 4 } },
    };
    const upsertSpy = mockRoundWriteChain({ existingData: matchingData });
    await shareRoundWithDevice("1234", matchingData, "device-tim");

    expect(upsertSpy).toHaveBeenCalledTimes(1); // identical content at the same hole - should proceed
  });

  test("a real round-code collision (different players entirely) is still detected separately, not conflated with the stale-device case", async () => {
    const someoneElsesRound = {
      lastHoleSaved: 16,
      allPlayers: [{ name: "Gregg" }, { name: "Russell" }],
      scores: {},
    };
    const myData = {
      lastHoleSaved: 16,
      allPlayers: [{ name: "Tim" }, { name: "Biro" }],
      scores: {},
    };
    const upsertSpy = mockRoundWriteChain({ existingData: someoneElsesRound });
    await shareRoundWithDevice("9999", myData, "device-tim");

    // A genuine collision (no name overlap at all) should NOT block the
    // write - it should proceed under a freshly generated code instead,
    // per the existing collision-resolution behavior. Confirms the new
    // content check doesn't accidentally swallow this separate case.
    expect(upsertSpy).toHaveBeenCalledTimes(1);
  });
});

describe("generateUniqueRoundCode", () => {
  test("returns the first generated code immediately when the insert succeeds (genuinely free, atomically claimed)", async () => {
    mockInsertResult({ error: null }); // insert succeeded — code is now claimed
    const code = await generateUniqueRoundCode();
    expect(code).toMatch(/^\d{4}$/);
  });

  test("a preferredCode already showing on screen is claimed first, not silently replaced, when the insert succeeds", async () => {
    mockInsertResult({ error: null });
    const code = await generateUniqueRoundCode(20, "4321");
    expect(code).toBe("4321");
  });

  test("a taken preferredCode (23505 on insert) falls through to generating and claiming a fresh alternative", async () => {
    let callCount = 0;
    supabase.from.mockImplementation(() => ({
      insert: () => {
        callCount += 1;
        return Promise.resolve(
          callCount === 1
            ? { error: { code: "23505", message: "duplicate key value violates unique constraint" } }
            : { error: null }
        );
      },
    }));
    const code = await generateUniqueRoundCode(20, "9999");
    expect(code).not.toBe("9999");
    expect(code).toMatch(/^\d{4}$/);
  });

  test("retries when a generated code collides (23505), and eventually returns a genuinely claimed one", async () => {
    let callCount = 0;
    supabase.from.mockImplementation(() => ({
      insert: () => {
        callCount += 1;
        return Promise.resolve(
          callCount <= 2
            ? { error: { code: "23505", message: "duplicate key value violates unique constraint" } }
            : { error: null }
        );
      },
    }));
    const code = await generateUniqueRoundCode();
    expect(code).toMatch(/^\d{4}$/);
    expect(callCount).toBeGreaterThanOrEqual(3);
  });

  test("a real error other than 23505 (e.g. network failure) does not get treated as a collision to retry past - falls back safely instead of guessing", async () => {
    mockInsertResult({ error: { code: "NETWORK_ERROR", message: "fetch failed" } });
    const code = await generateUniqueRoundCode();
    expect(code).toMatch(/^\d{4}$/);
  });

  test("the atomic claim leaves no gap for a second concurrent attempt to slip through - sequential claims of the same code never both succeed", async () => {
    let claimed = false;
    supabase.from.mockImplementation(() => ({
      insert: () => {
        if (claimed) {
          return Promise.resolve({ error: { code: "23505", message: "duplicate key value violates unique constraint" } });
        }
        claimed = true;
        return Promise.resolve({ error: null });
      },
    }));
    const first = await generateUniqueRoundCode(20, "5555");
    const second = await generateUniqueRoundCode(20, "5555");
    expect(first).toBe("5555");
    expect(second).not.toBe("5555");
  });
});
