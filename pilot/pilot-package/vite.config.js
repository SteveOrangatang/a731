import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    // When developing locally against a deployed Foundry environment, set
    // VITE_FOUNDRY_PROXY to your stack hostname so REST function calls hit
    // the right place. Inside the deployed Pilot/OSDK app these calls go
    // straight to relative paths and SSO carries auth automatically.
    proxy: process.env.VITE_FOUNDRY_PROXY
      ? {
          '/functions': {
            target: process.env.VITE_FOUNDRY_PROXY,
            changeOrigin: true,
            secure: true,
          },
        }
      : undefined,
  },
});
