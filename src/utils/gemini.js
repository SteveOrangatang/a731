import { GEMINI_API_KEY, GEMINI_API_KEYS, modelRotation } from '../config/constants';

/**
 * In-memory map of (apiKey:model) pairs currently rate-limited and the
 * timestamp at which they should be available again. Each (key, model) pair
 * is tracked independently because each Google account has its own quota
 * bucket per model. Survives across calls within the same browser tab.
 */
const _rateLimitedUntil = new Map(); // "key:model" -> ms timestamp

const limitKey = (apiKey, model) => `${apiKey.slice(0, 8)}:${model}`;

/**
 * Parse the "retry in X seconds" hint from Gemini's 429 error body and
 * fall back to a sane default if it isn't present.
 */
function parseRetryAfterMs(errMsg) {
  if (!errMsg) return 30_000;
  const m = errMsg.match(/retry in (\d+(?:\.\d+)?)\s*s/i);
  if (m) return Math.ceil(parseFloat(m[1]) * 1000) + 500; // small buffer
  // Default: assume the per-minute window
  return 60_000;
}

/**
 * Make a single Gemini call with model fallback. Iterates the rotation list,
 * skipping any model whose rate-limit window has not yet expired. On 429,
 * marks the offending model and tries the next one. Throws only if every
 * model is exhausted and the soonest-available is more than a minute away.
 */
async function callGeminiWithFallback(body, { prefer } = {}) {
  if (!GEMINI_API_KEYS.length) {
    throw new Error('No Gemini API key configured.');
  }

  // Build the candidate list: optional preferred model first, then the
  // standard rotation, deduplicated.
  const rotation = modelRotation();
  const models = prefer ? [prefer, ...rotation.filter((m) => m !== prefer)] : rotation;

  // Iterate every (key, model) pair. Each pair has its own quota bucket on
  // Google's side, so this is the real lever for free-tier capacity.
  const candidates = [];
  for (const model of models) {
    for (const apiKey of GEMINI_API_KEYS) {
      candidates.push({ apiKey, model });
    }
  }

  const errors = [];
  const now = () => Date.now();

  for (const { apiKey, model } of candidates) {
    const lk = limitKey(apiKey, model);
    const blockedUntil = _rateLimitedUntil.get(lk) || 0;
    if (blockedUntil > now()) continue;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Per-request timeout so a single hung request can't stall the rotation.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25_000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        return { data: await res.json(), model, apiKey };
      }

      const errData = await res.json().catch(() => null);
      const errMsg = errData?.error?.message || `HTTP ${res.status}`;

      if (res.status === 429 || /quota|rate/i.test(errMsg)) {
        const retryMs = parseRetryAfterMs(errMsg);
        _rateLimitedUntil.set(lk, now() + retryMs);
        // eslint-disable-next-line no-console
        console.warn(`[gemini] ${lk} rate-limited, retry in ${retryMs}ms; trying next pair`);
        errors.push({ pair: lk, status: res.status, errMsg });
        continue;
      }

      if (res.status === 404) {
        errors.push({ pair: lk, status: 404, errMsg });
        continue;
      }

      // eslint-disable-next-line no-console
      console.warn(`[gemini] ${lk} error ${res.status}: ${errMsg}`);
      errors.push({ pair: lk, status: res.status, errMsg });
      continue;
    } catch (networkErr) {
      clearTimeout(timer);
      // eslint-disable-next-line no-console
      console.warn(`[gemini] ${lk} network error: ${networkErr.message}`);
      errors.push({ pair: lk, status: 'network', errMsg: networkErr.message });
      continue;
    }
  }

  // Every candidate failed. If something will recover soon, wait for it.
  const soonest = Math.min(
    ...Array.from(_rateLimitedUntil.values()).filter((t) => t > now()),
  );
  if (Number.isFinite(soonest) && soonest - now() < 60_000) {
    const wait = Math.max(soonest - now(), 0) + 250;
    await new Promise((r) => setTimeout(r, wait));
    for (const { apiKey, model } of candidates) {
      const lk = limitKey(apiKey, model);
      if ((_rateLimitedUntil.get(lk) || 0) > now()) continue;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) return { data: await res.json(), model, apiKey };
      } catch (_) {}
    }
  }

  const detail = errors
    .map((e) => `${e.pair}: ${e.status} ${(e.errMsg || '').slice(0, 80)}`)
    .join(' | ');
  throw new Error(`All Gemini key/model pairs exhausted. ${detail}`);
}

