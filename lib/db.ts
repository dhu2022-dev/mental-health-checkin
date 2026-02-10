import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

export type CheckIn = {
  id: string;
  mood: number;
  notes: string | null;
  recorded_at: string;
  created_at: string;
  source: string | null;
};

export type Insight = {
  id: string;
  period_type: string;
  period_start: string;
  period_end: string;
  summary: string | null;
  positive_factors: string[] | null;
  negative_factors: string[] | null;
  created_at: string;
};
