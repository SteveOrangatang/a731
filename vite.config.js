import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Mirror /api/gemini into the dev server so `npm run dev` works end-to-end
 * without needing `vercel dev`. Loads the same handler the Vercel function
 * uses (api/_geminiProxy.js) and wires it as a middleware.
 *
 * Reads env vars from .env, .env.local, etc. via Vite's loadEnv helper, then
 * promotes the relevant ones to process.env so the proxy sees them. Vite
 * doesn't normally promote non-VITE_ vars to process.env, so we do it
 * explicitly.
 */
function geminiDevProxy() {
  return {
    name: 'gemini-dev-proxy',
    configResolved(config) {
      const env = loadEnv(config.mode, process.cwd(), '');
      for (const k of [
        'FIREBASE_SERVICE_ACCOUNT_JSON',
        'FIREBASE_PROJECT_ID',
        'GEMINI_API_KEY',
        'APP_ID',
      ]) {
        if (env[k] && !process.env[k]) {
          process.env[k] = env[k];
        }
      }
      // Also promote VITE_FIREBASE_PROJECT_ID -> FIREBASE_PROJECT_ID if the
      // un-prefixed one isn't set, since the existing .env uses VITE_ names.
      if (
        !process.env.FIREBASE_PROJECT_ID &&
        env.VITE_FIREBASE_PROJECT_ID
      ) {
        process.env.FIREBASE_PROJECT_ID = env.VITE_FIREBASE_PROJECT_ID;
      }
      // Same for app id.
      if (!process.env.APP_ID && env.VITE_APP_ID) {
        process.env.APP_ID = env.VITE_APP_ID;
      }
    },
    configureServer(server) {
      server.middlewares.use('/api/gemini', async (req, res) => {
        // Lazy import so a missing firebase-admin dep doesn't break the dev
        // server until /api/gemini is actually requested.
        try {
          const mod = await import('./api/_geminiProxy.js');
          await mod.viteMiddleware(req, res);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: `Dev proxy failed: ${err.message}. Did you run "npm install" after pulling? The proxy requires firebase-admin.`,
            }),
          );
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), geminiDevProxy()],
});
