/**
 * Server-side Gemini proxy. Used by both the Vercel serverless function
 * (api/gemini.js) and the local Vite dev middleware (configured in
 * vite.config.js). Keeps the Gemini API key off the browser.
 *
 * Key resolution order:
 *   1. Firestore document settings/apiKeys.geminiApiKey (admin-controllable
 *      from inside the app's admin portal — Option C in the design notes).
 *   2. process.env.GEMINI_API_KEY — fallback so the proxy works before an
 *      admin has configured a key in the UI, and also as a "break glass"
 *      override during cohorts.
 *
 * Service-account credential is read from FIREBASE_SERVICE_ACCOUNT_JSON
 * (the entire downloaded JSON, stringified). FIREBASE_PROJECT_ID falls
 * back to VITE_FIREBASE_PROJECT_ID if the un-prefixed one isn't set
 * (helpful in local dev where you might only have the VITE_ vars defined).
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const APP_ID = process.env.APP_ID || process.env.VITE_APP_ID || 'a731-simulator';

let _adminApp = null;
let _firestoreError = null;

/**
 * Lazily initialize the Firebase Admin SDK. Returns null if no service
 * account credential is configured (and surfaces the reason via _firestoreError
 * so the caller can include it in error messages for debugging).
 */
function getAdminApp() {
  if (_adminApp) return _adminApp;
  if (getApps().length > 0) {
    _adminApp = getApps()[0];
    return _adminApp;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    null;
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!sa) {
    _firestoreError =
      'FIREBASE_SERVICE_ACCOUNT_JSON not set. The proxy can still forward calls if GEMINI_API_KEY is configured, but admin-controlled keys from Firestore will not work.';
    return null;
  }

  try {
    const credential = JSON.parse(sa);
    _adminApp = initializeApp({
      credential: cert(credential),
      projectId: projectId || credential.project_id,
    });
    return _adminApp;
  } catch (err) {
    _firestoreError = `Failed to initialize Firebase Admin: ${err.message}`;
    return null;
  }
}

/**
 * Read the admin-configured Gemini key from Firestore. Returns null if
 * Firestore can't be reached or the doc/field doesn't exist. Never throws.
 */
async function readKeyFromFirestore() {
  const app = getAdminApp();
  if (!app) return null;
  try {
    const db = getFirestore(app);
    const snap = await db
      .doc(`artifacts/${APP_ID}/public/data/settings/apiKeys`)
      .get();
    if (!snap.exists) return null;
    const data = snap.data() || {};
    const key = (data.geminiApiKey || '').trim();
    return key || null;
  } catch (err) {
    _firestoreError = `Firestore read failed: ${err.message}`;
    return null;
  }
}

/**
 * Resolve the Gemini API key to use for this request, in priority order.
 */
async function resolveApiKey() {
  const fromFirestore = await readKeyFromFirestore();
  if (fromFirestore) return { key: fromFirestore, source: 'firestore' };

  const fromEnv = (process.env.GEMINI_API_KEY || '').trim();
  if (fromEnv) return { key: fromEnv, source: 'env' };

  return {
    key: null,
    source: 'none',
    detail:
      _firestoreError ||
      'No Gemini API key configured. Set settings/apiKeys.geminiApiKey from the admin portal, or set GEMINI_API_KEY in the deployment environment.',
  };
}

/**
 * Read the JSON body from a Node request stream. Used by the Vite dev
 * middleware path; Vercel parses JSON automatically and exposes it as
 * `req.body`.
 */
async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON body: ${err.message}`);
  }
}

/**
 * Core handler. Forwards a chat-completion request to the Gemini REST API
 * using the resolved key. Accepts the same body shape the upstream Gemini
 * generateContent endpoint accepts (systemInstruction, contents,
 * generationConfig, etc.) plus an optional `model` field overriding the
 * default rotation entry.
 *
 * Returns a flat status + JSON body. The caller adapts to its host's
 * response convention (Vercel `res.status().json(...)` vs Node http
 * `res.writeHead(...).end(...)`).
 */
export async function handleGeminiRequest({ method, body }) {
  if (method !== 'POST') {
    return { status: 405, body: { error: 'Method not allowed' } };
  }

  const payload = body || {};
  const model = payload.model || 'gemini-2.5-flash';

  if (!payload.contents) {
    return {
      status: 400,
      body: { error: 'Request body must include `contents`.' },
    };
  }

  const { key, source, detail } = await resolveApiKey();
  if (!key) {
    return { status: 503, body: { error: detail || 'No API key' } };
  }

  // Strip our own meta fields before forwarding
  const upstreamBody = { ...payload };
  delete upstreamBody.model;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  let upstreamRes;
  try {
    upstreamRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(upstreamBody),
    });
  } catch (err) {
    return {
      status: 502,
      body: { error: `Upstream fetch failed: ${err.message}` },
    };
  }

  const text = await upstreamRes.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch (err) {
    parsed = { rawText: text };
  }

  return {
    status: upstreamRes.status,
    body: {
      ...(parsed || {}),
      // Surface which source provided the key in successful responses for
      // debug visibility. Removed from error responses to avoid leaking it
      // when something is misconfigured.
      ...(upstreamRes.ok ? { _proxyKeySource: source, _proxyModel: model } : {}),
    },
  };
}

/**
 * Express/Connect-style middleware. Used by the Vite dev plugin so /api/gemini
 * works locally with `npm run dev`.
 */
export async function viteMiddleware(req, res) {
  try {
    const body = await readJsonBody(req);
    const result = await handleGeminiRequest({ method: req.method, body });
    res.statusCode = result.status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result.body));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message || 'Internal error' }));
  }
}
