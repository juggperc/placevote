import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // Map NEXT_PUBLIC_ env vars (Vercel convention) to VITE_ (Vite convention)
    // This allows Vercel env vars like NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to work
    'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(
      process.env.VITE_CLERK_PUBLISHABLE_KEY || 
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 
      ''
    ),
  },
})