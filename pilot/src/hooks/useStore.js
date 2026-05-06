import { useEffect, useState, useCallback } from 'react';
import seedAgents from '../data/seedAgents';
import seedScenarios from '../data/seedScenarios';

/**
 * localStorage-backed store for the Pilot build.
 *
 * Everything lives in the browser — no backend, no auth, no network sync.
 * Persists three things across reloads:
 *   - agents (the personas — editable in Admin)
 *   - scenarios (the lessons — editable in Admin)
 *   - transcripts (chat history per agent)
 *
 * The only outbound network call the app makes is the Gemini fetch in
 * src/utils/ai.js for persona replies. Wipe local data via the
 * "Reset to seed data" button in the Admin tab.
 */

const KEYS = {
  agents: 'pilot.agents.v1',
  scenarios: 'pilot.scenarios.v1',
  transcripts: 'pilot.transcripts.v1',
};

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (err) {
    console.warn(`[store] failed to load ${key}:`, err);
    return fallback;
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[store] failed to save ${key}:`, err);
  }
}

export function useStore() {
  const [agents, setAgents] = useState(() =>
    loadFromStorage(KEYS.agents, seedAgents),
  );
  const [scenarios, setScenarios] = useState(() =>
    loadFromStorage(KEYS.scenarios, seedScenarios),
  );
  const [transcripts, setTranscripts] = useState(() =>
    loadFromStorage(KEYS.transcripts, []),
  );

  useEffect(() => saveToStorage(KEYS.agents, agents), [agents]);
  useEffect(() => saveToStorage(KEYS.scenarios, scenarios), [scenarios]);
  useEffect(
    () => saveToStorage(KEYS.transcripts, transcripts),
    [transcripts],
  );

  // ── Agents ───────────────────────────────────────────────────────────────
  const upsertAgent = useCallback((agent) => {
    setAgents((prev) => {
      const i = prev.findIndex((a) => a.id === agent.id);
      if (i === -1) return [...prev, agent];
      const next = [...prev];
      next[i] = { ...prev[i], ...agent };
      return next;
    });
  }, []);

  const deleteAgent = useCallback((id) => {
    setAgents((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const toggleAgent = useCallback((id) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, active: a.active === false ? true : false } : a,
      ),
    );
  }, []);

  // ── Scenarios ────────────────────────────────────────────────────────────
  const upsertScenario = useCallback((scenario) => {
    setScenarios((prev) => ({
      ...prev,
      [scenario.id]: { ...(prev[scenario.id] || {}), ...scenario },
    }));
  }, []);

  const deleteScenario = useCallback((id) => {
    setScenarios((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setAgents((prev) => prev.filter((a) => (a.lessonId || 'lesson1') !== id));
  }, []);

  // ── Transcripts ──────────────────────────────────────────────────────────
  /** Find or create a transcript for (agentId). Returns the transcript object. */
  const getOrCreateTranscript = useCallback(
    (agent) => {
      const existing = transcripts.find((t) => t.agentId === agent.id);
      if (existing) return existing;
      const fresh = {
        id: `t_${agent.id}_${Date.now()}`,
        agentId: agent.id,
        agentName: `${agent.rank} ${agent.name}`,
        lessonId: agent.lessonId || 'lesson1',
        messages: [],
        createdAt: Date.now(),
      };
      setTranscripts((prev) => [...prev, fresh]);
      return fresh;
    },
    [transcripts],
  );

  const updateTranscript = useCallback((id, patch) => {
    setTranscripts((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t,
      ),
    );
  }, []);

  const resetScenarioTranscripts = useCallback((lessonId) => {
    setTranscripts((prev) => prev.filter((t) => t.lessonId !== lessonId));
  }, []);

  // ── Reset everything ─────────────────────────────────────────────────────
  const resetAll = useCallback(() => {
    setAgents(seedAgents);
    setScenarios(seedScenarios);
    setTranscripts([]);
  }, []);

  return {
    // state
    agents,
    scenarios,
    transcripts,
    // agent ops
    upsertAgent,
    deleteAgent,
    toggleAgent,
    // scenario ops
    upsertScenario,
    deleteScenario,
    // transcript ops
    getOrCreateTranscript,
    updateTranscript,
    resetScenarioTranscripts,
    // hard reset
    resetAll,
  };
}
