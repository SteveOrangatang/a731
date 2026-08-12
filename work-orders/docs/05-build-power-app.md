# Build Guide — Power App (Canvas)

Tablet layout (works fine on phones too, and supervisors will use desktops).
Data sources to add: `Work Orders` list, `Team Roster` list, **Office 365 Users**
(standard). Formulas below use display names as they appear once sources are added; if
your generated names differ (e.g. `'Work Orders'`), adjust.

`power-apps/src/` contains Power Fx YAML for these screens that you can paste into the
modern editor's code view (View → Code, or Ctrl+Shift+Y in studio). If the YAML schema
in your studio version rejects a paste, build the controls by hand from this guide —
every formula that matters is below.

## App.OnStart / named formulas

Prefer **named formulas** (App.Formulas) over OnStart where available:

```powerfx
// App.Formulas
nfMyEmail = Lower(User().Email);

nfMyRoster = LookUp('Team Roster', Lower(Member.Email) = nfMyEmail && Active);

nfMyRole = Coalesce(nfMyRoster.TeamRole.Value, "Technician");

nfIsSupervisor = nfMyRole = "Supervisor";
nfIsLead = nfMyRole = "Team Lead" || nfIsSupervisor;

nfOpenStatuses = ["New","Assigned","Scheduled","In Progress",
                  "On Hold - Parts","On Hold - Access","On Hold - Other"];

nfTechs = Filter('Team Roster', Active && TeamRole.Value <> "Supervisor");
```

```powerfx
// App.OnStart — keep light
Set(varSelectedWO, Blank());
```

## Screen 1 — `scrHome` (My Work)

- **Header label:** `"My Work — " & nfMyRole`
- **Toggle/segmented filter** (`inpShowAll`, supervisors only —
  `Visible: nfIsLead`): "Mine / All Open"
- **galMyWOs** (vertical gallery):

```powerfx
// Items
SortByColumns(
    Filter('Work Orders',
        WOStatus.Value in nfOpenStatuses,
        inpShowAll.Value || nfMyEmail in Lower(Concat(AssignedTech, Email & ";"))
    ),
    "Priority", SortOrder.Ascending,
    "DueDate", SortOrder.Ascending
)
```

  Template: WO Number + Priority badge, Description (2 lines), Location,
  Scheduled date/slot, Status pill.

```powerfx
// Priority badge Fill — dataviz-sane: red only for emergencies
Switch(ThisItem.Priority.Value,
    "1 - Emergency", ColorValue("#C42B1C"),
    "2 - Urgent",    ColorValue("#B8860B"),
    ColorValue("#5B5F66"))

// Row OnSelect
Set(varSelectedWO, ThisItem); Navigate(scrDetail)
```

- **Nav buttons:** Schedule Board (`Visible: nfIsLead`), Sync Queue
  (`Visible: nfIsLead`, badge: `CountRows(Filter('Work Orders', GMMSSync.Value = "Pending"))`).

> Delegation note: `in` on the person column isn't delegable, and that's fine at shop
> scale. If the list will exceed ~2,000 rows (delegation limit at max setting), archive
> `Closed in GMMS` items yearly to an archive list, or filter server-side on Shop first.

## Screen 2 — `scrDetail` (Work Order Detail)

Read-only fields from `varSelectedWO` (WO number, description, location, asset, priority,
due date, reported date, attachments via a form or `varSelectedWO.Attachments`).

**Action buttons** — each `Patch` writes the change AND the sync flag in one shot:

```powerfx
// btnStart — Visible: varSelectedWO.WOStatus.Value in ["Assigned","Scheduled","New"]
Patch('Work Orders', varSelectedWO, {
    WOStatus: {Value: "In Progress"},
    GMMSSync: {Value: "Pending"}
});
Set(varSelectedWO, LookUp('Work Orders', ID = varSelectedWO.ID))
```

```powerfx
// btnHold — opens a small container with drpHoldType + txtHoldReason, then:
Patch('Work Orders', varSelectedWO, {
    WOStatus: {Value: drpHoldType.Selected.Value},   // On Hold - Parts / Access / Other
    HoldReason: txtHoldReason.Text,
    GMMSSync: {Value: "Pending"}
});
```

