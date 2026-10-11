ALTER TABLE public.roomy_layout_items
  ADD COLUMN layer_order integer;

WITH ordered_placements AS (
  SELECT room_id,
         item_id,
         ROW_NUMBER() OVER (PARTITION BY room_id ORDER BY item_id) - 1 AS layer_order
  FROM public.roomy_layout_items
)
UPDATE public.roomy_layout_items AS placement
SET layer_order = ordered_placements.layer_order
FROM ordered_placements
WHERE placement.room_id = ordered_placements.room_id
  AND placement.item_id = ordered_placements.item_id;

ALTER TABLE public.roomy_layout_items
  ALTER COLUMN layer_order SET DEFAULT 0,
  ALTER COLUMN layer_order SET NOT NULL,
  ADD CONSTRAINT roomy_layout_items_layer_order_check
    CHECK (layer_order BETWEEN 0 AND 499),
  ADD CONSTRAINT roomy_layout_items_room_layer_order_unique
    UNIQUE (room_id, layer_order);
