# Power Apps source

`src/` holds Power Fx YAML for the app, in the modern canvas-app YAML format
(the one shown in Power Apps Studio's code view and used by `pac canvas` source files).

**How to use it:** the YAML control schema varies slightly between studio versions, so
treat these files as authoritative for *structure and formulas*, and paste at the level
that works in your tenant:

1. Best case — create a blank tablet app, open code view, and paste screen-by-screen.
2. If a paste is rejected, add the controls by hand and copy the formulas per property —
   every formula here also appears in `docs/05-build-power-app.md` with context.

Data sources required before pasting: `Work Orders` (SharePoint), `Team Roster`
(SharePoint), `Office 365 Users`.
