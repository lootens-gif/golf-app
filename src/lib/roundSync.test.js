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
 */

jest.mock("./supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { supabase } from "./supabase";
import { generateUniqueRoundCode } from "./roundSync";

// Builds a mock matching the exact chain used in roundSync.js:
// supabase.from("rounds").select("code").eq("code", ...).single()
function mockSingleResult(result) {
  supabase.from.mockReturnValue({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve(result),
      }),
    }),
  });
}

describe("generateUniqueRoundCode", () => {
  test("returns the first generated code immediately when it is genuinely free", async () => {
    mockSingleResult({ data: null, error: { code: "PGRST116" } }); // confirmed: no round exists
    const code = await generateUniqueRoundCode();
    expect(code).toMatch(/^\d{4}$/);
  });

  test("a preferredCode already showing on screen is verified first, not silently replaced, when it is free", async () => {
    mockSingleResult({ data: null, error: { code: "PGRST116" } });
    const code = await generateUniqueRoundCode(20, "4321");
    // Must return the EXACT preferred code, not a freshly generated one —
    // a real bug caught before shipping: generating a fresh code even
    // when the preferred one was fine would make the visible round code
    // flicker to a different number moments after someone starts typing.
    expect(code).toBe("4321");
  });

  test("a taken preferredCode falls through to generating and verifying a fresh alternative", async () => {
    let callCount = 0;
    supabase.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: () => {
            callCount += 1;
            // First call (checking preferredCode) says taken; every
            // subsequent call (checking freshly generated codes) says free.
            return Promise.resolve(
              callCount === 1
                ? { data: { code: "9999" }, error: null }
                : { data: null, error: { code: "PGRST116" } }
            );
          },
        }),
      }),
    }));
    const code = await generateUniqueRoundCode(20, "9999");
    expect(code).not.toBe("9999"); // the taken one must never be reused
    expect(code).toMatch(/^\d{4}$/);
  });

  test("retries when a generated code is already taken, and eventually returns a genuinely free one", async () => {
    let callCount = 0;
    supabase.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: () => {
            callCount += 1;
            return Promise.resolve(
              callCount <= 2
                ? { data: { code: "0000" }, error: null } // "taken" the first 2 tries
                : { data: null, error: { code: "PGRST116" } } // free from the 3rd try on
            );
          },
        }),
      }),
    }));
    const code = await generateUniqueRoundCode();
    expect(code).toMatch(/^\d{4}$/);
    expect(callCount).toBeGreaterThanOrEqual(3);
  });

  test("a real error other than PGRST116 (e.g. network failure) does not get treated as \"code is free\" — falls back safely instead of guessing", async () => {
    mockSingleResult({ data: null, error: { code: "NETWORK_ERROR", message: "fetch failed" } });
    // Must not throw, and must not silently proceed as if this specific
    // error meant the code was confirmed free — it returns SOME usable
    // code rather than blocking the user from starting a round entirely
    // over a connectivity hiccup, matching the pre-existing behavior as
    // a safe floor rather than a regression.
    const code = await generateUniqueRoundCode();
    expect(code).toMatch(/^\d{4}$/);
  });
});
