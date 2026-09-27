ALTER TABLE roomy_items
  ADD COLUMN IF NOT EXISTS photo_fit text NOT NULL DEFAULT 'cover',
  ADD COLUMN IF NOT EXISTS photo_position text NOT NULL DEFAULT 'center';

ALTER TABLE roomy_items
  DROP CONSTRAINT IF EXISTS roomy_item_photo_fit,
  DROP CONSTRAINT IF EXISTS roomy_item_photo_position;

ALTER TABLE roomy_items
  ADD CONSTRAINT roomy_item_photo_fit CHECK (photo_fit IN ('cover', 'contain')),
  ADD CONSTRAINT roomy_item_photo_position CHECK (photo_position IN ('center', 'top', 'bottom', 'left', 'right'));
