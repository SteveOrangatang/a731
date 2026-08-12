# SOP — GMMS Write-Back (Sync Queue)

GMMS is the system of record. Nothing on this network can write to it automatically, so
this SOP is the bridge. It is short on purpose: if the loop takes more than ~15 minutes a
day, something upstream is broken — fix that instead of skipping days.

## Who

Team leads (backup: supervisor). Named in the `Team Roster` list. At least two people
must know this SOP — the loop cannot depend on one person's presence.

## Battle rhythm

- **End of every shift** (recommended; daily minimum): work the Sync Queue to zero.
- **Weekly** (e.g. Friday): review the **Recon Review** list view.

## Daily procedure — Sync Queue to zero

1. Open the app → **Sync Queue** screen (or the `Sync Queue` list view — same data;
   the 06:00 digest email links straight to it).
2. For each item, oldest first:
   1. Open the WO in GMMS by WO number.
   2. Key in what changed — status, completion remarks (copy/paste from Completion
      Notes), labor hours, parts. The queue row shows everything; if it doesn't,
      that's tech feedback, not a reason to guess.
   3. Complete/close the WO in GMMS if the work is done.
   4. Back in the app: tap **Mark Synced**. This stamps you and the timestamp, and
      moves completed items to `Closed in GMMS`.
3. Item can't be synced (GMMS rejects it, WO missing, data doesn't make sense)?
   **Do not Mark Synced.** Leave it pending, note the problem in Hold Reason / a comment,
   and flag the tech or supervisor. Pending-and-old is visible; silently skipped is not.
4. Queue at zero → done. Tomorrow's digest not arriving means nothing was pending —
   or the flow died. If you *know* items are pending and no digest came, tell the builder.

## Weekly procedure — Recon Review

Items in **Recon Review** were open on our board but vanished from the GMMS export:
someone closed, cancelled, or renumbered them in GMMS directly.

For each: check the WO in GMMS → if genuinely closed/cancelled there, set the item's
status to `Closed in GMMS` (or `Cancelled`) and clear the Recon flag; if it's a GMMS
report filter problem, clear the flag and tell the builder.

## Manual work orders (TMP numbers)

Work that starts in the field before GMMS knows about it gets created in the app with a
`TMP-` number. During the daily sync: create the real WO in GMMS, then **rename the
item's WO Number to the real GMMS number**. Never let TMP numbers live longer than one
sync cycle.

## The one metric that matters

**Oldest pending item age.** Under 24 hours: healthy. Over 48 hours: the dashboard is
lying to leadership and GMMS is lying to everyone above them. It's on the Power BI page
for exactly that reason.
