import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Change 'hotel-tracker' to your actual GitHub repo name
export default defineConfig({
  plugins: [react()],
  base: '/hotel-tracker/',
})
