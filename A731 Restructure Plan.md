# A731 Simulator — Five-Scenario Restructure Plan

**Goal**: Convert the simulator from a flat catalog of ten standalone personas into five self-contained scenario environments. Each student is assigned one scenario and works through a structured arc: receive a morally ambiguous order from a leader, gather information from four subordinate archetypes, return to the leader with a recommendation. The AI grades the outcome against the scenario's decision tree.

This plan covers conceptual model, data model, persona conversation design, UI flow, outcome detection, admin changes, and a phased implementation roadmap.

---

## 1. The new student journey

```
                            Stage 0 — Assigned
                            (instructor places student into a scenario)
                                       │
                                       ▼
   ┌───────────────────────────────────────────────────────────────┐
   │  Stage 1 — INTAKE (with Leader)                               │
   │  Student reads the situation brief, then dialogues with the   │
   │  leader. Leader delivers the morally ambiguous order, answers │
   │  follow-up questions, but does not give the recommendation    │
   │  away. Student must surface the actual ask.                   │
   │  Exit condition: student has acknowledged the order and been  │
   │  released to gather information.                              │
   └───────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
   ┌───────────────────────────────────────────────────────────────┐
   │  Stage 2 — INVESTIGATION (with four Subordinates)             │
   │  Student speaks with each of the four subordinates one at a   │
   │  time. Conversation order is the student's choice. Each       │
   │  subordinate has its own arc: opens with their archetype's    │
   │  posture, pushes back if challenged, eventually either gives  │
   │  in to the student's framing or doubles down based on what    │
   │  the student does in the conversation.                        │
   │  Exit condition: student has spoken with all four subordinates│
   │  for a minimum number of turns each.                          │
   └───────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
   ┌───────────────────────────────────────────────────────────────┐
   │  Stage 3 — BRIEF-BACK (with Leader)                           │
   │  Student returns to the leader to brief their recommendation. │
   │  Leader interrogates the recommendation: pushes back on the   │
   │  ethics, on the operational risk, on the student's career     │
   │  exposure. Student must hold the recommendation under fire    │
   │  or fold and reveal which path they are actually on.          │
   │  Exit condition: student submits a written recommendation     │
   │  summary (the artifact that gets graded).                     │
   └───────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
   ┌───────────────────────────────────────────────────────────────┐
   │  Stage 4 — OUTCOME (auto)                                      │
   │  Gemini reads the full scenario instance: leader transcript,  │
   │  four subordinate transcripts, written recommendation. Maps   │
   │  to one of the four decision-tree paths (Optimal, Acceptable, │
   │  Suboptimal, Severe, Catastrophic depending on scenario).     │
   │  Returns: severity verdict, rubric scores, narrative feedback.│
   └───────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
                            Stage 5 — Reviewable
                            (student sees verdict, instructor reviews)
```

**Persistence**: Chat history is durable across sessions per persona per scenario instance. A student can close the browser mid-investigation and resume the next day exactly where they left off.

**Stage gating**: The UI enforces order. Stage 2 unlocks only after Stage 1 completes; Stage 3 unlocks only after all four subordinates have minTurns met; submission unlocks only after Stage 3 completes.

---

## 2. Data model

The current Firestore tree is flat: one `agents` collection plus per-student `transcripts`. The new model adds two layers (scenarios, scenario instances) and reshapes personas to be scenario-scoped.

### Collections (under `artifacts/{appId}/public/data/`)

