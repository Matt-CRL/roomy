ALTER TABLE roomy_items
  ADD COLUMN IF NOT EXISTS photo_position_x numeric(5,2) NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS photo_position_y numeric(5,2) NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS photo_zoom numeric(4,2) NOT NULL DEFAULT 1;

ALTER TABLE roomy_items
  DROP CONSTRAINT IF EXISTS roomy_item_photo_position_x,
  DROP CONSTRAINT IF EXISTS roomy_item_photo_position_y,
  DROP CONSTRAINT IF EXISTS roomy_item_photo_zoom;

ALTER TABLE roomy_items
  ADD CONSTRAINT roomy_item_photo_position_x CHECK (photo_position_x BETWEEN 0 AND 100),
  ADD CONSTRAINT roomy_item_photo_position_y CHECK (photo_position_y BETWEEN 0 AND 100),
  ADD CONSTRAINT roomy_item_photo_zoom CHECK (photo_zoom BETWEEN 1 AND 2);
