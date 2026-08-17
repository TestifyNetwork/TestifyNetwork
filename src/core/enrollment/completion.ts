// Step 10 (completion) and Step 11 (welcome email).
import type { Client, Result } from "./types";
import { err, ok } from "./types";

export async function completeEnrollment(client: Client, userId: string): Promise<Result<void, "incomplete_steps">> {
  const { data: user, error } = await client
    .from("users")
    .select("enrollment_step")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`completeEnrollment failed: ${error.message}`);
  if (!user || user.enrollment_step !== "completed") return err("incomplete_steps");

  const { error: updateError } = await client.from("users").update({ status: "onboarding" }).eq("user_id", userId);
  if (updateError) throw new Error(`completeEnrollment failed: ${updateError.message}`);

  return ok(undefined);
}

// No transactional-email provider is wired into this codebase yet (no
// Resend/Postmark/SES integration exists). `sendMail` is injected so this
// stays testable now and pluggable once a provider is chosen, rather than
// this module deciding a vendor unilaterally.
export type MailSender = (params: { to: string; subject: string }) => Promise<void>;

export async function sendWelcomeEmail(
  client: Client,
  userId: string,
  sendMail: MailSender,
): Promise<Result<void, "no_email">> {
  const { data: user, error } = await client
    .from("users")
    .select("email")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`sendWelcomeEmail failed: ${error.message}`);
  if (!user?.email) return err("no_email");

  await sendMail({
    to: user.email,
    subject: "Welcome to Testify Network — here's how to get started",
  });

  return ok(undefined);
}
