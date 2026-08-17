// Steps 5-9 — contact info, email/password credentials, referral source,
// bio, and profile visibility.
import type { Client, ProfileVisibility, ReferralSource, Result } from "./types";
import { err, ok } from "./types";

// ─── Step 5: contact info ───────────────────────────────────────────────
export interface ContactInfoInput {
  firstName: string;
  lastName: string;
  homeAddress: string;
  mobilePhone: string;
  spouseName?: string;
}

export async function submitContactInfo(
  client: Client,
  userId: string,
  input: ContactInfoInput,
): Promise<Result<void, "validation_error">> {
  if (!input.firstName.trim() || !input.lastName.trim() || !input.homeAddress.trim() || !input.mobilePhone.trim()) {
    return err("validation_error");
  }

  const { error: userError } = await client
    .from("users")
    .update({
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      enrollment_step: "email_verification",
    })
    .eq("user_id", userId);
  if (userError) throw new Error(`submitContactInfo failed: ${userError.message}`);

  const { error: detailsError } = await client.from("user_private_details").upsert({
    user_id: userId,
    home_address: input.homeAddress.trim(),
    mobile_phone: input.mobilePhone.trim(),
    spouse_name: input.spouseName?.trim() || null,
  });
  if (detailsError) throw new Error(`submitContactInfo failed: ${detailsError.message}`);

  return ok(undefined);
}

// ─── Step 6: email confirmation, then password ──────────────────────────
export async function beginEmailVerification(
  client: Client,
  email: string,
): Promise<Result<void, "invalid_email" | "email_taken">> {
  const trimmed = email.trim();
  if (!trimmed || !trimmed.includes("@")) return err("invalid_email");

  const { error } = await client.auth.updateUser({ email: trimmed });
  if (error) {
    // supabase-js's error code/message for "already registered" has shifted
    // across versions — check both rather than trust one exactly.
    const message = error.message.toLowerCase();
    if (error.code === "email_exists" || message.includes("already registered") || message.includes("already exists")) {
      return err("email_taken");
    }
    throw new Error(`beginEmailVerification failed: ${error.message}`);
  }

  return ok(undefined);
}

export async function confirmEmail(
  client: Client,
  params: { email: string; token: string },
): Promise<Result<void, "expired_or_invalid">> {
  const { data, error } = await client.auth.verifyOtp({
    email: params.email,
    token: params.token,
    type: "email_change",
  });
  if (error || !data.user) return err("expired_or_invalid");

  const { error: updateError } = await client
    .from("users")
    .update({ email: params.email, enrollment_step: "password" })
    .eq("user_id", data.user.id);
  if (updateError) throw new Error(`confirmEmail failed: ${updateError.message}`);

  return ok(undefined);
}

const PASSWORD_MIN_LENGTH = 8;

function isValidPassword(password: string): boolean {
  if (password.length < PASSWORD_MIN_LENGTH) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumberOrSymbol = /[0-9]|[^A-Za-z0-9]/.test(password);
  return hasUpper && hasLower && hasNumberOrSymbol;
}

export async function setPassword(
  client: Client,
  password: string,
): Promise<Result<void, "weak_password" | "email_not_confirmed">> {
  if (!isValidPassword(password)) return err("weak_password");

  const { data: authData, error: authError } = await client.auth.getSession();
  if (authError) throw new Error(`setPassword failed: ${authError.message}`);
  const userId = authData.session?.user.id;
  if (!userId || !authData.session?.user.email) return err("email_not_confirmed");

  const { error } = await client.auth.updateUser({ password });
  if (error) throw new Error(`setPassword failed: ${error.message}`);

  const { error: updateError } = await client
    .from("users")
    .update({ enrollment_step: "referral_source" })
    .eq("user_id", userId);
  if (updateError) throw new Error(`setPassword failed: ${updateError.message}`);

  return ok(undefined);
}

// ─── Step 7: referral source ────────────────────────────────────────────
export async function submitReferralSource(
  client: Client,
  userId: string,
  params: { source: ReferralSource; detail: string },
): Promise<Result<void, never>> {
  const { error } = await client
    .from("users")
    .update({
      referral_source: params.source,
      referral_detail: params.detail.trim() || null,
      enrollment_step: "bio",
    })
    .eq("user_id", userId);
  if (error) throw new Error(`submitReferralSource failed: ${error.message}`);
  return ok(undefined);
}

// ─── Step 8: bio ─────────────────────────────────────────────────────────
export interface BioInput {
  birthYear?: number;
  spouseName?: string;
  homeChurch?: string;
  photoUrl?: string;
  faith?: string;
  family?: string;
  work?: string;
  season?: string;
  ministryInterests?: string;
}

export async function submitBio(client: Client, userId: string, input: BioInput): Promise<Result<void, never>> {
  const { error: userError } = await client
    .from("users")
    .update({
      home_church: input.homeChurch?.trim() || null,
      profile_photo_url: input.photoUrl || null,
      ministry_interests: input.ministryInterests?.trim() || null,
      bio_faith: input.faith?.trim() || null,
      bio_family: input.family?.trim() || null,
      bio_work: input.work?.trim() || null,
      bio_season: input.season?.trim() || null,
      enrollment_step: "profile_visibility",
    })
    .eq("user_id", userId);
  if (userError) throw new Error(`submitBio failed: ${userError.message}`);

  // Spouse name/birth year were already asked at Step 5 — only touch them
  // here if this step actually supplied a value, so leaving them blank
  // doesn't erase an earlier answer.
  if (input.birthYear !== undefined || input.spouseName !== undefined) {
    const { error: detailsError } = await client
      .from("user_private_details")
      .update({
        ...(input.birthYear !== undefined ? { birth_year: input.birthYear } : {}),
        ...(input.spouseName !== undefined ? { spouse_name: input.spouseName.trim() || null } : {}),
      })
      .eq("user_id", userId);
    if (detailsError) throw new Error(`submitBio failed: ${detailsError.message}`);
  }

  return ok(undefined);
}

// ─── Step 9: profile visibility ─────────────────────────────────────────
export async function submitProfileVisibility(
  client: Client,
  userId: string,
  visibility: ProfileVisibility[],
): Promise<Result<void, "empty_selection">> {
  if (visibility.length === 0) return err("empty_selection");

  // "If Private is selected together with any other option, the broader
  // selection(s) override Private — Private only applies in full when it
  // is the sole selection." (Step 9 note)
  const normalized = visibility.length > 1 ? visibility.filter((v) => v !== "private") : visibility;

  const { error } = await client
    .from("users")
    .update({ profile_visibility: normalized, enrollment_step: "completed" })
    .eq("user_id", userId);
  if (error) throw new Error(`submitProfileVisibility failed: ${error.message}`);

  return ok(undefined);
}
