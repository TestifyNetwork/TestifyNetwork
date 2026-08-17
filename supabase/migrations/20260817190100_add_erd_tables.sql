-- The remaining tables from the ERD in README.md. Enums are CHECK
-- constraints on text columns (matching ministries/ministry_reports'
-- existing style, not native Postgres ENUM types — easier to alter later).
-- Fields where the ERD names a category but not the actual allowed values
-- (e.g. users.referral_source) are left unconstrained rather than guessed.
--
-- RLS is enabled on every table below with no policies (deny-all) — access
-- rules aren't specified by the ERD and are a separate follow-up. Edge
-- functions using the service-role key bypass RLS entirely, so this doesn't
-- block anything working today.

-- ── users ────────────────────────────────────────────────────────────────
-- First table in the repo to touch Supabase Auth: user_id is 1:1 with
-- auth.users, so RLS can use auth.uid() once login exists.
CREATE TABLE "public"."users" (
    "user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "bio" "text",
    "home_church" "text",
    "ministry_interests" "text"[],
    "profile_photo_url" "text",
    "referral_source" "text",
    "profile_visibility" "text"[] DEFAULT ARRAY['private'::"text"] NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    "updated_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "users_email_key" UNIQUE ("email"),
    CONSTRAINT "users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "users_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'onboarding'::"text", 'active'::"text", 'inactive'::"text"]))),
    CONSTRAINT "users_profile_visibility_check" CHECK (("profile_visibility" <@ ARRAY['private'::"text", 'staff_of_followed_ministries'::"text", 'dialogue_channels'::"text", 'all_members'::"text"]))
);

-- ── user_private_details ────────────────────────────────────────────────────
CREATE TABLE "public"."user_private_details" (
    "user_id" "uuid" NOT NULL,
    "home_address" "text",
    "mobile_phone" "text",
    "spouse_name" "text",
    "birth_year" integer,
    CONSTRAINT "user_private_details_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "user_private_details_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE
);

COMMENT ON COLUMN "public"."user_private_details"."birth_year" IS 'Not exposed publicly';

-- ── admins ───────────────────────────────────────────────────────────────
CREATE TABLE "public"."admins" (
    "admin_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    CONSTRAINT "admins_pkey" PRIMARY KEY ("admin_id"),
    CONSTRAINT "admins_user_id_key" UNIQUE ("user_id"),
    CONSTRAINT "admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE RESTRICT
);

-- ── ministry_questionnaires ──────────────────────────────────────────────
CREATE TABLE "public"."ministry_questionnaires" (
    "questionnaire_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "NRM_1_review" "text",
    "question_1" "text",
    "question_2" "text",
    "question_3" "text",
    "question_4" "text",
    "question_5" "text",
    "question_6" "text",
    "question_7" "text",
    CONSTRAINT "ministry_questionnaires_pkey" PRIMARY KEY ("questionnaire_id")
);

-- ── user_roles ───────────────────────────────────────────────────────────
CREATE TABLE "public"."user_roles" (
    "role_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "ministry_id" "uuid" NOT NULL,
    "role_on_testify" "text" NOT NULL,
    "role_in_ministry" "text",
    "assigned_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("role_id"),
    CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE,
    CONSTRAINT "user_roles_ministry_id_fkey" FOREIGN KEY ("ministry_id") REFERENCES "public"."ministries"("ministry_id") ON DELETE CASCADE,
    CONSTRAINT "user_roles_role_on_testify_check" CHECK (("role_on_testify" = ANY (ARRAY['follow'::"text", 'witness'::"text", 'beneficiary'::"text", 'advocate'::"text", 'moderator'::"text", 'leader'::"text", 'representative'::"text"]))),
    CONSTRAINT "user_roles_role_in_ministry_check" CHECK (("role_in_ministry" IS NULL) OR ("role_in_ministry" = ANY (ARRAY['Leader'::"text", 'Staff'::"text", 'Volunteer'::"text", 'Donor'::"text", 'Beneficiary'::"text"])))
);

COMMENT ON COLUMN "public"."user_roles"."ministry_id" IS 'Every role is ministry-scoped';

