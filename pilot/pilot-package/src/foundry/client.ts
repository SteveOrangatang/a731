/**
 * Typed client for the A731 Simulator backend.
 *
 * Wraps the 11 published TSv1 functions (v0.0.3) and the four ontology object
 * types. Function calls go through Foundry's Functions REST API; auth is
 * inherited from the Foundry-hosted app's SSO session, so no token management
 * happens on this side.
 *
 * If the REST URL pattern differs in your environment, change the single
 * `FUNCTION_BASE` constant below. If FDE adds a `whoAmI()` query function
 * later, swap the `probeIsAdmin` implementation for a direct call to it.
 *
 * Object queries (Scenario, Persona) currently go through the OSDK's generated
 * package. The exact import path is filled in once the OSDK React app project
 * is created and OSDK tooling generates the package — see the OSDK_PACKAGE
 * placeholder section below.
 */

import type {
  Scenario,
  Persona,
  ConversationSummary,
  AdminConversationSummary,
  LoadedConversation,
  StageProgress,
  ExportPayload,
  ExportFormat,
} from './types';

// ─── Configuration ──────────────────────────────────────────────────────────

const FUNCTION_BASE = '/functions';
const VERSION = '0.0.3';

const RIDS = {
  // Student-facing
  getStageProgress: 'ri.function-registry.main.function.8aa74cea-bb24-4e6a-8ace-90f97d9ba73d',
  listMyConversations: 'ri.function-registry.main.function.5798c343-9c21-4854-83b0-9a87b010b272',
  loadConversation: 'ri.function-registry.main.function.a612ab89-9f51-48a7-860a-5eadcfc11f26',
  generatePersonaReply: 'ri.function-registry.main.function.5a4fc2f4-497a-4ee4-83ae-e72e0a1fe4d7',

  // Admin-facing
  listAllConversations: 'ri.function-registry.main.function.42fc770d-9a23-47fd-b1a4-878494b59bab',
  exportConversations: 'ri.function-registry.main.function.b449d692-eab8-4e41-a252-6ba20389b651',
  deleteConversation: 'ri.function-registry.main.function.8bcb0a6f-22b4-486b-bf0e-66585ab777c2',
  upsertScenario: 'ri.function-registry.main.function.f8cf2754-bb67-4ac7-b4d6-a74d25d3cffb',
  upsertPersona: 'ri.function-registry.main.function.cb2bdfde-2be9-4f8f-8c16-7e06c259e48f',
  togglePersonaActive: 'ri.function-registry.main.function.8159d1e4-f9fb-4a71-8e6d-8b4535dee920',

  // Seed loader
  importSeedData: 'ri.function-registry.main.function.80c94565-68a0-4e41-a252-6ba20389b651',
} as const;

// ─── Function-call plumbing ─────────────────────────────────────────────────

