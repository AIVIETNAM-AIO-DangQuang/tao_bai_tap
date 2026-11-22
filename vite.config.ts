import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { SITE_PAGES, sitePlugin } from './vite-plugin-site.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    base: './',
    plugins: [react(), tailwindcss(), sitePlugin(env)],
    build: {
      rollupOptions: {
        input: Object.fromEntries(
          SITE_PAGES.map((p) => [p.replace('.html', ''), fileURLToPath(new URL(p, import.meta.url))]),
        ),
      },
    },
  }
})
