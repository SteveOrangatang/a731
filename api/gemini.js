/**
 * Vercel serverless function entry point. Thin wrapper around the shared
 * proxy logic in api/_geminiProxy.js.
 *
 * URL: /api/gemini
 *
 * Environment variables required (set in Vercel project settings):
 *   FIREBASE_SERVICE_ACCOUNT_JSON  Service account JSON (entire contents).
 *   FIREBASE_PROJECT_ID            Optional override; otherwise pulled from
 *                                  the service account's project_id.
 *   GEMINI_API_KEY                 Fallback key used when Firestore has no
 *                                  admin-configured key. Optional but
 *                                  recommended for the bootstrap window.
 *   APP_ID                         Optional. Defaults to "a731-simulator".
 */
import { handleGeminiRequest } from './_geminiProxy.js';

export default async function handler(req, res) {
  const result = await handleGeminiRequest({
    method: req.method,
    body: req.body,
  });
  res.status(result.status).json(result.body);
}
