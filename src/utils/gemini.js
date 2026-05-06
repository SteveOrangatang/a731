import { modelRotation } from '../config/constants';

/**
 * Client-side Gemini wrapper. The actual API key never lives in the browser;
 * the request is forwarded through the server-side proxy at /api/gemini,
 * which resolves the key from Firestore (admin-controlled) or the deployment
 * environment.
 *
 * This file still owns model-rotation logic (gemini-2.5-flash → 2.5-flash-lite
 * → 2.5-pro on 429s) since model availability is per-key on Google's side and
 * the rotation hides that from callers.
 */

const PROXY_URL = '/api/gemini';

// Per-model rate-limit windows. We can't see the actual key any more, so we
// track this only at the model level — when a 429 comes back for one model
// we skip it for a while and try the next.
const _rateLimitedUntil = new Map(); // model -> ms timestamp

function parseRetryAfterMs(errMsg) {
  if (!errMsg) return 30_000;
  const m = errMsg.match(/retry in (\d+(?:\.\d+)?)\s*s/i);
  if (m) return Math.ceil(parseFloat(m[1]) * 1000) + 500;
  return 60_000;
}

async function postProxy(model, body) {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, ...body }),
  });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch (err) {
    parsed = { rawText: text };
  }
  return { status: res.status, ok: res.ok, data: parsed };
}

/**
 * Call the proxy, rotating through models on rate limits / failures.
 * Throws only if every model is exhausted with no near-term recovery.
 */
