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
  const { data, error } = await supabase
    .from("rounds")
    .select("code, data, updated_at")
    .eq("device_id", deviceId)
    .order("updated_at", { ascending: false })
    .limit(5);

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
