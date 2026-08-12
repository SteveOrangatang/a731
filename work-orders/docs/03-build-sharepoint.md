# Build Guide — SharePoint

Time: about an hour. Do this first; everything else binds to it.

## 1. Site

Use an existing team site if the shop already has one, or create a new Team site
(e.g. **Facilities Work Orders**). Members = all techs, leads, supervisors. Owners = you
plus one backup. Avoid a site that's shared with a wider audience — list permissions
stay simple if site membership *is* the access list.

Also create one document library: **GMMS Exports** (used by Flow 1 if the report lands as
a file; also where you archive the emailed exports).

## 2. Create the lists

For each list: **New → List → Blank list**.

Create every column with its **internal name first** (the name in
`docs/02-data-dictionary.md`, no spaces), then rename to the display name. Column types
and choice values are all in the data dictionary — work down the table top to bottom.

`Work Orders` specifics:

1. Rename `Title` display name to **WO Number** (List settings → Title column).
2. List settings → Title column → **Enforce unique values: Yes** (this also indexes it).
3. List settings → Versioning settings → **Create a version each time…: Yes** (keep 100).
4. Advanced settings → Attachments: **Enabled**.
5. Choice columns: enter values exactly as in the dictionary (including the `1 - Emergency`
   numbering — it makes alphabetical sort equal priority sort everywhere for free).
6. Defaults: `WOStatus` → `New`; `GMMSSync` → `No Action Needed`; `ReconFlag` → `No`.

`Team Roster`: five columns, two minutes. Populate it now — the app won't let anyone in
who isn't on it.

## 3. Views

Create the five views from the data dictionary (`Open Work`, `Sync Queue`,
`Recon Review`, `Today's Schedule`, `Completed This Week`). Set **Open Work** as default.

View filters use display names; `[Today]` works in view filters for date comparisons
(`ScheduledDate` is equal to `[Today]`; `CompletedDate` is greater than `[Today]-7`).

For **Sync Queue**, add these columns to the view: WO Number, Status, Completion Notes,
Labor Hours, Parts Used, Assigned To, Modified. That view *is* the lead's data-entry
checklist — it should contain everything they need to key into GMMS without opening items.

## 4. Permissions sanity check

- Site members (techs) need **Edit** on both lists — default Members group is fine.
- Do not break inheritance per-item; the app enforces role behavior, and versioning
  covers accountability. Complexity here is where SharePoint projects go to die.

## 5. Seed test data

Add 3–5 fake work orders by hand covering: one `New` unassigned, one `Scheduled` for
today, one `In Progress`, one `Completed` + `GMMSSync = Pending`. You'll use these to
build the app before the flows are live.
