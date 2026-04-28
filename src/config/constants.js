export const SUPER_ADMIN_PASSCODE =
  import.meta.env.VITE_SUPER_ADMIN_PASSCODE || 'CPTAMERICA';

/**
 * One or more Gemini API keys. Two ways to configure:
 *   VITE_GEMINI_API_KEYS=key1,key2,key3   (comma-separated, preferred for class use)
 *   VITE_GEMINI_API_KEY=key1              (single key, legacy)
 *
 * Each key has its own independent free-tier quota on Google's side
 * (per Google account). Pooling keys across instructors/TAs is the easiest
 * way to scale free-tier capacity for a class of 16+ students.
 */
export const GEMINI_API_KEYS = (
  import.meta.env.VITE_GEMINI_API_KEYS ||
  import.meta.env.VITE_GEMINI_API_KEY ||
  ''
)
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);

/** First key, kept for backward compat with code that expects a single key. */
export const GEMINI_API_KEY = GEMINI_API_KEYS[0] || '';

export const GEMINI_MODEL =
  import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash';

/**
 * Ordered list of Gemini models to use as fallbacks when the primary model
 * returns a 429 quota error. Each model has its own free-tier quota bucket
 * on the Google AI side, so rotating through them roughly multiplies your
 * effective requests-per-minute by the number of models.
 *
 * Order matters: the primary model (GEMINI_MODEL) is tried first, then the
 * rotation list. Override via VITE_GEMINI_FALLBACK_MODELS as a comma-
 * separated list if you want a custom rotation.
 */
// Conservative defaults: 2.5-family models which most accounts still have
// free-tier access to. Override with VITE_GEMINI_FALLBACK_MODELS for a custom
// list (recommended after running the "Test Gemini rotation" diagnostic in
// the admin dashboard to see which models your specific API key supports).
const FALLBACK_DEFAULT = 'gemini-2.5-flash-lite,gemini-2.5-pro';
export const GEMINI_FALLBACK_MODELS = (
  import.meta.env.VITE_GEMINI_FALLBACK_MODELS || FALLBACK_DEFAULT
)
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

/** Build the canonical model rotation: primary first, fallbacks after, no duplicates. */
export function modelRotation() {
  const seen = new Set();
  const out = [];
  for (const m of [GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS]) {
    if (m && !seen.has(m)) {
      seen.add(m);
      out.push(m);
    }
  }
  return out;
}
