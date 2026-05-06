# A731 Simulator — OSDK React Build Spec

This package is the React/Vite frontend for the A731 Ethical Decision-Making
Simulator, wired to the TSv1 Foundry functions FDE published as
`A731 Simulator Functions` v0.0.3. It's intended to be dropped into a Foundry
OSDK React app project and deployed as a Foundry-hosted code repository.

The local pilot preview (in the parent folder) is the visual and behavioral
source of truth. This package is the same UI, with the data layer rewired:
localStorage → Foundry ontology, Gemini fetch → `generatePersonaReply` REST
call.

---

## 1. What's in this package

```
pilot-package/
├── README.md                ← this file (the build spec)
├── package.json             ← deps for Vite/React/TS/Tailwind
├── tsconfig.json            ← TS config (allows mixed JSX/TS)
├── vite.config.js
├── index.html
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx
    ├── index.css
    ├── App.jsx                              ← admin gating via group probe
    ├── foundry/
    │   ├── client.ts                        ← typed wrapper over the 11 functions
    │   └── types.ts                         ← TS types for ontology + return shapes
    ├── hooks/
    │   ├── useStore.ts                      ← Foundry-backed (replaces localStorage)
    │   └── useChat.ts                       ← fire-and-reload chat flow
    └── components/
        ├── Header.jsx
        ├── Dashboard.jsx
        ├── ScenarioView.jsx                 ← uses getStageProgress
        ├── AgentRoster.jsx
        ├── ChatPanel.jsx                    ← USER/ASSISTANT message shape
        └── admin/
            ├── AdminPanel.jsx               ← group-membership gated
            ├── ScenariosTab.jsx
            ├── PersonasTab.jsx
            └── ConversationsTab.jsx         ← NEW: instructor transcript viewer
```

---

## 2. What FDE needs to do to deploy this

1. **Create an OSDK React app project** in Foundry (Code Repositories →
   Create → OSDK React app, or whatever your stack calls it). This generates
   the OSDK package for the four ontology object types
   (`A731Scenario`, `A731Persona`, `A731Conversation`, `A731Message`).

2. **Drop the contents of this package into the project's source tree.** All
   files in `src/` go into the project's `src/` directory. The top-level
   config files (`package.json`, `tsconfig.json`, `vite.config.js`,
   `index.html`, `tailwind.config.js`, `postcss.config.js`) merge into
   whatever the OSDK template produced — keep the OSDK-template versions of
   anything that conflicts, but make sure our deps and Tailwind setup land.

3. **Wire up the OSDK ontology queries** in `src/foundry/client.ts`. Two
   functions there (`listScenarios`, `listPersonas`) currently throw with
   instructions. Replace them with real OSDK queries against
   `A731Scenario` and `A731Persona`. The expected shape is documented in the
   stub bodies. Whatever the OSDK package name ends up being (e.g.
   `@osdk-app/sdk` or similar from the OSDK wizard) is what you import from.

4. **Run `importSeedData` once** with the contents of the seed JSON from the
   FDE backend package (`pilot/fde-package/seed-scenarios.json` and
   `seed-personas.json`). This populates the ontology with the 5 scenarios
   and 25 personas. The current React app does NOT bundle the seed data —
   that's intentional (admins should run this through the Foundry Functions
   UI, not from the React app, since it's a one-time seed operation).

5. **Confirm the Foundry groups exist:** `CGSC-Admins` and `CGSC-Instructors`.
   Add at least one user to `CGSC-Admins` so admin features are exercisable.

6. **Build and deploy** through Foundry's standard code-repo deployment.

---

## 3. Architectural changes from the local pilot

The component tree is unchanged. Only three things flipped:

**localStorage → Foundry ontology.** `src/hooks/useStore.ts` replaces the old
JS store. It calls `listScenarios`, `listPersonas`, `listMyConversations` on
mount and exposes the same surface (`scenarios`, `agents`, `transcripts`,
plus mutation methods) that the components expect. Mutation methods now call
`upsertScenario`, `upsertPersona`, `togglePersonaActive` instead of writing
local state.

