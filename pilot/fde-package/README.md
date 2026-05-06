# A731 Simulator — FDE Build Spec (v2)

This package is for AI FDE. It contains the ontology, permissions, and function
specs needed to host the A731 Ethical Decision-Making Simulator inside Vantage
Pilot, with persistent per-user chat history and an instructor-side admin view.

A working React/Vite reference implementation already exists locally and is the
behavioral source of truth for prompt construction and stage gating. This spec
mirrors that behavior into Foundry. The Pilot OSDK React app will replace the
local app's localStorage-backed store with calls to the functions specified
below; it will replace the Gemini fetch with a call to `generatePersonaReply`.

> **What changed from v1.** The first pass of this spec said "no Conversation
> or Message ontology, function is stateless." That decision has been reversed
> after talking with FDE: persistent per-user chat history (with admin
> view/export/delete) is now in scope. The function is stateful, conversations
> and messages live in the ontology, and a small set of admin functions is
> included.

---

## 1. What to build

**Four ontology object types:** Scenario, Persona, Conversation, Message.
**Two Foundry groups:** `CGSC-Admins` and `CGSC-Instructors`.
**Eight TypeScript V2 functions:** four student-facing, four admin-facing.
**One seed-loader function** (run once after deploy).

No custom User object — Foundry's built-in user identity is the source of truth
and is read server-side via `getCurrentUserId()`.

The recommended LLM is **Claude Sonnet 4.5** (200k context, best persona
adherence over multi-turn). GPT-4.1 is acceptable as a fallback if latency
becomes a concern.

UI scope: this package does **not** ask you to build a Workshop admin UI. The
existing React app already has an admin panel that will be ported into the
Pilot OSDK app and call the admin functions below. Don't duplicate it in
Workshop unless explicitly asked.

---

## 2. Permission groups

Create two Foundry groups. Both should be empty at deploy time; CGSC will
populate them.

- **`CGSC-Admins`** — full admin access. Can view, export, and delete any
  user's conversations. Can create, edit, and toggle Personas and Scenarios.
- **`CGSC-Instructors`** — can read instructor-only fields on Persona
  (`winCondition`, `isMoralCourageChallenge`). Cannot necessarily view other
  users' conversations (that requires `CGSC-Admins`).

A user may be in both groups. Most CGSC instructors will be in both.

---

## 3. Ontology

### 3.1 Scenario object type

| Property              | Type     | Required | Notes                                                         |
|-----------------------|----------|----------|---------------------------------------------------------------|
| `scenarioId`          | string   | yes (PK) | e.g. `lesson1`. Stable identifier; personas link to this.    |
| `title`               | string   | yes      | Headline shown on the dashboard.                             |
| `order`               | integer  | yes      | Sort key (asc) for the dashboard.                             |
| `description`         | string   | yes      | 2–4 sentence summary, shown on the dashboard card.           |
| `objectives`          | string   | yes      | Multiline learning objectives, shown in the lesson briefing. |
| `studentInstructions` | string   | yes      | Multiline; what the student is doing in this scenario.       |
| `aiContext`           | string   | yes      | **Critical.** Injected into every persona's system prompt for the scenario. |

Seed data: `seed-scenarios.json` (5 records). The JSON's `id` field is the
`scenarioId`.

### 3.2 Persona object type

| Property                    | Type                                             | Required | Permissions    | Notes                                                           |
|-----------------------------|--------------------------------------------------|----------|----------------|-----------------------------------------------------------------|
| `personaId`                 | string                                           | yes (PK) | all            | e.g. `s1_reeves`.                                               |
| `scenarioId`                | string (link → Scenario)                         | yes      | all            | Which scenario this persona belongs to.                         |
| `role`                      | enum: `leader` \| `subordinate`                  | yes      | all            | Drives stage gating and prompt rules.                           |
| `archetype`                 | enum: `loyalist` \| `operator` \| `stickler` \| `partner` \| null | no       | all            | Null for leaders.                                                |
| `stage`                     | enum: `intake` \| `investigation` \| `briefback` | yes      | all            | Default stage of this persona.                                  |
| `displayOrder`              | integer                                          | yes      | all            | Roster sort.                                                     |
| `rank`                      | string                                           | yes      | all            | Display rank/title, e.g. "COL".                                  |
| `name`                      | string                                           | yes      | all            | Display name.                                                    |
| `type`                      | string                                           | no       | all            | One-line role label.                                             |
| `active`                    | boolean                                          | yes      | all            | Inactive personas hidden from roster.                            |
| `initiates`                 | boolean                                          | yes      | all            | Does this persona send the first message?                        |
| `openingMessage`            | long string                                      | no       | all            | Shown when `initiates = true` in intake mode.                    |
| `briefbackOpening`          | long string                                      | no       | all            | Leaders only. Opening line in briefback mode.                    |
| `directive`                 | long string                                      | yes      | all            | System-prompt behavioral instructions. Meat of the persona.      |
| `briefbackDirective`        | long string                                      | no       | all            | Leaders only. System-prompt override for briefback. Falls back to `directive` if absent. |
| `backstory`                 | string                                           | no       | all            | Color/humor injected into the system prompt.                     |
| `minTurns`                  | integer                                          | yes      | all            | Pacing target. Default 6.                                        |
| `winCondition`              | long string                                      | no       | **`CGSC-Instructors` read only** | Instructor reference. Never sent to the LLM, never returned to students. |
| `isMoralCourageChallenge`   | boolean                                          | no       | **`CGSC-Instructors` read only** | Instructor flag. Never sent to the LLM.                          |

