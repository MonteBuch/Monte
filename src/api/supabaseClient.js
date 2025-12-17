import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://izpjmvgtrwxjmucebfyy.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6cGptdmd0cnd4am11Y2ViZnl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzk3NjksImV4cCI6MjA4MDk1NTc2OX0.r9mcolZ5zCMmwjIO3mStZot8YUId_lbxjrvlfxJ_k3s";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

if (typeof window !== "undefined") {
  window.supabase = supabase;
}