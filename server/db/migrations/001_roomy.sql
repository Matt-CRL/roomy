-- Roomy schema. Apply with npm run db:migrate; never use the legacy sightings seed.
CREATE TABLE IF NOT EXISTS roomy_categories (
  name text PRIMARY KEY
);

INSERT INTO roomy_categories (name) VALUES
  ('Furniture'), ('Bedding'), ('Clothing'), ('Personal items'),
  ('Books & media'), ('Electronics'), ('Decor'), ('Storage'),
  ('Appliances'), ('Cookware'), ('Dinnerware'), ('Utensils'),
  ('Food storage'), ('Toiletries'), ('Towels'), ('Personal care'),
  ('Bathroom storage'), ('Cleaning supplies'), ('Documents'),
  ('Tools'), ('Cables'), ('Miscellaneous')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS roomy_rooms (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
  width_cm numeric(9,2) CHECK (width_cm BETWEEN 1 AND 100000),
  depth_cm numeric(9,2) CHECK (depth_cm BETWEEN 1 AND 100000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roomy_room_dimensions_pair CHECK ((width_cm IS NULL) = (depth_cm IS NULL)),
  CONSTRAINT roomy_rooms_owner_id_id UNIQUE (owner_id, id)
);
CREATE UNIQUE INDEX IF NOT EXISTS roomy_rooms_unique_name
  ON roomy_rooms (owner_id, lower(trim(name)));

CREATE TABLE IF NOT EXISTS roomy_items (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  room_id uuid NOT NULL,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
  category text NOT NULL REFERENCES roomy_categories(name),
  notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 500),
  is_storage_unit boolean NOT NULL DEFAULT false,
  parent_storage_id uuid,
  width_cm numeric(9,2) CHECK (width_cm BETWEEN 1 AND 100000),
  depth_cm numeric(9,2) CHECK (depth_cm BETWEEN 1 AND 100000),
  photo_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roomy_item_dimensions_pair CHECK ((width_cm IS NULL) = (depth_cm IS NULL)),
  CONSTRAINT roomy_item_no_self_parent CHECK (parent_storage_id IS NULL OR parent_storage_id <> id),
  CONSTRAINT roomy_storage_cannot_have_parent CHECK (NOT is_storage_unit OR parent_storage_id IS NULL),
  CONSTRAINT roomy_item_owner_room_id UNIQUE (owner_id, room_id, id),
  CONSTRAINT roomy_item_room FOREIGN KEY (owner_id, room_id)
    REFERENCES roomy_rooms(owner_id, id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT roomy_item_parent FOREIGN KEY (owner_id, room_id, parent_storage_id)
    REFERENCES roomy_items(owner_id, room_id, id) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX IF NOT EXISTS roomy_items_room_idx ON roomy_items(owner_id, room_id, created_at, id);
CREATE INDEX IF NOT EXISTS roomy_items_parent_idx ON roomy_items(parent_storage_id);
CREATE INDEX IF NOT EXISTS roomy_items_category_idx ON roomy_items(owner_id, room_id, category);

CREATE TABLE IF NOT EXISTS roomy_layouts (
  room_id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roomy_layout_room FOREIGN KEY (owner_id, room_id)
    REFERENCES roomy_rooms(owner_id, id) ON DELETE CASCADE,
  CONSTRAINT roomy_layout_owner_room UNIQUE (owner_id, room_id)
);
CREATE TABLE IF NOT EXISTS roomy_layout_items (
  owner_id uuid NOT NULL,
  room_id uuid NOT NULL,
  item_id uuid NOT NULL,
  x numeric(9,2) NOT NULL CHECK (x >= 0),
  y numeric(9,2) NOT NULL CHECK (y >= 0),
  width numeric(9,2) NOT NULL CHECK (width > 0),
  depth numeric(9,2) NOT NULL CHECK (depth > 0),
  rotation numeric(7,2) NOT NULL DEFAULT 0 CHECK (rotation BETWEEN -360 AND 360),
  color text NOT NULL DEFAULT '#f97316' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  PRIMARY KEY (room_id, item_id),
  CONSTRAINT roomy_placement_layout FOREIGN KEY (owner_id, room_id)
    REFERENCES roomy_layouts(owner_id, room_id) ON DELETE CASCADE,
  CONSTRAINT roomy_placement_item FOREIGN KEY (owner_id, room_id, item_id)
    REFERENCES roomy_items(owner_id, room_id, id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
);

-- Restrict direct table access. The Express runtime role must be granted only
-- SELECT/INSERT/UPDATE/DELETE on these tables, not migration/DDL privileges.
-- Express verifies users and scopes every query by owner_id. A direct Supabase
-- Data API caller does not have access to these private tables.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON roomy_rooms, roomy_items, roomy_categories, roomy_layouts, roomy_layout_items FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON roomy_rooms, roomy_items, roomy_categories, roomy_layouts, roomy_layout_items FROM authenticated;
  END IF;
END $$;
