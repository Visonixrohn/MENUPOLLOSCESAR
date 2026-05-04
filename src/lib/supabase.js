import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://smykkrarygouoxtuytrt.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNteWtrcmFyeWdvdW94dHV5dHJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1OTg3ODMsImV4cCI6MjA4OTE3NDc4M30.ktaKeh0df98lQvm5zd9MGEBQ0hLue6PHtP28H5InC1Q";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
