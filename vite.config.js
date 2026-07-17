import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vite configuration for Beyscore X frontend SPA.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
  },
});
