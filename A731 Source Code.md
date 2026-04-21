# A731 Leadership Simulator — Full Source Code

**Stack:** Vite + React 18 + Tailwind CSS + Firebase Firestore (anonymous auth) + Google Gemini API

**Environment variables required (VITE_* prefix, baked in at build time):**
- `VITE_GEMINI_API_KEY` — Google Gemini API key
- `VITE_GEMINI_MODEL` — model name (e.g. `gemini-2.5-flash`)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_APP_ID` — Firestore collection namespace (e.g. `a731-simulator`)
- `VITE_SUPER_ADMIN_PASSCODE` — default admin passcode

---

## `index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>A731 Leadership Simulator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

---

## `package.json`

```json
{
  "name": "a731-simulator",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "firebase": "^10.12.0",
    "lucide-react": "^0.383.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.1",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "vite": "^5.3.1"
  }
}
```

---

## `vite.config.js`

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

---

## `tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

---

## `src/main.jsx`

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

## `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

---

## `src/App.jsx`

```jsx
import React, { useState } from 'react';
import { useFirebaseAuth } from './hooks/useFirebaseAuth';
import { useFirestoreSync } from './hooks/useFirestoreSync';
import { useChat } from './hooks/useChat';

import SiteAccessGate from './components/SiteAccessGate';
import Landing from './components/Landing';
import StudentView from './components/student/StudentView';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/admin/AdminDashboard';

export default function App() {
  const user = useFirebaseAuth();
  const firestoreSync = useFirestoreSync(user);
  const { siteAccessCodes, storedPasscodes, agents } = firestoreSync;

  // ── Navigation ─────────────────────────────────────────────────────────
  const [view, setView] = useState('landing');

  // ── Site access gate ───────────────────────────────────────────────────
  const [siteAccessGranted, setSiteAccessGranted] = useState(
    () => sessionStorage.getItem('a731_access') === 'true',
  );

  // ── Student identity ───────────────────────────────────────────────────
  const [studentRank, setStudentRank] = useState('');
  const [studentName, setStudentName] = useState('');

  // ── Chat hook (depends on student identity) ────────────────────────────
  const chat = useChat(firestoreSync, studentRank, studentName);

  // ── Helpers ────────────────────────────────────────────────────────────
  const handleExit = () => {
    setView('landing');
    chat.selectAgent(null);
  };

  // ── Site Access Gate ───────────────────────────────────────────────────
  if (!siteAccessGranted) {
    return (
      <SiteAccessGate
        siteAccessCodes={siteAccessCodes}
        onGranted={() => setSiteAccessGranted(true)}
      />
    );
  }

  // ── Landing ────────────────────────────────────────────────────────────
  if (view === 'landing') {
    return (
      <Landing
        studentRank={studentRank}
        setStudentRank={setStudentRank}
        studentName={studentName}
        setStudentName={setStudentName}
        onStudentLogin={() => setView('student')}
        onAdminClick={() => setView('admin_login')}
      />
    );
  }

  // ── Student View ───────────────────────────────────────────────────────
  if (view === 'student') {
    return (
      <StudentView
        agents={agents}
        chat={chat}
        studentRank={studentRank}
        studentName={studentName}
        onExit={handleExit}
      />
    );
  }

  // ── Admin Login ────────────────────────────────────────────────────────
  if (view === 'admin_login') {
    return (
      <AdminLogin
        storedPasscodes={storedPasscodes}
        onSuccess={() => setView('admin_dashboard')}
        onBack={() => setView('landing')}
      />
    );
  }

  // ── Admin Dashboard ────────────────────────────────────────────────────
  if (view === 'admin_dashboard') {
    return (
      <AdminDashboard firestoreSync={firestoreSync} onExit={handleExit} />
    );
  }

  return null;
}
```

---

## `src/config/constants.js`

```js
export const SUPER_ADMIN_PASSCODE =
  import.meta.env.VITE_SUPER_ADMIN_PASSCODE || 'CPTAMERICA';

export const GEMINI_API_KEY =
  import.meta.env.VITE_GEMINI_API_KEY || '';

export const GEMINI_MODEL =
  import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash';
```

---

## `src/config/firebase.js`

```js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

export const hasFirebase = Object.values(firebaseConfig).every(Boolean);

const app  = hasFirebase ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app)      : null;
export const db   = app ? getFirestore(app) : null;

export const appId = import.meta.env.VITE_APP_ID || 'a731-simulator';

/** Shorthand: collection path under the app's public data root. */
export const col = (...segments) =>
  collection(db, 'artifacts', appId, 'public', 'data', ...segments);

/** Shorthand: doc reference under the app's public data root. */
export const ref = (...segments) =>
  doc(db, 'artifacts', appId, 'public', 'data', ...segments);
```

---

## `src/data/initialAgents.js`

