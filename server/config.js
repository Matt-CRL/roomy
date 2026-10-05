function parseUrl(value) {
  try { return new URL(value) } catch { return null }
}

function publicHttps(value) {
  const url = parseUrl(value)
  return Boolean(url && url.protocol === 'https:' && url.hostname &&
    !['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname) &&
    url.pathname === '/' && !url.username && !url.password && !url.search && !url.hash)
}

function jwtRole(key) {
  try {
    return JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8')).role
  } catch {
    return null
  }
}

export function productionConfigIssues(env = process.env) {
  if (env.NODE_ENV !== 'production') return []

  const issues = []
  const runtimeUrl = parseUrl(env.DATABASE_URL)
  const cleanupUrl = parseUrl(env.PHOTO_CLEANUP_DATABASE_URL)
  if (!runtimeUrl || !['postgres:', 'postgresql:'].includes(runtimeUrl.protocol) || !runtimeUrl.password) issues.push('DATABASE_URL must be a PostgreSQL URL with credentials')
  else if (!runtimeUrl.username || ['postgres', 'supabase_admin', 'service_role'].includes(runtimeUrl.username)) {
    issues.push('DATABASE_URL must use the restricted roomy_runtime_login role')
  }

  if (!publicHttps(env.SUPABASE_URL)) issues.push('SUPABASE_URL must be a public HTTPS URL')
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY || ''
  const isPublishableKey = publishableKey.startsWith('sb_publishable_') || jwtRole(publishableKey) === 'anon'
  if (!isPublishableKey || /replace[_-]?me|your[-_]?project|<|>/.test(publishableKey) || /^(sb_secret_|service_role)/i.test(publishableKey)) {
    issues.push('SUPABASE_PUBLISHABLE_KEY must be a public publishable/anon key')
  }
  const secretKey = env.SUPABASE_SECRET_KEY || ''
  const isServerSecret = secretKey.startsWith('sb_secret_') || jwtRole(secretKey) === 'service_role'
  if (!isServerSecret || /replace[_-]?me|your[-_]?project|<|>/.test(secretKey)) {
    issues.push('SUPABASE_SECRET_KEY must be configured as a server-only secret')
  }
  if (!env.SUPABASE_PHOTO_BUCKET || /replace[_-]?me|your[-_]?project|<|>/.test(env.SUPABASE_PHOTO_BUCKET)) {
    issues.push('SUPABASE_PHOTO_BUCKET must name the configured private photo bucket')
  }

  if (!cleanupUrl || !['postgres:', 'postgresql:'].includes(cleanupUrl.protocol) || !cleanupUrl.username || !cleanupUrl.password) {
    issues.push('PHOTO_CLEANUP_DATABASE_URL must use the restricted photo-maintenance connection')
  } else if (cleanupUrl.username === runtimeUrl?.username || ['postgres', 'supabase_admin', 'service_role'].includes(cleanupUrl.username)) {
    issues.push('PHOTO_CLEANUP_DATABASE_URL must use a distinct non-admin role')
  }

  const origins = (env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean)
  if (!origins.length || origins.includes('*') || origins.some((origin) => {
    const url = parseUrl(origin)
    return !url || url.protocol !== 'https:' || url.origin !== origin || ['localhost', '127.0.0.1'].includes(url.hostname)
  })) {
    issues.push('CORS_ORIGINS must contain only explicit HTTPS production origins')
  }
  if (env.PUBLIC_HTTPS !== 'true') issues.push('PUBLIC_HTTPS must be "true" for the HTTPS production deployment')

  return issues
}

export function assertProductionConfig(env = process.env) {
  const issues = productionConfigIssues(env)
  if (issues.length) throw new Error(`Production server configuration is incomplete:\n- ${issues.join('\n- ')}`)
}