async function callFunction<T = void>(rid: string, args: Record<string, unknown>): Promise<T> {
  const url = `${FUNCTION_BASE}/${rid}/versions/${VERSION}/execute`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const message = body || res.statusText || `HTTP ${res.status}`;
    const err: Error & { status?: number } = new Error(message);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

// ─── Student-facing function calls ──────────────────────────────────────────

export function getStageProgress(scenarioId: string): Promise<StageProgress> {
  return callFunction<StageProgress>(RIDS.getStageProgress, { scenarioId });
}

export function listMyConversations(scenarioId?: string): Promise<ConversationSummary[]> {
  return callFunction<ConversationSummary[]>(
    RIDS.listMyConversations,
    scenarioId ? { scenarioId } : {},
  );
}

export function loadConversation(conversationId: string): Promise<LoadedConversation> {
  return callFunction<LoadedConversation>(RIDS.loadConversation, { conversationId });
}

/**
 * Fire-and-reload pattern: this returns void (TSv1 OntologyEditFunction
 * limitation). After it resolves, call `listMyConversations(scenarioId)` to
 * find the conversationId, then `loadConversation` to read the new message.
 *
 * `useChat` already does this dance — see src/hooks/useChat.ts.
 */
export function generatePersonaReply(args: {
  scenarioId: string;
  personaId: string;
  userMessage: string;
}): Promise<void> {
  return callFunction<void>(RIDS.generatePersonaReply, args);
}

// ─── Admin-facing function calls ────────────────────────────────────────────

export function listAllConversations(filters?: {
  userId?: string;
  scenarioId?: string;
  personaId?: string;
}): Promise<AdminConversationSummary[]> {
  return callFunction<AdminConversationSummary[]>(RIDS.listAllConversations, filters ?? {});
}

export function exportConversations(args: {
  userId?: string;
  scenarioId?: string;
  exportFormat?: ExportFormat;
}): Promise<ExportPayload> {
  return callFunction<ExportPayload>(RIDS.exportConversations, args);
}

export function deleteConversation(conversationId: string): Promise<void> {
  return callFunction<void>(RIDS.deleteConversation, { conversationId });
}

export function upsertScenario(scenario: Scenario): Promise<void> {
  return callFunction<void>(RIDS.upsertScenario, scenario);
}

export function upsertPersona(persona: Persona): Promise<void> {
  return callFunction<void>(RIDS.upsertPersona, persona);
}

export function togglePersonaActive(personaId: string): Promise<void> {
  return callFunction<void>(RIDS.togglePersonaActive, { personaId });
}

export function importSeedData(args: {
  scenarios: string;
  personas: string;
}): Promise<void> {
  return callFunction<void>(RIDS.importSeedData, args);
}

// ─── Admin probe ────────────────────────────────────────────────────────────

/**
 * Probe whether the current user is in CGSC-Admins by attempting an admin-only
 * function call. Returns true if it succeeds, false otherwise.
 *
 * If FDE adds a dedicated `whoAmI()` query function, swap this implementation
 * for a direct call.
 */
export async function probeIsAdmin(): Promise<boolean> {
  try {
    await listAllConversations({});
    return true;
  } catch (err) {
    return false;
  }
}

// ─── Object queries (OSDK) ──────────────────────────────────────────────────

/**
 * The OSDK-generated package wraps the four object types
 * (A731Scenario, A731Persona, A731Conversation, A731Message).
 *
 * Replace the placeholder imports below with the real package name once the
 * OSDK React app project is created and OSDK tooling has generated the SDK.
 *
 * Example expected shape (replace package name):
 *
 *     import { client } from '@osdk-app/client';
 *     import { A731Scenario, A731Persona } from '@osdk-app/sdk';
 *
 *     export async function listScenarios(): Promise<Scenario[]> {
 *       const page = await client(A731Scenario).fetchPage({ pageSize: 100 });
 *       return page.data
 *         .map((s) => ({
 *           scenarioId: s.scenarioId,
 *           title: s.title,
 *           order: s.order,
 *           description: s.description,
 *           objectives: s.objectives,
 *           studentInstructions: s.studentInstructions,
 *           aiContext: s.aiContext,
 *         }))
 *         .sort((a, b) => a.order - b.order);
 *     }
 *
 *     export async function listPersonas(): Promise<Persona[]> {
 *       const page = await client(A731Persona).fetchPage({ pageSize: 200 });
 *       return page.data.map((p) => ({ ...p })) as Persona[];
 *     }
 *
 * Until the OSDK package is generated, the two functions below throw so the
 * UI shows a clear configuration error rather than silently returning empty.
 */

export async function listScenarios(): Promise<Scenario[]> {
  throw new Error(
    'OSDK not yet wired. See src/foundry/client.ts — replace the listScenarios stub with a real OSDK query once the OSDK React app project exists and the SDK package has been generated.',
  );
}

export async function listPersonas(): Promise<Persona[]> {
  throw new Error(
    'OSDK not yet wired. See src/foundry/client.ts — replace the listPersonas stub with a real OSDK query once the OSDK React app project exists and the SDK package has been generated.',
  );
}
