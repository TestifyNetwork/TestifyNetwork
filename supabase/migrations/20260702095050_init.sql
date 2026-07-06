


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."kv_store_78e2f486" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL
);


ALTER TABLE "public"."kv_store_78e2f486" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ministry_reports" (
    "ministry_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    "ministry_name" "text" NOT NULL,
    "logo_url" "text",
    "generated_report" "text",
    "hq_location" "text",
    "mission" "text",
    "status" "text" DEFAULT 'waiting_generation'::"text" NOT NULL,
    "generated_citations" "text"[],
    CONSTRAINT "check_status" CHECK (("status" = ANY (ARRAY['waiting_generation'::"text", 'not_verified'::"text", 'verified'::"text"])))
);


ALTER TABLE "public"."ministry_reports" OWNER TO "postgres";


COMMENT ON COLUMN "public"."ministry_reports"."ministry_name" IS 'Name of ministry';



COMMENT ON COLUMN "public"."ministry_reports"."logo_url" IS 'URL for ministry''s logo. Leave empty if unable to find';



COMMENT ON COLUMN "public"."ministry_reports"."generated_report" IS 'Report is formatted in markdown';



ALTER TABLE ONLY "public"."ministry_reports"
    ADD CONSTRAINT "Ministry Reports_ministry_name_key" UNIQUE ("ministry_name");



ALTER TABLE ONLY "public"."ministry_reports"
    ADD CONSTRAINT "Ministry Reports_pkey" PRIMARY KEY ("ministry_id");



ALTER TABLE ONLY "public"."kv_store_78e2f486"
    ADD CONSTRAINT "kv_store_78e2f486_pkey" PRIMARY KEY ("key");



CREATE INDEX "kv_store_78e2f486_key_idx" ON "public"."kv_store_78e2f486" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_78e2f486_key_idx1" ON "public"."kv_store_78e2f486" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_78e2f486_key_idx2" ON "public"."kv_store_78e2f486" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_78e2f486_key_idx3" ON "public"."kv_store_78e2f486" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_78e2f486_key_idx4" ON "public"."kv_store_78e2f486" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_78e2f486_key_idx5" ON "public"."kv_store_78e2f486" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_78e2f486_key_idx6" ON "public"."kv_store_78e2f486" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_78e2f486_key_idx7" ON "public"."kv_store_78e2f486" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_78e2f486_key_idx8" ON "public"."kv_store_78e2f486" USING "btree" ("key" "text_pattern_ops");



CREATE POLICY "Public select: Ministry Reports" ON "public"."ministry_reports" FOR SELECT USING (true);



ALTER TABLE "public"."kv_store_78e2f486" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ministry_reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public insert: ministry_reports" ON "public"."ministry_reports" FOR INSERT WITH CHECK (true);



CREATE POLICY "public update: ministry_reports" ON "public"."ministry_reports" FOR UPDATE USING (true) WITH CHECK (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





































































































































































GRANT ALL ON TABLE "public"."kv_store_78e2f486" TO "anon";
GRANT ALL ON TABLE "public"."kv_store_78e2f486" TO "authenticated";
GRANT ALL ON TABLE "public"."kv_store_78e2f486" TO "service_role";



GRANT ALL ON TABLE "public"."ministry_reports" TO "anon";
GRANT ALL ON TABLE "public"."ministry_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."ministry_reports" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































