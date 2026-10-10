const APP_PAGE_NAMES = {
  rooms: 'Rooms',
  inventory: 'Inventory',
  planner: 'Planner',
}

const AUTH_PAGE_NAMES = {
  'sign-in': 'Login',
  'sign-up': 'Create Account',
  'forgot-password': 'Forgot Password',
  'update-password': 'Reset Password',
}

export function appPageTitle(page, itemId = null) {
  const pageName = page === 'item-form'
    ? (itemId ? 'Edit Item' : 'Add Item')
    : APP_PAGE_NAMES[page]
  return pageName ? `Roomy - ${pageName}` : 'Roomy'
}

export function authPageTitle(mode, passwordUpdated = false) {
  const pageName = passwordUpdated ? 'Password Updated' : AUTH_PAGE_NAMES[mode]
  return pageName ? `Roomy - ${pageName}` : 'Roomy'
}