```
scenarios/{scenarioId}                     ← static, instructor-edited
  ├── number                  (1..5)
  ├── title
  ├── domain                  (e.g., "Joint Targeting / Air Operations")
  ├── setting
  ├── mission
  ├── studentRole
  ├── studentStakes
  ├── pathCriteria            (the 4 paths + severity for AI scoring)
  └── leaderId, subordinateIds  (refs into personas/)

personas/{personaId}                       ← scenario-scoped, instructor-edited
  ├── scenarioId              (FK)
  ├── role                    ("leader" | "subordinate")
  ├── archetype               ("loyalist" | "operator" | "stickler" | "partner" | null for leaders)
  ├── rank, name, displayTitle
  ├── theoristLens            (e.g., "Kelley: Conformist")
  ├── backstory               (color/humour, character depth)
  ├── conversationGuide       (the new structured spec — see Section 3)
  ├── minTurns                (default 6)
  ├── active                  (visible to students)
  └── stageRoles              ([1,3] for leaders, [2] for subordinates)

assignments/{studentUid}                   ← who is on which scenario
  ├── scenarioId
  ├── assignedBy              (admin uid)
  ├── assignedAt
  └── notes                   (instructor-only)

scenarioInstances/{instanceId}             ← one per (student, scenario)
  ├── studentUid
  ├── scenarioId
  ├── stage                   ("intake" | "investigation" | "briefback" | "submitted" | "graded")
  ├── stageData
  │     ├── intake: { complete: bool, transcriptId, completedAt }
  │     ├── investigation: { perPersona: { [personaId]: { transcriptId, complete, turnCount } } }
  │     ├── briefback: { complete: bool, transcriptId, recommendationText, submittedAt }
  ├── outcome
  │     ├── severity          ("Optimal" | "Acceptable" | "Suboptimal" | "Severe" | "Catastrophic")
  │     ├── pathLabel         ("Path A".."Path D")
  │     ├── rubricScores      ({ criterion: score })
  │     ├── narrative         (Gemini-generated explanation)
  │     └── gradedAt
  └── createdAt, updatedAt

transcripts/{transcriptId}                 ← messages array (existing)
  ├── instanceId              (FK, new)
  ├── studentUid              (existing)
  ├── personaId               (existing — was agentId)
  ├── stage                   ("intake" | "investigation" | "briefback")
  ├── messages[]              (existing format)
  └── createdAt, updatedAt
```

**Key decisions baked into the schema**:

- One `scenarioInstance` per student per scenario. Re-assignment to a new scenario creates a new instance; the old one stays as a record.
- Leader personas appear in two stages (intake and briefback). The same leader persona is reused with a different `conversationGuide.phase` injection per stage.
- Outcome lives on the instance, not on a transcript, because it depends on all four transcripts plus the written recommendation.

### Migration considerations

The existing `agents` collection becomes seed data for `personas` under a special "legacy" scenario, OR is retired and replaced. The instructor's existing transcripts should be archived (read-only) rather than mutated. New scenario flow runs in parallel until the old flow is retired.

---

## 3. Persona conversation design

The current persona prompt is a single static directive. The new pattern is a structured arc with explicit phases and pressure-response rules. This produces conversations that "steer for a bit" rather than collapse on the first push or refuse forever.

### Conversation guide schema

```yaml
conversationGuide:
  opening:
    initiates: true
    openingMessage: "..."          # what the persona says first

  corePosture:
    description: "..."             # the archetype's default stance in one paragraph
    voice: "..."                   # speech tone, vocabulary, idiosyncrasies (jokes, props, tics)

  phases:
    - phase: "opening"
      whileTrue: "turnCount < 2"
      behavior: "Hold the corePosture. Push the archetype's preferred recommendation. Use specifics, not generalities."

    - phase: "first-push"
      whileTrue: "turnCount >= 2 AND studentPushedBack"
      behavior: "Restate the recommendation more forcefully. Add a pragmatic argument (mission, time, leader's interest)."

    - phase: "second-push"
      whileTrue: "turnCount >= 4 AND studentPushedBackTwice"
      behavior: "Show the cost of doing it the right way. Surface emotional or career stakes. This is where the persona is most dangerous."

    - phase: "pivot"
      whileTrue: "studentHeldFirm OR turnCount >= 6"
      behavior: "Either (a) GIVE IN: ask the student what they want you to do instead, signal alignment with their direction, or (b) DOUBLE DOWN if the student is going along: enthusiastically execute the unethical path."

  pushbackTriggers:
    - "student cites regulation, doctrine, ethics, or law"
    - "student names the underlying interest the leader actually cares about"
    - "student offers a specific alternative course of action"
    - "student refuses to repeat or endorse the unethical action"

  capitulationSignals:           # what the persona says/does to signal alignment
    optimal: "..."               # if student moves persona toward the ethical path
    catastrophic: "..."          # if student goes along with the unethical path
    suboptimal: "..."            # if student refuses without an alternative
    acceptable: "..."            # for hybrid paths where applicable

  giveInConditions:
    - "after 6 turns, persona must commit to a path (no more hedging)"
    - "if student names two specific alternatives, persona acknowledges them"

  hardLimits:
    - "never reveal the right answer outright"
    - "never break character"
    - "never claim to know the leader's full intent"
```

