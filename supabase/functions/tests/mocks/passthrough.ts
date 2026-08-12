// Supabase REST/Auth calls now hit a real local stack instead of a fake
// table, so MSW needs to explicitly let that traffic through rather than
// treat it as unhandled — otherwise onUnhandledRequest: "error" (which we
// keep so a forgotten Perplexity mock still fails loudly) would throw on
// every real DB request too.
import { http, passthrough } from "msw";

export function createSupabasePassthroughHandler(supabaseUrl: string) {
  return http.all(`${supabaseUrl.replace(/\/$/, "")}/*`, () => passthrough());
}
