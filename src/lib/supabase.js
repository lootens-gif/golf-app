import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://nlmyllxhruguifhdondi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sbXlsbHhocnVndWlmaGRvbmRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NjE2NzcsImV4cCI6MjA5NDMzNzY3N30.ihwKM57Ik8BgwHE_20yLbjzp2egARxs9H3jTrgyeb_w";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
