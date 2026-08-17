-- Companion schema changes for the member-enrollment core API. Mapping
-- Member-Enrollment-Process-v8.md against the ERD-derived schema surfaced
-- five gaps:

-- 0. users.email is NOT NULL, but the applicant's row is created at Step 2
--    (anonymous session start) — email isn't collected until Step 5 and
--    isn't confirmed until Step 6. Must be nullable until then.
ALTER TABLE "public"."users" ALTER COLUMN "email" DROP NOT NULL;

-- 1. Explicit step tracking for resumable enrollment (spec AUTH-05 —
--    "resume from last completed step"). Inferring progress from which
--    fields happen to be populated is fragile; track it directly instead.
--    Default is where a freshly-created applicant row lands right after
--    Step 2 ("continue"), about to see Step 3.
ALTER TABLE "public"."users"
    ADD COLUMN "enrollment_step" "text" DEFAULT 'participation_guidelines'::"text" NOT NULL;

ALTER TABLE "public"."users"
    ADD CONSTRAINT "users_enrollment_step_check" CHECK (("enrollment_step" = ANY (ARRAY[
        'participation_guidelines'::"text",
        'statement_of_faith'::"text",
        'contact_info'::"text",
        'email_verification'::"text",
        'password'::"text",
        'referral_source'::"text",
        'bio'::"text",
        'profile_visibility'::"text",
        'completed'::"text"
    ])));

-- 2. referral_source was one unconstrained freeform column (the ERD gave no
--    enum values). The spec gives 3 fixed values plus a separate freetext
--    detail ("name of member, or how you found us") — split them.
ALTER TABLE "public"."users"
    ADD CONSTRAINT "users_referral_source_check" CHECK (("referral_source" IS NULL) OR ("referral_source" = ANY (ARRAY[
        'invited_by_member'::"text",
        'invited_as_ministry_leader'::"text",
        'found_online'::"text"
    ])));

ALTER TABLE "public"."users"
    ADD COLUMN "referral_detail" "text";

-- 3. member_agreements had no way to distinguish Step 3 (participation
--    guidelines + ToS/Privacy, affirmed and versioned together) from Step 4
--    (statement of faith) — each needs independent re-affirmation when
--    materially updated, per the spec's Step 3 note.
ALTER TABLE "public"."member_agreements"
    ADD COLUMN "agreement_type" "text";

UPDATE "public"."member_agreements" SET "agreement_type" = 'participation_guidelines' WHERE "agreement_type" IS NULL;

ALTER TABLE "public"."member_agreements"
    ALTER COLUMN "agreement_type" SET NOT NULL,
    ADD CONSTRAINT "member_agreements_agreement_type_check" CHECK (("agreement_type" = ANY (ARRAY[
        'participation_guidelines'::"text",
        'statement_of_faith'::"text"
    ])));

-- 4. bio was a single generic field; the spec's Step 8 has 5 distinct,
--    independently-editable blurbs. ministry_interests was modeled as a tag
--    array, but the spec describes it as a freeform paragraph — retyped to
--    text (array_to_string preserves any existing values rather than
--    discarding them).
ALTER TABLE "public"."users"
    DROP COLUMN "bio",
    ADD COLUMN "bio_faith" "text",
    ADD COLUMN "bio_family" "text",
    ADD COLUMN "bio_work" "text",
    ADD COLUMN "bio_season" "text";

ALTER TABLE "public"."users"
    ALTER COLUMN "ministry_interests" TYPE "text" USING array_to_string("ministry_interests", ', ');
