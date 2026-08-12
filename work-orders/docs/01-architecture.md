# Architecture

## Problem statement

GMMS holds all work orders and is the mandated system of record, but it is painful to use
for day-to-day shop operations: scheduling, assignment, status visibility, and completion
capture. The network (OpenNet) blocks premium connectors, custom connectors, and any
direct integration with GMMS. GMMS can push data *out* only via email notifications and
(likely, since it is report-driven) scheduled report exports. Nothing can push data *in*.

## Solution shape

A one-way automated pipe from GMMS into a SharePoint list, a Power App on top of the list
for the daily work, Power BI for management visibility, and a **deliberate human
write-back loop** ("swivel-chair integration") with tooling that makes the manual step
small, visible, and auditable instead of an invisible failure point.

This is a well-worn pattern. The thing that kills these systems is never the ingest —
it's the write-back drifting until the two systems disagree and everyone stops trusting
the dashboard. The design below spends most of its effort on exactly that.

## Components

### 1. SharePoint list `Work Orders` — the backbone

- Single flat list, one row per GMMS work order, keyed on **WO Number** (`Title`,
  enforced unique).
- Versioning ON — every change is audited for free, no history table needed.
- All other components read/write this list. If a decision ever comes down to "put logic
  in the app or put a column on the list," put the column on the list — flows and
  Power BI can't see app logic.

Why not Planner as the store? Planner has no custom fields, no unique keys, weak
filtering, and poor Power BI access. It can be a *mirror* for people who live in Teams
(optional Flow 5), but it cannot be the source of truth.

### 2. Ingest flows (Power Automate, standard connectors)

**Flow 1 — Report intake (preferred).** GMMS (Maximo-based systems generally can do this)
emails a scheduled report — ideally Excel, CSV acceptable — daily to a shared mailbox, or
a person saves it to a SharePoint library. The flow parses rows and **upserts** by WO
number: update if the WO exists, create if new. It also stamps `Last Seen In GMMS` on
every row present in the export.

The stamp is what makes **reconciliation** free: any open item in the list whose
`Last Seen In GMMS` is older than the latest export was closed/cancelled in GMMS by
someone else — the flow flags it for review instead of letting it rot on the board.

**Flow 2 — Email intake.** Parses GMMS notification emails (new WO, status change) with
plain-text expressions. Faster (near-real-time) but only as rich as the notification.
Run both if you can: email for speed, report for completeness + reconciliation.

**Flow 3 — Sync Queue digest.** Daily (or twice daily) email to team leads listing every
item with `GMMS Sync = Pending`. No pending items → no email.

**Flow 4 — Aging/overdue alert (optional).** Daily supervisor summary of overdue and
stale items.

**Flow 5 — Planner mirror (optional).** Creates/completes Planner tasks from list items
for Teams visibility. One-directional (list → Planner) to avoid split-brain.

### 3. Power App (canvas, tablet/phone layout)

Four screens:

| Screen | Audience | Purpose |
|---|---|---|
| Home / My Work | Technicians | My assigned WOs today, tap into detail |
| Work Order Detail | Everyone | Full record; Start / Hold / Complete actions; completion notes + labor hours |
| Schedule Board | Supervisors | Unassigned queue, assign tech + date, see load by tech/day |
| Sync Queue | Team leads | Everything pending GMMS entry; "Mark Synced" button |

Role gating comes from the `Team Roster` list (Technician / Team Lead / Supervisor), which
also drives the assignment dropdown — one list, two jobs.

Every action a tech takes that must reach GMMS (status change, completion, hours) sets
`GMMS Sync = Pending` automatically inside the same `Patch`. Nobody has to remember.

### 4. Power BI

Reads the SharePoint list directly (standard SharePoint Online List connector, works on
OpenNet-class tenants). Backlog, aging, completion rate, on-hold reasons, and — pointedly
— **sync backlog age**, so leadership sees when the write-back loop is slipping.

### 5. The write-back loop (docs/07)

- Tech completes work in the app → item goes `Pending`.
- Team lead works the Sync Queue at a set battle rhythm (recommended: end of each shift),
  keys the data into GMMS, taps **Mark Synced** (stamps who + when).
- Reconciliation (Flow 1's `Last Seen` stamp + a weekly view review) catches both failure
  directions: things we changed that never made it into GMMS, and things GMMS changed
  that we never saw.

## Data flow summary

| # | From | To | How | Trigger |
|---|---|---|---|---|
| 1 | GMMS | Shared mailbox / SP library | Scheduled report export | GMMS scheduler |
| 2 | Report | `Work Orders` list | Flow 1 upsert | File/email arrives |
| 3 | GMMS | Shared mailbox | Notification email | GMMS event |
| 4 | Email | `Work Orders` list | Flow 2 parse + upsert | Email arrives |
| 5 | List | Techs/supervisors | Power App | Interactive |
| 6 | App | List | `Patch` (+ auto `Pending`) | User action |
| 7 | List | Team leads | Flow 3 digest + Sync Queue | Daily schedule |
| 8 | Team lead | GMMS | **Manual keying** | Battle rhythm |
| 9 | List | Leadership | Power BI | Scheduled refresh |

## Failure modes and mitigations

| Failure | Mitigation |
|---|---|
| GMMS changes its email/report format | Parsers isolated in one Compose step per field; samples kept in `samples/`; fix is a 10-minute expression edit |
| Duplicate WOs on re-ingest | Upsert by unique WO number; `Title` uniqueness enforced at the list |
| Write-back skipped / forgotten | Auto-`Pending` flag, daily digest, Sync Queue screen, synced-by/when audit stamps, Power BI sync-age tile |
| GMMS closed a WO we still show open | `Last Seen In GMMS` reconciliation flag |
| Someone edits the list directly and breaks data | List versioning; app is the encouraged path; restrict list editing to team members |
| Flow silently fails | Power Automate failure notifications to the builder; digest email absence is itself a signal |

## Why not OCR?

AI Builder (the supported OCR path in cloud flows) is premium and constrained in
government cloud environments, and OCR of tabular report PDFs mis-reads exactly the
fields that matter (WO numbers, dates). If GMMS can produce *any* structured export —
even an emailed CSV — that path wins on every axis. Keep OCR as the documented fallback
of last resort (Power Automate Desktop, attended on a workstation, has free OCR actions —
subject to local IT policy) but exhaust the report/email options first.
