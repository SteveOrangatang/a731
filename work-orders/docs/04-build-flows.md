# Build Guide — Power Automate Flows

All flows use **standard connectors only**: SharePoint, Office 365 Outlook, Excel Online
(Business), Content Conversion. Build in this order. Replace `<site>` with your site URL
everywhere.

> **Before you build:** put a real GMMS notification email and a real report export next
> to the samples in `samples/`. Every expression below anchors on literal label text
> (`Work Order:`, column headers, etc.) — adjust the anchors to match your real format
> once, and they'll run forever.

---

## The upsert pattern (used by both intake flows)

Never blindly create items — GMMS will re-send and re-export the same WOs daily.

1. **Get items** (SharePoint) on `Work Orders` with Filter Query:
   ```
   Title eq '@{outputs('WONumber')}'
   ```
   Top Count `1`.
2. **Condition**: `length(outputs('Get_items')?['body/value'])` **is greater than** `0`
   - **Yes →** Update item (ID = `first(outputs('Get_items')?['body/value'])?['ID']`)
   - **No →** Create item

When updating from GMMS, **only write GMMS-owned fields** (status from GMMS, priority,
due date, description, `LastSeenGMMS`). Never overwrite `AssignedTech`, `ScheduledDate`,
`CompletionNotes`, `LaborHours`, or `GMMSSync` from an intake flow — those belong to the
team, and clobbering them is how trust dies.

Status mapping on update: only move status *forward* from GMMS data. Practical rule: if
GMMS says the WO is closed/completed, set `WOStatus = Closed in GMMS`; otherwise leave
`WOStatus` alone on existing items (GMMS statuses like WAPPR/APPR are only interesting on
first creation, where they map to `New`).

---

## Flow 1 — Report intake + reconciliation (preferred path)

**Best version — Excel:** Ask your GMMS admin for a **daily scheduled report** of all
open work orders, exported as **Excel**, emailed to a shared mailbox. If GMMS can only do
CSV, see the CSV variant below. This flow is worth fighting for: it is the only path that
gives you reconciliation.

**Trigger:** Office 365 Outlook — *When a new email arrives (shared mailbox)* (or plain
*When a new email arrives* on the mailbox that gets the report). Filter: From = the GMMS
sender, Subject contains the report name, Has Attachments = Yes.

**Steps:**

1. **Apply to each** over `triggerOutputs()?['body/attachments']` →
   **Create file** (SharePoint) in the `GMMS Exports` library.
   File name: `@{item()?['name']}` — or prefix with `@{utcNow('yyyy-MM-dd')}-`.
   File content: `@{base64ToBinary(item()?['contentBytes'])}`
2. **List rows present in a table** (Excel Online (Business)) on the file just created.
   - *Gotcha:* this action needs the data formatted **as a table** inside the workbook.
     If GMMS exports a plain sheet, one-time fix: ask for the export "formatted as
     table," or use the CSV variant which needs no table.
3. **Compose — RunDate:** `utcNow('yyyy-MM-dd')`
4. **Apply to each row** → Compose the key fields from the row's columns
   (e.g. `item()?['Work Order']`, `item()?['Description']` — match the report's real
   column headers), then run the **upsert pattern**. On both create and update, set:
   - `LastSeenGMMS` = RunDate
   - `IngestSource` = `Report` (create only)
   - `ReconFlag` = `No`
5. **Reconciliation — after the loop.** **Get items** on `Work Orders`, Filter Query:
   ```
   LastSeenGMMS lt '@{outputs('RunDate')}' and GMMSSync ne 'Pending' and WOStatus ne 'Completed' and WOStatus ne 'Closed in GMMS' and WOStatus ne 'Cancelled'
   ```
   **Apply to each** result → **Update item**: `ReconFlag = Yes`.
   These are open items that disappeared from the GMMS export — almost always closed or
   cancelled in GMMS by someone outside the team. They surface in the **Recon Review**
   view instead of silently rotting on the schedule board.
   (Items with `GMMSSync = Pending` are excluded — they're mid-write-back; expect them to
   drop out of the export only after the lead keys them in.)

**CSV variant** (replaces steps 2–4a): skip Excel; take the attachment content as text —
`base64ToString(item()?['contentBytes'])` — then:

- Lines: `skip(split(outputs('CsvText'), decodeUriComponent('%0D%0A')), 1)` (skip header;
  if your file uses bare `\n`, use `%0A`)
- Apply to each line (skip empties: condition `length(trim(item())) > 0`), fields by
  position: `trim(split(item(), ',')[0])`, `[1]`, etc.
- *Caveat:* naive comma-splitting breaks if descriptions contain commas. If they do,
  ask for pipe-delimited or tab-delimited export (`decodeUriComponent('%09')` for tab),
  or fall back to the Excel path.

