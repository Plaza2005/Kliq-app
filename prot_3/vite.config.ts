import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

const BACKEND = 'http://localhost:4000'

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    basicSsl(),
  ],
  server: {
    host: true,   // expose to LAN so phones can connect
    https: true,  // self-signed cert — accept the browser warning once on the phone
    proxy: {
      // All backend routes proxied through Vite so the phone never touches
      // the plain-HTTP backend directly (avoids mixed-content blocks).
      '/auth':          { target: BACKEND, changeOrigin: true },
      '/posts':         { target: BACKEND, changeOrigin: true },
      '/users':         { target: BACKEND, changeOrigin: true },
      '/upload':        { target: BACKEND, changeOrigin: true },
      '/uploads':       { target: BACKEND, changeOrigin: true },
      '/live':          { target: BACKEND, changeOrigin: true },
      '/notifications': { target: BACKEND, changeOrigin: true },
      '/messages':      { target: BACKEND, changeOrigin: true },
      '/search':        { target: BACKEND, changeOrigin: true },
      '/analytics':     { target: BACKEND, changeOrigin: true },
      '/communities':   { target: BACKEND, changeOrigin: true },
      '/wallet':        { target: BACKEND, changeOrigin: true },
      '/amplify':       { target: BACKEND, changeOrigin: true },
      '/stories':       { target: BACKEND, changeOrigin: true },
      '/kliqstream':    { target: BACKEND, changeOrigin: true },
      '/sessions':      { target: BACKEND, changeOrigin: true },
      '/blocks':        { target: BACKEND, changeOrigin: true },
      '/bookmarks':     { target: BACKEND, changeOrigin: true },
      '/hashtags':      { target: BACKEND, changeOrigin: true },
      '/sounds':        { target: BACKEND, changeOrigin: true },
      '/polls':         { target: BACKEND, changeOrigin: true },
      '/groups':        { target: BACKEND, changeOrigin: true },
      '/admin':         { target: BACKEND, changeOrigin: true },
      '/region':        { target: BACKEND, changeOrigin: true },
      '/media':         { target: BACKEND, changeOrigin: true },
      '/health':        { target: BACKEND, changeOrigin: true },
      '/ws':            { target: 'ws://localhost:4000', ws: true, changeOrigin: true },
    },
  },
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
