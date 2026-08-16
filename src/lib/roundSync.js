import { supabase } from "./supabase";

// Generate a short human-readable code like "GOLF-2847"
export function generateRoundCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// Atomically claims a round code by attempting a real INSERT — not a
// SELECT-then-decide check. This is the actual fix for a real gap found
// during a post-incident audit: the previous check-then-use approach had
// a genuine window between "confirmed free" and "actually saved" where a
// second attempt could theoretically slip through, since nothing had
// actually claimed the code yet at the moment it was handed back as safe.
// A plain insert either succeeds (code is now genuinely claimed, atomically,
// in the same operation as the check) or fails with a real, unambiguous
// 23505 unique-violation error if another process claimed it first —
// there's no gap between "looks free" and "is free" for a second caller
// to land in. Returns true if claimed, false if genuinely taken.
async function claimRoundCode(code) {
  const { error } = await supabase
    .from("rounds")
    .insert({ id: code, code: code.toUpperCase(), data: {} });
  if (!error) return true; // claimed — this row is now genuinely ours
  if (error.code === "23505") return false; // genuinely taken by someone else
  throw error; // some other real error — don't guess either way
}

// Generates a round code and atomically claims it before handing it
// back — this is the actual fix for a real, confirmed bug: a brand new
// round silently colliding with an old leftover round sharing the same
// random 4-digit code, corrupting a live scored round with old
// placeholder players and sample scores. Retries a handful of times; if
// Supabase can't be reached at all to verify, falls back to the plain
// random code rather than blocking someone from starting a round over a
// connectivity hiccup — matching the previous behavior as a safe floor,
// not a regression. The initial placeholder row this claims gets fully
// overwritten by the app's first real autosave moments later — this
// function's only job is guaranteeing the code itself is genuinely,
// atomically owned before anything else happens.
export async function generateUniqueRoundCode(maxAttempts = 20, preferredCode = null) {
  // If a specific code is already showing on screen (e.g. optimistically
  // set the instant someone starts typing), try claiming THAT one first
  // rather than always generating a fresh one — otherwise the visible
  // code would flicker to a different number moments later even when the
  // original was completely fine all along.
  if (preferredCode) {
    try {
      const claimed = await claimRoundCode(preferredCode);
      if (claimed) return preferredCode;
    } catch (error) {
      return preferredCode;
    }
  }
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateRoundCode();
    try {
      const claimed = await claimRoundCode(code);
      if (claimed) return code;
    } catch (error) {
      return code; // couldn't verify — don't block starting a round over it
    }
  }
  return generateRoundCode(); // exceedingly unlikely: 20 real collisions in a row
}