-- ── testimonies ──────────────────────────────────────────────────────────
CREATE TABLE "public"."testimonies" (
    "testimony_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ministry_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "text_content" "text",
    "video_url" "text",
    "role_type" "text",
    "is_advocate" boolean DEFAULT false NOT NULL,
    "service_date" date,
    "sentiment" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "flag_level" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "testimonies_pkey" PRIMARY KEY ("testimony_id"),
    CONSTRAINT "testimonies_ministry_id_fkey" FOREIGN KEY ("ministry_id") REFERENCES "public"."ministries"("ministry_id") ON DELETE RESTRICT,
    CONSTRAINT "testimonies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE RESTRICT,
    CONSTRAINT "testimonies_type_check" CHECK (("type" = ANY (ARRAY['text'::"text", 'video'::"text"]))),
    CONSTRAINT "testimonies_role_type_check" CHECK (("role_type" IS NULL) OR ("role_type" = ANY (ARRAY['witness'::"text", 'beneficiary'::"text"]))),
    CONSTRAINT "testimonies_sentiment_check" CHECK (("sentiment" IS NULL) OR ("sentiment" = ANY (ARRAY['positive'::"text", 'neutral'::"text", 'negative'::"text"]))),
    CONSTRAINT "testimonies_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'removed'::"text"]))),
    CONSTRAINT "testimonies_flag_level_check" CHECK (("flag_level" = ANY (ARRAY[0, 1, 2])))
);

-- ── leader_interviews ────────────────────────────────────────────────────
CREATE TABLE "public"."leader_interviews" (
    "interview_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ministry_id" "uuid" NOT NULL,
    "interviewed_user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "text_content" "text",
    "video_url" "text",
    "posted_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    "status" "text",
    "flag_level" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "leader_interviews_pkey" PRIMARY KEY ("interview_id"),
    CONSTRAINT "leader_interviews_ministry_id_fkey" FOREIGN KEY ("ministry_id") REFERENCES "public"."ministries"("ministry_id") ON DELETE RESTRICT,
    CONSTRAINT "leader_interviews_interviewed_user_id_fkey" FOREIGN KEY ("interviewed_user_id") REFERENCES "public"."users"("user_id") ON DELETE RESTRICT,
    CONSTRAINT "leader_interviews_type_check" CHECK (("type" = ANY (ARRAY['text'::"text", 'video'::"text"]))),
    CONSTRAINT "leader_interviews_flag_level_check" CHECK (("flag_level" = ANY (ARRAY[0, 1, 2])))
);

-- ── channels ─────────────────────────────────────────────────────────────
CREATE TABLE "public"."channels" (
    "channel_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ministry_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    CONSTRAINT "channels_pkey" PRIMARY KEY ("channel_id"),
    CONSTRAINT "channels_ministry_id_key" UNIQUE ("ministry_id"),
    CONSTRAINT "channels_ministry_id_fkey" FOREIGN KEY ("ministry_id") REFERENCES "public"."ministries"("ministry_id") ON DELETE CASCADE
);

-- ── channel_posts ────────────────────────────────────────────────────────
-- "user_id must hold a User_Roles row for this ministry" (per the ERD) is
-- an app-level rule spanning two tables — not enforced here via CHECK/FK.
CREATE TABLE "public"."channel_posts" (
    "post_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "channel_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text",
    "image_url" "text",
    "file_attachment_url" "text",
    "deleted_flag" boolean DEFAULT false NOT NULL,
    "flag_level" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "channel_posts_pkey" PRIMARY KEY ("post_id"),
    CONSTRAINT "channel_posts_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("channel_id") ON DELETE CASCADE,
    CONSTRAINT "channel_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE RESTRICT,
    CONSTRAINT "channel_posts_flag_level_check" CHECK (("flag_level" = ANY (ARRAY[0, 1, 2])))
);

