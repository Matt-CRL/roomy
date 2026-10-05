const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

function isLocalHostname(hostname) {
  const host = hostname.toLowerCase()
  if (LOCAL_HOSTS.has(host) || host.endsWith('.localhost') || host.endsWith('.local')) return true
  if (/^10\./.test(host) || /^192\.168\./.test(host)) return true
  const match = /^172\.(\d+)\./.exec(host)
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31)
}

function publicHttpsUrl(value, name, errors) {
  if (!value) {
    errors.push(`${name} is required`)
    return
  }
  let url
  try {
    url = new URL(value)
  } catch {
    errors.push(`${name} must be an absolute HTTPS URL`)
    return
  }
  if (url.protocol !== 'https:' || !url.hostname || isLocalHostname(url.hostname) || url.username || url.password || url.search || url.hash) {
    errors.push(`${name} must be a public HTTPS URL without credentials, query, or fragment`)
  }
}

function jwtRole(key) {
  try {
    const payload = key.split('.')[1]
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).role
  } catch {
    return null
  }
}

export function validateProductionClientEnv(env) {
  const errors = []
  if (env.VITE_USE_MOCK_API !== 'false') {
    errors.push('VITE_USE_MOCK_API must be exactly "false" (use npm run build:demo for an intentional demo build)')
  }

  publicHttpsUrl(env.VITE_API_BASE_URL, 'VITE_API_BASE_URL', errors)
  if (env.VITE_API_BASE_URL) {
    try {
      if (new URL(env.VITE_API_BASE_URL).pathname !== '/') errors.push('VITE_API_BASE_URL must point to the API origin without a path')
    } catch {
      // The absolute-URL diagnostic above is sufficient.
    }
  }

  publicHttpsUrl(env.VITE_SUPABASE_URL, 'VITE_SUPABASE_URL', errors)
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
  const safePublicKey = key.startsWith('sb_publishable_') || jwtRole(key) === 'anon'
  if (!safePublicKey || /replace[_-]?me|your[-_]?project|<|>/.test(key) || /^(sb_secret_|service_role)/i.test(key)) {
    errors.push('VITE_SUPABASE_PUBLISHABLE_KEY must be a real public publishable/anon key, not a placeholder or server secret')
  }

  if (errors.length) {
    throw new Error(`Production release build configuration is invalid:\n- ${errors.join('\n- ')}`)
  }
}

export function validateBasePath(value) {
  const base = value || '/'
  if (!base.startsWith('/') || !base.endsWith('/') || base.startsWith('//') || base.includes('..') || /[?#]/.test(base)) {
    throw new Error('VITE_BASE_PATH must be a same-origin path that starts and ends with /')
  }
  return base
}
