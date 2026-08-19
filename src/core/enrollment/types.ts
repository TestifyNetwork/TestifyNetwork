import type { Database } from "../../types/database";
import type { Client } from "../client";

export type { Client };

// ─── Result ─────────────────────────────────────────────────────────────
// Expected business outcomes (validation failures, "already exists", etc.)
// are values, not exceptions — only unexpected system failures (DB/network
// errors) reject the returned promise. See each function's `throw` sites.
export type Result<T, E extends string> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): { ok: true; value: T } {
  return { ok: true, value };
}

export function err<E extends string>(error: E): { ok: false; error: E } {
  return { ok: false, error };
}

// ─── Row/Insert aliases from src/types/database.ts ─────────────────────────
type Tables = Database["public"]["Tables"];
export type UserRow = Tables["users"]["Row"];
export type UserUpdate = Tables["users"]["Update"];
export type UserPrivateDetailsRow = Tables["user_private_details"]["Row"];
export type MemberAgreementRow = Tables["member_agreements"]["Row"];

// ─── Enum-like literal types ────────────────────────────────────────────
// These columns are CHECK constraints, not native Postgres enums
export type EnrollmentStep =
  | "participation_guidelines"
  | "statement_of_faith"
  | "contact_info"
  | "email_verification"
  | "password"
  | "referral_source"
  | "bio"
  | "profile_visibility"
  | "completed";

export type DeclineStage = "welcome" | "participation_guidelines" | "statement_of_faith";

export type ReferralSource = "invited_by_member" | "invited_as_ministry_leader" | "found_online";

export type ProfileVisibility =
  | "private"
  | "staff_of_followed_ministries"
  | "dialogue_channels"
  | "all_members";

export type AgreementType = "participation_guidelines" | "statement_of_faith";

export type MemberStatus = "pending" | "onboarding" | "active" | "inactive";

// ─── Enrollment session ─────────────────────────────────────────────────
export interface EnrollmentSession {
  userId: string;
  currentStep: EnrollmentStep;
  email: string | null;
}
