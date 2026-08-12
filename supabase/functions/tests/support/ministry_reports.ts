// Direct, real-database access to `ministry_reports` for test setup/assertions —
// replaces the old hand-rolled MockMinistryReportsTable now that tests run
// against a real local Supabase stack (see scripts/test.sh).
//
// seedMinistry/getMinistry take the client as a parameter rather than
// constructing one internally, so callers choose the privilege level: a
// service-role client to set up state a real member couldn't create
// directly, or an anon/authenticated client once tests need to assert on
// what RLS actually allows or denies.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2.49.8";
import { requireEnv } from "./env.ts";

const TABLE = "ministry_reports";

/** Bypasses RLS — same privilege level server/index.tsx runs with. */
export function createServiceRoleClient(): SupabaseClient {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
}

/** Subject to RLS — same privilege level an unauthenticated request has.
 * Swap for an authenticated user's client once those exist, without
 * changing seedMinistry/getMinistry themselves. */
export function createAnonClient(): SupabaseClient {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_PUBLISHABLE_KEY"));
}

export interface MinistryRow {
  ministry_id: string;
  ministry_name: string;
  status: string;
  [key: string]: unknown;
}

/**
 * The DB is only reset once per whole test run (see scripts/test.sh), not
 * per test, so rows from different `it()` blocks coexist. Give each test its
 * own unique name to avoid tripping add_ministry's duplicate-name check.
 */
export function uniqueMinistryName(base: string): string {
  return `${base} ${crypto.randomUUID().slice(0, 8)}`;
}

export async function seedMinistry(
  client: SupabaseClient,
  overrides: { ministry_name: string } & Partial<MinistryRow>,
): Promise<MinistryRow> {
  const { data, error } = await client
    .from(TABLE)
    .insert([{ status: "waiting_generation", ...overrides }])
    .select()
    .single();
  if (error) throw new Error(`seedMinistry failed: ${error.message}`);
  return data as MinistryRow;
}

export async function getMinistry(client: SupabaseClient, id: string): Promise<MinistryRow | null> {
  const { data, error } = await client.from(TABLE).select("*").eq("ministry_id", id).maybeSingle();
  if (error) throw new Error(`getMinistry failed: ${error.message}`);
  return data as MinistryRow | null;
}
