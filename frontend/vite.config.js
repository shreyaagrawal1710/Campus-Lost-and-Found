import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Forwards /api calls to the Express backend (Person 2). Change the port if theirs differs.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:5000' } },
});
