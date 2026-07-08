ALTER TABLE ministry_reports
  ADD COLUMN "NRM_version" text,
  ADD COLUMN "model_name" text,
  ADD COLUMN "990s" text[],
  ADD COLUMN "annual_reports" text[];
