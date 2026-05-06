/**
 * Constants for the Pilot stripped-down build.
 *
 * Provide a Gemini API key by creating `pilot/.env.local`:
 *   VITE_GEMINI_API_KEY=your_key_here
 * (Optional)
 *   VITE_GEMINI_MODEL=gemini-2.0-flash
 *   VITE_ADMIN_PASSCODE=letmein
 *
 * If no key is set, the chat panel returns a stub message so the rest of the
 * UI is still walkable.
 */
export const GEMINI_API_KEY =
  import.meta.env.VITE_GEMINI_API_KEY || '';

export const GEMINI_MODEL =
  import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash';

export const ADMIN_PASSCODE =
  import.meta.env.VITE_ADMIN_PASSCODE || 'pilot';