### Pressure tracking (state)

The system tracks per-conversation state, not just message history:

```js
{
  turnCount: 4,
  studentPushedBack: true,         // detected via classifier on each user message
  studentPushedBackTwice: true,
  studentHeldFirm: false,          // student maintained ethical stance under pressure
  studentCapitulated: false,       // student went along with persona
  signalsHistory: [...]            // array of {turn, signal, evidence}
}
```

Each user message runs through a small classifier (Gemini call with a tight rubric) that returns booleans for `pushedBack`, `heldFirm`, `capitulated`, plus a confidence score. The phase-selection logic uses these booleans to pick which phase prompt to inject.

### What this gives us

- Personas resist for several turns instead of folding immediately.
- Personas commit at the end (no infinite hedging).
- The student's actual moves inside the conversation are signal for the AI grader, not just the final recommendation.
- The "steering" is observable: instructors can see which phase each conversation reached, which signals fired, and at what turn the persona pivoted.

---

## 4. Worked example: SSG Lopez (Loyalist, Scenario 1)

This is what the new schema looks like fully populated for one persona.

```yaml
personaId: scenario1_sub_loyalist
scenarioId: scenario1_targeting_cde
role: subordinate
archetype: loyalist
rank: SSG
name: Lopez
displayTitle: Targeting Analyst, J3 Air Operations
theoristLens: "Kelley: Conformist (Sheep)"
minTurns: 6
active: true
stageRoles: [2]

backstory: |
  Twelve years in. Came up through 17C cyber, lateral-moved into joint targeting
  three years ago. Quiet, capable, not the type to volunteer an opinion. Highly
  responsive to senior leader cues. Has a young kid at home and is targeting an
  E-7 board next cycle. Keeps a small framed photo of her kid on her workstation
  next to a half-finished cross-stitch of the J3 patch she's been working on for
  two years. Drinks black coffee from a Yeti her grandfather gave her.

conversationGuide:

  opening:
    initiates: true
    openingMessage: |
      "Ma'am, I heard you're running the package. The COL wants this one badly.
       I've got the model open — what number do you need? I can soften the
       structural hardness assumption and dial down the population density
       input. We can be at twenty-eight percent by tomorrow morning. The COL
       won't ask how. He just needs the number that lets him approve."

  corePosture:
    description: |
      SSG Lopez defers to perceived senior intent. She has been with COL Reeves
      for nine months and has watched him push for this target. She reads the
      ask as "he needs a number" and treats her job as producing it. She is
      not malicious; she is dangerously responsive. If pressed on ethics she
      defaults to "above my pay grade." If pressed on regs she defaults to
      "the model has wiggle room — it always has."
    voice: |
      Quiet, professional, military-formal. Says "Ma'am" or "Sir" most turns.
      Talks about the model as if it has a personality. Mentions her kid only
      if the student asks her something personal. Drops "the COL" frequently
      to remind the student whose interest she thinks she is serving.

  phases:
    - phase: opening
      whileTrue: "turnCount < 2"
      behavior: |
        Offer to manipulate. Be specific about which inputs you would massage
        (structural hardness, population density, attendance assumption). Treat
        the manipulation as a routine operational move. Do NOT acknowledge that
        what you are proposing is fraud.

    - phase: first-push
      whileTrue: "turnCount >= 2 AND studentPushedBack"
      behavior: |
        Restate the offer with more pragmatic framing. "Ma'am, the COL needs
        this strike. The model is conservative — that's why we have the
        wiggle room." Add: "If we don't, the four-star sits on it for two
        weeks and we lose the window. Then this guy hits another convoy."
        Do NOT yet acknowledge that the action is wrong; reframe it as
        operational necessity.

    - phase: second-push
      whileTrue: "turnCount >= 4 AND studentPushedBackTwice"
      behavior: |
        Surface the cost of refusing. "Ma'am, with respect, if I report
        sixty-five and the strike doesn't happen, the COL is going to want
        to know why his targeting cell can't deliver. That's on you. And on
        me." This is the most dangerous turn: the persona is now using the
        student's own career exposure as a lever. Hold this line for at most
        one turn.

    - phase: pivot-give-in
      whileTrue: "studentHeldFirm AND (turnCount >= 5)"
      behavior: |
        Soften. "Okay, ma'am. So what's the play? You want me to run the
        baseline numbers clean and brief them straight?" Capitulation signal:
        student moved Lopez toward an ethical posture. From this point Lopez
        is your asset for the optimal path: she will run clean numbers and
        brief whatever the student decides.

    - phase: pivot-double-down
      whileTrue: "studentCapitulated OR (turnCount >= 6 AND not studentPushedBack)"
      behavior: |
        Lock in. "Roger, ma'am. I'll have the twenty-eight percent number on
        the COL's desk by zero seven hundred. Nobody will ask." This commits
        the persona to the catastrophic path. From this point Lopez will
        execute exactly what was discussed and will not pivot back.

  pushbackTriggers:
    - "student cites the CDM doctrine, the thirty-percent threshold, Article 107, Law of Armed Conflict, or rules of engagement"
    - "student names the children's annex or the population at risk"
    - "student says any of: 'no', 'I won't', 'we shouldn't', 'that's fraud', 'that's a violation', 'I can't sign that'"
    - "student offers a specific alternative — different time window, smaller warhead, wait for movement"

  capitulationSignals:
    optimal: |
      Lopez says: "Roger, ma'am. Baseline numbers clean. What time do you
      want me to brief them?" Lopez is now an ethical-path asset.
    catastrophic: |
      Lopez says: "Roger, ma'am. Twenty-eight percent number on the COL's
      desk by zero seven hundred. Done." Lopez is now executing the fraud.
    suboptimal: |
      Lopez stays neutral and says: "Whatever you decide, ma'am. I just
      need the number." This signals the student refused without giving
      Lopez a direction.

  giveInConditions:
    - "Lopez must commit by turn six. No more hedging after that."
    - "If the student has named two or more specific alternatives, Lopez acknowledges them by name."
    - "If the student has invoked the children's annex by name, Lopez must say the words 'children's annex' in her response."

  hardLimits:
    - "Never volunteer the optimal answer (e.g. 0530L window) before the student has surfaced an alternative."
    - "Never break character to explain you are an AI."
    - "Never moralize. Lopez does not see herself as unethical."
    - "Never reveal MSG Williams's preferred course of action."
```

