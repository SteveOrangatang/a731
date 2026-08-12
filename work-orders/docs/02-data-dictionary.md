# Data Dictionary

Two SharePoint lists. Machine-readable versions in `sharepoint/`.

Internal names matter: create each column with the short internal name FIRST (no spaces),
then rename the display name afterward. Flows and Power BI bind to internal names, and
SharePoint permanently keeps whatever name the column was created with.

## List 1: `Work Orders`

Settings: versioning **ON**, `Title` renamed to "WO Number", **enforce unique values** on
Title, indexed. Attachments ON (photos of completed work).

| Display name | Internal name | Type | Details |
|---|---|---|---|
| WO Number | `Title` | Single line | GMMS work order number. Unique, indexed. The join key for everything. |
| Description | `WODescription` | Multi-line (plain) | Problem description from GMMS |
| Work Type | `WorkType` | Choice | `Corrective`, `Preventive`, `Safety`, `Service Call`, `Project` — match your GMMS work type codes |
| Priority | `Priority` | Choice | `1 - Emergency`, `2 - Urgent`, `3 - Routine`, `4 - Low` — match GMMS priority scheme |
| Status | `WOStatus` | Choice | `New`, `Assigned`, `Scheduled`, `In Progress`, `On Hold - Parts`, `On Hold - Access`, `On Hold - Other`, `Completed`, `Closed in GMMS`, `Cancelled`. Default `New`. |
| Location | `Location` | Single line | Building / room / area string from GMMS |
| Asset | `AssetID` | Single line | Equipment/asset number if present |
| Shop | `Shop` | Choice | `HVAC`, `Electrical`, `Plumbing`, `Carpentry`, `Generator`, `Grounds`, `Other` — edit to your shops |
| Assigned To | `AssignedTech` | Person (multi) | Who's doing the work |
| Reported Date | `ReportedDate` | Date & time | From GMMS |
| Due Date | `DueDate` | Date only | Target finish from GMMS |
| Scheduled Date | `ScheduledDate` | Date only | Set by supervisor in the app |
| Scheduled Slot | `ScheduledSlot` | Choice | `AM`, `PM`, `All Day` — cheap scheduling granularity without calendar complexity |
| Completed Date | `CompletedDate` | Date & time | Stamped by the app on Complete |
| Completion Notes | `CompletionNotes` | Multi-line (plain) | What was done — this is what the lead keys into GMMS |
| Labor Hours | `LaborHours` | Number (1 decimal) | Total hours, all techs |
| Parts Used | `PartsUsed` | Multi-line (plain) | Free text; keyed into GMMS |
| Hold Reason | `HoldReason` | Multi-line (plain) | Why on hold; visible to supervisor |
| GMMS Sync | `GMMSSync` | Choice | `No Action Needed`, `Pending`, `Synced`. Default `No Action Needed`. **The write-back engine.** |
| Synced By | `SyncedBy` | Person | Stamped by Mark Synced |
| Synced Date | `SyncedDate` | Date & time | Stamped by Mark Synced |
| Ingest Source | `IngestSource` | Choice | `Report`, `Email`, `Manual` |
| Last Seen In GMMS | `LastSeenGMMS` | Date only | Stamped by Flow 1 on every row present in the latest export. Drives reconciliation. |
| Recon Flag | `ReconFlag` | Yes/No | Set by Flow 1 when an open item vanishes from the export (probably closed in GMMS). Default No. |

### Views to create

| View | Filter | Sort | For |
|---|---|---|---|
| Open Work | `WOStatus` not in Completed/Closed in GMMS/Cancelled | Priority, DueDate | default view |
| Sync Queue | `GMMSSync` = Pending | Modified asc (oldest first) | team leads |
| Recon Review | `ReconFlag` = Yes AND status open | Modified | weekly lead review |
| Today's Schedule | `ScheduledDate` = [Today] | Shop, ScheduledSlot | morning meeting |
| Completed This Week | `CompletedDate` >= [Today]-7 | CompletedDate desc | supervisors |

## List 2: `Team Roster`

Small reference list; drives app roles and the assignment picker.

| Display name | Internal name | Type | Details |
|---|---|---|---|
| Name | `Title` | Single line | Display convenience |
| Member | `Member` | Person | The actual account — the app matches on this |
| Role | `TeamRole` | Choice | `Technician`, `Team Lead`, `Supervisor` |
| Shop | `Shop` | Choice | Same values as Work Orders `Shop` |
| Active | `Active` | Yes/No | Default Yes; uncheck instead of deleting |

## Conventions

- **The WO number is sacred.** Everything joins on it. Manual items created before a GMMS
  number exists get `TMP-<initials>-<seq>` (e.g. `TMP-JD-001`) and are renamed to the
  real number when the lead creates the WO in GMMS.
- Status meanings: `Completed` = work done, awaiting GMMS entry. `Closed in GMMS` = the
  loop is fully closed. Power BI counts backlog as everything before `Completed`.
- Choice values above are starters. Match them to *your* GMMS codes before building the
  flows, then never rename them casually — flows and the app reference them literally.
