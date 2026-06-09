import { supabase } from "./supabase";

// Generate a short human-readable code like "GOLF-2847"
export function generateRoundCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
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
export async function shareRoundWithDevice(code, roundData, deviceId) {
  const { error } = await supabase
    .from("rounds")
    .upsert({
      id: code,
      code,
      data: roundData,
      device_id: deviceId,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

  if (error) throw error;
}

// Save a round to Supabase stats (called when "Save to History & Stats" is checked)
export async function saveRoundToStats(code, roundData, deviceId) {
  const { error } = await supabase
    .from("rounds")
    .upsert({
      id: code,
      code,
      data: roundData,
      device_id: deviceId,
      save_to_stats: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

  if (error) throw error;
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

// Search courses by name
export async function searchCourses(query) {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .ilike("name", `%${query}%`)
    .order("use_count", { ascending: false })
    .limit(10);

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
  await supabase.from('trip_players').delete().eq('trip_id', tripId);
  if (!players.length) return;
  const { error } = await supabase.from('trip_players').insert(
    players.map((p, i) => ({ ...p, trip_id: tripId, sort_order: i }))
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
