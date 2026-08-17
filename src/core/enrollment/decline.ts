// Steps 2, 3, 4 — the three decline points. One function, parametrized by
// stage, per PRD v2.6/PRIV-03: the opt-out reason is retained anonymously
// with the stage only — no name, email, or other identifying information.
import type { Client, DeclineStage, Result } from "./types";
import { ok } from "./types";

export async function recordDeclineAndExit(
  client: Client,
  params: { stage: DeclineStage; reason?: string },
): Promise<Result<void, never>> {
  const { error: insertError } = await client
    .from("decline_reasons")
    .insert({ decline_stage: params.stage, opt_out_reason: params.reason?.trim() || null });
  if (insertError) throw new Error(`recordDeclineAndExit failed: ${insertError.message}`);

  // Clean up whatever in-progress applicant record exists for this session
  // (if any) — nothing tied to this person should persist after declining.
  // This only removes the public.users profile row; the underlying
  // anonymous auth.users identity (which holds no identifying data at all)
  // is left for a separate cleanup process, same as incomplete_enrollments.
  const { data: authData } = await client.auth.getSession();
  const userId = authData.session?.user.id;
  if (userId) {
    await client.from("users").delete().eq("user_id", userId);
    await client.auth.signOut();
  }

  return ok(undefined);
}