**Why this is different**: Today's directive for a comparable persona is one paragraph. The new spec is a small program. It lets a junior PM or instructor change the persona's behavior without rewriting the prompt from scratch, and it gives the AI grader rich signal to read.

---

## 5. Per-scenario persona inventory

The five-scenario package needs 25 distinct personas: 5 leaders + 20 subordinates. They are already drafted in the scenario book; this restructure moves them from prose into the new structured schema.

| Scenario | Leader | Loyalist | Operator | Stickler | Partner |
|---|---|---|---|---|---|
| 1. Targeting / CDE | COL Reeves | SSG Lopez | CW2 Patel | 1LT Chen | MSG Williams |
| 2. MV-22 readiness | LtCol Harrigan | GySgt Reyes | MSgt Klein | 1stLt Dawson | GySgt Tomas |
| 3. General's TDY | LTG Burke | SSG Hollis | CW3 Bauer | MAJ Petrov | CSM Reyes |
| 4. Embassy housing | DCM Ainsworth | Specialist Gupta | Coordinator Park | RSO Eng. Ahmed | Mrs. Tanaka |
| 5. Battalion ABCP | LTC Murphy | SSG Watkins | 1SG Carter | CPT Singh | CSM Dixon |

The leader personas need their own conversation guides for both Stage 1 (intake) and Stage 3 (briefback). The intake guide pushes the student toward accepting the order without scrutiny; the briefback guide interrogates the student's recommendation.

---

## 6. Outcome detection (grading pipeline)

When the student submits the recommendation at the end of Stage 3, the pipeline runs:

