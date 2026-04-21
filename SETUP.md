# A731 Leadership Simulator — Setup Guide

This app runs on Firebase's **Spark (free) plan**. Only Firebase Auth and
Firestore are used. Firebase Storage is NOT required.

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com and create a new project. Stay on
   the **Spark** plan — do not upgrade to Blaze.
2. In the new project, open **Build → Authentication → Sign-in method** and
   enable **Email/Password**.
3. Open **Build → Firestore Database**, create a database in production mode,
   and pick a region close to you.
4. Open **Firestore → Rules** and paste the rules block below, then click
   Publish.
5. Open **Project settings → General → Your apps → Add app → Web**, register
   the web app, and copy the config object. You will need `apiKey`,
   `authDomain`, `projectId`, `messagingSenderId`, and `appId`.

### Firestore rules

Paste this in **Firestore → Rules** and Publish:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/public/data/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

This lets any signed-in user (student or instructor) read and write under the
app's data namespace. Tighten later if you want stricter role separation.

## 2. Get a Gemini API key

1. Go to https://aistudio.google.com/apikey and create an API key.
2. Copy it — you'll paste it into `.env.local` next.

## 3. Configure environment variables

```
cp .env.example .env.local
```

Edit `.env.local`:

```
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_GEMINI_MODEL=gemini-2.0-flash

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

VITE_APP_ID=a731-simulator
VITE_SUPER_ADMIN_PASSCODE=CPTAMERICA
```

No storage bucket needed.

## 4. Install and run locally

```
npm install
npm run dev
```

Open http://localhost:5173.

## 5. First run — admin setup

1. On the site-access screen, enter your super-admin passcode
   (`VITE_SUPER_ADMIN_PASSCODE`).
2. Go to the admin dashboard → **Security** tab → add one or more student
   access codes. Students will enter one of these to reach the signup screen.
3. **Lessons & Rubrics** tab — edit each lesson title and upload a rubric
   (.docx or .pdf). The text is extracted and saved; the original file isn't
   stored.
4. **Personas** tab — assign each persona to a lesson and set its `minTurns`
   if you want a longer conversation.
5. Sign out of admin and hand the student access code to your class.

## 6. Deploy to Vercel

### Option A — Vercel CLI

```
npm install -g vercel
vercel
```

### Option B — GitHub + Vercel dashboard

1. Push this folder to a GitHub repo.
2. In Vercel, import the repo.
3. Project Settings → Environment Variables — add every `VITE_*` value from
   your `.env.local`.
4. Deploy.

`.env.local` is gitignored and never committed. Always set env vars in
Vercel's dashboard for production.

Also add your production domain under **Firebase Auth → Settings →
Authorized domains**, or students will hit an auth error on signup.

## What the app does

- **Site-access gate** — a shared code keeps the public URL out of random
  hands before students sign up.
- **Email/password signup** — students create their own account with rank +
  last name.
- **Student dashboard** — three lessons, each a group of personas. Shows past
  chats, paper-submission status, and grade once the instructor runs grading.
- **Scenario chat** — Gemini-powered personas with a minimum-turns rule and
  probing follow-ups so conversations don't end early.
- **Paper submission** — paste or upload a .docx / .pdf / .txt summary per
  lesson. Text is extracted in-browser and saved to Firestore.
- **Admin dashboard**
  - Submissions & Grading: per-student, per-lesson view. "Grade & Export"
    calls Gemini to summarize the chat, compare it to the paper, score each
    rubric criterion, and download a Word doc with all of it.
  - All Transcripts, Personas, Lessons & Rubrics, Security.

## Cost expectations

- Firebase Spark: 50K reads / 20K writes / 20K deletes per day, 1 GiB stored.
  A typical class run stays well under that.
- Gemini: see https://ai.google.dev/pricing — flash models are very cheap per
  chat turn and per grading pass.
- Vercel Hobby: free for static SPA deploys.
