import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const migration = readFileSync(
  fileURLToPath(new URL('../db/migrations/007_layout_item_layer_order.sql', import.meta.url)),
  'utf8',
)

test('layer order migration backfills current display order and enforces unique bounded layers', () => {
  assert.match(migration, /ADD COLUMN layer_order integer/i)
  assert.match(migration, /ROW_NUMBER\(\) OVER \(PARTITION BY room_id ORDER BY item_id\) - 1/i)
  assert.match(migration, /ALTER COLUMN layer_order SET NOT NULL/i)
  assert.match(migration, /CHECK \(layer_order BETWEEN 0 AND 499\)/i)
  assert.match(migration, /UNIQUE \(room_id, layer_order\)/i)
})
