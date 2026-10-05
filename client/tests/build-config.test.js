import test from 'node:test'
import assert from 'node:assert/strict'
import { validateBasePath, validateProductionClientEnv } from '../buildConfig.js'

const validEnv = {
  VITE_USE_MOCK_API: 'false',
  VITE_API_BASE_URL: 'https://api.example.com',
  VITE_SUPABASE_URL: 'https://project.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_value',
}

test('release config accepts explicit real mode with public HTTPS services', () => {
  assert.doesNotThrow(() => validateProductionClientEnv(validEnv))
})

test('release config rejects unset, mistyped, or demo mode', () => {
  for (const mode of [undefined, 'true', 'False', 'typo']) {
    assert.throws(() => validateProductionClientEnv({ ...validEnv, VITE_USE_MOCK_API: mode }), /VITE_USE_MOCK_API/)
  }
})

test('release config identifies missing values without printing values', () => {
  assert.throws(() => validateProductionClientEnv({ VITE_USE_MOCK_API: 'false' }), (error) => {
    assert.match(error.message, /VITE_API_BASE_URL/)
    assert.match(error.message, /VITE_SUPABASE_URL/)
    assert.match(error.message, /VITE_SUPABASE_PUBLISHABLE_KEY/)
    return true
  })
})

test('release config rejects local/insecure endpoints and server-only keys', () => {
  assert.throws(() => validateProductionClientEnv({
    ...validEnv,
    VITE_API_BASE_URL: 'http://localhost:3000',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_never_public',
  }), /VITE_API_BASE_URL.*VITE_SUPABASE_PUBLISHABLE_KEY/s)
  assert.throws(() => validateProductionClientEnv({
    ...validEnv,
    VITE_API_BASE_URL: 'https://[::1]:3000',
  }), /VITE_API_BASE_URL/)
})

test('base path accepts root and a GitHub Pages project path only', () => {
  assert.equal(validateBasePath('/'), '/')
  assert.equal(validateBasePath('/roomy/'), '/roomy/')
  for (const path of ['roomy/', '/roomy', '//evil.example/', '/../']) {
    assert.throws(() => validateBasePath(path), /VITE_BASE_PATH/)
  }
})