/**
 * Call the Gemini generative-language API with conversation history.
 *
 * @param {string}   userMessage     The latest student message.
 * @param {Array}    currentMessages All messages so far (including the new one).
 * @param {Object}   agent           The selected persona object.
 * @param {string}   studentRank     e.g. "MAJ"
 * @param {string}   studentName     e.g. "Smith"
 * @param {Object}   [lesson]        Optional lesson record for context injection.
 * @param {Object}   [options]       { mode: 'intake' | 'briefback' } for leaders.
 * @returns {Promise<string>}        The model's reply text.
 */
/**
 * Diagnostic: ping every model in the rotation with a one-token prompt
 * and report status (ok / 404 / 429 / 403 / network / etc.) per model.
 *
 * Useful for verifying which fallbacks your API key actually has access to,
 * and for spot-checking quota state before a class session.
 */
export async function testModelRotation() {
  if (!GEMINI_API_KEYS.length) {
    return [{ model: '(no key)', keyIndex: -1, status: 'error', detail: 'No VITE_GEMINI_API_KEY(S) set' }];
  }
  const models = modelRotation();
  const tinyBody = {
    contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
    generationConfig: { maxOutputTokens: 1, temperature: 0 },
  };

  const pairs = [];
  for (const model of models) {
    for (let i = 0; i < GEMINI_API_KEYS.length; i++) {
      pairs.push({ apiKey: GEMINI_API_KEYS[i], keyIndex: i + 1, model });
    }
  }

  const results = await Promise.all(
    pairs.map(async ({ apiKey, keyIndex, model }) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12_000);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tinyBody),
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          return { model, keyIndex, status: 'ok', detail: 'available' };
        }
        const errData = await res.json().catch(() => null);
        const errMsg = errData?.error?.message || `HTTP ${res.status}`;
        if (res.status === 429 || /quota|rate/i.test(errMsg)) {
          return { model, keyIndex, status: 'rate-limited', detail: errMsg };
        }
        if (res.status === 404) {
          return { model, keyIndex, status: 'not-found', detail: 'model not available on this key' };
        }
        if (res.status === 403) {
          return { model, keyIndex, status: 'forbidden', detail: errMsg };
        }
        return { model, keyIndex, status: 'error', detail: `HTTP ${res.status}: ${errMsg}` };
      } catch (err) {
        clearTimeout(timer);
        return { model, keyIndex, status: 'network', detail: err.message };
      }
    }),
  );
  return results;
}