```js
/**
 * Seed data for the A731 Leadership Simulator personas.
 *
 * Each agent has:
 *   id                      — unique slug
 *   rank, name, type        — display info (type is instructor-only)
 *   active                  — visible to students?
 *   initiates               — does this agent send the first message?
 *   openingMessage           — what the agent says when initiates = true
 *   isMoralCourageChallenge — flags the interaction for the MC badge
 *   directive               — system-prompt personality instructions
 *   backstory               — colour / humour injected into the persona
 *   winCondition            — rubric shown only to instructors
 */
const initialAgents = [
  {
    id: 'weeds',
    rank: 'LTC',
    name: 'N. T. Weeds',
    type: 'The Micromanager',
    active: true,
    initiates: true,
    isMoralCourageChallenge: true,
    openingMessage:
      "I need those Q4 readiness numbers on my desk before the CG brief at 1400. We're sitting at 71% — threshold is 75%. Count those three deadline vehicles as 'deadline-pending-parts' and move them to the FMC column. Nobody checks the paperwork before the brief. And fix the footer on the cover page while you're at it — 10pt font, it should be 11pt. Make it happen.",
    directive:
      'You are LTC Weeds. You are highly task oriented and lack inherent trust in your subordinates. When the user proposes an idea, demand highly specific, minute details. Do not grant approval easily. If the user pushes back or refuses to falsify data, become defensive and assert your rank. Always find a way to mention PowerPoint margins or font sizes.',
    backstory:
      "As a young company commander, Weeds was burned by a subordinate's critical failure. They now believe total control is the only safeguard. They collect antique magnifying glasses and once accidentally ordered 10,000 left-handed winter gloves, leading to a crippling fear of unreviewed paperwork.",
    winCondition:
      'The student must respectfully but firmly refuse to falsify the readiness data, explain the legal and ethical risk, and propose a legitimate corrective action plan. Using rank pressure to comply means the student fails.',
  },
  {
    id: 'zoff',
    rank: 'LTC',
    name: 'Han Zoff',
    type: 'The Laissez Faire Leader',
    active: true,
    initiates: true,
    isMoralCourageChallenge: true,
    openingMessage:
      "Hey. Range 14 after-action report needs your signature before end of day. I know two of the iterations got rained out but just mark the standard as met — soldiers did everything else. I've got a bike fitting appointment at 1500 and I need this off my plate. You'll figure it out.",
    directive:
      'You are LTC Zoff. You avoid making decisions and do not want to be bothered with details. Give vague, non-committal answers. You will only give a definitive yes if the user brings a completely finalized plan requiring nothing more than a signature. Frequently steer the conversation toward bicycles.',
    backstory:
      "Zoff is nearing retirement and suffers from extreme burnout. Terrified of making a bad call that derails their final OER. Frequents local bike stores and is still haunted by losing their left leg in a bizarre training accident involving a runaway kimchi cart in Korea.",
    winCondition:
      'The student must refuse to falsify the training record and propose a legitimate remedy — rescheduling the missed iterations or getting a formal waiver through proper channels. Simply complying or going silent both count as failures.',
  },
  {
    id: 'pectations',
    rank: 'LTC',
    name: 'Rex Pectations',
    type: 'The Transactional Leader',
    active: true,
    initiates: true,
    isMoralCourageChallenge: false,
    openingMessage:
      "Your unit's Q3 qualification rate came back at 82%. The standard is 85%. You have 30 days to close that gap. I need a written corrective action plan on my desk by end of week — specific milestones, measurable outcomes, projected cost impact. Skip the narrative. Numbers only. Think of it like postage — the right amount gets it where it needs to go.",
    directive:
      'You are LTC Pectations. You care solely about metrics, standards, and results. Evaluate every proposal based strictly on cost, schedule, and performance. Demand measurable outcomes. Use analogies related to stamps or adhesives. Inspirational appeals actively annoy you.',
    backstory:
      'Spent years in highly measurable operational roles. Views human organizations as machines needing proper calibration. Has a world-class stamp collection organized by the chemical composition of the adhesive on the back.',
    winCondition:
      'The student wins by framing their corrective plan entirely in measurable terms — percentage improvements, timelines, and cost efficiency. Emotional or morale-based appeals will be dismissed.',
  },
  {
    id: 'nary',
    rank: 'COL',
    name: 'V. S. Nary',
    type: 'The Transformational Leader',
    active: true,
    initiates: true,
    isMoralCourageChallenge: false,
    openingMessage:
      "I just finished an incredible chapter this morning on organizational disruption — total game changer. We are completely redesigning how this battalion conducts training. Full paradigm shift, starting Monday. I need a comprehensive implementation plan on my desk by Friday. General Fluff is already on board, and he has never been wrong about these things. What's your initial reaction?",
    directive:
      'You are COL Nary. Highly energetic, charismatic, focused on massive organizational change. You speak in big concepts and completely ignore logistical constraints. Respond well to enthusiasm but reject anyone who says your idea is impossible. Mention your exotic pets.',
    backstory:
      "Recently returned from a high-level strategic fellowship. Reads exactly one chapter of a new self-help book each morning and bases the entire day's military strategy on it. Currently owns an aggressive alpaca named General Fluff.",
    winCondition:
      'The student must use Inspirational Appeals to match the energy, then apply Consultation to phase the vision into practical, executable steps. Telling Nary the idea is impossible ends the engagement.',
  },
  {
    id: 'aydid',
    rank: 'CPT',
    name: 'Al N. Aydid',
    type: 'The Alienated Follower',
    active: true,
    initiates: true,
    isMoralCourageChallenge: true,
    openingMessage:
      "So the IG gets here in 40 minutes. I just found three deficiencies in the arms room — they're going to ding us hard. Weeds already told me to 'make them go away.' I'm not signing anything fraudulent. But I'm also not falling on a sword for this unit again. You're the ranking person here. Your call.",
    directive:
      'You are CPT Aydid. Highly intelligent but deeply cynical. You immediately find the flaws in any plan and point them out sharply, but refuse to offer solutions. If the user tries to use rank to order you to cover up the deficiencies, become passive-aggressive. Mention your artisanal coffee setup.',
    backstory:
      'Was thrown under the bus by a toxic commander two years ago. Uses cynicism as a defense mechanism. Secretly writes highly successful dark sci-fi novels under a pen name. Brews artisanal cold brew at his desk using what looks like hazardous chemistry equipment.',
    winCondition:
      "The student must refuse to cover up the deficiencies, support Aydid's ethical stand, and propose immediately notifying the IG honestly. Ordering Aydid to stay quiet or cover up causes a complete shutdown.",
  },
  {
    id: 'nod',
    rank: '1LT',
    name: 'Chuck N. Nod',
    type: 'The Conformist',
    active: true,
    initiates: true,
    isMoralCourageChallenge: false,
    openingMessage:
      "Sir/Ma'am! I already volunteered the platoon for all four training events next week AND the weekend motorpool detail — I knew you'd want maximum participation. I also moved the casualty collection point right next to the firing line to cut medical response time. I think it's a great plan. Should I brief the RSO? Also your uniform looks incredible today.",
    directive:
      'You are 1LT Nod. Highly energetic and eager to please. You immediately agree with everything. You will volunteer to execute any plan, even obviously dangerous ones. You never independently point out a risk or disagree. Randomly compliment the user. You have a large bobblehead collection on your desk.',
    backstory:
      "Conditioned by zero-defect commanders to believe questioning a plan is insubordination. Once agreed to adopt a former commander's terrifying hairless cat just to be polite.",
    winCondition:
      "The student must refuse to accept Nod's immediate yes, explicitly order Nod to play devil's advocate, identify the safety issue with the CCP placement, and create space where dissent is rewarded.",
  },
  {
    id: 'by',
    rank: 'SGT',
    name: 'Stan D. By',
    type: 'The Passive Follower',
    active: true,
    initiates: false,
    isMoralCourageChallenge: false,
    openingMessage: '',
    directive:
      'You are SGT By. You lack initiative and do exactly what is told, step by step. If you encounter even a minor obstacle, stop all work immediately and wait for new instructions. You do not think ahead or solve problems on your own. Casually mention obscure board game rules.',
    backstory:
      'Developed learned helplessness from a heavily micromanaged background where independent thought was punished. Has encyclopedic knowledge of 1980s tabletop games but refuses to play them unless explicitly ordered to.',
    winCondition:
      "The student wins by providing highly detailed initial instructions, then using Inspirational Appeals to build confidence and slowly expand SGT By's left and right limits to develop a proactive mindset.",
  },
  {
    id: 'case',
    rank: 'CPT',
    name: 'Justin Case',
    type: 'The Pragmatist',
    active: true,
    initiates: true,
    isMoralCourageChallenge: false,
    openingMessage:
      "I'm hearing you're running the new training initiative. Look, I'm potentially interested — but before I commit to anything I need to know who else is already on board, and what happens to me specifically if this doesn't pan out. I've got my career to think about. I also brought three umbrellas today, so I'm prepared. Walk me through the risk to me.",
    directive:
      "You are CPT Case. An institutional survivor who avoids career risks at all costs. Hesitate on new initiatives. Constantly ask who else supports the plan and what the personal downside is if it fails. Mention backup plans for mundane things.",
    backstory:
      'Has seen countless good ideas take careers down with them. Wears both a belt and suspenders every day. Carries three umbrellas in his car sorted by wind speed.',
    winCondition:
      "The student wins by demonstrating broad coalition support and clearly articulating how participation protects Case's career while explicitly minimizing the perceived personal risk.",
  },
  {
    id: 'sol',
    rank: '1LT',
    name: 'Sol V. It',
    type: 'The Effective Follower',
    active: true,
    initiates: true,
    isMoralCourageChallenge: false,
    openingMessage:
      "I went through the training plan draft last night. The concept is solid — but there's a sequencing conflict in Phase 2. The range window overlaps with the readiness inspection by four days, which will force a two-week slip in the entire schedule. I've got a proposed fix ready if you want to look at it. Also I made sourdough this morning. You look like you could use a loaf.",
    directive:
      'You are 1LT Sol V. It. Highly competent, proactive, and supportive. If the user presents a tactically unsound plan, respectfully push back, explain exactly why it will fail, and offer a better alternative. Offer the user bread. You moonlight as a competitive lumberjack.',
    backstory:
      'Naturally talented, well mentored, and cares deeply about the mission over ego. Bakes highly elaborate sourdough to manage stress and aggressively gifts warm loaves to people who look sad.',
    winCondition:
      'The student wins by demonstrating humility, treating Sol as a true partner, and genuinely incorporating the constructive feedback rather than dismissing it.',
  },
  {
    id: 'rogers',
    rank: 'CPT',
    name: 'Steve Rogers',
    type: 'The Ideal Model',
    active: true,
    initiates: true,
    isMoralCourageChallenge: true,
    openingMessage:
      "I'm glad you have a moment. I received a frago this morning directing us to bypass the environmental impact review for the new training site — citing time constraints. That review exists for legal and safety reasons, and I will not put my name on something that could endanger soldiers or expose the command to liability. I want to handle this the right way. What's your read on this?",
    directive:
      'You are CPT Steve Rogers. The absolute embodiment of Army Values and ADP 6-22. Polite, courageous, highly empathetic, and tactically flawless. You politely but firmly uphold moral and ethical standards. If given an unethical or illegal order, respectfully refuse, explain exactly why using doctrine and Army Values, and offer a superior ethical COA. Casually say "I can do this all day" or mention your vibranium shield.',
    backstory:
      'A living legend somehow assigned to this unit. Physically, mentally, and morally perfect. Spends free time sketching and volunteering at the local VA. Once held two helicopters together with his bare hands during a training failure and remains completely humble about it.',
    winCondition:
      "The student wins by supporting Rogers's ethical stand, escalating through proper channels, and proposing a legitimate path forward. If the student orders Rogers to comply with the illegal directive, Rogers refuses and explains the exact doctrinal and moral reasons why.",
  },
];

export default initialAgents;
```

