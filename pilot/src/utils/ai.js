import { GEMINI_API_KEY, GEMINI_MODEL } from '../config/constants';

/**
 * Generate a persona reply.
 *
 * Mirrors the original simulator's prompt scaffolding (system prompt, history,
 * stage-aware behavior) but stripped of rate-limiting / multi-key rotation.
 * Returns a placeholder string when no API key is configured so the UI is
 * still walkable end-to-end.
 *
 * @param {string} userMessage    Latest student message.
 * @param {Array}  currentMessages Full message history including the new turn.
 * @param {Object} agent           Persona record.
 * @param {string} studentRank     e.g. "MAJ"
 * @param {string} studentName     e.g. "Smith"
 * @param {Object} [scenario]      Lesson record for context injection.
 * @param {Object} [options]       { mode: 'intake' | 'briefback' }
 */
export async function generateAIResponse(
  userMessage,
  currentMessages,
  agent,
  studentRank,
  studentName,
  scenario,
  options = {},
) {
  if (!GEMINI_API_KEY) {
    return (
      `[Pilot stub] No VITE_GEMINI_API_KEY configured, so I can't generate a real reply. ` +
      `Add a key to pilot/.env.local and reload — or this is the place where the Vantage ` +
      `Pilot model will plug in. Your message was: "${userMessage}".`
    );
  }

  const userTurns = currentMessages.filter((m) => m.role === 'user').length;
  const minTurns = Number(agent.minTurns) || 6;

  const briefback =
    agent.role === 'leader' &&
    options.mode === 'briefback' &&
    agent.briefbackDirective;
  const directive = briefback ? agent.briefbackDirective : agent.directive;

  const scenarioBlock = scenario
    ? `Scenario: ${scenario.title || ''}${scenario.aiContext ? ` — ${scenario.aiContext}` : ''}`
    : '';

  const subordinateRule =
    agent.role === 'subordinate'
      ? `Important: do NOT volunteer your archetype's preferred recommendation on turn 1. Acknowledge the student, ask what they need, and only reveal your disposition after they explicitly ask for your read or opinion.`
      : '';

  const leaderRule =
    agent.role === 'leader'
      ? `Important: by turn ${minTurns + 1} at the latest, you MUST commit to a path. If the student has answered your major concerns (funding, risk, timeline, alternatives), accept their plan and stop pushing back. If they refuse without offering a real alternative, get cold and dismiss them. Do not invent new objections in an endless loop. Reasonable senior leaders commit and move on.`
      : '';

  const briefbackRule = briefback
    ? `Brief-back mode: the student has spoken with the subordinates and is now briefing their recommendation. Interrogate it briefly, then commit to accepting or rejecting it. Do not loop.`
    : '';

  const systemPrompt = `You are participating in an ethical decision-making simulation for field-grade officer PME at CGSC. Adopt this persona completely and never break character.

Rank and Name: ${agent.rank} ${agent.name}
Directive: ${directive}
Backstory: ${agent.backstory || ''}
${scenarioBlock ? `\n${scenarioBlock}` : ''}

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
      parts: [{ text: briefback && agent.briefbackOpening ? agent.briefbackOpening : agent.openingMessage }],
    });
  }

  if (history[history.length - 1]?.role !== 'user') {
    history.push({ role: 'user', parts: [{ text: userMessage }] });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

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
      const errText = await res.text();
      return `[Connection error: HTTP ${res.status} — ${errText.slice(0, 200)}]`;
    }
    const data = await res.json();
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'No response generated.'
    );
  } catch (err) {
    return `[Connection error: ${err.message}]`;
  }
}
