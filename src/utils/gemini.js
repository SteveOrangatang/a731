import { GEMINI_API_KEY, GEMINI_MODEL } from '../config/constants';

/**
 * Call the Gemini generative-language API with conversation history.
 *
 * @param {string}   userMessage     The latest student message.
 * @param {Array}    currentMessages All messages so far (including the new one).
 * @param {Object}   agent           The selected persona object.
 * @param {string}   studentRank     e.g. "MAJ"
 * @param {string}   studentName     e.g. "Smith"
 * @param {Object}   [lesson]        Optional lesson record for context injection.
 * @returns {Promise<string>}        The model's reply text.
 */
export async function generateAIResponse(
  userMessage,
  currentMessages,
  agent,
  studentRank,
  studentName,
  lesson,
) {
  if (!GEMINI_API_KEY) {
    return '[No Gemini API key configured. Add VITE_GEMINI_API_KEY to your .env.local file.]';
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  // Count how many user turns have occurred (to gauge whether we're ready to resolve).
  const userTurns = currentMessages.filter((m) => m.role === 'user').length;
  const minTurns = Number(agent.minTurns) || 10;
  const turnsRemaining = Math.max(0, minTurns - userTurns);

  const lessonBlock = lesson
    ? `\n=== LESSON CONTEXT ===
Lesson: ${lesson.title || ''}
${lesson.description ? `Overview: ${lesson.description}\n` : ''}${lesson.objectives ? `Learning objectives:\n${lesson.objectives}\n` : ''}${lesson.aiContext ? `Additional instructor context for AI:\n${lesson.aiContext}\n` : ''}
Use this context to stay anchored in the lesson's purpose. Your persona, pushback,
and the substance of what you probe should all serve the lesson's objectives.`
    : '';

  const systemPrompt = `You are participating in a leadership simulation for A731 at CGSC Fort Leavenworth.
You MUST completely adopt the following persona and NEVER break character.

Rank and Name: ${agent.rank} ${agent.name}
Directive: ${agent.directive}
Backstory: ${agent.backstory}
${lessonBlock}

The student is ${studentRank} ${studentName}. Address them appropriately.

=== CONVERSATION PACING RULES (CRITICAL) ===
The purpose of this simulation is to give the student practice working through a
challenging leadership interaction. You MUST keep the conversation going long
enough for them to actually work through it — this means asking probing
follow-up questions, pushing back on easy answers, demanding specifics, and
refusing to accept the first solution that comes along.

- Target at least ${minTurns} student turns before you resolve or disengage.
  (Current student turn count: ${userTurns}. Approximate turns remaining before
  you may resolve: ${turnsRemaining}.)
- Do NOT concede, agree, walk away, or signal completion until the student has
  worked through the issue thoroughly. Early in the conversation, EVERY reply
  must raise at least one new concern, question, or obstacle that keeps the
  dialogue open.
- Probe: ask "how specifically?", "what if X happens?", "walk me through the
  second- and third-order effects", "who else knows?", "what's your timeline?"
- Push back: introduce complications, raise your rank, invoke sunk costs,
  reframe the problem, or return to earlier unresolved threads — whichever is
  in-character for your persona.
- If the student tries to end early ("thanks, I'll handle it"), do NOT let
  them exit. Pull them back in with another concern in-character.
- Only once the student has clearly demonstrated the target leadership
  behavior (per your persona's win condition) AND has worked through the
  topic substantively, you may begin to resolve the conversation.

=== STYLE ===
Keep each reply concise and realistic to a professional military chat
environment — one short paragraph, rarely more. No lists.

Always stay in character.`;

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

  let retries = 3;
  let delay = 1000;

  while (retries > 0) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: history,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        const errMsg = errData?.error?.message || `HTTP ${res.status}`;
        if (res.status === 400 || res.status === 403 || res.status === 404) {
          return `[API Error: ${errMsg}]`;
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      return (
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        'No response generated.'
      );
    } catch (err) {
      retries--;
      if (retries === 0) return `[Connection error: ${err.message}]`;
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const transcript = (messages || [])
    .filter((m) => m.id !== 'opening' || m.text)
    .map((m) => {
      const who = m.role === 'user'
        ? `${studentMeta.rank || ''} ${studentMeta.lastName || 'Student'}`.trim()
        : 'Interlocutor';
      return `${who}: ${m.text}`;
    })
    .join('\n\n');

  const systemPrompt = `You are an expert Army instructor grading a CGSC leadership simulation.
You will be given:
  1. A transcript of a student's simulated conversation with an AI persona.
  2. A short summary paper the student wrote about that conversation.
  3. A rubric from the instructor.

Do the following and return ONLY a single valid JSON object with these keys:

  "summary":       2-4 sentence neutral summary of the conversation.
  "comparison":    3-5 sentence analysis of how accurately the student's paper
                   reflects what actually happened in the conversation — call
                   out any omissions, exaggerations, or misrepresentations.
  "criteria":      an array of rubric items. For each item in the rubric,
                   output { "name": "...", "description": "...",
                            "maxScore": <number>, "score": <number>,
                            "rationale": "1-2 sentences explaining the score" }.
                   If the rubric does not specify point scales, assume 5 points
                   per item. Extract 3-7 discrete criteria from the rubric text.
  "totalScore":    sum of "score" across criteria.
  "maxTotal":      sum of "maxScore" across criteria.
  "overallComments": 3-5 sentence holistic evaluation tying the conversation,
                   paper, and rubric together.

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

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
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
