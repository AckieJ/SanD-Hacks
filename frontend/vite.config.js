import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/workspaces': 'http://localhost:8000',
      '/papers': 'http://localhost:8000',
      '/edges': 'http://localhost:8000',
      '/health': 'http://localhost:8000'
    }
  }
})
