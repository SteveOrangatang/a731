/**
 * Parsing helpers for text that comes back from the model.
 *
 * These are deliberately pure and dependency-free: the grading and analysis
 * calls both ask Gemini for "strictly valid JSON, no code fences" and both
 * have to cope with the model ignoring that instruction some fraction of the
 * time. Keeping the recovery logic in one place means both call sites behave
 * identically and the behavior can be tested without a network round-trip.
 */

/** Opening fence of a markdown code block, with an optional language tag. */
const FENCE_BLOCK = /```[a-zA-Z0-9_-]*[ \t]*\r?\n?([\s\S]*?)```/;

/**
 * Return the contents of the first markdown code block that looks like it
 * holds JSON. If the text has no such block, the text is returned unchanged.
 */
export function stripCodeFences(text) {
  const raw = typeof text === 'string' ? text : '';
  const match = raw.match(FENCE_BLOCK);
  if (match && match[1].includes('{')) return match[1];
  return raw;
}

/**
 * Scan out the first balanced `{...}` object in a string, ignoring braces
 * that appear inside JSON string literals.
 *
 * A greedy `/\{[\s\S]*\}/` match is wrong here: it runs to the last closing
 * brace in the whole response, so any trailing commentary containing a `}`
 * swallows the object it was supposed to isolate. Returns null when there is
 * no opening brace or the object never closes.
 */
export function extractJsonObject(text) {
  const raw = typeof text === 'string' ? text : '';
  const start = raw.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }

  return null;
}

/**
 * Parse a JSON object out of a model response.
 *
 * Tries, in order: the response as-is, the response with markdown fences
 * removed, and the first balanced object embedded in it. Throws if none of
 * those yield valid JSON.
 *
 * @param {string} text  Raw text from the model.
 * @returns {Object}     The parsed object.
 */
export function parseModelJson(text) {
  const raw = typeof text === 'string' ? text : '';
  const candidates = [raw.trim(), stripCodeFences(raw).trim()];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (err) {
      /* fall through to the next strategy */
    }
  }

  const embedded = extractJsonObject(stripCodeFences(raw));
  if (embedded) {
    try {
      return JSON.parse(embedded);
    } catch (err) {
      /* fall through to the throw */
    }
  }

  throw new Error('Model returned unparseable output.');
}

/**
 * Pull a retry delay out of a Gemini rate-limit error message.
 *
 * Google's 429 bodies carry a human-readable "... retry in 12.5s ..." hint.
 * When it's missing we fall back to a conservative fixed window so a model
 * that just got rate-limited isn't hammered again immediately.
 *
 * @param {string} errMsg  The upstream error message.
 * @returns {number}       Milliseconds to hold this model out of rotation.
 */
export function parseRetryAfterMs(errMsg) {
  if (!errMsg) return 30_000;
  const m = String(errMsg).match(/retry in (\d+(?:\.\d+)?)\s*s/i);
  if (m) return Math.ceil(parseFloat(m[1]) * 1000) + 500;
  return 60_000;
}