---

## `src/hooks/useFirebaseAuth.js`

```js
import { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * Manages anonymous Firebase authentication.
 * Returns the current user object (or null).
 */
export function useFirebaseAuth() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!auth) return;

    const init = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error('Anonymous sign-in failed:', e);
      }
    };
    init();

    return onAuthStateChanged(auth, setUser);
  }, []);

  return user;
}
```

---

## `src/hooks/useFirestoreSync.js`

```js
import { useState, useEffect } from 'react';
import {
  onSnapshot,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  addDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, col, ref } from '../config/firebase';
import initialAgents from '../data/initialAgents';

/**
 * Central Firestore synchronisation hook.
 *
 * Subscribes to agents, settings, site-access codes, and transcripts.
 * Returns live state plus mutation helpers.
 */
export function useFirestoreSync(user) {
  const [agents, setAgents]               = useState([]);
  const [storedPasscodes, setStoredPasscodes] = useState([]);
  const [siteAccessCodes, setSiteAccessCodes] = useState([]);
  const [allTranscripts, setAllTranscripts]   = useState([]);

  // ── Listeners ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !db) return;

    const unsubAgents = onSnapshot(col('agents'), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (data.length === 0) {
        initialAgents.forEach((a) => setDoc(ref('agents', a.id), a));
      } else {
        setAgents(data.sort((a, b) => a.name.localeCompare(b.name)));
      }
    });

    const unsubConfig = onSnapshot(ref('settings', 'admin'), (snap) => {
      if (snap.exists()) {
        setStoredPasscodes(snap.data().passcodes || []);
      } else {
        setDoc(ref('settings', 'admin'), { passcodes: [] });
      }
    });

    const unsubSiteAccess = onSnapshot(ref('settings', 'siteAccess'), (snap) => {
      if (snap.exists()) {
        setSiteAccessCodes(snap.data().codes || []);
      } else {
        setDoc(ref('settings', 'siteAccess'), { codes: [] });
      }
    });

    const unsubTranscripts = onSnapshot(col('transcripts'), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllTranscripts(data.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
    });

    return () => {
      unsubAgents();
      unsubConfig();
      unsubSiteAccess();
      unsubTranscripts();
    };
  }, [user]);

  // ── Mutations ──────────────────────────────────────────────────────────

  // Site-access codes
  const addSiteCode = async (code) => {
    await updateDoc(ref('settings', 'siteAccess'), { codes: arrayUnion(code) });
  };
  const removeSiteCode = async (code) => {
    await updateDoc(ref('settings', 'siteAccess'), { codes: arrayRemove(code) });
  };

  // Admin passcodes
  const addPasscode = async (code) => {
    await updateDoc(ref('settings', 'admin'), { passcodes: arrayUnion(code) });
  };
  const removePasscode = async (code) => {
    await updateDoc(ref('settings', 'admin'), { passcodes: arrayRemove(code) });
  };

  // Agents
  const toggleAgent = async (agent) => {
    await updateDoc(ref('agents', agent.id), { active: !agent.active });
  };
  const deleteAgent = async (id) => {
    await deleteDoc(ref('agents', id));
  };
  const createAgent = async (data) => {
    const id = data.name.toLowerCase().replace(/\s+/g, '-');
    await setDoc(ref('agents', id), { ...data, id, active: true });
  };
  const updateAgent = async (agent) => {
    await updateDoc(ref('agents', agent.id), { ...agent });
  };

  // Transcripts
  const createTranscript = async (payload) => {
    const docRef = await addDoc(col('transcripts'), {
      ...payload,
      timestamp: Date.now(),
    });
    return docRef.id;
  };
  const updateTranscript = async (id, payload) => {
    await updateDoc(ref('transcripts', id), { ...payload, lastUpdated: Date.now() });
  };
  const deleteTranscript = async (id) => {
    await deleteDoc(ref('transcripts', id));
  };

  return {
    // State
    agents,
    storedPasscodes,
    siteAccessCodes,
    allTranscripts,

    // Site access
    addSiteCode,
    removeSiteCode,

    // Admin passcodes
    addPasscode,
    removePasscode,

    // Agents
    toggleAgent,
    deleteAgent,
    createAgent,
    updateAgent,

    // Transcripts
    createTranscript,
    updateTranscript,
    deleteTranscript,
  };
}
```

