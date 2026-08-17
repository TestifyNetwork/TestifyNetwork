-- Replace ministry_reports with the ERD's ministries table. See README.md
-- for the full ERD and the 20-value Ministries.status enrollment pipeline.
--
-- FKs to users/ministry_questionnaires are added at the end of the
-- companion migration (20260817190100_add_erd_tables.sql), once those
-- tables exist.

ALTER TABLE "public"."ministry_reports" RENAME TO "ministries";

ALTER TABLE "public"."ministries" RENAME CONSTRAINT "Ministry Reports_pkey" TO "ministries_pkey";
ALTER TABLE "public"."ministries" RENAME CONSTRAINT "Ministry Reports_ministry_name_key" TO "ministries_ministry_name_key";

-- ── Location: split hq_location into 3 fields ──────────────────────────────
-- Existing hq_location is a freeform string (e.g. "rural Kenya") that can't
-- be reliably auto-split into city/state/country, so migrated rows start
-- with all three NULL — the original value isn't preserved anywhere.
ALTER TABLE "public"."ministries"
    ADD COLUMN "hq_city" "text",
    ADD COLUMN "hq_state" "text",
    ADD COLUMN "hq_country" "text";

ALTER TABLE "public"."ministries" DROP COLUMN "hq_location";

-- ── Reports: nrm1/nrm2 in the ERD, renamed generated_report_1/_2 ───────────
-- generated_report/generated_citations/NRM_version (single-report model)
-- become the "_1" variants; "_2" columns are net new for the pipeline's
-- second NRM review cycle (NRM2_generated / NRM2_reviewed steps).
ALTER TABLE "public"."ministries"
    ADD COLUMN "generated_report_1" "text",
    ADD COLUMN "generated_report_2" "text",
    ADD COLUMN "generated_citations_report_1" "text"[],
    ADD COLUMN "generated_citations_report_2" "text"[],
    ADD COLUMN "NRM_1_version" "text",
    ADD COLUMN "NRM_2_version" "text";

UPDATE "public"."ministries" SET
    "generated_report_1" = "generated_report",
    "generated_citations_report_1" = "generated_citations",
    "NRM_1_version" = "NRM_version";

COMMENT ON COLUMN "public"."ministries"."generated_report_1" IS 'Report is formatted in markdown';

ALTER TABLE "public"."ministries"
    DROP COLUMN "generated_report",
    DROP COLUMN "generated_citations",
    DROP COLUMN "NRM_version";

-- ── Leader info becomes a relationship, not free text ──────────────────────
-- Dropped with no migration destination: the new model's contact fields
-- have no email column for an unclaimed contact either. Real leader
-- name/email data in prod today is lost here.
ALTER TABLE "public"."ministries"
    DROP COLUMN "ministry_leader_name",
    DROP COLUMN "ministry_leader_email";

-- ── Status: remap the old 4-value status into the new 20-value pipeline ────
-- Done BEFORE swapping the CHECK constraint so no row is ever left
-- violating it. The new pipeline has no error/failed state at all, so
-- 'error' rows map back to "needs (re)generation" — the actual remediation
-- path — rather than inventing a 21st pipeline value.
ALTER TABLE "public"."ministries" DROP CONSTRAINT "check_status";

UPDATE "public"."ministries" SET "status" = CASE "status"
    WHEN 'waiting_generation' THEN 'waiting_generation_1'
    WHEN 'not_verified' THEN 'waiting_generation_1'
    WHEN 'verified' THEN 'correctly_identified'
    WHEN 'error' THEN 'waiting_generation_1'
    ELSE "status"
END;

ALTER TABLE "public"."ministries" ALTER COLUMN "status" SET DEFAULT 'waiting_generation_1';

ALTER TABLE "public"."ministries"
    ADD CONSTRAINT "ministries_status_check" CHECK (("status" = ANY (ARRAY[
        'waiting_generation_1'::"text",
        'correctly_identified'::"text",
        'relationship_identified'::"text",
        'contact_acquired'::"text",
        'invitation_sent'::"text",
        'invitation_accepted'::"text",
        'pending_admin_approval'::"text",
        'questionnaire_sent'::"text",
        'questionnaire_submitted'::"text",
        'questionnaire_pending_review'::"text",
        'questionnaire_completed'::"text",
        'NRM1_pending_review'::"text",
        'pending_both'::"text",
        'NRM1_reviewed'::"text",
        'NRM2_generated'::"text",
        'heart_questions_published'::"text",
        'NRM2_sent'::"text",
        'NRM2_pending_review'::"text",
        'NRM2_reviewed'::"text",
        'enrolled'::"text"
    ])));

-- ── New ERD-only columns ────────────────────────────────────────────────────
ALTER TABLE "public"."ministries"
    ADD COLUMN "slug" "text",
    ADD COLUMN "location_served" "text"[],
    ADD COLUMN "people_groups_served" "text"[],
    ADD COLUMN "ministry_type" "text",
    ADD COLUMN "annual_budget" numeric,
    ADD COLUMN "ein" "text",
    ADD COLUMN "website_url" "text",
    ADD COLUMN "exec_director_name" "text",
    ADD COLUMN "form_990_source" "text",
    ADD COLUMN "subsidiary_status" boolean DEFAULT false NOT NULL,
    ADD COLUMN "subsidiary_irs_reports" "text"[],
    ADD COLUMN "contact" "text",
    ADD COLUMN "contact_role" "text",
    ADD COLUMN "contact_id" "uuid",
    ADD COLUMN "contact_role_details" "text",
    ADD COLUMN "leader_or_representative_user_id" "uuid",
    -- Nullable even though every ministry conceptually has a proposer:
    -- there's no auth system yet, so existing/migrated rows have no real
    -- user to attribute. Revisit once auth.users-backed signup exists.
    ADD COLUMN "proposed_by" "uuid",
    ADD COLUMN "questionnaire" "uuid",
    ADD COLUMN "flag_level" integer DEFAULT 0 NOT NULL;

ALTER TABLE "public"."ministries"
    ADD CONSTRAINT "ministries_slug_key" UNIQUE ("slug"),
    ADD CONSTRAINT "ministries_form_990_source_check" CHECK (("form_990_source" IS NULL) OR ("form_990_source" = ANY (ARRAY['public_filing'::"text", 'subsidiary_website'::"text", 'ministry_provided'::"text", 'not_available'::"text"]))),
    ADD CONSTRAINT "ministries_contact_role_check" CHECK (("contact_role" IS NULL) OR ("contact_role" = ANY (ARRAY['staff'::"text", 'leader'::"text"]))),
    ADD CONSTRAINT "ministries_flag_level_check" CHECK (("flag_level" = ANY (ARRAY[0, 1, 2])));

-- ── RLS: drop the old wide-open policies ───────────────────────────────────
-- They don't fit a schema built around real accounts, and add_ministry
-- already needs updating to target the new column names regardless. New
-- tables get RLS enabled with no policies (deny-all) — edge functions using
-- the service-role key are unaffected.
DROP POLICY "Public select: Ministry Reports" ON "public"."ministries";
DROP POLICY "public insert: ministry_reports" ON "public"."ministries";
DROP POLICY "public update: ministry_reports" ON "public"."ministries";
