import test from 'node:test'
import assert from 'node:assert/strict'
import { appPageTitle, authPageTitle } from '../src/utils/pageTitle.js'

test('app page titles identify the active screen without private names', () => {
  assert.equal(appPageTitle('rooms'), 'Roomy - Rooms')
  assert.equal(appPageTitle('inventory'), 'Roomy - Inventory')
  assert.equal(appPageTitle('planner'), 'Roomy - Planner')
  assert.equal(appPageTitle('item-form'), 'Roomy - Add Item')
  assert.equal(appPageTitle('item-form', 'item-id'), 'Roomy - Edit Item')
  assert.equal(appPageTitle('unknown'), 'Roomy')
})

test('auth page titles follow the active auth view', () => {
  assert.equal(authPageTitle('sign-in'), 'Roomy - Login')
  assert.equal(authPageTitle('sign-up'), 'Roomy - Create Account')
  assert.equal(authPageTitle('forgot-password'), 'Roomy - Forgot Password')
  assert.equal(authPageTitle('update-password'), 'Roomy - Reset Password')
  assert.equal(authPageTitle('update-password', true), 'Roomy - Password Updated')
  assert.equal(authPageTitle('unknown'), 'Roomy')
})
