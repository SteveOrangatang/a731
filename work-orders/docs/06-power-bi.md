# Build Guide — Power BI

Read-only over the `Work Orders` list. Build last.

## Connection

Power BI Desktop → **Get Data → SharePoint Online List** → site URL →
select `Work Orders` → **Transform Data** (always transform; the raw list has 40+ junk
columns).

In Power Query:

1. Keep only: `Title`, `WODescription`, `WorkType`, `Priority`, `WOStatus`, `Location`,
   `Shop`, `ReportedDate`, `DueDate`, `ScheduledDate`, `CompletedDate`, `LaborHours`,
   `GMMSSync`, `SyncedDate`, `ReconFlag`, `Modified`.
2. Choice columns arrive as records → expand each to its `Value`.
3. Rename `Title` → `WO Number`. Set data types (dates as Date/Time, LaborHours as
   decimal).
4. Rename the query `WorkOrders`.

Publish to the service and set **scheduled refresh** (8× daily on Pro). If the tenant
blocks publishing, Power BI Desktop opened locally against the list still works for
weekly reviews.

## Date table

```dax
DimDate = CALENDAR(DATE(YEAR(TODAY())-1,1,1), EOMONTH(TODAY(),3))
```

Mark as date table; relate `DimDate[Date]` → `WorkOrders[ReportedDate]` (active) and use
`USERELATIONSHIP` for completed-date analysis, or simply build the two visuals that need
it off `CompletedDate` directly.

## Measures

```dax
Open WOs =
CALCULATE(COUNTROWS(WorkOrders),
    WorkOrders[WOStatus] IN {"New","Assigned","Scheduled","In Progress",
                             "On Hold - Parts","On Hold - Access","On Hold - Other"})

Overdue WOs =
CALCULATE(COUNTROWS(WorkOrders),
    WorkOrders[DueDate] < TODAY(),
    NOT WorkOrders[WOStatus] IN {"Completed","Closed in GMMS","Cancelled"})

On Hold WOs =
CALCULATE(COUNTROWS(WorkOrders),
    LEFT(WorkOrders[WOStatus], 7) = "On Hold")

Completed (7d) =
CALCULATE(COUNTROWS(WorkOrders),
    WorkOrders[CompletedDate] >= TODAY()-7)

Avg Days to Complete (30d) =
AVERAGEX(
    FILTER(WorkOrders,
        NOT ISBLANK(WorkOrders[CompletedDate]) &&
        WorkOrders[CompletedDate] >= TODAY()-30),
    DATEDIFF(WorkOrders[ReportedDate], WorkOrders[CompletedDate], DAY))

Labor Hours (30d) =
CALCULATE(SUM(WorkOrders[LaborHours]),
    WorkOrders[CompletedDate] >= TODAY()-30)

-- The write-back health tiles: leadership should see these
Sync Backlog =
CALCULATE(COUNTROWS(WorkOrders), WorkOrders[GMMSSync] = "Pending")

Oldest Pending (hrs) =
MAXX(FILTER(WorkOrders, WorkOrders[GMMSSync] = "Pending"),
     DATEDIFF(WorkOrders[Modified], NOW(), HOUR))

Recon Flags =
CALCULATE(COUNTROWS(WorkOrders), WorkOrders[ReconFlag] = TRUE())

Avg WO Age (Open) =
AVERAGEX(
    FILTER(WorkOrders,
        WorkOrders[WOStatus] IN {"New","Assigned","Scheduled","In Progress",
                                 "On Hold - Parts","On Hold - Access","On Hold - Other"}),
    DATEDIFF(WorkOrders[ReportedDate], TODAY(), DAY))
```

## Report layout (one page is enough to start)

- **Top KPI row:** Open WOs · Overdue WOs · Completed (7d) · Sync Backlog ·
  Recon Flags. Conditional color only where it means something (Sync Backlog red
  when Oldest Pending > 24h).
- **Backlog by Shop** — bar chart, `Open WOs` by `Shop`, sorted descending.
- **Backlog by Priority** — bar, ordered 1→4 (the `1 - Emergency` naming sorts itself).
- **Intake vs Completion trend** — line chart, count of WOs by `ReportedDate` week vs by
  `CompletedDate` week. Backlog grows when the first line stays above the second.
- **On-hold breakdown** — bar by hold status; long `On Hold - Parts` bars are a supply
  conversation, not a shop-performance conversation.
- **Detail table** — WO Number, Shop, Priority, Status, Due, Age — with slicers for
  Shop / Status / Priority.

Second page later if wanted: labor-hours by shop/tech, PM vs CM ratio (`WorkType`),
completion aging distribution.