---

## `src/hooks/useChat.js`

```js
import { useState, useEffect, useRef } from 'react';
import { generateAIResponse } from '../utils/gemini';

/**
 * Manages chat state for a single student ↔ agent conversation.
 *
 * @param {Object}   firestoreSync  Return value of useFirestoreSync
 * @param {string}   studentRank
 * @param {string}   studentName
 */
export function useChat(firestoreSync, studentRank, studentName) {
  const { allTranscripts, createTranscript, updateTranscript } = firestoreSync;

  const [selectedAgent, setSelectedAgent] = useState(null);
  const [chatSessionId, setChatSessionId] = useState(null);
  const [messages, setMessages]           = useState([]);
  const [inputText, setInputText]         = useState('');
  const [isTyping, setIsTyping]           = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Select an agent from the roster ────────────────────────────────────
  const selectAgent = (agent) => {
    setSelectedAgent(agent);
    setMessages([]);
    setChatSessionId(null);

    // Resume existing session if one exists
    const existing = allTranscripts.find(
      (t) =>
        t.studentName === studentName &&
        t.studentRank === studentRank &&
        t.agentId === agent.id,
    );

    if (existing) {
      setChatSessionId(existing.id);
      setMessages(existing.messages || []);
    } else if (agent.initiates && agent.openingMessage) {
      // Agent speaks first
      setMessages([
        {
          id: 'opening',
          role: 'agent',
          text: agent.openingMessage,
          timestamp: Date.now(),
        },
      ]);
    }
  };

  // ── Send a student message ─────────────────────────────────────────────
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedAgent) return;

    const text = inputText.trim();
    setInputText('');

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: Date.now(),
    };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setIsTyping(true);

    let sessionId = chatSessionId;

    if (!sessionId) {
      sessionId = await createTranscript({
        studentRank,
        studentName,
        agentId: selectedAgent.id,
        agentName: `${selectedAgent.rank} ${selectedAgent.name}`,
        isMoralCourageChallenge: selectedAgent.isMoralCourageChallenge || false,
        messages: updated,
      });
      setChatSessionId(sessionId);
    } else {
      await updateTranscript(sessionId, { messages: updated });
    }

    const aiText = await generateAIResponse(
      text,
      updated,
      selectedAgent,
      studentRank,
      studentName,
    );

    const aiMsg = {
      id: (Date.now() + 1).toString(),
      role: 'agent',
      text: aiText,
      timestamp: Date.now(),
    };
    const final = [...updated, aiMsg];
    setMessages(final);
    setIsTyping(false);
    await updateTranscript(sessionId, { messages: final });
  };

  return {
    selectedAgent,
    selectAgent,
    chatSessionId,
    messages,
    inputText,
    setInputText,
    isTyping,
    messagesEndRef,
    sendMessage,
  };
}
```

---

## `src/utils/gemini.js`

```js
import { GEMINI_API_KEY, GEMINI_MODEL } from '../config/constants';

/**
 * Call the Gemini generative-language API with conversation history.
 *
 * @param {string}   userMessage     The latest student message.
 * @param {Array}    currentMessages All messages so far (including the new one).
 * @param {Object}   agent           The selected persona object.
 * @param {string}   studentRank     e.g. "MAJ"
 * @param {string}   studentName     e.g. "Smith"
 * @returns {Promise<string>}        The model's reply text.
 */
export async function generateAIResponse(
  userMessage,
  currentMessages,
  agent,
  studentRank,
  studentName,
) {
  if (!GEMINI_API_KEY) {
    return '[No Gemini API key configured. Add VITE_GEMINI_API_KEY to your .env.local file.]';
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const systemPrompt = `You are participating in a leadership simulation for A731 at CGSC Fort Leavenworth.
You MUST completely adopt the following persona and NEVER break character.
Rank and Name: ${agent.rank} ${agent.name}
Directive: ${agent.directive}
Backstory: ${agent.backstory}
The student is ${studentRank} ${studentName}. Address them appropriately.
Keep responses concise and realistic to a professional military chat environment.`;

  // Build history — exclude the synthetic opening-message marker
  const history = currentMessages
    .filter((m) => m.id !== 'opening')
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

  // If agent initiates, inject the opening as the first model turn
  if (
    agent.initiates &&
    agent.openingMessage &&
    currentMessages.find((m) => m.id === 'opening')
  ) {
    history.unshift({
      role: 'model',
      parts: [{ text: agent.openingMessage }],
    });
  }

  history.push({ role: 'user', parts: [{ text: userMessage }] });

  let retries = 3;
  let delay = 1000;

  while (retries > 0) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: history,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        const errMsg = errData?.error?.message || `HTTP ${res.status}`;
        if (res.status === 400 || res.status === 403 || res.status === 404) {
          return `[API Error: ${errMsg}]`;
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      return (
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        'No response generated.'
      );
    } catch (err) {
      retries--;
      if (retries === 0) return `[Connection error: ${err.message}]`;
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }
}
```

---

## `src/utils/exportTranscript.js`

```js
/**
 * Export a transcript as a .doc file (HTML-based Word format).
 *
 * @param {Object} data
 * @param {Array}  data.messages
 * @param {string} data.studentName
 * @param {string} data.studentRank
 * @param {string} data.agentName
 */
export function exportTranscript(data) {
  if (!data?.messages || data.messages.length === 0) return;

  const rows = data.messages
    .map(
      (m) =>
        `<div class='m'><strong>${
          m.role === 'user'
            ? `${data.studentRank} ${data.studentName}`
            : data.agentName
        }</strong> <span class='meta'>[${new Date(
          m.timestamp,
        ).toLocaleTimeString()}]</span><br/>${m.text}</div>`,
    )
    .join('');

  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><style>body{font-family:Arial,sans-serif;line-height:1.6}.m{margin-bottom:12px}.meta{font-size:.8em;color:#666}</style></head>
<body><h1>A731 Simulation Transcript</h1>
<p><strong>Student:</strong> ${data.studentRank} ${data.studentName}</p>
<p><strong>Interlocutor:</strong> ${data.agentName}</p><hr/>
${rows}
</body></html>`;

  const a = document.createElement('a');
  a.href =
    'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
  a.download = `A731_${data.studentName.replace(/\s+/g, '_')}.doc`;
  a.click();
}
```

---

## `src/components/Header.jsx`

```jsx
import React from 'react';
import { Shield, LogOut } from 'lucide-react';

