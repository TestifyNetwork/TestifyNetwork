// Step 1 (human check) and Step 2 (welcome/continue) — starting or resuming
// an applicant's identity. See src/core/client.ts's module comment: the
// Supabase client is always passed in, never owned by this module.
import type { Client, EnrollmentSession, EnrollmentStep, Result } from "./types";
import { err, ok } from "./types";

// No CAPTCHA provider is wired into this codebase yet. `verify` is injected
// so this stays testable and provider-agnostic rather than this module
// picking a vendor (Turnstile/reCAPTCHA/hCaptcha) unilaterally.
export type CaptchaVerifier = (token: string) => Promise<boolean>;

export async function verifyHumanApplicant(
  token: string,
  verify: CaptchaVerifier,
): Promise<Result<void, "captcha_failed">> {
  const passed = await verify(token);
  return passed ? ok(undefined) : err("captcha_failed");
}

export async function getEnrollmentSession(
  client: Client,
): Promise<Result<EnrollmentSession, "no_session" | "already_enrolled">> {
  const { data: authData, error: authError } = await client.auth.getSession();
  if (authError) throw new Error(`getEnrollmentSession failed: ${authError.message}`);

  const authUserId = authData.session?.user.id;
  if (!authUserId) return err("no_session");

  const { data: user, error } = await client
    .from("users")
    .select("user_id, enrollment_step, email")
    .eq("user_id", authUserId)
    .maybeSingle();
  if (error) throw new Error(`getEnrollmentSession failed: ${error.message}`);
  if (!user) return err("no_session");

  if (user.enrollment_step === "completed") return err("already_enrolled");

  return ok({
    userId: user.user_id,
    currentStep: user.enrollment_step as EnrollmentStep,
    email: user.email,
  });
}

export async function startOrResumeEnrollment(
  client: Client,
): Promise<Result<EnrollmentSession, "already_enrolled" | "signup_failed">> {
  const existing = await getEnrollmentSession(client);
  if (existing.ok) return existing;
  if (existing.error === "already_enrolled") return err("already_enrolled");
  // existing.error === "no_session" here — fall through to create a new one.

  const { data: authData, error: authError } = await client.auth.signInAnonymously();
  if (authError || !authData.user) return err("signup_failed");

  const { data: user, error } = await client
    .from("users")
    .insert({ user_id: authData.user.id })
    .select("user_id, enrollment_step, email")
    .single();
  if (error) throw new Error(`startOrResumeEnrollment failed: ${error.message}`);

  return ok({
    userId: user.user_id,
    currentStep: user.enrollment_step as EnrollmentStep,
    email: user.email,
  });
}
