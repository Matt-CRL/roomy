CREATE TABLE IF NOT EXISTS roomy_photo_cleanup (
  path text PRIMARY KEY,
  queued_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  last_error text
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON roomy_photo_cleanup FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON roomy_photo_cleanup FROM authenticated;
  END IF;
END $$;