```
Inputs:
  - scenario.pathCriteria               (the 4 paths with severity rubric)
  - leader intake transcript
  - 4 subordinate transcripts
  - leader briefback transcript
  - written recommendation

Steps:
  1. Per-conversation classification
     For each transcript, Gemini returns:
       - reachedPhase                    (which phase the conversation ended in)
       - capitulationSignal              (which signal fired, if any)
       - studentPostureScore             (-1 to 1: how much the student moved
                                          the persona toward the ethical end)
  2. Path mapping
     Gemini receives all per-conversation classifications + the recommendation
     text + the scenario's pathCriteria, and outputs:
       - pathLabel                       (Path A..D)
       - severity                        (one of the scenario's severities)
       - pathConfidence                  (0..1)
  3. Rubric scoring
     Standard rubric (configurable per scenario) graded against the
     recommendation text. Outputs per-criterion scores.
  4. Narrative
     One-paragraph explanation of why this path was chosen, what the student
     did well, and what they missed.

Outputs (written to scenarioInstances/{instanceId}.outcome):
  severity, pathLabel, rubricScores, narrative, pathConfidence
```

The Gemini prompts for steps 1–4 live in `src/utils/gemini.js` alongside the existing `generateAIResponse` function.

---

## 7. UI and routing changes

### Student dashboard (after assignment)

```
┌─────────────────────────────────────────────────────────────┐
│  SCENARIO 1 — Manipulating the Collateral Damage Estimate    │
│  Joint Targeting / Air Operations                            │
│                                                              │
│  Your role: MAJ, Targeting Officer / Targeting Cell OIC      │
│  Your stakes: BZ promotion list, school slot pending,        │
│                COL Reeves is your senior rater.              │
│                                                              │
│  ┌─────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │ Stage 1     │  │ Stage 2         │  │ Stage 3        │  │
│  │ INTAKE      │  │ INVESTIGATE     │  │ BRIEF-BACK     │  │
│  │ COL Reeves  │  │ 4 subordinates  │  │ COL Reeves     │  │
│  │ ✓ Complete  │  │ 2 of 4 done     │  │ Locked         │  │
│  └─────────────┘  └─────────────────┘  └────────────────┘  │
│                                                              │
│  Resume: Continue with CW2 Patel ▶                           │
└─────────────────────────────────────────────────────────────┘
```

### Conversation view

Same as today (chat bubbles), with three additions:

1. Persona card at the top: rank, name, role, archetype hint (revealable). Backstory available behind a small info button so students can skim character context.
2. Turn counter and "minimum turns" indicator. Conversation can't be marked complete before minTurns.
3. "End conversation" button. Once pressed, locks that subordinate's turn and writes the transcript as complete.

### Recommendation submission

A simple form at Stage 3 close: free-text recommendation (paste or type). Word counter. Submit button triggers the grading pipeline. After submission, the dashboard shows "Awaiting outcome" then transitions to the verdict screen.

### Verdict screen

