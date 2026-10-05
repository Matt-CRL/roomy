-- Security boundary for the Express-mediated Roomy API.
-- Apply only after this migration has been tested in an isolated database.
-- The API must connect as a login role that inherits roomy_runtime, never as
-- the table owner, postgres, service_role, or a BYPASSRLS role.

DO $$
DECLARE
  expected_tables text[] := ARRAY[
    'roomy_categories', 'roomy_items', 'roomy_layout_items', 'roomy_layouts',
    'roomy_migrations', 'roomy_photo_cleanup', 'roomy_rooms'
  ];
  existing_count integer;
BEGIN
  SELECT count(*) INTO existing_count
  FROM pg_tables
  WHERE schemaname='public' AND tablename=ANY(expected_tables);
  IF existing_count <> cardinality(expected_tables) THEN
    RAISE EXCEPTION 'Roomy security migration requires all seven expected tables; found %', existing_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename=ANY(expected_tables)
  ) THEN
    RAISE EXCEPTION 'Existing Roomy RLS policies found. Review and reconcile them before applying migration 005.';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('roomy_runtime', 'roomy_photo_maintenance')) THEN
    RAISE EXCEPTION 'Roomy security group roles already exist. Review their memberships and grants before retrying migration 005.';
  END IF;

  EXECUTE 'CREATE ROLE roomy_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION INHERIT';
  EXECUTE 'CREATE ROLE roomy_photo_maintenance NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION INHERIT';
END $$;

GRANT USAGE ON SCHEMA public TO roomy_runtime, roomy_photo_maintenance;

REVOKE ALL ON TABLE
  public.roomy_categories, public.roomy_rooms, public.roomy_items,
  public.roomy_layouts, public.roomy_layout_items, public.roomy_photo_cleanup,
  public.roomy_migrations
FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON TABLE
      public.roomy_categories, public.roomy_rooms, public.roomy_items,
      public.roomy_layouts, public.roomy_layout_items, public.roomy_photo_cleanup,
      public.roomy_migrations FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL ON TABLE
      public.roomy_categories, public.roomy_rooms, public.roomy_items,
      public.roomy_layouts, public.roomy_layout_items, public.roomy_photo_cleanup,
      public.roomy_migrations FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
    REVOKE ALL ON TABLE
      public.roomy_categories, public.roomy_rooms, public.roomy_items,
      public.roomy_layouts, public.roomy_layout_items, public.roomy_photo_cleanup,
      public.roomy_migrations FROM service_role;
  END IF;
END $$;

GRANT SELECT ON public.roomy_categories TO roomy_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.roomy_rooms, public.roomy_items, public.roomy_layouts,
  public.roomy_layout_items, public.roomy_photo_cleanup TO roomy_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roomy_photo_cleanup TO roomy_photo_maintenance;
REVOKE ALL ON public.roomy_migrations FROM roomy_runtime, roomy_photo_maintenance;

ALTER TABLE public.roomy_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roomy_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roomy_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roomy_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roomy_layout_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roomy_photo_cleanup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roomy_migrations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.roomy_categories FORCE ROW LEVEL SECURITY;
ALTER TABLE public.roomy_rooms FORCE ROW LEVEL SECURITY;
ALTER TABLE public.roomy_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.roomy_layouts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.roomy_layout_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.roomy_photo_cleanup FORCE ROW LEVEL SECURITY;

CREATE POLICY roomy_runtime_categories_read
  ON public.roomy_categories FOR SELECT TO roomy_runtime USING (true);

CREATE POLICY roomy_runtime_rooms_owner
  ON public.roomy_rooms FOR ALL TO roomy_runtime
  USING (owner_id = NULLIF(current_setting('roomy.user_id', true), '')::uuid)
  WITH CHECK (owner_id = NULLIF(current_setting('roomy.user_id', true), '')::uuid);

CREATE POLICY roomy_runtime_items_owner
  ON public.roomy_items FOR ALL TO roomy_runtime
  USING (owner_id = NULLIF(current_setting('roomy.user_id', true), '')::uuid)
  WITH CHECK (owner_id = NULLIF(current_setting('roomy.user_id', true), '')::uuid);

CREATE POLICY roomy_runtime_layouts_owner
  ON public.roomy_layouts FOR ALL TO roomy_runtime
  USING (owner_id = NULLIF(current_setting('roomy.user_id', true), '')::uuid)
  WITH CHECK (owner_id = NULLIF(current_setting('roomy.user_id', true), '')::uuid);

CREATE POLICY roomy_runtime_layout_items_owner
  ON public.roomy_layout_items FOR ALL TO roomy_runtime
  USING (owner_id = NULLIF(current_setting('roomy.user_id', true), '')::uuid)
  WITH CHECK (owner_id = NULLIF(current_setting('roomy.user_id', true), '')::uuid);

CREATE POLICY roomy_runtime_photo_cleanup_owner
  ON public.roomy_photo_cleanup FOR ALL TO roomy_runtime
  USING (path LIKE current_setting('roomy.user_id', true) || '/%')
  WITH CHECK (path LIKE current_setting('roomy.user_id', true) || '/%');

CREATE POLICY roomy_photo_maintenance_jobs
  ON public.roomy_photo_cleanup FOR ALL TO roomy_photo_maintenance
  USING (true) WITH CHECK (true);

-- roomy_migrations intentionally has no application policy or runtime grants.
