import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { validateBasePath, validateProductionClientEnv } from './buildConfig.js'

function contentSecurityPolicyPlugin(directives) {
  return {
    name: 'roomy-production-content-security-policy',
    transformIndexHtml(html) {
      return {
        html,
        tags: [{
          tag: 'meta',
          attrs: {
            'http-equiv': 'Content-Security-Policy',
            content: directives,
          },
          injectTo: 'head-prepend',
        }],
      }
    },
  }
}

// VITE_BASE_PATH is set by the Pages workflow to "/<repository-name>/", because
// a GitHub project page is served from a subfolder, not the root of the domain.
// Everywhere else (local dev, Vercel, Netlify, a custom domain) the root is
// correct, so the default is "/". Page 7 of content/extending-your-app explains
// what goes wrong without this: a blank white page and 404s on every asset.
export default defineConfig(({ command, mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  const demoBuild = command === 'build' && mode === 'demo'

  if (command === 'build' && !demoBuild) validateProductionClientEnv(env)

  const connectSources = ["'self'"]
  if (!demoBuild && command === 'build') {
    connectSources.push(new URL(env.VITE_API_BASE_URL).origin, new URL(env.VITE_SUPABASE_URL).origin)
  }
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    `connect-src ${connectSources.join(' ')}`,
  ].join('; ')

  return {
    plugins: [react(), tailwindcss(), ...(command === 'build' ? [contentSecurityPolicyPlugin(csp)] : [])],
    base: validateBasePath(env.VITE_BASE_PATH),
    ...(demoBuild && {
      define: { 'import.meta.env.VITE_USE_MOCK_API': JSON.stringify('true') },
    }),
    server: {
      // Only used by `npm run dev`. It is NOT part of the production build, which
      // is why the deployed site needs CORS and this does not. See page 8.
      proxy: {
        '/api': 'http://localhost:3000',
      },
    },
  }
})