**Gemini fetch → `generatePersonaReply` REST call.** `src/hooks/useChat.ts`
replaces the old chat hook. Because TSv1 OntologyEditFunctions return `void`,
the flow is fire-and-reload: send the user message via
`generatePersonaReply`, then call `loadConversation` to read the new
ASSISTANT reply. Optimistic UI keeps the user's message on screen during the
round trip.

**Admin passcode → group probe.** `src/App.jsx` and
`src/components/admin/AdminPanel.jsx` no longer prompt for a passcode. On
mount, `useStore` calls `probeIsAdmin()` (which tries `listAllConversations`
with empty filters; succeeds only for `CGSC-Admins`). The "Admin" link in
the header is shown only to admins; the panel itself bounces non-admins
to a "Not authorized" message.

A new `ConversationsTab.jsx` was added to the admin panel — instructors can
list, filter, view, export (JSON or CSV), and delete any user's
conversation. This wasn't in the local pilot because it didn't have multi-user
data; with Foundry it's a natural addition.

---

## 4. Function call patterns (reference)

All 11 published functions are wrapped in `src/foundry/client.ts`. Each
wrapper is one line — no React-specific logic — so you can call them from
anywhere. The wrappers POST to `/functions/<rid>/versions/0.0.3/execute`
with the function's parameters as JSON. Auth is inherited from the
Foundry-hosted SSO session.

The function RIDs are baked into `client.ts` (constant `RIDS`). If FDE
republishes at a new version, change the `VERSION` constant from `'0.0.3'`
to the new version. If the REST URL pattern in your environment differs,
change the `FUNCTION_BASE` constant.

---

## 5. Acceptance criteria

When you've integrated this, please confirm:

1. The OSDK React app builds without errors against the generated SDK.
2. `listScenarios` and `listPersonas` are wired to real OSDK queries (no
   longer throwing the placeholder error).
3. The dashboard renders all 5 scenarios with correct persona counts.
4. Clicking into a scenario, selecting the leader, sending one user message
   produces a real Claude reply that gets persisted (you can verify by
   reloading the page — the conversation should re-load with the same
   messages).
5. The "Admin" link appears in the header only when the logged-in user is
   in `CGSC-Admins`.
6. The admin Conversations tab lists conversations and the JSON/CSV export
   downloads work.

If any of those fail, send me the failure mode and I'll iterate.

---

## 6. Files modified vs. ported unchanged

**New files:**
- `src/foundry/client.ts`
- `src/foundry/types.ts`
- `src/hooks/useStore.ts` (replaces `useStore.js`)
- `src/hooks/useChat.ts` (replaces `useChat.js`)
- `src/components/admin/ConversationsTab.jsx`

**Modified files:**
- `src/App.jsx` — admin passcode flow → group probe; loading state added
- `src/components/admin/AdminPanel.jsx` — passcode UI → "Not authorized" UI;
  added Conversations tab
- `src/components/admin/ScenariosTab.jsx` — `id` → `scenarioId`; delete
  marked as v0.0.3-unsupported
- `src/components/admin/PersonasTab.jsx` — `id` → `personaId`,
  `lessonId` → `scenarioId`, `type` → `personaType`; delete is now soft
  (toggles inactive)
- `src/components/Dashboard.jsx` — field renames (`scenarioId`,
  `messageCount` for "conversations started")
- `src/components/ScenarioView.jsx` — replaced local stage-progress
  computation with `getStageProgress` Foundry call; admin-only reset; field
  renames
- `src/components/AgentRoster.jsx` — `agent.id` → `agent.personaId`
- `src/components/ChatPanel.jsx` — accepts `USER`/`ASSISTANT` role and
  `content` field; renders error banner

**Deleted files (relative to local pilot):**
- `src/utils/ai.js` — Gemini call now lives in the Foundry function
- `src/data/seedAgents.js`, `src/data/seedScenarios.js` — data is in
  Foundry now
- `src/config/constants.js` — no API keys; no admin passcode
- `pilot/.env.local`, `pilot/.env.example` — no env config needed at runtime

**Ported unchanged:**
- `src/main.jsx`
- `src/index.css`
- `src/components/Header.jsx`
