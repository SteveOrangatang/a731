/**
 * TypeScript types matching the A731 Foundry ontology and TSv1 function
 * signatures (v0.0.3).
 *
 * Source of truth: the FDE-deployed functions repo `A731 Simulator Functions`.
 * If the deployed signatures change, update this file to match.
 */

// ─── Ontology object types ──────────────────────────────────────────────────

export type ScenarioId = string;
export type PersonaId = string;
export type ConversationId = string;
export type MessageId = string;
export type UserId = string;

export type PersonaRole = 'leader' | 'subordinate';
export type PersonaArchetype = 'loyalist' | 'operator' | 'stickler' | 'partner' | null;
export type PersonaStage = 'intake' | 'investigation' | 'briefback';
export type ConversationMode = 'intake' | 'briefback';
export type MessageRole = 'USER' | 'ASSISTANT';

export interface Scenario {
  scenarioId: ScenarioId;
  title: string;
  order: number;
  description: string;
  objectives: string;
  studentInstructions: string;
  aiContext: string;
}

/**
 * Persona record. Note: instructor-only fields (`winCondition`,
 * `isMoralCourageChallenge`) are never returned to the React app by any
 * student-facing function. They appear here for type completeness when the
 * admin UI calls `upsertPersona`.
 */
export interface Persona {
  personaId: PersonaId;
  scenarioId: ScenarioId;
  role: PersonaRole;
  archetype?: PersonaArchetype;
  stage: PersonaStage;
  displayOrder: number;
  rank: string;
  name: string;
  personaType?: string; // OSDK normalized name; was `type` in the spec
  active: boolean;
  initiates: boolean;
  openingMessage?: string;
  briefbackOpening?: string;
  directive: string;
  briefbackDirective?: string;
  backstory?: string;
  minTurns: number;
  winCondition?: string;
  isMoralCourageChallenge?: boolean;
}

export interface Conversation {
  conversationId: ConversationId;
  userId: UserId;
  personaId: PersonaId;
  scenarioId: ScenarioId;
  mode: ConversationMode;
  startedAt: string; // ISO
  lastMessageAt: string; // ISO
  messageCount: number;
}

export interface Message {
  messageId: MessageId;
  role: MessageRole;
  content: string;
  timestamp: string; // ISO
}

// ─── Function return-shape types ────────────────────────────────────────────

export interface StageProgress {
  leaderEngaged: boolean;
  subordinatesEngaged: number;
  totalSubordinates: number;
  leaderPersonaId: PersonaId | null;
}

export interface ConversationSummary {
  conversationId: ConversationId;
  personaId: PersonaId;
  scenarioId: ScenarioId;
  mode: ConversationMode;
  lastMessageAt: string;
  messageCount: number;
}

export interface AdminConversationSummary extends ConversationSummary {
  userId: UserId;
  startedAt: string;
}

export interface LoadedConversation {
  conversation: {
    conversationId: ConversationId;
    personaId: PersonaId;
    scenarioId: ScenarioId;
    mode: ConversationMode;
    startedAt: string;
    lastMessageAt: string;
    messageCount: number;
  };
  messages: Message[];
}

export interface ExportPayload {
  fileName: string;
  contentType: string;
  content: string;
}

export type ExportFormat = 'json' | 'csv';