---

## Flow 2 — Email notification intake (near-real-time)

**Trigger:** Office 365 Outlook — *When a new email arrives*. Filter: From = GMMS
notification sender; Subject Filter: whatever is constant in the subject
(e.g. `Work Order`).

**Steps:**

1. **Html to text** (Content Conversion) on `triggerOutputs()?['body/body']` — GMMS
   emails are usually HTML; this flattens them so line-based parsing works.
2. **One Compose per field**, named clearly (`WONumber`, `WODesc`, `WOPriority`, …).
   The canonical extraction expression — "text after the label, up to end of line":
   ```
   trim(first(split(last(split(outputs('PlainText'), 'Work Order:')), decodeUriComponent('%0A'))))
   ```
   Swap `'Work Order:'` for each label: `Description:`, `Priority:`, `Location:`,
   `Asset:`, `Target Finish:`, `Status:` — whatever the real email says
   (see `samples/sample-gmms-email.txt`, then your real one).
   - If a label can appear in body text too, anchor on the more unique form
     (e.g. `'Priority:'` with the leading newline: `decodeUriComponent('%0A')` +
     `'Priority:'`).
   - WO number from the *subject* is often the most reliable:
     `first(split(last(split(triggerOutputs()?['body/subject'], 'Work Order ')), ' '))`
3. **Map GMMS values to list choices** where needed, e.g. priority:
   ```
   if(equals(outputs('WOPriority'),'1'),'1 - Emergency', if(equals(outputs('WOPriority'),'2'),'2 - Urgent', if(equals(outputs('WOPriority'),'3'),'3 - Routine','4 - Low')))
   ```
4. **Upsert pattern** keyed on `WONumber`. On create: `IngestSource = Email`,
   `WOStatus = New`. On update: GMMS-owned fields only (see rules above).
5. **(Optional)** If Priority = `1 - Emergency`, post to the shop's Teams channel
   (Teams connector, standard) or send a push email to the duty supervisor.

**Parser durability tips:** keep each field in its own Compose so a format change breaks
one visible step, not a buried expression; when GMMS changes its template, open the run
history, copy the new plain-text body, fix the anchors, done.

---

## Flow 3 — Sync Queue digest

**Trigger:** Recurrence — daily `06:00` local (add a second run at `15:00` if leads sync
twice a day).

1. **Get items** on `Work Orders`, Filter Query: `GMMSSync eq 'Pending'`,
   Order By `Modified asc`.
2. **Condition:** `length(body('Get_items')?['value'])` greater than `0`.
   No → terminate quietly. (No email = nothing pending. An *expected* digest that stops
   arriving is also your canary that the flow died.)
3. Yes → **Create HTML table** (Data Operations) with columns: WO Number, Status,
   Completion Notes, Labor Hours, Parts Used, Modified.
4. **Send an email (V2)** to the team leads:
   Subject: `GMMS Sync Queue — @{length(body('Get_items')?['value'])} item(s) pending`.
   Body: the HTML table + a link to the **Sync Queue** list view.

---

## Flow 4 — Overdue & stale alert (optional)

**Trigger:** Recurrence — weekdays `06:30`.

1. **Get items**, Filter Query:
   ```
   DueDate lt '@{utcNow('yyyy-MM-dd')}' and WOStatus ne 'Completed' and WOStatus ne 'Closed in GMMS' and WOStatus ne 'Cancelled'
   ```
2. Also useful: items `On Hold - Parts` untouched for 14+ days
   (`Modified lt '@{addDays(utcNow(),-14)}'`).
3. Same HTML-table-email pattern as Flow 3, to supervisors.

---

## Flow 5 — Planner mirror (optional, one-way)

Only if your techs live in Teams and want tasks there. List → Planner only.

- **Trigger:** SharePoint — *When an item is created or modified* on `Work Orders`.
- Create a Planner task titled `@{Title}: @{WODescription}` in the shop's plan/bucket on
  creation (store the returned Task ID in a `PlannerTaskID` text column you add to the
  list); mark the Planner task complete when `WOStatus` reaches `Completed`.
- Never flow Planner edits back to the list — one-way keeps one truth.

---

## Flow error handling (all flows)

- Power Automate emails you on flow failures by default — don't turn that off.
- In Flow 1/2, wrap the parse-and-upsert in a **Scope**; add a parallel Scope with *Run
  after: has failed* that emails you the item that broke plus
  `result('Scope_Parse')` — you'll fix format drift in minutes instead of discovering it
  weeks later.
- Once stable, change flow ownership to a shared/service account or add co-owners so a
  PCS/departure doesn't orphan the automation.