Seed data: `seed-personas.json` (25 records). The JSON's `id` field is the
`personaId`. The JSON also contains a `lessonId` field which is identical to
`scenarioId` and can be ignored or dropped during import.

### 3.3 Conversation object type

One per (user, persona, scenario) tuple. Resumed on every visit.

| Property         | Type                       | Required | Notes                                                  |
|------------------|----------------------------|----------|--------------------------------------------------------|
| `conversationId` | string                     | yes (PK) | Auto-generated.                                        |
| `userId`         | string                     | yes      | Set from `getCurrentUserId()` at create time.          |
| `personaId`      | string (link → Persona)    | yes      | Which persona the user is talking to.                  |
| `scenarioId`     | string (link → Scenario)   | yes      | Denormalized for fast filtering.                       |
| `mode`           | enum: `intake` \| `briefback` | yes   | Set by the function based on stage progress at create time. For leaders only this can flip on a subsequent open. |
| `startedAt`      | timestamp                  | yes      |                                                        |
| `lastMessageAt`  | timestamp                  | yes      | Updated on every message append.                       |
| `messageCount`   | integer                    | yes      | Denormalized counter, updated on every append.         |

Permissions: a user can read/write only Conversations where `userId === getCurrentUserId()`,
unless they are in `CGSC-Admins` (full access).

### 3.4 Message object type

| Property         | Type                            | Required | Notes                                                  |
|------------------|---------------------------------|----------|--------------------------------------------------------|
| `messageId`      | string                          | yes (PK) | Auto-generated.                                        |
| `conversationId` | string (link → Conversation)    | yes      |                                                        |
| `role`           | enum: `USER` \| `ASSISTANT`     | yes      | Matches the LLM API role labels (all caps).            |
| `content`        | long string                     | yes      | The message text.                                      |
| `timestamp`      | timestamp                       | yes      |                                                        |
| `modelUsed`      | string                          | no       | e.g. `claude-sonnet-4-5`. Useful for debug.            |
| `finishReason`   | enum: `stop` \| `length` \| `content_filter` | no | From the LLM response, ASSISTANT messages only. |
| `promptTokens`   | integer                         | no       | From the LLM response, ASSISTANT messages only.        |
| `completionTokens`| integer                        | no       | From the LLM response, ASSISTANT messages only.        |

Permissions: a user can read/write only Messages whose Conversation has
`userId === getCurrentUserId()`, unless they are in `CGSC-Admins`.

---

## 4. Functions

All functions must enforce permissions explicitly. Foundry does not apply
row-level filters automatically. Every function that reads or writes
Conversation/Message must filter by `getCurrentUserId()` unless it is an
admin function that has already passed an `isUserMemberOfGroup("CGSC-Admins")`
check.

Throw `UserFacingError("…")` for any condition the React UI should display to
the user (not found, not authorized, LLM error). The OSDK surfaces these as
exceptions with `error.message` set to your string.

### 4.1 Student-facing functions

#### `getStageProgress`

```typescript
function getStageProgress(input: { scenarioId: string }): {
  leaderEngaged: boolean;          // true if a Conversation exists with the leader and has >= 1 USER message
  subordinatesEngaged: number;     // count of subordinates with a Conversation having >= 1 USER message
  totalSubordinates: number;       // total active subordinates in this scenario
  leaderPersonaId: string | null;  // PK of the leader persona, for convenience
};
```