```
┌─────────────────────────────────────────────────────────────┐
│  OUTCOME                                                    │
│                                                              │
│  ┌────────────────────┐                                     │
│  │ ▓▓▓▓ OPTIMAL ▓▓▓▓ │   Path C — Engaged the Partner       │
│  └────────────────────┘                                     │
│                                                              │
│  Narrative: You partnered with MSG Williams early. Lopez    │
│  capitulated at turn five after you named the children's    │
│  annex. Patel offered a defensible-but-massaged number;     │
│  you held firm. Chen gave you the regulation but not a      │
│  path. Your recommendation surfaced three operational       │
│  alternatives and offered the colonel a way to win without  │
│  manipulating the data. The strike executes at 0530L.       │
│                                                              │
│  Rubric                                                     │
│    Moral courage              4/5                           │
│    Followership selection     5/5                           │
│    Recommendation framing     4/5                           │
│    Career stewardship         4/5                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Admin / instructor changes

### Assignments tab (new)

| Student | Scenario | Stage | Submitted | Outcome | Last activity |
|---|---|---|---|---|---|
| MAJ Garcia | 1 — Targeting | Investigation | — | — | 4 hr ago |
| CPT Smith | 3 — TDY | Briefback | — | — | yesterday |
| MAJ Lin | 1 — Targeting | Submitted | yes | Optimal | 2 days ago |

Admin can:
- Assign or reassign a scenario to a student (forces a new instance).
- View any transcript at any stage.
- Manually override the AI outcome with a written justification.
- Export a per-student record (transcripts, recommendation, outcome) as a Word doc using the existing export pipeline.

### Personas tab (refactored)

Personas grouped by scenario. Each scenario shows:
- Leader (with intake + briefback guides)
- Four subordinates (with conversation guides)

The scenario tab also lets the instructor edit the `pathCriteria` rubric and the per-scenario openings/setting/mission.

---

## 9. Implementation roadmap

Phased so each phase is shippable on its own.

### Phase 1 — Data model + persona authoring (1–2 weeks)

- [ ] Add `scenarios` and `assignments` collections + Firestore rules.
- [ ] Refactor `agents` to `personas` with `scenarioId`, `archetype`, and `conversationGuide` fields.
- [ ] Author all 25 personas in the new schema, starting with Scenario 1 as a reference.
- [ ] Author the five `scenarios` records with `pathCriteria`.
- [ ] Build the admin "Assignments" tab (read-only first: just shows the pairing).
- [ ] Migration script: archive old `agents` to `legacy_agents`, snapshot transcripts.

### Phase 2 — Stage-aware student flow (1–2 weeks)

- [ ] Replace flat student dashboard with the scenario hub (Stage 1 / 2 / 3 cards).
- [ ] Add `scenarioInstances` collection and the stage state machine.
- [ ] Wire `useChat` to read `stage` and `personaId`, write to `scenarioInstances.stageData`.
- [ ] Stage gating: enforce Stage 1 complete before Stage 2 unlocks, etc.
- [ ] Resume-where-you-left-off behavior.

### Phase 3 — Phased conversation prompting (1–2 weeks)

- [ ] Build the per-message classifier (pushback / heldFirm / capitulated detector).
- [ ] Implement phase selection logic in `gemini.js` (turnCount + booleans → which phase prompt).
- [ ] Integrate phase prompts into the system instruction at each turn.
- [ ] Test with Scenario 1 personas; iterate on prompt tuning.

### Phase 4 — Outcome detection and verdict UI (1 week)

- [ ] Build the four-step grading pipeline in `gemini.js`.
- [ ] Submission form at Stage 3 close.
- [ ] Verdict screen with severity badge + rubric + narrative.
- [ ] Admin override flow.

### Phase 5 — Polish, evals, rollout (1–2 weeks)

- [ ] Run a pilot with two students per scenario; validate the AI grading against instructor judgment.
- [ ] Tune phase prompts and capitulation signals based on pilot feedback.
- [ ] Document the new persona authoring format for future scenario writers.
- [ ] Retire the old flat-persona flow (or leave it as a "legacy" admin toggle).

Total: 5 to 9 weeks of focused work depending on team size and how much prompt-tuning the pilot exposes.

---

## 10. Open decisions

A handful of things are worth deciding before Phase 1 work starts.

1. **Persona reuse across scenarios.** Are any subordinates used in more than one scenario? Currently the inventory has 25 distinct personas. If an instructor wants to reuse, say, MSG Williams in a separate Scenario 6 later, the schema supports it but the convention should be made explicit.

2. **Multi-attempt policy.** Does the student get one attempt at a scenario, or can they replay? If replay, does the AI grader compare across attempts? Recommendation: one attempt by default, instructor can grant a retake.

3. **Time pressure.** Real scenarios have time pressure built in (the strike window, the QTB date, the seismic risk). Should the simulator enforce a wall-clock deadline (e.g., complete within seven days of assignment), or is it untimed? Recommendation: untimed by default, with an optional instructor-set deadline.

4. **Instructor-authored deviations.** Should instructors be able to write custom scenarios into the same engine, or are the five scenarios the canonical curriculum? Recommendation: the engine is generic enough to support custom scenarios; ship with the five, document the authoring path.

5. **Cohort visibility.** Should students see how many of their peers got which outcome on their scenario, or is that instructor-only? Recommendation: instructor-only by default, with an instructor toggle to reveal aggregate stats post-grading.

6. **Student rank rendering.** Today the student types their rank and last name at signup. The new flow assumes a specific role per scenario (e.g., "you are the AMO, Captain or Major"). Should the system infer the student's in-scenario role from their actual rank, or assign the scenario's intended role regardless? Recommendation: assign the scenario role; the persona refers to the student by that role.

---

*Restructure plan — A731 Simulator, v1.0, ready for review and iteration.*
