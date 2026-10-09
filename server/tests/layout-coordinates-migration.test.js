import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const migrationUrl = new URL('../db/migrations/006_rotated_layout_positions.sql', import.meta.url)
const migration = readFileSync(fileURLToPath(migrationUrl), 'utf8')

test('rotated-layout migration allows bounded negative origins without changing placement data', () => {
  assert.match(migration, /ALTER TABLE public\.roomy_layout_items/i)
  assert.match(migration, /DROP CONSTRAINT IF EXISTS roomy_layout_items_x_check/i)
  assert.match(migration, /DROP CONSTRAINT IF EXISTS roomy_layout_items_y_check/i)
  assert.match(migration, /roomy_layout_items_x_range CHECK \(x BETWEEN -100000 AND 100000\)/i)
  assert.match(migration, /roomy_layout_items_y_range CHECK \(y BETWEEN -100000 AND 100000\)/i)
  assert.doesNotMatch(migration, /\b(DROP TABLE|TRUNCATE|DELETE FROM|UPDATE)\b/i)
})
