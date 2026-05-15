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

// Subscribe to live updates for a round
export function subscribeToRound(code, onUpdate) {
  const channel = supabase
    .channel(`round-${code}`)
    .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "rounds",
    },
    (payload) => {
      if (payload.new?.code === code.toUpperCase() && payload.new?.data) {
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