```powerfx
// btnComplete — opens completion container: txtNotes (required), numHours, txtParts
If(IsBlank(txtNotes.Text) || IsBlank(numHours.Text),
    Notify("Completion notes and labor hours are required — the team lead keys these into GMMS.", NotificationType.Error),
    Patch('Work Orders', varSelectedWO, {
        WOStatus: {Value: "Completed"},
        CompletedDate: Now(),
        CompletionNotes: txtNotes.Text,
        LaborHours: Value(numHours.Text),
        PartsUsed: txtParts.Text,
        GMMSSync: {Value: "Pending"}
    });
    Notify("Completed — queued for GMMS entry.", NotificationType.Success);
    Back()
)
```

The validation line is deliberate: the completion notes ARE the GMMS write-back payload.
Garbage here means the lead has to chase the tech tomorrow.

## Screen 3 — `scrSchedule` (Schedule Board — supervisors/leads)

Two panes.

**Left — Unassigned queue** (`galUnassigned`):

```powerfx
SortByColumns(
    Filter('Work Orders', IsEmpty(AssignedTech), WOStatus.Value in nfOpenStatuses),
    "Priority", SortOrder.Ascending)
```

**Right — assignment panel** for the selected WO:

- `cmbTech` (combobox): `Items: nfTechs` — display `Title`, optionally filter by
  `Shop.Value = galUnassigned.Selected.Shop.Value` with an override toggle.
- `dteSched` (date picker), `drpSlot` (AM/PM/All Day).

```powerfx
// btnAssign.OnSelect
Patch('Work Orders', galUnassigned.Selected, {
    AssignedTech: ForAll(cmbTech.SelectedItems, Member),
    ScheduledDate: dteSched.SelectedDate,
    ScheduledSlot: {Value: drpSlot.Selected.Value},
    WOStatus: {Value: "Scheduled"}
});
Notify("Assigned.", NotificationType.Success)
```

(Assignment/scheduling doesn't set `GMMSSync = Pending` unless your GMMS also tracks
assignee — if it does, add the flag here too.)

**Load strip** (who's got what today) — small gallery over `nfTechs` with a count label:

```powerfx
CountRows(Filter('Work Orders',
    ScheduledDate = Today(),
    ThisItem.Member.Email in Concat(AssignedTech, Email & ";")))
```

## Screen 4 — `scrSyncQueue` (Team leads)

**galSync.Items:**

```powerfx
SortByColumns(Filter('Work Orders', GMMSSync.Value = "Pending"), "Modified", SortOrder.Ascending)
```

Template shows everything needed to key into GMMS without leaving the row: WO Number,
Status, Completion Notes, Labor Hours, Parts Used, tech name(s), how long it's been
pending (`DateDiff(ThisItem.Modified, Now(), TimeUnit.Hours) & "h"`).

```powerfx
// btnMarkSynced.OnSelect (per row)
Patch('Work Orders', ThisItem, {
    GMMSSync: {Value: "Synced"},
    SyncedBy: {
        '@odata.type': "#Microsoft.Azure.Connectors.SharePoint.SPListExpandedUser",
        Claims: "i:0#.f|membership|" & nfMyEmail,
        DisplayName: User().FullName,
        Email: nfMyEmail
    },
    SyncedDate: Now(),
    // work fully entered in GMMS and completed → close the loop
    WOStatus: If(ThisItem.WOStatus.Value = "Completed",
                 {Value: "Closed in GMMS"}, ThisItem.WOStatus)
})
```

Header stat labels: pending count, oldest pending age in hours — the two numbers that
tell a lead whether the battle rhythm is holding.

## Polish checklist

- App icon + name ("Shop Work Orders"), description mentioning it does NOT replace GMMS.
- Share the app with the same M365 group as the SharePoint site; share the lists as
  data sources when prompted.
- Settings → enable *Modern controls* if your tenant version has them (nicer comboboxes).
- Test as a plain technician account, not just as yourself.
