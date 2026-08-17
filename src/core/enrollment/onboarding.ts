// Step 12 — the access gate. New Member Onboarding is a required first step
// before the member may access the full site; a member who logs out mid-
// onboarding must be returned to it on next login until it's marked
// complete. This module answers "what should the router show," not the
// onboarding flow's own content/steps (out of scope for enrollment).
import type { Client, Result } from "./types";
import { err, ok } from "./types";

export type GateStatus =
  | "requires_enrollment" // status = pending — never finished Steps 2-9
  | "requires_onboarding" // status = onboarding — enrollment done, onboarding pending
  | "active" // status = active — full access
  | "deactivated"; // status = inactive

export async function getOnboardingGateStatus(
  client: Client,
  userId: string,
): Promise<Result<GateStatus, "user_not_found">> {
  const { data: user, error } = await client
    .from("users")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`getOnboardingGateStatus failed: ${error.message}`);
  if (!user) return err("user_not_found");

  switch (user.status) {
    case "active":
      return ok("active");
    case "onboarding":
      return ok("requires_onboarding");
    case "inactive":
      return ok("deactivated");
    default:
      return ok("requires_enrollment");
  }
}

export async function completeOnboarding(client: Client, userId: string): Promise<Result<void, never>> {
  const { error } = await client.from("users").update({ status: "active" }).eq("user_id", userId);
  if (error) throw new Error(`completeOnboarding failed: ${error.message}`);
  return ok(undefined);
}