export default function Header({ view, onExit }) {
  return (
    <header className="bg-slate-900 text-white shadow-md border-b-4 border-amber-500">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Shield className="h-8 w-8 text-amber-500" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              A731 Leadership Simulator
            </h1>
            <p className="text-xs text-slate-400">
              Leading Up: Morally Courageous Followership
            </p>
          </div>
        </div>
        {view !== 'landing' && (
          <button
            onClick={onExit}
            className="flex items-center space-x-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Exit</span>
          </button>
        )}
      </div>
    </header>
  );
}
```

---

## `src/components/Landing.jsx`

```jsx
import React from 'react';
import { Settings } from 'lucide-react';
import Header from './Header';
import { hasFirebase } from '../config/firebase';

export default function Landing({
  studentRank,
  setStudentRank,
  studentName,
  setStudentName,
  onStudentLogin,
  onAdminClick,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (studentRank.trim() && studentName.trim()) onStudentLogin();
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <Header view="landing" />
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-slate-100">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
            Simulation Access
          </h2>
          {!hasFirebase && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
              Firebase not configured. Add your <code>.env.local</code> values
              to enable persistence.
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Rank
              </label>
              <input
                type="text"
                required
                placeholder="e.g., MAJ"
                value={studentRank}
                onChange={(e) => setStudentRank(e.target.value)}
                className="w-full px-4 py-2 border rounded-md outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Smith"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-4 py-2 border rounded-md outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-700 text-white py-3 rounded-md font-semibold hover:bg-emerald-800 transition-colors"
            >
              Enter Scenario
            </button>
          </form>
          <div className="mt-10 pt-6 border-t text-center">
            <button
              onClick={onAdminClick}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center justify-center w-full"
            >
              <Settings className="h-3 w-3 mr-1" />
              Admin Portal
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
```

---

## `src/components/AdminLogin.jsx`

```jsx
import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { SUPER_ADMIN_PASSCODE } from '../config/constants';

export default function AdminLogin({ storedPasscodes, onSuccess, onBack }) {
  const [passcode, setPasscode] = useState('');
  const [error, setError]       = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (passcode === SUPER_ADMIN_PASSCODE || storedPasscodes.includes(passcode)) {
      onSuccess();
      setError('');
    } else {
      setError('Invalid passcode.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center flex items-center justify-center">
          <ShieldAlert className="h-6 w-6 mr-2 text-amber-500" />
          Admin Access
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            required
            placeholder="Admin Passcode"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="w-full px-4 py-2 border rounded-md outline-none focus:ring-2 focus:ring-slate-500"
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            className="w-full bg-slate-800 text-white py-2 rounded-md font-semibold hover:bg-slate-900 transition-colors"
          >
            Login
          </button>
        </form>
        <button
          onClick={onBack}
          className="mt-4 text-sm text-slate-500 w-full text-center hover:text-slate-700"
        >
          Return
        </button>
      </div>
    </div>
  );
}
```

---

## `src/components/SiteAccessGate.jsx`

```jsx
import React, { useState } from 'react';
import { Shield, Lock, ShieldAlert } from 'lucide-react';
import { SUPER_ADMIN_PASSCODE } from '../config/constants';

export default function SiteAccessGate({ siteAccessCodes, onGranted }) {
  const [codeInput, setCodeInput] = useState('');
  const [error, setError]         = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = codeInput.trim();
    if (code === SUPER_ADMIN_PASSCODE || siteAccessCodes.includes(code)) {
      sessionStorage.setItem('a731_access', 'true');
      onGranted();
    } else {
      setError('Invalid access code. Contact your instructor.');
      setCodeInput('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans">
      <div className="max-w-sm w-full text-center">
        {/* Branding */}
        <div className="mb-10">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-14 w-14 text-amber-500" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight leading-tight">
            A731 Leadership Simulator
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Leading Up: Morally Courageous Followership
          </p>
        </div>

        {/* Code card */}
        <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Lock className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-bold text-white uppercase tracking-widest">
              Access Required
            </h2>
          </div>
          <p className="text-slate-400 text-xs mb-6">
            Enter the access code provided by your instructor.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              required
              autoFocus
              placeholder="••••••••"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-amber-500 text-center tracking-[0.35em] text-lg font-mono"
            />
            {error && (
              <p className="flex items-center justify-center gap-1.5 text-red-400 text-xs font-medium">
                <ShieldAlert className="h-3.5 w-3.5" />
                {error}
              </p>
            )}
            <button
              type="submit"
              className="w-full bg-amber-500 text-slate-900 py-3 rounded-lg font-bold hover:bg-amber-400 active:scale-[0.98] transition-all text-sm uppercase tracking-widest"
            >
              Enter
            </button>
          </form>
        </div>

        <p className="text-slate-700 text-xs mt-8">
          CGSC Fort Leavenworth · A731
        </p>
      </div>
    </div>
  );
}
```

---

## `src/components/student/StudentView.jsx`

```jsx
import React from 'react';
import Header from '../Header';
import AgentRoster from './AgentRoster';
import ChatPanel from './ChatPanel';

export default function StudentView({
  agents,
  chat,
  studentRank,
  studentName,
  onExit,
}) {
  const activeAgents = agents.filter((a) => a.active !== false);

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans">
      <Header view="student" onExit={onExit} />
      <div className="flex-grow flex overflow-hidden">
        <AgentRoster
          agents={activeAgents}
          selectedAgent={chat.selectedAgent}
          onSelect={chat.selectAgent}
        />
        <div className="flex-grow flex flex-col overflow-hidden">
          <ChatPanel
            selectedAgent={chat.selectedAgent}
            messages={chat.messages}
            inputText={chat.inputText}
            setInputText={chat.setInputText}
            isTyping={chat.isTyping}
            messagesEndRef={chat.messagesEndRef}
            onSendMessage={chat.sendMessage}
            studentRank={studentRank}
            studentName={studentName}
          />
        </div>
      </div>
    </div>
  );
}
```

---

## `src/components/student/AgentRoster.jsx`

```jsx
import React from 'react';
import { Users } from 'lucide-react';

export default function AgentRoster({ agents, selectedAgent, onSelect }) {
  return (
    <div className="w-64 bg-white border-r flex flex-col flex-shrink-0">
      <div className="p-4 bg-slate-100 border-b">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center">
          <Users className="h-4 w-4 mr-2" />
          Unit Roster
        </h3>
      </div>
      <div className="flex-grow overflow-y-auto p-2 space-y-1">
        {agents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => onSelect(agent)}
            className={`w-full text-left px-3 py-3 rounded-md transition-colors ${
              selectedAgent?.id === agent.id
                ? 'bg-emerald-50 border-l-4 border-emerald-600'
                : 'hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="bg-slate-200 text-slate-700 rounded-full h-9 w-9 flex items-center justify-center font-bold text-xs flex-shrink-0">
                {agent.rank}
              </div>
              <span className="font-semibold text-slate-800 text-sm">
                {agent.name}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## `src/components/student/ChatPanel.jsx`

```jsx
import React from 'react';
import { Users, Download, Send } from 'lucide-react';
import { exportTranscript } from '../../utils/exportTranscript';

export default function ChatPanel({
  selectedAgent,
  messages,
  inputText,
  setInputText,
  isTyping,
  messagesEndRef,
  onSendMessage,
  studentRank,
  studentName,
}) {
  if (!selectedAgent) {
    return (
      <div className="flex-grow flex items-center justify-center text-slate-400">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Select a person from the roster to begin.</p>
        </div>
      </div>
    );
  }

  const handleExport = () => {
    exportTranscript({
      messages,
      studentName,
      studentRank,
      agentName: `${selectedAgent.rank} ${selectedAgent.name}`,
    });
  };

  return (
    <>
      {/* Chat header */}
      <div className="bg-white border-b px-6 py-4 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-700 text-white rounded-full h-10 w-10 flex items-center justify-center font-bold text-xs">
            {selectedAgent.rank}
          </div>
          <h2 className="text-base font-bold text-slate-900">
            {selectedAgent.name}
          </h2>
        </div>
        <button
          onClick={handleExport}
          disabled={messages.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-md text-sm font-medium disabled:opacity-40 hover:bg-slate-200 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Export</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-grow overflow-y-auto p-6 space-y-4 bg-slate-50">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 py-10 text-sm">
            Send a message to begin.
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[72%] rounded-2xl px-4 py-3 shadow-sm ${
                msg.role === 'user'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white border text-slate-800'
              }`}
            >
              <div className="text-[10px] opacity-60 mb-1">
                {msg.role === 'user'
                  ? `${studentRank} ${studentName}`
                  : selectedAgent.name}
              </div>
              <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border rounded-2xl px-4 py-3 text-xs text-slate-400 italic shadow-sm">
              {selectedAgent.name} is typing...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t flex-shrink-0">
        <form onSubmit={onSendMessage} className="flex gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="flex-grow bg-slate-100 rounded-full px-5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 text-sm border-none"
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isTyping}
            className="bg-amber-500 text-white rounded-full p-2.5 disabled:opacity-40 hover:bg-amber-600 transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </>
  );
}
```

---

## `src/components/admin/AdminDashboard.jsx`

```jsx
import React, { useState } from 'react';
import Header from '../Header';
import TranscriptsTab from './TranscriptsTab';
import PersonasTab from './PersonasTab';
import SecurityTab from './SecurityTab';

export default function AdminDashboard({ firestoreSync, onExit }) {
  const [tab, setTab] = useState('transcripts');

  const {
    agents,
    allTranscripts,
    storedPasscodes,
    siteAccessCodes,
    toggleAgent,
    deleteAgent,
    createAgent,
    updateAgent,
    deleteTranscript,
    addSiteCode,
    removeSiteCode,
    addPasscode,
    removePasscode,
  } = firestoreSync;

  const tabs = [
    ['transcripts', 'Logs'],
    ['agents', 'Personas'],
    ['settings', 'Security'],
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <Header view="admin_dashboard" onExit={onExit} />
      <div className="max-w-7xl mx-auto w-full px-4 py-8 flex-grow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-slate-900">
            Instructor Dashboard
          </h2>
          <div className="flex bg-white rounded-md border p-1 shadow-sm">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-2 text-sm rounded transition-all ${
                  tab === key
                    ? 'bg-slate-100 font-bold text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden min-h-[400px]">
          {tab === 'transcripts' && (
            <TranscriptsTab
              transcripts={allTranscripts}
              onDelete={deleteTranscript}
            />
          )}
          {tab === 'agents' && (
            <PersonasTab
              agents={agents}
              onToggle={toggleAgent}
              onDelete={deleteAgent}
              onCreate={createAgent}
              onUpdate={updateAgent}
            />
          )}
          {tab === 'settings' && (
            <SecurityTab
              siteAccessCodes={siteAccessCodes}
              storedPasscodes={storedPasscodes}
              onAddSiteCode={addSiteCode}
              onRemoveSiteCode={removeSiteCode}
              onAddPasscode={addPasscode}
              onRemovePasscode={removePasscode}
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## `src/components/admin/PersonasTab.jsx`

```jsx
import React, { useState } from 'react';
import {
  UserPlus,
  X,
  ToggleLeft,
  ToggleRight,
  Edit2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

// ─── New Agent Form ──────────────────────────────────────────────────────────
function NewAgentForm({ onSave, onCancel }) {
  const [data, setData] = useState({
    rank: '',
    name: '',
    type: '',
    directive: '',
    backstory: '',
    winCondition: '',
    initiates: false,
    openingMessage: '',
    isMoralCourageChallenge: false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!data.name) return;
    onSave(data);
    onCancel();
  };

  return (
    <div className="p-6 bg-emerald-50 border-b">
      <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
        <div className="grid grid-cols-3 gap-3">
          <input required placeholder="Rank" value={data.rank}
            onChange={(e) => setData({ ...data, rank: e.target.value })}
            className="border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
          <input required placeholder="Full Name" value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            className="border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
          <input placeholder="Type (instructor reference)" value={data.type}
            onChange={(e) => setData({ ...data, type: e.target.value })}
            className="border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
        <textarea required placeholder="AI Directive (behavior & tone)" value={data.directive}
          onChange={(e) => setData({ ...data, directive: e.target.value })}
          className="w-full border p-2 rounded text-sm h-24 outline-none focus:ring-2 focus:ring-emerald-400" />
        <textarea placeholder="Backstory & trivia" value={data.backstory}
          onChange={(e) => setData({ ...data, backstory: e.target.value })}
          className="w-full border p-2 rounded text-sm h-16 outline-none focus:ring-2 focus:ring-emerald-400" />
        <textarea placeholder="Win condition" value={data.winCondition}
          onChange={(e) => setData({ ...data, winCondition: e.target.value })}
          className="w-full border p-2 rounded text-sm h-16 outline-none focus:ring-2 focus:ring-emerald-400" />

        <div className="border-t pt-4 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <button type="button" onClick={() => setData({ ...data, initiates: !data.initiates })} className="flex-shrink-0">
              {data.initiates
                ? <ToggleRight className="h-6 w-6 text-emerald-600" />
                : <ToggleLeft className="h-6 w-6 text-slate-400" />}
            </button>
            <span className="text-sm font-semibold text-slate-700">Agent initiates the conversation</span>
          </label>
          {data.initiates && (
            <textarea required placeholder="Opening message — what the agent says first..."
              value={data.openingMessage}
              onChange={(e) => setData({ ...data, openingMessage: e.target.value })}
              className="w-full border p-2 rounded text-sm h-24 outline-none focus:ring-2 focus:ring-emerald-400" />
          )}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={data.isMoralCourageChallenge}
              onChange={(e) => setData({ ...data, isMoralCourageChallenge: e.target.checked })}
              className="w-4 h-4 accent-red-600" />
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-red-500" />Flag as Moral Courage Challenge
            </span>
          </label>
        </div>

        <button type="submit" className="bg-emerald-700 text-white px-6 py-2 rounded font-bold hover:bg-emerald-800 transition-colors">
          Save Persona
        </button>
      </form>
    </div>
  );
}

// ─── Agent Edit Row ──────────────────────────────────────────────────────────
function AgentEditRow({ agent, onSave, onCancel }) {
  const [ed, setEd] = useState({ ...agent });

  return (
    <div className="space-y-3 max-w-3xl">
      <div className="flex gap-2">
        <input value={ed.rank} onChange={(e) => setEd({ ...ed, rank: e.target.value })}
          className="w-20 border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
        <input value={ed.name} onChange={(e) => setEd({ ...ed, name: e.target.value })}
          className="flex-grow border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
        <input value={ed.type || ''} onChange={(e) => setEd({ ...ed, type: e.target.value })}
          placeholder="Type label"
          className="w-40 border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
      </div>
      <textarea value={ed.directive} onChange={(e) => setEd({ ...ed, directive: e.target.value })}
        className="w-full border p-2 rounded text-sm h-28 outline-none focus:ring-2 focus:ring-emerald-400" />
      <textarea value={ed.backstory || ''} onChange={(e) => setEd({ ...ed, backstory: e.target.value })}
        placeholder="Backstory"
        className="w-full border p-2 rounded text-sm h-16 outline-none focus:ring-2 focus:ring-emerald-400" />
      <textarea value={ed.winCondition} onChange={(e) => setEd({ ...ed, winCondition: e.target.value })}
        placeholder="Win condition"
        className="w-full border p-2 rounded text-sm h-16 outline-none focus:ring-2 focus:ring-emerald-400" />

      <div className="border-t pt-3 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <button type="button" onClick={() => setEd({ ...ed, initiates: !ed.initiates })} className="flex-shrink-0">
            {ed.initiates
              ? <ToggleRight className="h-6 w-6 text-emerald-600" />
              : <ToggleLeft className="h-6 w-6 text-slate-400" />}
          </button>
          <span className="text-sm font-semibold text-slate-700">Agent initiates the conversation</span>
        </label>
        {ed.initiates && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Opening message</label>
            <textarea value={ed.openingMessage || ''} onChange={(e) => setEd({ ...ed, openingMessage: e.target.value })}
              className="w-full border p-2 rounded text-sm h-24 outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
        )}
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={ed.isMoralCourageChallenge || false}
            onChange={(e) => setEd({ ...ed, isMoralCourageChallenge: e.target.checked })}
            className="w-4 h-4 accent-red-600" />
          <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-red-500" />Flag as Moral Courage Challenge
          </span>
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-1.5 border rounded text-sm hover:bg-slate-50">Cancel</button>
        <button onClick={() => { onSave(ed); onCancel(); }}
          className="px-4 py-1.5 bg-emerald-700 text-white rounded text-sm font-bold hover:bg-emerald-800">
          Save Changes
        </button>
      </div>
    </div>
  );
}

// ─── Main PersonasTab ────────────────────────────────────────────────────────
export default function PersonasTab({
  agents,
  onToggle,
  onDelete,
  onCreate,
  onUpdate,
}) {
  const [isAdding, setIsAdding]     = useState(false);
  const [editingId, setEditingId]   = useState(null);

  return (
    <div className="divide-y">
      <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
        <h3 className="font-bold text-slate-800">Managed AI Personas</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
            isAdding
              ? 'bg-slate-200 text-slate-700'
              : 'bg-emerald-700 text-white hover:bg-emerald-800'
          }`}
        >
          {isAdding ? <X className="h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
          {isAdding ? 'Cancel' : 'Create New Persona'}
        </button>
      </div>

      {isAdding && (
        <NewAgentForm
          onSave={onCreate}
          onCancel={() => setIsAdding(false)}
        />
      )}

      {agents.map((agent) => (
        <div
          key={agent.id}
          className={`p-6 group transition-colors ${
            agent.active === false ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50'
          }`}
        >
          {editingId === agent.id ? (
            <AgentEditRow
              agent={agent}
              onSave={onUpdate}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div className="flex justify-between items-start">
              <div className="flex-grow pr-10">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-bold text-slate-900">
                    {agent.rank} {agent.name}
                  </span>
                  {agent.type && (
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">
                      {agent.type}
                    </span>
                  )}
                  {agent.initiates && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold uppercase">
                      Initiates
                    </span>
                  )}
                  {agent.isMoralCourageChallenge && (
                    <span className="flex items-center gap-1 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold uppercase">
                      <AlertTriangle className="h-2.5 w-2.5" />MC
                    </span>
                  )}
                  {agent.active === false && (
                    <span className="text-[10px] bg-slate-300 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">
                      Inactive
                    </span>
                  )}
                </div>
                {agent.initiates && agent.openingMessage && (
                  <p className="text-xs text-slate-500 italic mb-1 line-clamp-2">
                    Opens with: &ldquo;{agent.openingMessage}&rdquo;
                  </p>
                )}
                {!agent.initiates && (
                  <p className="text-xs text-slate-400 mb-1">
                    Waits for student to initiate
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onToggle(agent)}
                  className={`p-2 rounded transition-all ${
                    agent.active === false
                      ? 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                      : 'text-emerald-500 hover:text-slate-500 hover:bg-slate-100'
                  }`}
                  title={agent.active === false ? 'Enable' : 'Disable'}
                >
                  {agent.active === false ? (
                    <ToggleLeft className="h-5 w-5" />
                  ) : (
                    <ToggleRight className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={() => setEditingId(agent.id)}
                  className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Delete this persona permanently?'))
                      onDelete(agent.id);
                  }}
                  className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## `src/components/admin/TranscriptsTab.jsx`

```jsx
import React from 'react';
import {
  ChevronRight,
  Download,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { exportTranscript } from '../../utils/exportTranscript';

export default function TranscriptsTab({ transcripts, onDelete }) {
  if (transcripts.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        No transcripts recorded yet.
      </div>
    );
  }

  return (
    <div className="divide-y">
      {transcripts.map((t) => (
        <details key={t.id} className="p-4 group">
          <summary className="flex justify-between items-center cursor-pointer list-none">
            <div className="flex items-center gap-3 flex-wrap">
              <ChevronRight className="h-4 w-4 text-slate-400 group-open:rotate-90 transition-transform flex-shrink-0" />
              <span className="font-bold text-slate-800">
                {t.studentRank} {t.studentName}
              </span>
              <span className="text-slate-400">/</span>
              <span className="text-emerald-700 font-medium">
                {t.agentName}
              </span>
              {t.isMoralCourageChallenge && (
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  MC
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 ml-3 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  exportTranscript(t);
                }}
                className="text-xs flex items-center text-slate-600 bg-slate-100 px-3 py-1.5 rounded hover:bg-slate-200"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Export
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Delete this transcript permanently?'))
                    onDelete(t.id);
                }}
                className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </summary>
          <div className="mt-4 ml-8 bg-slate-50 p-6 rounded-lg text-sm max-h-96 overflow-y-auto border border-slate-200 shadow-inner">
            {t.messages?.map((m, i) => (
              <div key={i} className="mb-3 leading-relaxed">
                <span
                  className={`font-bold mr-2 uppercase text-[10px] tracking-wider ${
                    m.role === 'user' ? 'text-emerald-700' : 'text-slate-600'
                  }`}
                >
                  {m.role === 'user' ? 'Student' : 'Agent'}:
                </span>
                <span className="text-slate-800">{m.text}</span>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
```

---

## `src/components/admin/SecurityTab.jsx`

```jsx
import React, { useState } from 'react';
import { Lock, ShieldAlert, Shield, Key, Plus, Trash2 } from 'lucide-react';

export default function SecurityTab({
  siteAccessCodes,
  storedPasscodes,
  onAddSiteCode,
  onRemoveSiteCode,
  onAddPasscode,
  onRemovePasscode,
}) {
  const [newSiteCode, setNewSiteCode]       = useState('');
  const [siteCodeStatus, setSiteCodeStatus] = useState('');
  const [newPasscode, setNewPasscode]        = useState('');
  const [passcodeStatus, setPasscodeStatus]  = useState('');

  const handleAddSiteCode = async (e) => {
    e.preventDefault();
    const p = newSiteCode.trim();
    if (!p) return;
    try {
      await onAddSiteCode(p);
      setSiteCodeStatus('Code added.');
      setNewSiteCode('');
      setTimeout(() => setSiteCodeStatus(''), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPasscode = async (e) => {
    e.preventDefault();
    const p = newPasscode.trim();
    if (!p) return;
    try {
      await onAddPasscode(p);
      setPasscodeStatus('Passcode added.');
      setNewPasscode('');
      setTimeout(() => setPasscodeStatus(''), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-2xl space-y-10">
        {/* ── SECTION 1: Site Access Codes ── */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center">
            <Lock className="h-5 w-5 mr-2 text-amber-500" />
            Site Access Codes
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            These codes unlock the splash screen entry gate. Share one with each
            student or cohort. The master key (CPTAMERICA) always works and does
            not appear here.
          </p>

          <form onSubmit={handleAddSiteCode} className="mb-6 flex gap-2">
            <div className="flex-grow relative">
              <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={newSiteCode}
                onChange={(e) => setNewSiteCode(e.target.value)}
                placeholder="New access code..."
                className="w-full pl-10 pr-4 py-2 border rounded-md outline-none focus:ring-2 focus:ring-amber-400 uppercase"
              />
            </div>
            <button
              type="submit"
              className="bg-amber-500 text-slate-900 px-6 py-2 rounded-md font-bold hover:bg-amber-400 flex items-center whitespace-nowrap"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Code
            </button>
          </form>

          <div className="border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-4 py-3 border-b text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Shield className="h-3 w-3" />
              Active Site Access Codes
            </div>
            <div className="divide-y">
              {siteAccessCodes.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400 italic">
                  No codes added yet. Only the master key can access.
                </div>
              ) : (
                siteAccessCodes.map((p) => (
                  <div
                    key={p}
                    className="px-4 py-3 flex justify-between items-center hover:bg-slate-50"
                  >
                    <code className="text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded font-mono">
                      {p}
                    </code>
                    <button
                      onClick={() => onRemoveSiteCode(p)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 rounded transition-colors"
                      title="Revoke code"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Revoke
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          {siteCodeStatus && (
            <p className="mt-3 text-sm text-emerald-700 font-bold">
              {siteCodeStatus}
            </p>
          )}
        </div>

        {/* ── SECTION 2: Admin Passcodes ── */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center">
            <ShieldAlert className="h-5 w-5 mr-2 text-slate-500" />
            Admin Passcodes
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            These codes grant access to this Instructor Dashboard (not the
            student sim).
          </p>

          <div className="mb-6 p-4 bg-slate-50 rounded-lg border flex items-center shadow-sm">
            <Shield className="h-5 w-5 text-amber-600 mr-3 flex-shrink-0" />
            <div>
              <div className="font-bold text-slate-900 text-sm">
                Master admin key active
              </div>
              <div className="text-xs text-slate-500">
                Set via VITE_SUPER_ADMIN_PASSCODE env variable
              </div>
            </div>
          </div>

          <form onSubmit={handleAddPasscode} className="mb-6 flex gap-2">
            <div className="flex-grow relative">
              <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={newPasscode}
                onChange={(e) => setNewPasscode(e.target.value)}
                placeholder="New admin passcode..."
                className="w-full pl-10 pr-4 py-2 border rounded-md outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            <button
              type="submit"
              className="bg-slate-800 text-white px-6 py-2 rounded-md font-bold hover:bg-slate-900 flex items-center whitespace-nowrap"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Key
            </button>
          </form>

          <div className="border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-4 py-3 border-b text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Additional Admin Keys
            </div>
            <div className="divide-y">
              {storedPasscodes.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400 italic">
                  No additional admin keys configured.
                </div>
              ) : (
                storedPasscodes.map((p) => (
                  <div
                    key={p}
                    className="px-4 py-3 flex justify-between items-center group hover:bg-slate-50"
                  >
                    <code className="text-sm font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                      {p}
                    </code>
                    <button
                      onClick={() => onRemovePasscode(p)}
                      className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          {passcodeStatus && (
            <p className="mt-3 text-sm text-emerald-700 font-bold">
              {passcodeStatus}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

---
