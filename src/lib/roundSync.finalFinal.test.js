/**
 * roundSync.finalFinal.test.js
 *
 * Regression test for the "Final Final" feature — a genuinely separate,
 * permanent record of a round's agreed-final result, decoupled from the
 * live round's autosave. Confirmed design (Tim, Sep 2026), built directly
 * in response to the incident where a post-round correction was silently
 * discarded by the sync guard.
 *
 * Run with: npm test -- --testPathPattern=finalFinal
 */

jest.mock("./supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { supabase } from "./supabase";
import { finalizeRound, saveRoundRevision, fetchFinalVersions, shareRoundWithDevice, saveRoundToStats } from "./roundSync";

function mockInsert(result = { error: null }) {
  const insertMock = jest.fn(() => Promise.resolve(result));
  supabase.from.mockReturnValue({ insert: insertMock });
  return insertMock;
}

function mockSelectVersions(rows) {
  const orderMock = jest.fn(() => Promise.resolve({ data: rows, error: null }));
  supabase.from.mockReturnValue({
    select: () => ({
      like: () => ({
        order: orderMock,
      }),
    }),
  });
  return orderMock;
}

describe("finalized records are unconditionally protected from the normal write path", () => {
  function mockExistingFinalRecord() {
    const upsertMock = jest.fn(() => Promise.resolve({ error: null }));
    supabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { data: { isFinalRecord: true, lastHoleSaved: 18, scores: {} } }, error: null }),
        }),
      }),
      upsert: upsertMock,
    });
    return upsertMock;
  }

  test("shareRoundWithDevice refuses to write to a finalized record, no matter what", async () => {
    const upsertMock = mockExistingFinalRecord();
    const result = await shareRoundWithDevice("4471F", { lastHoleSaved: 18, scores: { 1: { p1: 99 } } }, "device-1");
    expect(upsertMock).not.toHaveBeenCalled();
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe("finalized");
  });

  test("saveRoundToStats also refuses to write to a finalized record", async () => {
    const upsertMock = mockExistingFinalRecord();
    const result = await saveRoundToStats("4471F", { lastHoleSaved: 18, scores: { 1: { p1: 99 } } }, "device-1");
    expect(upsertMock).not.toHaveBeenCalled();
    expect(result.blocked).toBe(true);
  });
});

describe("finalizeRound", () => {
  test("creates the first final record as {code}F, tagged with the original code", async () => {
    const insertMock = mockInsert();
    const id = await finalizeRound("4471", { lastHoleSaved: 18, scores: {} }, "device-1");

    expect(id).toBe("4471F");
    expect(insertMock).toHaveBeenCalledTimes(1);
    const payload = insertMock.mock.calls[0][0];
    expect(payload.id).toBe("4471F");
    expect(payload.code).toBe("4471F");
    expect(payload.data.originalRoundCode).toBe("4471");
    expect(payload.data.isFinalRecord).toBe(true);
    expect(payload.save_to_stats).toBe(true);
  });

  test("fails loudly (does not silently overwrite) if 4471F already exists", async () => {
    mockInsert({ error: { code: "23505", message: "duplicate key value violates unique constraint" } });
    await expect(finalizeRound("4471", { lastHoleSaved: 18, scores: {} }, "device-1")).rejects.toBeTruthy();
  });
});

describe("fetchFinalVersions", () => {
  test("returns every F-suffixed row for a round code", async () => {
    const rows = [
      { code: "4471F", data: {}, updated_at: "2026-09-27T10:00:00Z" },
      { code: "4471F2", data: {}, updated_at: "2026-09-27T11:00:00Z" },
    ];
    mockSelectVersions(rows);
    const result = await fetchFinalVersions("4471");
    expect(result).toEqual(rows);
  });

  test("returns an empty array for a round that was never finalized", async () => {
    mockSelectVersions([]);
    const result = await fetchFinalVersions("9999");
    expect(result).toEqual([]);
  });
});

describe("saveRoundRevision", () => {
  test("creates F2 when only the base F version exists", async () => {
    // saveRoundRevision calls fetchFinalVersions (select) then inserts —
    // the mock needs to support both calls in sequence.
    const insertMock = jest.fn(() => Promise.resolve({ error: null }));
    let callCount = 0;
    supabase.from.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) {
        return { select: () => ({ like: () => ({ order: () => Promise.resolve({ data: [{ code: "4471F", data: {}, updated_at: "t" }], error: null }) }) }) };
      }
      return { insert: insertMock };
    });

    const id = await saveRoundRevision("4471", { lastHoleSaved: 18, scores: {} }, "device-1");

    expect(id).toBe("4471F2");
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock.mock.calls[0][0].id).toBe("4471F2");
  });

  test("creates F4 when F, F2, F3 already exist (always next after the highest, not a count)", async () => {
    const insertMock = jest.fn(() => Promise.resolve({ error: null }));
    let callCount = 0;
    const existing = [
      { code: "4471F", data: {}, updated_at: "t1" },
      { code: "4471F2", data: {}, updated_at: "t2" },
      { code: "4471F3", data: {}, updated_at: "t3" },
    ];
    supabase.from.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) {
        return { select: () => ({ like: () => ({ order: () => Promise.resolve({ data: existing, error: null }) }) }) };
      }
      return { insert: insertMock };
    });

    const id = await saveRoundRevision("4471", { lastHoleSaved: 18, scores: {} }, "device-1");
    expect(id).toBe("4471F4");
  });

  test("never touches the version being edited — always inserts a new row, never updates", async () => {
    const insertMock = jest.fn(() => Promise.resolve({ error: null }));
    let callCount = 0;
    supabase.from.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) {
        return { select: () => ({ like: () => ({ order: () => Promise.resolve({ data: [{ code: "4471F", data: {}, updated_at: "t" }], error: null }) }) }) };
      }
      // If this were an update/upsert call instead of insert, this mock
      // wouldn't provide the method the code expects and the test would
      // throw — confirming saveRoundRevision only ever calls .insert().
      return { insert: insertMock };
    });

    await saveRoundRevision("4471", { lastHoleSaved: 18, scores: { 5: { p1: 4 } } }, "device-1");
    expect(insertMock).toHaveBeenCalledTimes(1);
  });
});
