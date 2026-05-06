# A731 Pilot Preview

Stripped-down preview of the A731 Leadership Simulator, intended as the visual
and functional reference for the eventual port to Vantage Pilot.

## What's stripped out

- Firebase, authentication, user accounts
- Student assignment / instructor approval flows
- Submitted papers, grading, rubrics, transcripts admin
- Site access codes, super-admin passcodes, multi-key Gemini rotation
- Scenario 6 (Goliath / Acme Lock & Security) — removed for the Pilot transfer

## What's kept

- The five scenarios (1 through 5) and their personas
- The three-stage flow: leader intake → four subordinate archetypes → leader briefback
- A simple admin tab to edit personas and scenarios (passcode-gated)
- localStorage persistence so chats and edits survive a page refresh

## Run it

```bash
cd "pilot"
npm install
npm run dev
```

Then open the URL Vite prints (defaults to http://localhost:5174).

## Optional config

Create `pilot/.env.local`:

```
VITE_GEMINI_API_KEY=your_key_here
VITE_GEMINI_MODEL=gemini-2.0-flash
VITE_ADMIN_PASSCODE=pilot
```

Without a Gemini key the chat panel returns a stub message but the rest of the
UI is fully walkable. The default admin passcode is `pilot`.

## Reset

In the Admin tab, click "Reset to seed data" to wipe localStorage and reload the
seeded scenarios and personas.
