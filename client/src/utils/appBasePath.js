const configuredBasePath = import.meta.env?.BASE_URL || '/'

export function fromPublicPath(pathname, basePath = configuredBasePath) {
  const path = pathname || '/'
  if (basePath === '/') return path
  const prefix = basePath.endsWith('/') ? basePath : `${basePath}/`
  if (path === prefix.slice(0, -1) || path === prefix) return '/'
  if (!path.startsWith(prefix)) return '/'
  return `/${path.slice(prefix.length)}`
}

export function toPublicPath(pathname, basePath = configuredBasePath) {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  if (basePath === '/') return path
  return `${basePath.replace(/\/$/, '')}${path}`
}

export function publicAssetPath(assetPath, basePath = configuredBasePath) {
  return `${basePath.replace(/\/$/, '')}/${assetPath.replace(/^\//, '')}`
}
