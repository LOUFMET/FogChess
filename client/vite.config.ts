import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    fs: {
      // The project lives inside a .git worktree folder which Vite blocks by default.
      // Disable strict mode and remove the .git deny rule to allow serving from here.
      strict: false,
      deny: ['.env', '.env.*', '*.{crt,pem}'],
    },
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