export async function generateAIResponse(
  userMessage,
  currentMessages,
  agent,
  studentRank,
  studentName,
  lesson,
  options = {},
) {
  if (!GEMINI_API_KEY) {
    return '[No Gemini API key configured. Add VITE_GEMINI_API_KEY to your .env.local file.]';
  }

  // Count how many user turns have occurred (to gauge whether we're ready to resolve).
  const userTurns = currentMessages.filter((m) => m.role === 'user').length;
  const minTurns = Number(agent.minTurns) || 6;
  const turnsRemaining = Math.max(0, minTurns - userTurns);

  // Briefback mode kicks in only when the leader is engaged after the
  // subordinate phase. Drives a small directive override.
  const briefback =
    agent.role === 'leader' &&
    options.mode === 'briefback' &&
    agent.conversationGuide?.briefback;
  const directive = briefback
    ? agent.conversationGuide?.briefback?.behavior || agent.directive
    : agent.directive;

  // Compact lesson block: title + aiContext only. The persona's directive
  // already encodes the archetype-specific behavior, so we don't need to
  // restate the full lesson description here.
  const lessonBlock = lesson
    ? `Scenario: ${lesson.title || ''}${lesson.aiContext ? ` — ${lesson.aiContext}` : ''}`
    : '';

  // Subordinate-opening discipline: short and to the point. Avoids the
  // bloated multi-paragraph version that was driving tokens up.
  const subordinateRule =
    agent.role === 'subordinate'
      ? `Important: do NOT volunteer your archetype's preferred recommendation on turn 1. Acknowledge the student, ask what they need, and only reveal your disposition after they explicitly ask for your read or opinion.`
      : '';

  // Leader resolution rule: leaders must COMMIT to a path once the student
  // has substantively answered their concerns. Without this, the model loops
  // forever inventing new objections. SKIPPED in 'hard' mode so the leader
  // resists indefinitely (the original behavior, useful for advanced students).
  const isHard = options.difficulty === 'hard';
  const leaderRule =
    agent.role === 'leader' && !isHard
      ? `Important: by turn ${minTurns + 1} at the latest, you MUST commit to a path. If the student has answered your major concerns (funding, risk, timeline, alternatives), accept their plan and stop pushing back. If they refuse without offering a real alternative, get cold and dismiss them. Do not invent new objections in an endless loop. Reasonable senior leaders commit and move on.`
      : agent.role === 'leader' && isHard
      ? `Hard mode: this is an advanced student. Be relentless. Keep finding new angles to push back on. Do not capitulate easily even after the student answers your concerns; hold the line and force them to truly earn the resolution. Only commit if they clearly establish moral authority through repeated, substantive engagement.`
      : '';

  const briefbackRule = briefback
    ? `Brief-back mode: the student has spoken with the subordinates and is now briefing their recommendation. Interrogate it briefly, then commit to accepting or rejecting it. Do not loop.`
    : '';

  const systemPrompt = `You are participating in an ethical decision-making simulation for field-grade officer PME at CGSC. Adopt this persona completely and never break character.

Rank and Name: ${agent.rank} ${agent.name}
Directive: ${directive}
Backstory: ${agent.backstory}
${lessonBlock ? `\n${lessonBlock}` : ''}

The student is ${studentRank} ${studentName}.
${briefbackRule ? `\n${briefbackRule}` : ''}
${leaderRule ? `\n${leaderRule}` : ''}
${subordinateRule ? `\n${subordinateRule}` : ''}

Pacing: target at least ${minTurns} student turns before you resolve. Current turn count: ${userTurns}. Resist easy answers, ask probing follow-ups, push back in character. Don't concede or walk away early.

Style: one short paragraph per reply. Professional military chat. No bullet lists. Stay in character.`;

  // Build history — exclude the synthetic opening-message marker
  const history = currentMessages
    .filter((m) => m.id !== 'opening')
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

  // If agent initiates, inject the opening as the first model turn
  if (
    agent.initiates &&
    agent.openingMessage &&
    currentMessages.find((m) => m.id === 'opening')
  ) {
    history.unshift({
      role: 'model',
      parts: [{ text: agent.openingMessage }],
    });
  }

  // Note: the user message is already in currentMessages — don't double-push.
  // But if the caller hasn't included it yet, push it.
  if (history[history.length - 1]?.role !== 'user') {
    history.push({ role: 'user', parts: [{ text: userMessage }] });
  }

  try {
    const { data, model } = await callGeminiWithFallback({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: history,
    });
    if (model && model !== modelRotation()[0]) {
      // eslint-disable-next-line no-console
      console.info(`[gemini] used fallback model: ${model}`);
    }
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'No response generated.'
    );
  } catch (err) {
    return `[Connection error: ${err.message}]`;
  }
}

/**
 * Ask Gemini to produce a structured grade.
 *
 * @param {Object} params
 * @param {Array}  params.messages     Full chat transcript
 * @param {string} params.paperText    The student's submitted paper
 * @param {string} params.rubricText   Extracted text of the rubric
 * @param {Object} params.studentMeta  { rank, lastName, email, lessonTitle }
 * @param {Object} [params.lesson]     Optional lesson record for grader context.
 * @returns {Promise<Object>}          { summary, comparison, criteria: [{ name, description, maxScore, score, rationale }], totalScore, maxTotal, overallComments }
 */
