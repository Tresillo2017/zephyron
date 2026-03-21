import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from "@cloudflare/vite-plugin"
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __TURNSTILE_SITE_KEY__: JSON.stringify(process.env.TURNSTILE_SITE_KEY || ''),
  },
})