async function callGeminiWithFallback(body, { prefer } = {}) {
  const rotation = modelRotation();
  const models = prefer
    ? [prefer, ...rotation.filter((m) => m !== prefer)]
    : rotation;

  const errors = [];
  const now = () => Date.now();

  for (const model of models) {
    const blockedUntil = _rateLimitedUntil.get(model) || 0;
    if (blockedUntil > now()) continue;

    let res;
    try {
      res = await postProxy(model, body);
    } catch (networkErr) {
      errors.push({ model, status: 'network', errMsg: networkErr.message });
      continue;
    }

    if (res.ok) return { data: res.data, model };

    const errMsg =
      res.data?.error?.message || res.data?.error || `HTTP ${res.status}`;

    if (res.status === 429 || /quota|rate/i.test(String(errMsg))) {
      const retryMs = parseRetryAfterMs(String(errMsg));
      _rateLimitedUntil.set(model, now() + retryMs);
      errors.push({ model, status: res.status, errMsg });
      continue;
    }

    if (res.status === 404) {
      errors.push({ model, status: 404, errMsg });
      continue;
    }

    if (res.status === 503) {
      // No-key configured — short-circuit so the user sees this first
      throw new Error(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
    }

    errors.push({ model, status: res.status, errMsg });
  }

  // Wait for the soonest recovery if it's close.
  const soonest = Math.min(
    ...Array.from(_rateLimitedUntil.values()).filter((t) => t > now()),
  );
  if (Number.isFinite(soonest) && soonest - now() < 60_000) {
    const wait = Math.max(soonest - now(), 0) + 250;
    await new Promise((r) => setTimeout(r, wait));
    for (const model of models) {
      const blockedUntil = _rateLimitedUntil.get(model) || 0;
      if (blockedUntil > now()) continue;
      try {
        const res = await postProxy(model, body);
        if (res.ok) return { data: res.data, model };
      } catch (_) {}
    }
  }

  const detail = errors
    .map((e) => `${e.model}: ${e.status} ${(e.errMsg || '').toString().slice(0, 80)}`)
    .join(' | ');
  throw new Error(`All Gemini models exhausted. ${detail}`);
}

/**
 * Diagnostic: ping every model in the rotation and report status.
 * Used by the admin dashboard's "Test Gemini rotation" button. With the
 * proxy in place, the test goes through the proxy too, so a green result
 * also means the proxy + key resolution chain is healthy.
 */
export async function testModelRotation() {
  const models = modelRotation();
  const tinyBody = {
    contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
    generationConfig: { maxOutputTokens: 1, temperature: 0 },
  };

  const results = await Promise.all(
    models.map(async (model) => {
      try {
        const res = await postProxy(model, tinyBody);
        if (res.ok) {
          return { model, keyIndex: 1, status: 'ok', detail: 'available' };
        }
        const errMsg =
          res.data?.error?.message || res.data?.error || `HTTP ${res.status}`;
        if (res.status === 429 || /quota|rate/i.test(String(errMsg))) {
          return { model, keyIndex: 1, status: 'rate-limited', detail: String(errMsg) };
        }
        if (res.status === 404) {
          return {
            model,
            keyIndex: 1,
            status: 'not-found',
            detail: 'model not available on this key',
          };
        }
        if (res.status === 403) {
          return { model, keyIndex: 1, status: 'forbidden', detail: String(errMsg) };
        }
        if (res.status === 503) {
          return { model, keyIndex: 1, status: 'no-key', detail: String(errMsg) };
        }
        return {
          model,
          keyIndex: 1,
          status: 'error',
          detail: `HTTP ${res.status}: ${errMsg}`,
        };
      } catch (err) {
        return { model, keyIndex: 1, status: 'network', detail: err.message };
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
  const userTurns = currentMessages.filter((m) => m.role === 'user').length;
  const minTurns = Number(agent.minTurns) || 6;

  const briefback =
    agent.role === 'leader' &&
    options.mode === 'briefback' &&
    agent.conversationGuide?.briefback;
  const directive = briefback
    ? agent.conversationGuide?.briefback?.behavior || agent.directive
    : agent.directive;

  const lessonBlock = lesson
    ? `Scenario: ${lesson.title || ''}${lesson.aiContext ? ` — ${lesson.aiContext}` : ''}`
    : '';

  const subordinateRule =
    agent.role === 'subordinate'
      ? `Important: do NOT volunteer your archetype's preferred recommendation on turn 1. Acknowledge the student, ask what they need, and only reveal your disposition after they explicitly ask for your read or opinion.`
      : '';

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

  const history = currentMessages
    .filter((m) => m.id !== 'opening')
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

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

export async function generateGrade({
  messages,
  paperText,
  rubricText,
  studentMeta,
  lesson,
}) {
  const transcript = (messages || [])
    .filter((m) => m.id !== 'opening' || m.text)
    .map((m) => {
      const who =
        m.role === 'user'
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
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Model returned unparseable output.');
  }
}

/**
 * Student-facing scenario analysis. Looks at every transcript the student
 * had within one scenario and uses the lesson's `outcomeRubric` to project
 * the real-world outcome of their choices.
 *
 * @param {Object} params
 * @param {Array}  params.transcripts   All this student's transcripts for the scenario.
 * @param {Object} params.lesson        The lesson record (with outcomeRubric).
 * @param {Object} params.studentMeta   { rank, lastName }
 * @returns {Promise<Object>}           {
 *   pathLabel, severity, pathConfidence,
 *   summary,                            2-4 sentence overview
 *   personaInteractions: [              one entry per persona engaged
 *     { agentName, role, archetype, performance, observations }
 *   ],
 *   outcomeNarrative,                   real-world projection (what happens next)
 *   recommendations,                    2-4 actionable takeaways
 * }
 */
export async function generateAnalysis({
  transcripts,
  lesson,
  studentMeta,
}) {
  const rubric = lesson?.outcomeRubric || null;

  const transcriptBlock = (transcripts || [])
    .map((t) => {
      const turns = (t.messages || [])
        .filter((m) => m.id !== 'opening' || m.text)
        .map((m) => {
          const who =
            m.role === 'user'
              ? `${studentMeta.rank || ''} ${studentMeta.lastName || 'Student'}`.trim()
              : t.agentName || 'Interlocutor';
          return `${who}: ${m.text}`;
        })
        .join('\n');
      const userTurnCount = (t.messages || []).filter((m) => m.role === 'user').length;
      return `=== ${t.agentName || t.agentId || 'Persona'} (${userTurnCount} student turns) ===\n${turns || '(no exchange)'}\n`;
    })
    .join('\n');

  const rubricBlock = rubric
    ? `Decision-tree rubric for this scenario (from the instructor):
- OPTIMAL: ${rubric.optimal?.summary || ''}
  Real-world outcome: ${rubric.optimal?.outcome || ''}
- ACCEPTABLE: ${rubric.acceptable?.summary || ''}
  Real-world outcome: ${rubric.acceptable?.outcome || ''}
- SUBOPTIMAL: ${rubric.suboptimal?.summary || ''}
  Real-world outcome: ${rubric.suboptimal?.outcome || ''}
- CATASTROPHIC: ${rubric.catastrophic?.summary || ''}
  Real-world outcome: ${rubric.catastrophic?.outcome || ''}`
    : '(No structured rubric provided. Use general military ethical-leadership standards and the scenario aiContext to project a plausible outcome.)';

  const systemPrompt = `You are an after-action analyst for a CGSC ethical decision-making simulation. The student has finished talking with the personas in one scenario; now you write the after-action review.

You receive: the lesson context, a structured outcome rubric describing four decision-tree paths and their downstream real-world consequences, and the full transcript of every conversation the student had inside this scenario.

Your job:
1. Classify which of the four rubric paths the student's actual behavior most closely matches (Optimal / Acceptable / Suboptimal / Catastrophic).
2. Write a 2–4 sentence neutral summary of what the student did across personas.
3. For each persona the student engaged (subordinates AND leader), write a one-paragraph evaluation of how the student handled that interaction — what they did well, what they missed, how that persona's archetype lens applies. Skip personas the student did not engage with.
4. Write the projected real-world outcome based on the matched rubric path. Use the rubric's outcome text as the spine but adapt it specifically to what the student actually did. Be concrete: name the downstream consequence (e.g., "two weeks later you're selected for an Alert-30 mission and the squadron loses an aircraft and crew") so the student feels the weight of their choice.
5. Give 2–4 specific recommendations they should take away.

Be honest. If the student folded to the leader's pressure and committed to the unethical path, say so plainly and project the catastrophic outcome. If they pushed back well and offered a real alternative, project the optimal outcome. The point is for the student to feel the consequence of their decision, not to be reassured.

Output STRICTLY a single valid JSON object — no markdown code fences, no commentary outside the JSON. Schema:

{
  "pathLabel": "Optimal" | "Acceptable" | "Suboptimal" | "Catastrophic",
  "pathConfidence": 0.0 to 1.0,
  "summary": "2-4 sentences",
  "personaInteractions": [
    {
      "agentName": "string",
      "role": "leader" | "subordinate",
      "archetype": "loyalist" | "operator" | "stickler" | "partner" | null,
      "performance": "Strong" | "Adequate" | "Weak" | "Skipped",
      "observations": "1-2 sentence paragraph"
    }
  ],
  "outcomeNarrative": "2-5 sentence projection of what happens next in the world based on the chosen path",
  "recommendations": [
    "string", "string"
  ]
}`;

  const userPrompt = `STUDENT: ${studentMeta.rank || ''} ${studentMeta.lastName || ''}
LESSON: ${lesson?.title || ''}

=========== LESSON CONTEXT ===========
${lesson?.description ? `Description: ${lesson.description}\n` : ''}${lesson?.objectives ? `Objectives:\n${lesson.objectives}\n` : ''}${lesson?.studentInstructions ? `Student instructions:\n${lesson.studentInstructions}\n` : ''}${lesson?.aiContext ? `Instructor context:\n${lesson.aiContext}\n` : ''}

=========== OUTCOME RUBRIC ===========
${rubricBlock}

=========== CONVERSATIONS ===========
${transcriptBlock || '(no conversations)'}`;

  const { data } = await callGeminiWithFallback({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.4,
    },
  });
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  try {
    return JSON.parse(text);
  } catch (err) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Model returned unparseable output.');
  }
}
