// Thin, stateless factory for a typed Supabase client. The core library
// itself owns no client instance — callers (app bootstrap, tests) construct
// one and pass it explicitly into every core function.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

export type Client = SupabaseClient<Database>;

export function createSupabaseClient(): Client {
  return createClient<Database>(`https://${projectId}.supabase.co`, publicAnonKey);
}