export async function generateGrade({
  messages,
  paperText,
  rubricText,
  studentMeta,
  lesson,
}) {
  if (!GEMINI_API_KEY) {
    throw new Error('No Gemini API key configured.');
  }

  const transcript = (messages || [])
    .filter((m) => m.id !== 'opening' || m.text)
    .map((m) => {
      const who = m.role === 'user'
        ? `${studentMeta.rank || ''} ${studentMeta.lastName || 'Student'}`.trim()
        : 'Interlocutor';
      return `${who}: ${m.text}`;
    })
    .join('\n\n');

  const systemPrompt = `You are an expert military instructor grading an ethical decision-making simulation.
You will be given:
  1. The full transcript history for one scenario (one or more conversations the student had with the
     leader and four subordinate archetypes).
  2. A short summary / recommendation paper the student wrote.
  3. A rubric from the instructor (may be implicit if no rubric is provided).
  4. Scenario context including the four decision-tree paths and their severity.

Do the following and return ONLY a single valid JSON object with these keys:

  "summary":       2-4 sentence neutral summary of the conversation across all personas.
  "comparison":    3-5 sentence analysis of how accurately the student's paper reflects the
                   conversations. Call out omissions or misrepresentations.
  "pathLabel":     One of "Path A" / "Path B" / "Path C" / "Path D" — which decision-tree path
                   does the student's actual behavior most closely match?
  "severity":      One of "Catastrophic" / "Severe" / "Suboptimal" / "Acceptable" / "Optimal".
                   Use the scenario context to pick the closest severity for the chosen path.
  "pathConfidence": 0.0 to 1.0 — how confident are you in the path mapping?
  "pathNarrative": 3-5 sentence explanation of why this path was chosen, what the student did
                   well, and what they missed.
  "criteria":      an array of rubric items. For each item in the rubric (or, if no rubric was
                   provided, four standard ethical-decision-making criteria: Moral Courage,
                   Followership Selection, Recommendation Framing, Career Stewardship),
                   output { "name": "...", "description": "...", "maxScore": <number>,
                            "score": <number>, "rationale": "1-2 sentences explaining the score" }.
                   Default to 5 points per item.
  "totalScore":    sum of "score" across criteria.
  "maxTotal":      sum of "maxScore" across criteria.
  "overallComments": 3-5 sentence holistic evaluation tying the conversations, paper, and outcome together.

Output strictly valid JSON — no markdown code fences, no commentary.`;

  const lessonBlock = lesson
    ? `=========== LESSON CONTEXT ===========
Title: ${lesson.title || studentMeta.lessonTitle || ''}
${lesson.description ? `Description: ${lesson.description}\n` : ''}${lesson.objectives ? `Objectives:\n${lesson.objectives}\n` : ''}${lesson.studentInstructions ? `Student instructions:\n${lesson.studentInstructions}\n` : ''}${lesson.aiContext ? `Additional grader context:\n${lesson.aiContext}\n` : ''}`
    : '';

  const userPrompt = `STUDENT: ${studentMeta.rank || ''} ${studentMeta.lastName || ''} (${studentMeta.email || ''})
LESSON: ${lesson?.title || studentMeta.lessonTitle || ''}

${lessonBlock}
=========== RUBRIC ===========
${rubricText || '(no rubric provided — use general military leadership standards)'}

=========== CONVERSATION TRANSCRIPT ===========
${transcript || '(no transcript)'}

=========== STUDENT PAPER ===========
${paperText || '(no paper submitted)'}`;

  const { data } = await callGeminiWithFallback({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3,
    },
  });
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  try {
    return JSON.parse(text);
  } catch (err) {
    // Try to extract JSON from code fences if model ignored response format.
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Model returned unparseable output.');
  }
}
