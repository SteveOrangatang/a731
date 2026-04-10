# A731 Leadership Simulator — Setup Guide

## 1. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```
cp .env.example .env.local
```

Then edit `.env.local`:

```
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_GEMINI_MODEL=gemini-2.0-flash

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

VITE_APP_ID=a731-simulator
VITE_SUPER_ADMIN_PASSCODE=CPTAMERICA
```

## 2. Install Dependencies

```
npm install
```

## 3. Run Locally

```
npm run dev
```

Open http://localhost:5173 in your browser.

## 4. Deploy to Vercel

### Option A — Vercel CLI
```
npm install -g vercel
vercel
```

### Option B — GitHub + Vercel Dashboard
1. Push this folder to your GitHub repo
2. In Vercel dashboard, import the repo
3. Add all your `VITE_*` environment variables in Project Settings → Environment Variables
4. Deploy

> **Important:** `.env.local` is gitignored and never committed. Always set env vars in Vercel's dashboard for production.

## What's New (vs. original Gemini build)

- **Persona Toggle** — In Admin → Personas, click the toggle icon to enable/disable any persona. Disabled personas are hidden from students.
- **Agent-Initiated Scenarios** — In Admin → Scenarios, create scenarios where the agent speaks first with a defined task or order. Flag scenarios as "Moral Courage Challenges" to tag them with a red badge.
- **Firebase + Gemini via env vars** — No more hardcoded keys.
- **Vercel-ready** — `vercel.json` handles SPA routing.