-- ── ministry_updates ─────────────────────────────────────────────────────
CREATE TABLE "public"."ministry_updates" (
    "update_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ministry_id" "uuid" NOT NULL,
    "posted_by_user_id" "uuid" NOT NULL,
    "content" "text",
    "image_url" "text",
    "published_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    CONSTRAINT "ministry_updates_pkey" PRIMARY KEY ("update_id"),
    CONSTRAINT "ministry_updates_ministry_id_fkey" FOREIGN KEY ("ministry_id") REFERENCES "public"."ministries"("ministry_id") ON DELETE RESTRICT,
    CONSTRAINT "ministry_updates_posted_by_user_id_fkey" FOREIGN KEY ("posted_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE RESTRICT
);

-- ── member_notes ─────────────────────────────────────────────────────────
CREATE TABLE "public"."member_notes" (
    "note_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "ministry_id" "uuid" NOT NULL,
    "content" "text",
    "updated_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    CONSTRAINT "member_notes_pkey" PRIMARY KEY ("note_id"),
    CONSTRAINT "member_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE,
    CONSTRAINT "member_notes_ministry_id_fkey" FOREIGN KEY ("ministry_id") REFERENCES "public"."ministries"("ministry_id") ON DELETE CASCADE
);

-- ── ministry_newsletters ─────────────────────────────────────────────────
CREATE TABLE "public"."ministry_newsletters" (
    "newsletter_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ministry_id" "uuid" NOT NULL,
    "source_url" "text",
    "content" "text",
    "pulled_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    CONSTRAINT "ministry_newsletters_pkey" PRIMARY KEY ("newsletter_id"),
    CONSTRAINT "ministry_newsletters_ministry_id_fkey" FOREIGN KEY ("ministry_id") REFERENCES "public"."ministries"("ministry_id") ON DELETE CASCADE
);

-- ── content_flags ────────────────────────────────────────────────────────
-- target_id is intentionally not a DB-level FK (polymorphic across
-- post/testimony/profile/interview, per the ERD).
CREATE TABLE "public"."content_flags" (
    "flag_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "flagged_by_user_id" "uuid" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "severity" integer NOT NULL,
    "reason" "text",
    "resolved_at" timestamp with time zone,
    "resolved_by_user_id" "uuid",
    CONSTRAINT "content_flags_pkey" PRIMARY KEY ("flag_id"),
    CONSTRAINT "content_flags_flagged_by_user_id_fkey" FOREIGN KEY ("flagged_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE RESTRICT,
    CONSTRAINT "content_flags_resolved_by_user_id_fkey" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL,
    CONSTRAINT "content_flags_target_type_check" CHECK (("target_type" = ANY (ARRAY['post'::"text", 'testimony'::"text", 'profile'::"text", 'interview'::"text"]))),
    CONSTRAINT "content_flags_severity_check" CHECK (("severity" = ANY (ARRAY[1, 2])))
);

-- ── member_agreements ────────────────────────────────────────────────────
CREATE TABLE "public"."member_agreements" (
    "agreement_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "version" "text" NOT NULL,
    "text_content" "text",
    "effective_date" date,
    CONSTRAINT "member_agreements_pkey" PRIMARY KEY ("agreement_id")
);

-- ── user_agreement_acknowledgments ───────────────────────────────────────
CREATE TABLE "public"."user_agreement_acknowledgments" (
    "ack_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "agreement_id" "uuid" NOT NULL,
    "accepted_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    "ip_address" "text",
    CONSTRAINT "user_agreement_acknowledgments_pkey" PRIMARY KEY ("ack_id"),
    CONSTRAINT "user_agreement_acknowledgments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE,
    CONSTRAINT "user_agreement_acknowledgments_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "public"."member_agreements"("agreement_id") ON DELETE RESTRICT
);

-- ── admin_audit_logs ─────────────────────────────────────────────────────
CREATE TABLE "public"."admin_audit_logs" (
    "log_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "target_type" "text",
    "target_id" "uuid",
    "timestamp" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    "notes" "text",
    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("log_id"),
    CONSTRAINT "admin_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("admin_id") ON DELETE RESTRICT
);

-- ── decline_reasons ──────────────────────────────────────────────────────
-- Anonymous by design (per the ERD) — no user_id column at all.
CREATE TABLE "public"."decline_reasons" (
    "reason_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "decline_stage" "text" NOT NULL,
    "opt_out_reason" "text",
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    CONSTRAINT "decline_reasons_pkey" PRIMARY KEY ("reason_id"),
    CONSTRAINT "decline_reasons_decline_stage_check" CHECK (("decline_stage" = ANY (ARRAY['welcome'::"text", 'participation_guidelines'::"text", 'statement_of_faith'::"text"])))
);

-- ── incomplete_enrollments ───────────────────────────────────────────────
-- Anonymous by design (per the ERD) — no user_id column at all.
-- enrollment_type left unconstrained: the ERD gives only "ministry" as an
-- example value, not an exhaustive list.
CREATE TABLE "public"."incomplete_enrollments" (
    "record_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enrollment_type" "text" NOT NULL,
    "exited_at_step" "text",
    "opt_out_reason" "text",
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    CONSTRAINT "incomplete_enrollments_pkey" PRIMARY KEY ("record_id")
);

-- ── Deferred FKs on ministries (targets didn't exist until now) ─────────────
ALTER TABLE "public"."ministries"
    ADD CONSTRAINT "ministries_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL,
    ADD CONSTRAINT "ministries_leader_or_representative_user_id_fkey" FOREIGN KEY ("leader_or_representative_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL,
    ADD CONSTRAINT "ministries_proposed_by_fkey" FOREIGN KEY ("proposed_by") REFERENCES "public"."users"("user_id") ON DELETE SET NULL,
    ADD CONSTRAINT "ministries_questionnaire_fkey" FOREIGN KEY ("questionnaire") REFERENCES "public"."ministry_questionnaires"("questionnaire_id") ON DELETE SET NULL;

-- ── updated_at auto-maintenance (users, member_notes) ───────────────────────
CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = (now() AT TIME ZONE 'utc');
  RETURN NEW;
END;
$$;

CREATE TRIGGER "set_users_updated_at" BEFORE UPDATE ON "public"."users"
    FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE TRIGGER "set_member_notes_updated_at" BEFORE UPDATE ON "public"."member_notes"
    FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

-- ── RLS: enabled, no policies (deny-all) on every new table ────────────────
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_private_details" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."admins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ministry_questionnaires" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."testimonies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."leader_interviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."channels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."channel_posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ministry_updates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."member_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ministry_newsletters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."content_flags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."member_agreements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_agreement_acknowledgments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."admin_audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."decline_reasons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."incomplete_enrollments" ENABLE ROW LEVEL SECURITY;

-- ── FK indexes (Postgres doesn't auto-index these) ──────────────────────────
CREATE INDEX "user_private_details_user_id_idx" ON "public"."user_private_details" USING "btree" ("user_id");
CREATE INDEX "admins_user_id_idx" ON "public"."admins" USING "btree" ("user_id");
CREATE INDEX "user_roles_user_id_idx" ON "public"."user_roles" USING "btree" ("user_id");
CREATE INDEX "user_roles_ministry_id_idx" ON "public"."user_roles" USING "btree" ("ministry_id");
CREATE INDEX "testimonies_ministry_id_idx" ON "public"."testimonies" USING "btree" ("ministry_id");
CREATE INDEX "testimonies_user_id_idx" ON "public"."testimonies" USING "btree" ("user_id");
CREATE INDEX "leader_interviews_ministry_id_idx" ON "public"."leader_interviews" USING "btree" ("ministry_id");
CREATE INDEX "leader_interviews_interviewed_user_id_idx" ON "public"."leader_interviews" USING "btree" ("interviewed_user_id");
CREATE INDEX "channels_ministry_id_idx" ON "public"."channels" USING "btree" ("ministry_id");
CREATE INDEX "channel_posts_channel_id_idx" ON "public"."channel_posts" USING "btree" ("channel_id");
CREATE INDEX "channel_posts_user_id_idx" ON "public"."channel_posts" USING "btree" ("user_id");
CREATE INDEX "ministry_updates_ministry_id_idx" ON "public"."ministry_updates" USING "btree" ("ministry_id");
CREATE INDEX "ministry_updates_posted_by_user_id_idx" ON "public"."ministry_updates" USING "btree" ("posted_by_user_id");
CREATE INDEX "member_notes_user_id_idx" ON "public"."member_notes" USING "btree" ("user_id");
CREATE INDEX "member_notes_ministry_id_idx" ON "public"."member_notes" USING "btree" ("ministry_id");
CREATE INDEX "ministry_newsletters_ministry_id_idx" ON "public"."ministry_newsletters" USING "btree" ("ministry_id");
CREATE INDEX "content_flags_flagged_by_user_id_idx" ON "public"."content_flags" USING "btree" ("flagged_by_user_id");
CREATE INDEX "content_flags_resolved_by_user_id_idx" ON "public"."content_flags" USING "btree" ("resolved_by_user_id");
CREATE INDEX "content_flags_target_idx" ON "public"."content_flags" USING "btree" ("target_type", "target_id");
CREATE INDEX "user_agreement_acknowledgments_user_id_idx" ON "public"."user_agreement_acknowledgments" USING "btree" ("user_id");
CREATE INDEX "user_agreement_acknowledgments_agreement_id_idx" ON "public"."user_agreement_acknowledgments" USING "btree" ("agreement_id");
CREATE INDEX "admin_audit_logs_admin_id_idx" ON "public"."admin_audit_logs" USING "btree" ("admin_id");
CREATE INDEX "ministries_contact_id_idx" ON "public"."ministries" USING "btree" ("contact_id");
CREATE INDEX "ministries_leader_or_representative_user_id_idx" ON "public"."ministries" USING "btree" ("leader_or_representative_user_id");
CREATE INDEX "ministries_proposed_by_idx" ON "public"."ministries" USING "btree" ("proposed_by");
CREATE INDEX "ministries_questionnaire_idx" ON "public"."ministries" USING "btree" ("questionnaire");

-- ── Grants ───────────────────────────────────────────────────────────────
-- Matches the existing convention (blanket GRANT to anon/authenticated/
-- service_role). Safe here because RLS is enabled with no policies above —
-- RLS is the actual access gate, not the schema-level grant.
DO $$
DECLARE
    tbl text;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'users', 'user_private_details', 'admins', 'ministry_questionnaires',
        'user_roles', 'testimonies', 'leader_interviews', 'channels',
        'channel_posts', 'ministry_updates', 'member_notes',
        'ministry_newsletters', 'content_flags', 'member_agreements',
        'user_agreement_acknowledgments', 'admin_audit_logs',
        'decline_reasons', 'incomplete_enrollments'
    ]
    LOOP
        EXECUTE format('GRANT ALL ON TABLE "public".%I TO "anon"', tbl);
        EXECUTE format('GRANT ALL ON TABLE "public".%I TO "authenticated"', tbl);
        EXECUTE format('GRANT ALL ON TABLE "public".%I TO "service_role"', tbl);
    END LOOP;
END $$;
