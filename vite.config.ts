import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from "@cloudflare/vite-plugin"
import pkg from './package.json' with { type: 'json' }

// Stub plugin for optional dependencies that don't exist in the Cloudflare
// Workers runtime (e.g. @opentelemetry/api imported by better-auth).
// Using `external` would leave the import unresolved inside the Worker bundle
// and cause a validation error at deploy time.
function stubPlugin(moduleId: string) {
  const resolvedId = `\0stub:${moduleId}`
  return {
    name: `stub:${moduleId}`,
    resolveId(id: string) {
      if (id === moduleId) return resolvedId
    },
    load(id: string) {
      if (id === resolvedId) return 'export default {}; export const context = {};'
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cloudflare(),
    stubPlugin('@opentelemetry/api'),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __TURNSTILE_SITE_KEY__: JSON.stringify(process.env.TURNSTILE_SITE_KEY || ''),
  },
})
