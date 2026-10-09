-- A rotated shape's unrotated top-left origin may be negative even while its
-- visible rotated footprint remains inside the room. The API validates that
-- footprint before saving; keep the stored coordinates within its numeric cap.
ALTER TABLE public.roomy_layout_items
  DROP CONSTRAINT IF EXISTS roomy_layout_items_x_check,
  DROP CONSTRAINT IF EXISTS roomy_layout_items_y_check;

ALTER TABLE public.roomy_layout_items
  ADD CONSTRAINT roomy_layout_items_x_range CHECK (x BETWEEN -100000 AND 100000),
  ADD CONSTRAINT roomy_layout_items_y_range CHECK (y BETWEEN -100000 AND 100000);