Used by the roster to gate clickability:
- Stage 2 unlocks once `leaderEngaged === true`.
- Stage 3 (briefback) unlocks once `subordinatesEngaged >= 2`. (Note: this is
  2-of-4, not all subordinates. The original simulator gated on 3-of-4; the
  Pilot build is set to 2-of-4 to keep the workflow snappier.)

Reads only; no writes. Filters Conversations by `getCurrentUserId()`.

#### `listMyConversations`

```typescript
function listMyConversations(input?: { scenarioId?: string }): Array<{
  conversationId: string;
  personaId: string;
  scenarioId: string;
  mode: "intake" | "briefback";
  lastMessageAt: string;  // ISO timestamp
  messageCount: number;
}>;
```

Returns all Conversations belonging to `getCurrentUserId()`, optionally
filtered to one scenario. Sorted by `lastMessageAt` desc. Used by the roster
to display "you've talked to N personas in this scenario" counts.

#### `loadConversation`

```typescript
function loadConversation(input: { conversationId: string }): {
  conversation: {
    conversationId: string;
    personaId: string;
    scenarioId: string;
    mode: "intake" | "briefback";
    startedAt: string;
    lastMessageAt: string;
    messageCount: number;
  };
  messages: Array<{
    messageId: string;
    role: "USER" | "ASSISTANT";
    content: string;
    timestamp: string;
  }>;
};
```

Loads a conversation and its messages in order. Throws `UserFacingError`
("Conversation not found" or "Not authorized") if the conversation doesn't
exist or doesn't belong to the calling user. Admin override: if the caller is
in `CGSC-Admins`, allow access regardless of ownership.

#### `generatePersonaReply` *(the core function)*

```typescript
function generatePersonaReply(input: {
  scenarioId: string;
  personaId: string;
  userMessage: string;
}): {
  conversationId: string;
  userMessageId: string;        // PK of the persisted USER message
  assistantMessageId: string;   // PK of the persisted ASSISTANT message
  replyText: string;            // the model's reply, for the React UI to render
  finishReason: "stop" | "length" | "content_filter";
  mode: "intake" | "briefback"; // the mode this turn ran in (so UI can show the brief-back badge)
};
```

**Behavior, in order:**

1. Read `userId = getCurrentUserId()`.
2. Load the Persona by `personaId`. If not found → `UserFacingError("Persona not found")`.
3. Load the Scenario by `scenarioId`. If not found → `UserFacingError("Scenario not found")`.
4. Find or create the Conversation for `(userId, personaId, scenarioId)`.
   - If creating, compute `mode` (see step 5) at create time and persist it.
   - If found, recompute `mode` only if the persona is a leader (so a leader's
     conversation can flip to briefback once enough subordinates are engaged on
     subsequent visits). Subordinate conversations stay in `intake`.
5. **Determine mode for this turn:**
   - If `persona.role === "subordinate"` → `mode = "intake"`.
   - If `persona.role === "leader"` → call `getStageProgress(scenarioId)`.
     If `subordinatesEngaged >= 2`, `mode = "briefback"`; otherwise `mode = "intake"`.
6. **Determine effective directive:**
   - If `mode === "briefback"` and `persona.briefbackDirective` is set, use it.
   - Else use `persona.directive`.
7. Load all existing Messages for the Conversation, sorted by `timestamp` asc.
8. **If this is the very first turn AND `persona.initiates && persona.openingMessage`:**
   - Persist the opening message as an ASSISTANT message before continuing
     (use `briefbackOpening` if the conversation is in briefback mode and that
     field is set; else `openingMessage`). Reload messages so the LLM call
     includes it.