// Share a round — create or update in Supabase
export async function shareRound(code, roundData) {
  const { error } = await supabase
    .from("rounds")
    .upsert({
      id: code,
      code,
      data: roundData,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

  if (error) throw error;
}

// Fetch a round by code
export async function fetchRound(code) {
  const { data, error } = await supabase
    .from("rounds")
    .select("data, updated_at")
    .eq("code", code.toUpperCase())
    .single();

  if (error) throw error;
  return data;
}

// Subscribe to live updates for a specific round.
// Uses a DB-level filter so only changes to THIS round trigger the callback.
export function subscribeToRound(code, onUpdate) {
  const upperCode = code.toUpperCase();

  const channel = supabase
    .channel(`round-${upperCode}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "rounds",
        filter: `code=eq.${upperCode}`,
      },
      (payload) => {
        if (payload.new?.data) {
          onUpdate(payload.new.data);
        }
      }
    )
    .subscribe();

  return channel;
}

// Unsubscribe from a channel
export function unsubscribeFromRound(channel) {
  if (channel) supabase.removeChannel(channel);
}

// Get or create a persistent device ID
export function getDeviceId() {
  const KEY = "sc-device-id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = "dev-" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(KEY, id);
  }
  return id;
}

// Fetch recent rounds for this device (last 5)
export async function fetchRecentRounds(deviceId) {
  let query = supabase
    .from("rounds")
    .select("code, data, updated_at")
    .order("updated_at", { ascending: false })
    .limit(10);

  if (deviceId) {
    query = query.eq("device_id", deviceId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Share a round with device ID tagged
// Shared staleness/conflict guard for every function that writes a round's
// `data` to Supabase. Prevents a stale or out-of-sync device from clobbering
// a round that's already further along — or already complete — remotely.
//
// Found July 2026: this guard originally lived ONLY inside
// shareRoundWithDevice. saveRoundToStats (below) is a second, completely
// separate write path to the exact same `rounds` row, upserting
// unconditionally with no check at all. A device sitting on a stale,
// already-completed round (e.g. reopening a bookmarked URL days later,
// silently auto-restoring an old finished round — see CRITICAL_GUARDS.md)
// could hit "Save Round" and blow away the real completed data in Supabase
// with whatever was in local state, no staleness check, no scores-differ
// check, nothing. Confirmed as the likely mechanism behind round 9194
// showing an unexplained partial data change days after it was completed.
// CONFIRMED REAL BUG (Aug 2026): this guard only ever compared
// lastHoleSaved — it had no way to tell "my own round, another of my
// devices is just ahead" (the legitimate case this was built for) apart
// from "a completely different round happens to be sitting under this
// same code" (a genuine collision). In the second case, blocking is
// exactly the wrong response — it permanently traps the local round,
// since the remote data never changes and every future save hits the
// same comparison forever. Confirmed directly: round 8348, an entire
// live round's worth of autosaves silently blocked start to finish,
// no error ever shown, on WiFi the whole time — nothing to do with
// connectivity. Now checks whether the remote round is even the same
// round at all (matching named players, ignoring placeholder names
// like "P1"/"P2") before deciding whether "remote is ahead" means
// "wait" or means "this was never my round to begin with."
export function sameRoundIdentity(localData, remoteData) {
  const realNames = (players) =>
    (players || [])
      .map(p => (p?.name || "").trim())
      .filter(n => n && !/^P\d+$/.test(n));

  const localNames = new Set(realNames(localData.allPlayers));
  const remoteNames = new Set(realNames(remoteData.allPlayers));

  // If either side has no real (named) players yet, there's nothing
  // reliable to compare — don't claim a mismatch off placeholder data.
  if (!localNames.size || !remoteNames.size) return true;

  const overlap = [...localNames].some(n => remoteNames.has(n));
  return overlap;
}

async function shouldBlockRoundWrite(code, roundData) {
  try {
    const { data: existing } = await supabase
      .from("rounds")
      .select("data")
      .eq("id", code)
      .single();

    if (existing?.data) {
      const remoteHole = existing.data.lastHoleSaved ?? -1;
      const localHole = roundData.lastHoleSaved ?? -1;

      // Local is behind — but is this even the same round? If the
      // remote round's real players don't overlap with ours at all,
      // this is a code collision, not a stale device — don't block.
      if (localHole < remoteHole) {
        if (!sameRoundIdentity(roundData, existing.data)) {
          console.warn(`[sync] code ${code} collision detected — remote round has different players, not blocking`);
          return { block: false, reason: "different-round" };
        }
        console.warn(`[sync] Skipping save: local lastHoleSaved=${localHole} < remote=${remoteHole}`);
        return { block: true, reason: "stale-device" };
      }

      // Same hole count — compare scores. If remote has scores and they differ,
      // don't overwrite. The remote is the source of truth for completed rounds.
      if (localHole === remoteHole && remoteHole >= 18) {
        const remoteScores = JSON.stringify(existing.data.scores || {});
        const localScores = JSON.stringify(roundData.scores || {});
        if (remoteScores !== localScores) {
          if (!sameRoundIdentity(roundData, existing.data)) {
            console.warn(`[sync] code ${code} collision detected at completion — remote round has different players, not blocking`);
            return { block: false, reason: "different-round" };
          }
          console.warn(`[sync] Skipping save: completed round scores differ — keeping remote`);
          return { block: true, reason: "stale-device" };
        }
      }
    }
  } catch {
    // If we can't fetch, proceed with save (don't block on network error)
  }

  return { block: false, reason: null };
}

// Returns the code the write actually succeeded under — normally the
// same `code` passed in, but a different one if a genuine round-code
// collision was detected and auto-resolved (see shouldBlockRoundWrite).
// Callers that care whether their round's identity just changed
// mid-flight should check the return value against what they passed in.
export async function shareRoundWithDevice(code, roundData, deviceId) {
  const { block, reason } = await shouldBlockRoundWrite(code, roundData);
  if (block) return code; // genuinely stale device — no write, same code

  let finalCode = code;
  if (reason === "different-round") {
    // A different, unrelated round already owns this code. Generating
    // a fresh one and writing under that instead, rather than silently
    // discarding this round's data or fighting over the same row.
    finalCode = await generateUniqueRoundCode();
    console.warn(`[sync] round code collision — moved from ${code} to ${finalCode}`);
  }

  const { error } = await supabase
    .from("rounds")
    .upsert({
      id: finalCode,
      code: finalCode,
      data: roundData,
      device_id: deviceId,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

  if (error) throw error;
  return finalCode;
}

// Save a round to Supabase stats (called when "Save to History & Stats" is checked)
export async function saveRoundToStats(code, roundData, deviceId) {
  const { block, reason } = await shouldBlockRoundWrite(code, roundData);
  if (block) return code;

  let finalCode = code;
  if (reason === "different-round") {
    finalCode = await generateUniqueRoundCode();
    console.warn(`[sync] round code collision — moved from ${code} to ${finalCode}`);
  }

  const { error } = await supabase
    .from("rounds")
    .upsert({
      id: finalCode,
      code: finalCode,
      data: roundData,
      device_id: deviceId,
      save_to_stats: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

  if (error) throw error;
  return finalCode;
}

// Fetch all rounds marked save_to_stats for Stats screen
export async function fetchStatsRounds() {
  const { data, error } = await supabase
    .from("rounds")
    .select("code, data, updated_at")
    .eq("save_to_stats", true)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// Save a course to the course library
export async function saveCourseToLibrary(course, createdBy, deviceId) {
  const { data, error } = await supabase
    .from("courses")
    .upsert({
      name: course.name,
      city: course.city || "",
      state: course.state || "",
      pars: course.pars,
      hcp: course.hcp,
      created_by: createdBy || "Anonymous",
      device_id: deviceId || null,
    }, { onConflict: "name" })
    .select();

  if (error) throw error;
  return data?.[0];
}

// Update an existing course (owner or admin)
export async function updateCourseInLibrary(courseId, course, deviceId, adminPin) {
  const ADMIN_PIN = "1234"; // must match AdminScreen
  const isAdmin = adminPin === ADMIN_PIN;

  // Verify ownership if not admin
  if (!isAdmin) {
    const { data: existing } = await supabase
      .from("courses")
      .select("device_id")
      .eq("id", courseId)
      .single();

    if (!existing || existing.device_id !== deviceId) {
      throw new Error("not_owner");
    }
  }

  const { data, error } = await supabase
    .from("courses")
    .update({
      city: course.city || "",
      state: course.state || "",
      pars: course.pars,
      hcp: course.hcp,
    })
    .eq("id", courseId)
    .select();

  if (error) throw error;
  return data?.[0];
}

export async function deleteCourseFromLibrary(courseId, deviceId, adminPin) {
  const ADMIN_PIN = "1234";
  const isAdmin = adminPin === ADMIN_PIN;

  if (!isAdmin) {
    const { data: existing } = await supabase
      .from("courses")
      .select("device_id")
      .eq("id", courseId)
      .single();

    if (!existing || existing.device_id !== deviceId) {
      throw new Error("not_owner");
    }
  }

  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) throw error;
  return true;
}

// Search courses by name
export async function searchCourses(query) {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .ilike("name", `%${query}%`)
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

// Increment use count when a course is loaded
export async function incrementCourseUse(courseId) {
  await supabase.rpc("increment_course_use", { course_id: courseId }).catch(() => {});
}

// ── GROUP TEMPLATES ──────────────────────────────────────────────────────────

// Save a group template to Supabase
export async function saveTemplate(template, deviceId) {
  const { data, error } = await supabase
    .from("group_templates")
    .upsert({
      ...template,
      device_id: deviceId,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" })
    .select();

  if (error) throw error;
  return data?.[0];
}

// Fetch private templates for this device
export async function fetchMyTemplates(deviceId) {
  const { data, error } = await supabase
    .from("group_templates")
    .select("*")
    .eq("device_id", deviceId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// Search public templates by name
export async function searchTemplates(query) {
  const { data, error } = await supabase
    .from("group_templates")
    .select("*")
    .eq("is_public", true)
    .ilike("name", `%${query}%`)
    .order("use_count", { ascending: false })
    .limit(10);

  if (error) throw error;
  return data || [];
}

// Increment use count for a template
export async function incrementTemplateUse(templateId) {
  await supabase.rpc("increment_template_use", { template_id: templateId }).catch(() => {});
}

// Delete a template
export async function deleteTemplate(templateId, deviceId) {
  const { error } = await supabase
    .from("group_templates")
    .delete()
    .eq("id", templateId)
    .eq("device_id", deviceId);

  if (error) throw error;
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────

// Fetch all rounds updated in the last N hours (for admin view)
export async function fetchActiveRounds(hoursAgo = 4) {
  const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("rounds")
    .select("code, data, device_id, updated_at")
    .gte("updated_at", since)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}

// Check if a course name already exists
export async function checkCourseExists(name) {
  const { data, error } = await supabase
    .from("courses")
    .select("id, name, city, state, pars, hcp")
    .ilike("name", name.trim())
    .limit(1);

  if (error) throw error;
  return data?.[0] || null;
}

// ── TRIPS ─────────────────────────────────────────────────────────────────────

export async function deleteTrip(tripId) {
  await supabase.from('trip_players').delete().eq('trip_id', tripId);
  await supabase.from('trip_rounds').delete().eq('trip_id', tripId);
  await supabase.from('trip_games').delete().eq('trip_id', tripId);
  const { error } = await supabase.from('trips').delete().eq('id', tripId);
  if (error) throw error;
}

export async function createTrip(trip, deviceId) {
  const { data, error } = await supabase
    .from('trips')
    .insert({ ...trip, device_id: deviceId, updated_at: new Date().toISOString() })
    .select();
  if (error) throw error;
  return data?.[0];
}

export async function fetchMyTrips(deviceId) {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('device_id', deviceId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchTrip(tripId) {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single();
  if (error) throw error;
  return data;
}

export async function saveTripPlayers(tripId, players) {
  const { error: delError } = await supabase.from('trip_players').delete().eq('trip_id', tripId);
  if (delError) throw delError;
  if (!players.length) return;
  const { error } = await supabase.from('trip_players').insert(
    players.map((p, i) => ({
      ...p,
      trip_id: tripId,
      sort_order: i,
      hcp_index: p.hcp_index === "" || p.hcp_index == null ? null : Number(p.hcp_index),
    }))
  );
  if (error) throw error;
}

export async function fetchTripPlayers(tripId) {
  const { data, error } = await supabase
    .from('trip_players')
    .select('*')
    .eq('trip_id', tripId)
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function saveTripRound(round) {
  const { data, error } = await supabase
    .from('trip_rounds')
    .upsert(round, { onConflict: 'id' })
    .select();
  if (error) throw error;
  return data?.[0];
}

export async function fetchTripRounds(tripId) {
  const { data, error } = await supabase
    .from('trip_rounds')
    .select('*')
    .eq('trip_id', tripId)
    .order('round_number');
  if (error) throw error;
  return data || [];
}

export async function saveTripGames(tripId, games) {
  await supabase.from('trip_games').delete().eq('trip_id', tripId);
  if (!games.length) return;
  const { error } = await supabase.from('trip_games').insert(
    games.map(g => ({ ...g, trip_id: tripId }))
  );
  if (error) throw error;
}

export async function fetchTripGames(tripId) {
  const { data, error } = await supabase
    .from('trip_games')
    .select('*')
    .eq('trip_id', tripId);
  if (error) throw error;
  return data || [];
}

export async function fetchRoundsByCode(codes) {
  if (!codes.length) return [];
  const { data, error } = await supabase
    .from('rounds')
    .select('code, data, updated_at')
    .in('code', codes);
  if (error) throw error;
  return data || [];
}
