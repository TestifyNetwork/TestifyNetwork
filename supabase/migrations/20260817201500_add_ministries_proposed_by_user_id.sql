-- Re-add ministries.proposed_by under its new name, proposed_by_user_id.
-- Nullable for the same reason the original proposed_by was: no auth system
-- yet, so existing rows have no real user to attribute. Revisit once
-- auth.users-backed signup exists.
ALTER TABLE "public"."ministries"
    ADD COLUMN "proposed_by_user_id" "uuid";

ALTER TABLE "public"."ministries"
    ADD CONSTRAINT "ministries_proposed_by_user_id_fkey" FOREIGN KEY ("proposed_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

CREATE INDEX "ministries_proposed_by_user_id_idx" ON "public"."ministries" USING "btree" ("proposed_by_user_id");