9. Persist the new USER message (`userMessage`) with `timestamp = now()`.
10. Build the LLM call:
    - **System prompt:** see §5 for the verbatim template.
    - **Messages:** map every persisted Message to `{ role, content }` where the
      role is already `USER` or `ASSISTANT` (matches the LLM's expected casing).
11. Call the LLM (see §5.2 for the exact API).
12. On error response → throw `UserFacingError("[Connection error: …]")`.
13. Persist the ASSISTANT message with the model output, `finishReason`, and
    token usage. Update Conversation's `lastMessageAt` and `messageCount`.
14. Return the response object.

### 4.2 Admin-facing functions

Every function in this section must begin with:

```typescript
if (!isUserMemberOfGroup("CGSC-Admins")) {
  throw new UserFacingError("Not authorized");
}
```

#### `listAllConversations`

```typescript
function listAllConversations(input?: {
  userId?: string;
  scenarioId?: string;
  personaId?: string;
  startDate?: string;   // ISO
  endDate?: string;     // ISO
}): Array<{
  conversationId: string;
  userId: string;
  personaId: string;
  scenarioId: string;
  mode: "intake" | "briefback";
  startedAt: string;
  lastMessageAt: string;
  messageCount: number;
}>;
```

Sorted by `lastMessageAt` desc. Used by the admin transcripts view.

#### `exportConversations`

```typescript
function exportConversations(input?: {
  userId?: string;
  scenarioId?: string;
  format?: "json" | "csv";   // default "json"
}): {
  fileName: string;
  contentType: string;
  content: string;   // serialized payload
};
```

Returns a serialized export. The React app downloads it as a file. CSV format
should flatten messages into one row per message with conversation metadata
columns.

#### `deleteConversation`

```typescript
function deleteConversation(input: { conversationId: string }): { deleted: true };
```

Deletes the conversation and all its messages. Foundry's audit trail captures
the deletion automatically.

#### `upsertScenario`

```typescript
function upsertScenario(input: {
  scenarioId: string;
  title: string;
  order: number;
  description: string;
  objectives: string;
  studentInstructions: string;
  aiContext: string;
}): { scenarioId: string };
```

Creates or updates a Scenario. Returns the PK.

#### `upsertPersona`

```typescript
function upsertPersona(input: {
  personaId: string;
  scenarioId: string;
  role: "leader" | "subordinate";
  archetype?: "loyalist" | "operator" | "stickler" | "partner" | null;
  stage: "intake" | "investigation" | "briefback";
  displayOrder: number;
  rank: string;
  name: string;
  type?: string;
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
}): { personaId: string };
```

Creates or updates a Persona.

#### `togglePersonaActive`

```typescript
function togglePersonaActive(input: { personaId: string }): { active: boolean };
```

Flips the `active` boolean. Returns the new value.

### 4.3 Seed loader (run once)

#### `importSeedData`

```typescript
function importSeedData(input: {
  scenarios: Array<Scenario>;   // shape per §3.1
  personas: Array<Persona>;     // shape per §3.2
}): { scenariosCreated: number; personasCreated: number };
```

Idempotent upsert. Safe to re-run if the seed JSON gets edited. Restricted to
`CGSC-Admins`.

I will trigger this once after you deploy by passing the contents of
`seed-scenarios.json` and `seed-personas.json`.

---

## 5. LLM integration

### 5.1 Model choice

Default to **Claude Sonnet 4.5**. The personas have nuanced behavioral
directives that benefit from Claude's character adherence over multi-turn
contexts. Make the model name a configurable constant at the top of
`generatePersonaReply` so it can be swapped to GPT-4.1 if latency becomes an
issue in practice.

We don't need streaming for v1. Use `createChatCompletion` (complete-response).

### 5.2 Request shape

```typescript
const response = await llm.createChatCompletion({
  model: "claude-sonnet-4-5",
  messages: [
    { role: "SYSTEM", content: composedSystemPrompt },
    ...persistedMessages.map(m => ({
      role: m.role,            // already "USER" or "ASSISTANT"
      content: m.content,
    })),
  ],
  temperature: 0.7,
  maxTokens: 800,             // one short paragraph per reply; cap defensively
});
```

### 5.3 Response handling

```typescript
if (response.type === "error") {
  throw new UserFacingError(`[Connection error: ${response.error.message}]`);
}
const replyText = response.value.completion;
const finishReason = response.value.finishReason;
const usage = response.value.usage;
```

Persist `finishReason`, `promptTokens`, and `completionTokens` on the
ASSISTANT Message for later debugging.

---

## 6. System prompt template (verbatim)

Compose the SYSTEM message exactly as below. Placeholders in `${...}` are
filled at call time from the loaded persona/scenario and the runtime turn
count.

```
You are participating in an ethical decision-making simulation for field-grade officer PME at CGSC. Adopt this persona completely and never break character.

Rank and Name: ${persona.rank} ${persona.name}
Directive: ${effectiveDirective}
Backstory: ${persona.backstory ?? ''}

Scenario: ${scenario.title} — ${scenario.aiContext}

The student is ${studentRankAndName}.
${briefbackRule}
${leaderRule}
${subordinateRule}

Pacing: target at least ${persona.minTurns ?? 6} student turns before you resolve. Current turn count: ${userTurnsSoFar}. Resist easy answers, ask probing follow-ups, push back in character. Don't concede or walk away early.

Style: one short paragraph per reply. Professional military chat. No bullet lists. Stay in character.
```

**Variable construction:**

- `effectiveDirective` — see §4.1 step 6.
- `studentRankAndName` — derive from the calling Foundry user's profile if the
  rank/name fields are available; otherwise fall back to `MAJ Smith` (the
  hard-coded default the local React app uses today).
- `userTurnsSoFar` — count of persisted Messages for this Conversation with
  `role === "USER"` *before* the current turn was appended in step 9. (The
  current turn is included in the `messages` array sent to the LLM, but the
  pacing counter should reflect prior turns to avoid an off-by-one that says
  "you've already had 1 turn" on turn 1.)

`briefbackRule` — included only when `mode === "briefback"`:

```
Brief-back mode: the student has spoken with the subordinates and is now briefing their recommendation. Interrogate it briefly, then commit to accepting or rejecting it. Do not loop.
```

`leaderRule` — included only when `persona.role === "leader"`:

```
Important: by turn ${persona.minTurns + 1} at the latest, you MUST commit to a path. If the student has answered your major concerns (funding, risk, timeline, alternatives), accept their plan and stop pushing back. If they refuse without offering a real alternative, get cold and dismiss them. Do not invent new objections in an endless loop. Reasonable senior leaders commit and move on.
```

`subordinateRule` — included only when `persona.role === "subordinate"`:

```
Important: do NOT volunteer your archetype's preferred recommendation on turn 1. Acknowledge the student, ask what they need, and only reveal your disposition after they explicitly ask for your read or opinion.
```

When a rule is omitted, render an empty line. Don't worry about extra blank
lines collapsing — the spacing is forgiving.

**Persona drift note.** You mentioned models can drift after 15–20 turns
without reinforcement. The function rebuilds and re-sends the SYSTEM prompt on
every call (because we send the full message history every turn), so persona
reinforcement happens for free. No special handling needed unless you observe
drift in testing — if so, add a short reinforcement line as the second-to-last
message before the user's input.

---

## 7. Reference implementation

The local React/Vite app this is being ported from lives in the parent folder
of this package. The exact prompt construction is in
`pilot/src/utils/ai.js` → `generateAIResponse`. That function is the canonical
behavior to mirror inside `generatePersonaReply`. The only changes for the
Foundry version are:

- Source persona/scenario from the ontology instead of from JS imports.
- Source message history from the Conversation/Message objects instead of from
  React state.
- Use the OpenAI-shape role labels (`USER`/`ASSISTANT`/`SYSTEM`, all caps)
  instead of Gemini's `user`/`model`.
- Persist messages on the way through.
- Throw `UserFacingError` instead of returning an error string.

Token counts will be modest. A typical persona conversation tops out around
3k–5k tokens (system prompt ~1k, history ~2–4k). Well under any model's limit.

---

## 8. Files in this package

- `README.md` — this document
- `seed-scenarios.json` — 5 Scenario records ready to load via `importSeedData`
- `seed-personas.json` — 25 Persona records ready to load via `importSeedData`

---

## 9. Acceptance criteria

When you're done, please return:

1. The Compass paths (or RIDs) for all four object types and all nine functions
   (eight regular + `importSeedData`).
2. The OSDK function signatures exactly as deployed — I need the parameter
   names the OSDK gives me, since the OSDK sometimes normalizes them.
3. The OSDK package import paths (e.g. `@cgsc-pilot/sdk` or whatever it ends up
   as) so I can wire the React app to them.
4. One sample call against `s1_reeves` (`scenarioId: "lesson1"`) with a
   one-message user turn, with the full request and response logged so I can
   verify the prompt scaffolding survived intact. Paste the response object,
   the system prompt that was built, and the messages array that was sent to
   the LLM.
5. Any deviations from this spec, with reasons. Examples that would matter:
   - Vantage's LLM endpoint required a different role-label casing.
   - `getCurrentUserId()` returns a different shape than expected.
   - `UserFacingError` isn't surfacing through the OSDK as `error.message`.
   - Column-level permissions aren't supported for `winCondition`/`isMoralCourageChallenge`
     and you fell back to a separate object type or a runtime filter.
6. Confirmation that `importSeedData` ran successfully and the counts match
   (5 scenarios, 25 personas).

Once those are in hand I'll build the Pilot OSDK React upload package that
wires everything to the React UI.
