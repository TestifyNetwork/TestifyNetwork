-- Remove ministries.proposed_by.
ALTER TABLE "public"."ministries" DROP CONSTRAINT "ministries_proposed_by_fkey";
DROP INDEX "public"."ministries_proposed_by_idx";
ALTER TABLE "public"."ministries" DROP COLUMN "proposed_by";
