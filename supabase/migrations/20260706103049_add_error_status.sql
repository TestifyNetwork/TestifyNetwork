ALTER TABLE ministry_reports
  DROP CONSTRAINT check_status,
  ADD CONSTRAINT check_status CHECK (status = ANY (ARRAY['waiting_generation', 'not_verified', 'verified', 'error']));
