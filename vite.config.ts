import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from "@cloudflare/vite-plugin"

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
})