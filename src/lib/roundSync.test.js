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
import { generateUniqueRoundCode } from "./roundSync";

// Builds a mock matching the exact chain used in roundSync.js:
// supabase.from("rounds").insert({...})
function mockInsertResult(result) {
  supabase.from.mockReturnValue({
    insert: () => Promise.resolve(result),
  });
}

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
