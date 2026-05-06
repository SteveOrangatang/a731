import { useCallback, useEffect, useState } from 'react';
import {
  deleteConversation as fnDeleteConversation,
  exportConversations as fnExportConversations,
  importSeedData as fnImportSeedData,
  listAllConversations,
  listMyConversations,
  listPersonas,
  listScenarios,
  probeIsAdmin,
  togglePersonaActive as fnTogglePersonaActive,
  upsertPersona as fnUpsertPersona,
  upsertScenario as fnUpsertScenario,
} from '../foundry/client';
import type {
  AdminConversationSummary,
  ConversationSummary,
  ExportPayload,
  Persona,
  Scenario,
} from '../foundry/types';

/**
 * Top-level store hook for the A731 simulator. Replaces the localStorage-backed
 * store from the local pilot. All persistence lives in Foundry now; this hook
 * caches results in React state and exposes the same shape the existing
 * components expect:
 *
 *   { scenarios, agents, transcripts, isAdmin, ...mutations }
 *
 * `transcripts` is the list of the current user's ConversationSummary objects
 * (used by Dashboard and ScenarioView for "conversations started" counts and
 * stage-gating). The actual messages live inside Foundry and are fetched via
 * `loadConversation` in `useChat`, not here.
 */
export function useStore() {
  // Catalog
  const [scenarios, setScenarios] = useState<Record<string, Scenario>>({});
  const [agents, setAgents] = useState<Persona[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Identity
  const [isAdmin, setIsAdmin] = useState(false);
  const [identityChecked, setIdentityChecked] = useState(false);

  // My conversations (lightweight summaries; messages fetched on demand)
  const [transcripts, setTranscripts] = useState<ConversationSummary[]>([]);

  // Initial load
  const refreshCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const [s, p] = await Promise.all([listScenarios(), listPersonas()]);
      const map: Record<string, Scenario> = {};
      for (const sc of s) map[sc.scenarioId] = sc;
      setScenarios(map);
      setAgents(p);
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  const refreshMyConversations = useCallback(async () => {
    const summaries = await listMyConversations();
    setTranscripts(summaries);
  }, []);

  useEffect(() => {
    refreshCatalog().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[store] refreshCatalog failed:', err);
    });
    refreshMyConversations().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[store] refreshMyConversations failed:', err);
    });
    probeIsAdmin()
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false))
      .finally(() => setIdentityChecked(true));
  }, [refreshCatalog, refreshMyConversations]);

  // ─── Scenario mutations ───────────────────────────────────────────────────
  const upsertScenario = useCallback(
    async (scenario: Scenario) => {
      await fnUpsertScenario(scenario);
      await refreshCatalog();
    },
    [refreshCatalog],
  );

  const deleteScenario = useCallback(async () => {
    // No backend `deleteScenario` in v0.0.3 — admins must use Foundry's
    // ontology UI to delete a scenario. Toggle the personas inactive instead.
    throw new Error(
      'Delete scenario not supported in v0.0.3. Mark its personas inactive or remove via the Foundry ontology UI.',
    );
  }, []);

  // ─── Persona mutations ────────────────────────────────────────────────────
  const upsertAgent = useCallback(
    async (agent: Persona) => {
      await fnUpsertPersona(agent);
      await refreshCatalog();
    },
    [refreshCatalog],
  );

  const togglePersonaActive = useCallback(
    async (personaId: string) => {
      await fnTogglePersonaActive(personaId);
      await refreshCatalog();
    },
    [refreshCatalog],
  );

  // Local pilot's `deleteAgent` mapped to soft-delete (toggle inactive).
  // Hard delete requires the Foundry ontology UI in v0.0.3.
  const deleteAgent = useCallback(
    async (personaId: string) => {
      await fnTogglePersonaActive(personaId);
      await refreshCatalog();
    },
    [refreshCatalog],
  );

  // ─── Conversation lifecycle (student) ─────────────────────────────────────
  const resetScenarioTranscripts = useCallback(
    async (scenarioId: string) => {
      // For the student-facing reset, list this scenario's conversations and
      // delete each one. Requires admin permissions on the underlying
      // `deleteConversation` function — see the README about gating this UI
      // affordance behind `isAdmin`.
      const mine = await listMyConversations(scenarioId);
      for (const c of mine) {
        try {
          await fnDeleteConversation(c.conversationId);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn(`[store] could not delete ${c.conversationId}:`, err);
        }
      }
      await refreshMyConversations();
    },
    [refreshMyConversations],
  );

  // ─── Admin operations ─────────────────────────────────────────────────────
  const adminListAllConversations = useCallback(
    (filters?: { userId?: string; scenarioId?: string; personaId?: string }) =>
      listAllConversations(filters) as Promise<AdminConversationSummary[]>,
    [],
  );

  const adminExportConversations = useCallback(
    (args: { userId?: string; scenarioId?: string; exportFormat?: 'json' | 'csv' }) =>
      fnExportConversations(args) as Promise<ExportPayload>,
    [],
  );

  const adminDeleteConversation = useCallback(
    async (conversationId: string) => {
      await fnDeleteConversation(conversationId);
      await refreshMyConversations();
    },
    [refreshMyConversations],
  );

  const adminImportSeedData = useCallback(
    async (args: { scenarios: string; personas: string }) => {
      await fnImportSeedData(args);
      await refreshCatalog();
    },
    [refreshCatalog],
  );

  return {
    // Catalog
    scenarios,
    agents,
    loadingCatalog,

    // Identity
    isAdmin,
    identityChecked,

    // Transcripts (lightweight)
    transcripts,
    refreshMyConversations,

    // Catalog mutations
    upsertScenario,
    deleteScenario,
    upsertAgent,
    togglePersonaActive,
    deleteAgent,

    // Student conversation lifecycle
    resetScenarioTranscripts,

    // Admin
    adminListAllConversations,
    adminExportConversations,
    adminDeleteConversation,
    adminImportSeedData,

    // For ad-hoc reload from anywhere
    refreshCatalog,
  };
}

export type Store = ReturnType<typeof useStore>;
