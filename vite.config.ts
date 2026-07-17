import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-vite',
    emptyOutDir: true,
    commonjsOptions: {
      include: [/node_modules/],
    },
    lib: {
      entry: resolve(__dirname, 'src/main.tsx'),
      name: 'KnockoutEmbed',
      formats: ['iife'],
      fileName: () => 'knockout-app.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        assetFileNames: (asset) => {
          if (asset.name?.endsWith('.css')) return 'knockout-style-raw.css'
          return 'assets/[name][extname]'
        },
      },
    },
    cssCodeSplit: false,
  },
})
