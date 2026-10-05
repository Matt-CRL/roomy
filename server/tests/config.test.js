import test from 'node:test'
import assert from 'node:assert/strict'
import { assertProductionConfig, productionConfigIssues } from '../config.js'

const validProductionEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://roomy_runtime_login:private-test-password@db.example.com:5432/postgres',
  PHOTO_CLEANUP_DATABASE_URL: 'postgresql://roomy_photo_maintenance_login:other-test-password@db.example.com:5432/postgres',
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_public_value',
  SUPABASE_SECRET_KEY: 'sb_secret_test_server_value',
  SUPABASE_PHOTO_BUCKET: 'roomy-item-photos',
  CORS_ORIGINS: 'https://roomy.example.com',
  PUBLIC_HTTPS: 'true',
}

test('production API config accepts distinct least-privilege database roles and explicit HTTPS origin', () => {
  assert.deepEqual(productionConfigIssues(validProductionEnv), [])
  assert.doesNotThrow(() => assertProductionConfig(validProductionEnv))
})

test('production API config rejects the postgres admin connection and shared cleanup role', () => {
  const issues = productionConfigIssues({
    ...validProductionEnv,
    DATABASE_URL: 'postgresql://postgres:private-test-password@db.example.com:5432/postgres',
    PHOTO_CLEANUP_DATABASE_URL: 'postgresql://postgres:other-test-password@db.example.com:5432/postgres',
  })
  assert.ok(issues.some((issue) => issue.includes('restricted roomy_runtime_login')))
  assert.ok(issues.some((issue) => issue.includes('distinct non-admin role')))
})

test('production API config accepts a legacy anon JWT and rejects arbitrary public-key text', () => {
  const anonPayload = Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url')
  assert.deepEqual(productionConfigIssues({
    ...validProductionEnv,
    SUPABASE_PUBLISHABLE_KEY: `header.${anonPayload}.signature`,
  }), [])
  assert.ok(productionConfigIssues({
    ...validProductionEnv,
    SUPABASE_PUBLISHABLE_KEY: 'not-a-supabase-public-key',
  }).some((issue) => issue.includes('SUPABASE_PUBLISHABLE_KEY')))
})

test('production API config rejects a loopback Supabase endpoint', () => {
  assert.ok(productionConfigIssues({
    ...validProductionEnv,
    SUPABASE_URL: 'https://[::1]',
  }).some((issue) => issue.includes('SUPABASE_URL')))
})

test('production config errors name variables/rules without echoing secret values', () => {
  const env = {
    ...validProductionEnv,
    DATABASE_URL: 'postgresql://postgres:unique-private-test-password@db.example.com:5432/postgres',
    SUPABASE_SECRET_KEY: 'sb_publishable_wrong-kind-secret-value',
    CORS_ORIGINS: '*',
  }
  assert.throws(() => assertProductionConfig(env), (error) => {
    assert.match(error.message, /DATABASE_URL/)
    assert.match(error.message, /SUPABASE_SECRET_KEY/)
    assert.match(error.message, /CORS_ORIGINS/)
    assert.equal(error.message.includes('unique-private-test-password'), false)
    assert.equal(error.message.includes('wrong-kind-secret-value'), false)
    return true
  })
})

test('development config remains usable without production host credentials', () => {
  assert.deepEqual(productionConfigIssues({ NODE_ENV: 'development' }), [])
})
