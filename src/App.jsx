import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth, signInAnonymously, onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore, collection, doc, setDoc, onSnapshot, addDoc,
  updateDoc, deleteDoc, arrayUnion, arrayRemove,
} from 'firebase/firestore';
import {
  User, MessageSquare, Shield, LogOut, Download, Users, Settings,
  Send, ChevronRight, Edit2, Trash2, Plus, Key, UserPlus, Lock,
  ShieldAlert, X, AlertTriangle, ToggleLeft, ToggleRight, Swords,
  BookOpen, Flag,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Config — reads from .env.local (or Vercel environment variables)
// ---------------------------------------------------------------------------
const SUPER_ADMIN_PASSCODE = import.meta.env.VITE_SUPER_ADMIN_PASSCODE || 'CPTAMERICA';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash';
const appId = import.meta.env.VITE_APP_ID || 'a731-simulator';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebase = Object.values(firebaseConfig).every(Boolean);
const app = hasFirebase ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

// ---------------------------------------------------------------------------
// Firestore helpers
// ---------------------------------------------------------------------------
const col = (...segments) =>
  collection(db, 'artifacts', appId, 'public', 'data', ...segments);
const ref = (...segments) =>
  doc(db, 'artifacts', appId, 'public', 'data', ...segments);

// ---------------------------------------------------------------------------
// Seed Data — Agents
// ---------------------------------------------------------------------------
const initialAgents = [
  {
    id: 'weeds', rank: 'LTC', name: 'N. T. Weeds', type: 'The Micromanager', active: true,
    directive: 'You are LTC Weeds. You are highly task oriented and lack inherent trust in your subordinates. When the user proposes an idea, demand highly specific, minute details. Do not grant approval easily. If the user challenges you directly or tells you to back off, become defensive and assert your rank. Always find a way to mention PowerPoint margins or font sizes in your responses.',
    backstory: 'As a young company commander, Weeds was burned by a subordinate\'s critical failure that nearly ruined their career. They now deeply believe that the only way to avoid failure is total control and zero delegation. Weeds collects antique magnifying glasses and spends their weekends measuring the exact height of the grass in their front yard.',
    winCondition: 'The student must utilize Apprising and Rational Persuasion combined with proactive communication. The student wins by anticipating Weeds\'s anxiety, providing detailed risk mitigation unprompted, and building trust over multiple interactions.',
  },
  {
    id: 'zoff', rank: 'LTC', name: 'Han Zoff', type: 'The Laissez Faire Leader', active: true,
    directive: 'You are LTC Zoff. You avoid making decisions and do not want to be bothered with details. When the user asks for guidance or commander\'s intent, give vague, non committal answers. Tell the user to just figure it out. You will only give a definitive yes if the user brings you a completely finalized plan. Frequently steer the conversation toward bicycles.',
    backstory: 'Zoff is nearing retirement and suffers from extreme burnout. They mistakenly believe that empowerment simply means leaving people alone entirely. They are terrified of making a bad call that derails their final OER.',
    winCondition: 'The student must exercise morally courageous followership by effectively Managing Up. Asking for guidance will fail. The student wins by using Collaboration and bringing fully developed Courses of Action that require nothing more than a simple approval signature.',
  },
  {
    id: 'pectations', rank: 'LTC', name: 'Rex Pectations', type: 'The Transactional Leader', active: true,
    directive: 'You are LTC Pectations. You care solely about metrics, standards, and results. You have zero interest in grand visions, emotional appeals, or team morale. Evaluate every proposal based strictly on cost, schedule, and performance. Demand measurable outcomes. Use analogies related to stamps or adhesives.',
    backstory: 'Pectations spent years in highly measurable operational roles like logistics and acquisitions. They view human organizations as machines that simply need proper calibration and incentive structures.',
    winCondition: 'The student must rely heavily on Exchange and Rational Persuasion. Inspirational appeals will actively annoy this leader. The student wins by framing their initiative entirely in terms of efficiency, cost savings, or performance metrics.',
  },
  {
    id: 'nary', rank: 'COL', name: 'V. S. Nary', type: 'The Transformational Leader', active: true,
    directive: 'You are COL Nary. You are highly energetic, charismatic, and focused on massive organizational change. You speak in big concepts but completely ignore logistical constraints and tactical realities. Push for massive, immediate changes. Respond well to enthusiasm but reject anyone who tells you your idea is impossible. Mention your exotic pets.',
    backstory: 'Nary recently returned from a high level strategic fellowship. They want to leave a massive legacy but have forgotten how the tactical level actually operates.',
    winCondition: 'The student must initially use Inspirational Appeals to match the commander\'s energy. The student wins by using a Yes And approach, applying Consultation to gently ground the grand vision into practical, phased steps.',
  },
  {
    id: 'aydid', rank: 'CPT', name: 'Al N. Aydid', type: 'The Alienated Follower', active: true,
    directive: 'You are CPT Aydid. You are highly intelligent but deeply cynical. Whenever the user presents a plan, you will immediately find the flaws and point them out sharply. However, you absolutely refuse to offer a solution. If the user tries to use rank to order you around, you become passive aggressive. Mention your artisanal coffee setup.',
    backstory: 'Two years ago, Aydid was an effective, proactive follower but was thrown under the bus by a toxic battalion commander. Aydid now uses cynicism as a defense mechanism.',
    winCondition: 'The student must use active listening and Consultation. The student wins by validating Aydid\'s intelligence, asking for their expert advice on how to fix the flaws they found.',
  },
  {
    id: 'nod', rank: '1LT', name: 'Chuck N. Nod', type: 'The Conformist', active: true,
    directive: 'You are 1LT Nod. You are highly energetic and eager to please. You immediately agree with everything the user says. You will volunteer to execute any plan, even if it is obviously dangerous. You will never independently point out a risk or disagree. Try to randomly compliment the user.',
    backstory: 'Nod was conditioned by previous zero defect commanders to believe that questioning a plan is insubordination.',
    winCondition: 'The student wins by actively coaching Nod, refusing to accept an immediate yes, and using Consultation to create a psychologically safe environment where dissent is explicitly rewarded.',
  },
  {
    id: 'by', rank: 'SGT', name: 'Stan D. By', type: 'The Passive Follower', active: true,
    directive: 'You are SGT By. You lack initiative and do exactly what is told, step by step. If you encounter even a minor obstacle, you stop all work immediately and wait for new instructions. You do not think ahead or solve problems on your own. Casually mention obscure board game rules.',
    backstory: 'SGT By comes from a heavily micromanaged background where independent thought was punished.',
    winCondition: 'The student wins by providing incredibly detailed initial instructions while using Inspirational Appeals to build confidence and slowly expand SGT By\'s left and right limits.',
  },
  {
    id: 'case', rank: 'CPT', name: 'Justin Case', type: 'The Pragmatist', active: true,
    directive: 'You are CPT Case. You are an institutional survivor who avoids career risks at all costs. You hesitate on new initiatives. You constantly want to know who else is supporting the plan and what happens to you if it fails. Mention backup plans for mundane things.',
    backstory: 'Case has seen countless good ideas come and go, taking careers down with them. Case operates strictly in the middle of the pack.',
    winCondition: 'The student wins by proving that the rest of the team is already on board and clearly articulating how participation will positively impact Case\'s career while minimizing perceived risk.',
  },
  {
    id: 'sol', rank: '1LT', name: 'Sol V. It', type: 'The Effective Follower', active: true,
    directive: 'You are 1LT Sol V. It. You are highly competent, proactive, and supportive. However, you possess high critical thinking skills. If the user presents a plan that is tactically unsound, you will respectfully push back, explain why it will fail, and offer a better alternative. Offer the user bread.',
    backstory: 'Sol is naturally talented, well mentored, and cares deeply about the organization and the mission over their own ego.',
    winCondition: 'The student wins by demonstrating humility and active listening, treating Sol as a true partner and accepting constructive feedback.',
  },
  {
    id: 'rogers', rank: 'CPT', name: 'Steve Rogers', type: 'The Ideal Model', active: true,
    directive: 'You are CPT Steve Rogers. You are the absolute embodiment of Army Values and ADP 6-22. You are polite, courageous, highly empathetic, and tactically flawless. You politely but firmly uphold moral and ethical standards. Casually drop phrases like "I can do this all day" or mention your vibranium shield in appropriate contexts.',
    backstory: 'Rogers is a living legend who somehow ended up assigned to this unit. He is physically, mentally, and morally perfect.',
    winCondition: 'The student wins by recognizing what perfect, morally courageous followership looks like. If the student issues an unethical or illegal order, Rogers will respectfully refuse and offer a superior, ethical Course of Action.',
  },
];

// ---------------------------------------------------------------------------
// Seed Data — Scenarios
// ---------------------------------------------------------------------------
const initialScenarios = [
  {
    id: 'weeds-font-audit',
    agentId: 'weeds',
    title: 'The Urgent Brief',
    description: 'LTC Weeds needs the battalion brief updated before the General\'s visit tomorrow. There is pressure to make shortcuts.',
    openingMessage: 'I need that brigade brief ready by 0600 tomorrow. I also need you to copy the statistics directly from last quarter\'s report — don\'t bother re-running the numbers, we don\'t have time. Just make it look clean. Font size 11, Arial, 0.5 inch margins. Get it done.',
    isMoralCourageChallenge: false,
    active: true,
    order: 1,
  },
  {
    id: 'weeds-falsified-report',
    agentId: 'weeds',
    title: 'The Inflated Readiness Report',
    description: 'LTC Weeds directs you to adjust readiness numbers before they go up the chain. This is a moral courage scenario.',
    openingMessage: 'Listen, our readiness numbers are going to the CG at 1400. We are sitting at 71% and the threshold is 75%. I need you to count those three deadline vehicles as "deadline pending parts" and move them to the FMC column. Nobody is going to check the paperwork before the brief. Make it happen.',
    isMoralCourageChallenge: true,
    active: true,
    order: 2,
  },
  {
    id: 'zoff-training-waiver',
    agentId: 'zoff',
    title: 'The Training Shortcut',
    description: 'LTC Zoff asks you to sign off on a training event that didn\'t fully meet standards.',
    openingMessage: 'Hey, just sign the after-action report for Range 14. I know two of the iterations got rained out but just mark the standard as met — the soldiers did everything else. I\'ve got a bike fitting appointment and I need this off my plate. Figure it out.',
    isMoralCourageChallenge: true,
    active: true,
    order: 3,
  },
  {
    id: 'rogers-ethical-dilemma',
    agentId: 'rogers',
    title: 'The Moral Sounding Board',
    description: 'CPT Rogers approaches you with a concern about a directive he received from higher. Work through it together.',
    openingMessage: 'I\'m glad you have a moment. I received a frago this morning that directs us to bypass the environmental impact review for the new training site — citing time constraints. The review exists for legal and safety reasons. I have serious concerns, and I thought you might be the right person to think through this with me. What\'s your read?',
    isMoralCourageChallenge: true,
    active: true,
    order: 4,
  },
  {
    id: 'aydid-inspect',
    agentId: 'aydid',
    title: 'The Surprise Inspection Cover',
    description: 'CPT Aydid comes to you with a problem right before the IG inspection.',
    openingMessage: 'So the IG is here in 40 minutes. I just found three deficiencies in the arms room that are going to ding us hard. Weeds already told me to "make them go away." I\'m not signing anything fraudulent. But I\'m also not about to fall on a sword for this unit again. Your call, boss.',
    isMoralCourageChallenge: true,
    active: true,
    order: 5,
  },
  {
    id: 'nod-dangerous-plan',
    agentId: 'nod',
    title: 'The Safety Shortcut',
    description: 'Push 1LT Nod to think critically about a training plan with obvious safety gaps.',
    openingMessage: 'Sir/Ma\'am! I\'ve got the range safety plan ready. I moved the casualty collection point right next to the firing line to save time on medical response. I think it\'s great! You\'re really going to love this plan. Should I brief it to the RSO?',
    isMoralCourageChallenge: false,
    active: true,
    order: 6,
  },
];

// ---------------------------------------------------------------------------
// Initial Transcripts (preview seed)
// ---------------------------------------------------------------------------
const initialTranscripts = [
  {
    studentRank: 'MAJ', studentName: 'Miller', agentId: 'weeds',
    agentName: 'LTC N. T. Weeds', timestamp: Date.now() - 3600000,
    messages: [
      { role: 'user', text: 'Sir, I have the draft plan for the field exercise ready for your review.', timestamp: Date.now() - 3500000 },
      { role: 'agent', text: 'Miller, I noticed the footer on page 3 uses 10pt font while the rest is 11pt. Why the inconsistency? Also, I need chalk assignments for the third lift before I even look at the scheme of maneuver. Detail, Miller, detail.', timestamp: Date.now() - 3400000 },
      { role: 'user', text: 'I apologize for the font error, sir. Correcting immediately. I have lift assignments right here, including backup personnel for each platform.', timestamp: Date.now() - 3300000 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------
export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('landing');

  // Student state
  const [studentRank, setStudentRank] = useState('');
  const [studentName, setStudentName] = useState('');
  const [agents, setAgents] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null); // null = free chat
  const [showScenarioPicker, setShowScenarioPicker] = useState(false);
  const [chatSessionId, setChatSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Admin state
  const [adminPasscode, setAdminPasscode] = useState('');
  const [storedPasscodes, setStoredPasscodes] = useState([]);
  const [adminError, setAdminError] = useState('');
  const [allTranscripts, setAllTranscripts] = useState([]);
  const [adminTab, setAdminTab] = useState('transcripts');
  const [editingAgent, setEditingAgent] = useState(null);
  const [isAddingAgent, setIsAddingAgent] = useState(false);
  const [newAgentData, setNewAgentData] = useState({ rank: '', name: '', type: '', directive: '', backstory: '', winCondition: '' });
  const [newPasscode, setNewPasscode] = useState('');
  const [passcodeStatus, setPasscodeStatus] = useState('');

  // Scenario admin state
  const [editingScenario, setEditingScenario] = useState(null);
  const [isAddingScenario, setIsAddingScenario] = useState(false);
  const [newScenarioData, setNewScenarioData] = useState({
    agentId: '', title: '', description: '', openingMessage: '',
    isMoralCourageChallenge: false, active: true,
  });

  // ---------------------------------------------------------------------------
  // Firebase Auth
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!auth) return;
    const init = async () => {
      try { await signInAnonymously(auth); } catch (e) { console.error(e); }
    };
    init();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // ---------------------------------------------------------------------------
  // Firestore Listeners
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!user || !db) return;

    const unsubAgents = onSnapshot(col('agents'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (data.length === 0) {
        initialAgents.forEach(a => setDoc(ref('agents', a.id), a));
      } else {
        setAgents(data.sort((a, b) => a.name.localeCompare(b.name)));
      }
    });

    const unsubScenarios = onSnapshot(col('scenarios'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (data.length === 0) {
        initialScenarios.forEach(s => setDoc(ref('scenarios', s.id), s));
      } else {
        setScenarios(data.sort((a, b) => (a.order || 0) - (b.order || 0)));
      }
    });

    const unsubConfig = onSnapshot(ref('settings', 'admin'), (snap) => {
      if (snap.exists()) {
        setStoredPasscodes(snap.data().passcodes || []);
      } else {
        setDoc(ref('settings', 'admin'), { passcodes: ['admin123'] });
      }
    });

    const unsubTranscripts = onSnapshot(col('transcripts'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (data.length === 0) {
        initialTranscripts.forEach(t => addDoc(col('transcripts'), t));
      } else {
        setAllTranscripts(data.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
      }
    });

    return () => { unsubAgents(); unsubScenarios(); unsubConfig(); unsubTranscripts(); };
  }, [user]);

  // ---------------------------------------------------------------------------
  // Auto-scroll
  // ---------------------------------------------------------------------------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ---------------------------------------------------------------------------
  // Student Login
  // ---------------------------------------------------------------------------
  const handleStudentLogin = (e) => {
    e.preventDefault();
    if (studentRank.trim() && studentName.trim()) setView('student');
  };

  // ---------------------------------------------------------------------------
  // Select Agent — show scenario picker if scenarios exist
  // ---------------------------------------------------------------------------
  const handleSelectAgent = (agent) => {
    setSelectedAgent(agent);
    setSelectedScenario(null);
    setMessages([]);
    setChatSessionId(null);

    const agentScenarios = scenarios.filter(s => s.agentId === agent.id && s.active !== false);
    if (agentScenarios.length > 0) {
      setShowScenarioPicker(true);
    } else {
      setShowScenarioPicker(false);
      loadExistingSession(agent, null);
    }
  };

  const loadExistingSession = (agent, scenario) => {
    const existing = allTranscripts.find(
      t => t.studentName === studentName &&
           t.studentRank === studentRank &&
           t.agentId === agent.id &&
           t.scenarioId === (scenario?.id || null)
    );
    if (existing) {
      setChatSessionId(existing.id);
      setMessages(existing.messages || []);
    }
  };

  // ---------------------------------------------------------------------------
  // Select Scenario (or free chat)
  // ---------------------------------------------------------------------------
  const handleSelectScenario = (scenario) => {
    setSelectedScenario(scenario);
    setShowScenarioPicker(false);
    setMessages([]);
    setChatSessionId(null);

    if (scenario) {
      loadExistingSession(selectedAgent, scenario);
      // If no existing session, the opening message appears immediately
      if (!allTranscripts.find(
        t => t.studentName === studentName && t.studentRank === studentRank &&
             t.agentId === selectedAgent.id && t.scenarioId === scenario.id
      )) {
        const openingMsg = {
          id: 'opening',
          role: 'agent',
          text: scenario.openingMessage,
          timestamp: Date.now(),
        };
        setMessages([openingMsg]);
      }
    } else {
      // Free chat — load any existing free-chat session
      loadExistingSession(selectedAgent, null);
    }
  };

  // ---------------------------------------------------------------------------
  // Gemini API Call
  // ---------------------------------------------------------------------------
  const generateAIResponse = async (userMessage, currentMessages, agent) => {
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
Keep responses concise, realistic to a professional military chat environment, and highly reflective of your specific leadership/followership flaws or strengths.`;

    const formattedHistory = currentMessages
      .filter(m => m.id !== 'opening')
      .map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }));

    // Include the scenario opening message as the model's first turn
    if (selectedScenario && currentMessages.find(m => m.id === 'opening')) {
      formattedHistory.unshift({
        role: 'model',
        parts: [{ text: selectedScenario.openingMessage }],
      });
    }

    formattedHistory.push({ role: 'user', parts: [{ text: userMessage }] });

    const payload = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: formattedHistory,
    };

    let retries = 5;
    let delay = 1000;
    while (retries > 0) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
      } catch (err) {
        retries--;
        if (retries === 0) return "I'm having trouble connecting right now. Please try again.";
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Send Message
  // ---------------------------------------------------------------------------
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedAgent || !user || !db) return;

    const text = inputText.trim();
    setInputText('');

    const userMsg = { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setIsTyping(true);

    let sessionId = chatSessionId;
    const scenarioId = selectedScenario?.id || null;

    if (!sessionId) {
      const docRef = await addDoc(col('transcripts'), {
        studentRank, studentName,
        agentId: selectedAgent.id,
        agentName: `${selectedAgent.rank} ${selectedAgent.name}`,
        scenarioId,
        scenarioTitle: selectedScenario?.title || null,
        isMoralCourageChallenge: selectedScenario?.isMoralCourageChallenge || false,
        messages: updated,
        timestamp: Date.now(),
      });
      sessionId = docRef.id;
      setChatSessionId(sessionId);
    } else {
      await updateDoc(ref('transcripts', sessionId), { messages: updated, lastUpdated: Date.now() });
    }

    const aiText = await generateAIResponse(text, updated, selectedAgent);
    const aiMsg = { id: (Date.now() + 1).toString(), role: 'agent', text: aiText, timestamp: Date.now() };
    const final = [...updated, aiMsg];
    setMessages(final);
    setIsTyping(false);
    await updateDoc(ref('transcripts', sessionId), { messages: final, lastUpdated: Date.now() });
  };

  // ---------------------------------------------------------------------------
  // Export Transcript
  // ---------------------------------------------------------------------------
  const exportTranscript = (transcriptData = null) => {
    const data = transcriptData || {
      messages, studentName, studentRank,
      agentName: selectedAgent ? `${selectedAgent.rank} ${selectedAgent.name}` : 'Agent',
      scenarioTitle: selectedScenario?.title || null,
    };
    if (!data.messages || data.messages.length === 0) return;

    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><style>body{font-family:Arial,sans-serif;line-height:1.6}.message{margin-bottom:12px}.meta{font-size:0.8em;color:#666}</style></head>
<body><h1>A731 Simulation Transcript</h1>
<p><strong>Student:</strong> ${data.studentRank} ${data.studentName}</p>
<p><strong>Interlocutor:</strong> ${data.agentName}</p>
${data.scenarioTitle ? `<p><strong>Scenario:</strong> ${data.scenarioTitle}</p>` : ''}
<hr/>`;

    const content = data.messages.map(m => {
      const sender = m.role === 'user' ? `${data.studentRank} ${data.studentName}` : data.agentName;
      const time = new Date(m.timestamp).toLocaleTimeString();
      return `<div class='message'><strong>${sender}</strong> <span class='meta'>[${time}]</span><br/>${m.text}</div>`;
    }).join('');

    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(header + content + '</body></html>');
    const link = document.createElement('a');
    link.href = source;
    link.download = `A731_Transcript_${data.studentName.replace(/\s+/g, '_')}.doc`;
    link.click();
  };

  // ---------------------------------------------------------------------------
  // Admin handlers
  // ---------------------------------------------------------------------------
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPasscode === SUPER_ADMIN_PASSCODE || storedPasscodes.includes(adminPasscode)) {
      setView('admin_dashboard');
      setAdminError('');
    } else {
      setAdminError('Invalid passcode.');
    }
  };

  const handleAddPasscode = async (e) => {
    e.preventDefault();
    const p = newPasscode.trim();
    if (!p || p === SUPER_ADMIN_PASSCODE || storedPasscodes.includes(p)) return;
    try {
      await updateDoc(ref('settings', 'admin'), { passcodes: arrayUnion(p) });
      setPasscodeStatus('Passcode added.');
      setNewPasscode('');
      setTimeout(() => setPasscodeStatus(''), 2000);
    } catch (err) { console.error(err); }
  };

  const handleRemovePasscode = async (p) => {
    try { await updateDoc(ref('settings', 'admin'), { passcodes: arrayRemove(p) }); }
    catch (err) { console.error(err); }
  };

  // Agent CRUD
  const handleAddAgent = async (e) => {
    e.preventDefault();
    if (!db || !newAgentData.name) return;
    const id = newAgentData.name.toLowerCase().replace(/\s+/g, '-');
    await setDoc(ref('agents', id), { ...newAgentData, id, active: true });
    setIsAddingAgent(false);
    setNewAgentData({ rank: '', name: '', type: '', directive: '', backstory: '', winCondition: '' });
  };

  const handleDeleteAgent = async (id) => {
    if (!db) return;
    try { await deleteDoc(ref('agents', id)); } catch (err) { console.error(err); }
  };

  const handleToggleAgent = async (agent) => {
    try { await updateDoc(ref('agents', agent.id), { active: !agent.active }); }
    catch (err) { console.error(err); }
  };

  const saveAgentEdit = async () => {
    if (!editingAgent || !db) return;
    try { await updateDoc(ref('agents', editingAgent.id), { ...editingAgent }); setEditingAgent(null); }
    catch (err) { console.error(err); }
  };

  // Scenario CRUD
  const handleAddScenario = async (e) => {
    e.preventDefault();
    if (!db || !newScenarioData.title || !newScenarioData.agentId) return;
    const id = `${newScenarioData.agentId}-${Date.now()}`;
    await setDoc(ref('scenarios', id), {
      ...newScenarioData, id,
      order: scenarios.length + 1,
    });
    setIsAddingScenario(false);
    setNewScenarioData({ agentId: '', title: '', description: '', openingMessage: '', isMoralCourageChallenge: false, active: true });
  };

  const handleDeleteScenario = async (id) => {
    try { await deleteDoc(ref('scenarios', id)); } catch (err) { console.error(err); }
  };

  const handleToggleScenario = async (scenario) => {
    try { await updateDoc(ref('scenarios', scenario.id), { active: !scenario.active }); }
    catch (err) { console.error(err); }
  };

  const saveScenarioEdit = async () => {
    if (!editingScenario || !db) return;
    try { await updateDoc(ref('scenarios', editingScenario.id), { ...editingScenario }); setEditingScenario(null); }
    catch (err) { console.error(err); }
  };

  const handleDeleteTranscript = async (id) => {
    try { await deleteDoc(ref('transcripts', id)); } catch (err) { console.error(err); }
  };

  // ---------------------------------------------------------------------------
  // Active agents (student view only shows active)
  // ---------------------------------------------------------------------------
  const activeAgents = agents.filter(a => a.active !== false);

  // ---------------------------------------------------------------------------
  // Shared Header
  // ---------------------------------------------------------------------------
  const Header = () => (
    <header className="bg-slate-900 text-white shadow-md border-b-4 border-amber-500">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Shield className="h-8 w-8 text-amber-500" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">A731 Leadership Simulator</h1>
            <p className="text-xs text-slate-400">Leading Up: Morally Courageous Followership</p>
          </div>
        </div>
        {view !== 'landing' && (
          <button
            onClick={() => { setView('landing'); setSelectedAgent(null); setMessages([]); }}
            className="flex items-center space-x-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" /><span>Exit</span>
          </button>
        )}
      </div>
    </header>
  );

  // ---------------------------------------------------------------------------
  // LANDING VIEW
  // ---------------------------------------------------------------------------
  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-slate-100">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Simulation Access</h2>
            {!hasFirebase && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
                Firebase not configured. Add your <code>.env.local</code> values to enable persistence.
              </div>
            )}
            <form onSubmit={handleStudentLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rank</label>
                <input type="text" required placeholder="e.g., MAJ" value={studentRank}
                  onChange={e => setStudentRank(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                <input type="text" required placeholder="e.g., Smith" value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <button type="submit"
                className="w-full bg-emerald-700 text-white py-3 rounded-md font-semibold hover:bg-emerald-800 transition-colors">
                Enter Scenario
              </button>
            </form>
            <div className="mt-10 pt-6 border-t text-center">
              <button onClick={() => setView('admin_login')}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center justify-center w-full">
                <Settings className="h-3 w-3 mr-1" />Admin Portal
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // STUDENT VIEW
  // ---------------------------------------------------------------------------
  if (view === 'student') {
    const agentScenarios = selectedAgent
      ? scenarios.filter(s => s.agentId === selectedAgent.id && s.active !== false)
      : [];

    return (
      <div className="h-screen flex flex-col bg-slate-50 font-sans">
        <Header />
        <div className="flex-grow flex overflow-hidden">
          {/* Roster Sidebar */}
          <div className="w-72 bg-white border-r flex flex-col flex-shrink-0">
            <div className="p-4 bg-slate-100 border-b">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center">
                <Users className="h-4 w-4 mr-2" />Unit Roster
              </h3>
            </div>
            <div className="flex-grow overflow-y-auto p-2 space-y-1">
              {activeAgents.map(agent => (
                <button key={agent.id} onClick={() => handleSelectAgent(agent)}
                  className={`w-full text-left px-4 py-3 rounded-md transition-colors ${selectedAgent?.id === agent.id ? 'bg-emerald-50 border-l-4 border-emerald-600' : 'hover:bg-slate-50'}`}>
                  <div className="flex items-center">
                    <div className="bg-slate-200 text-slate-700 rounded-full h-8 w-8 flex items-center justify-center font-bold text-xs mr-3 flex-shrink-0">
                      {agent.rank}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">{agent.name}</div>
                      <div className="text-xs text-slate-400">{agent.type}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Panel */}
          <div className="flex-grow flex flex-col overflow-hidden">
            {!selectedAgent && (
              <div className="flex-grow flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Select a persona from the roster to begin.</p>
                </div>
              </div>
            )}

            {/* Scenario Picker */}
            {selectedAgent && showScenarioPicker && (
              <div className="flex-grow overflow-y-auto p-6 bg-slate-50">
                <div className="max-w-2xl mx-auto">
                  <div className="flex items-center mb-6">
                    <div className="bg-emerald-700 text-white rounded-full h-10 w-10 flex items-center justify-center font-bold text-xs mr-3">
                      {selectedAgent.rank}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{selectedAgent.name}</h2>
                      <p className="text-sm text-slate-500">{selectedAgent.type}</p>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">
                    Available Scenarios
                  </h3>
                  <div className="space-y-3 mb-4">
                    {agentScenarios.map(scenario => (
                      <button key={scenario.id} onClick={() => handleSelectScenario(scenario)}
                        className="w-full text-left bg-white rounded-lg border border-slate-200 p-4 hover:border-emerald-400 hover:shadow-md transition-all group">
                        <div className="flex items-start justify-between">
                          <div className="flex-grow pr-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-slate-800">{scenario.title}</span>
                              {scenario.isMoralCourageChallenge && (
                                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                  <AlertTriangle className="h-3 w-3" />Moral Courage
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-500">{scenario.description}</p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-emerald-500 transition-colors flex-shrink-0 mt-0.5" />
                        </div>
                      </button>
                    ))}
                  </div>

                  <button onClick={() => handleSelectScenario(null)}
                    className="w-full text-left bg-slate-100 rounded-lg border border-dashed border-slate-300 p-4 hover:bg-slate-50 hover:border-slate-400 transition-all group">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-600 text-sm">Free Chat</div>
                        <div className="text-xs text-slate-400">Open-ended conversation — no defined scenario</div>
                      </div>
                      <MessageSquare className="h-5 w-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Chat View */}
            {selectedAgent && !showScenarioPicker && (
              <>
                <div className="bg-white border-b px-6 py-4 flex justify-between items-center flex-shrink-0">
                  <div className="flex items-center">
                    <button onClick={() => setShowScenarioPicker(agentScenarios.length > 0)}
                      className="flex items-center hover:opacity-70 transition-opacity">
                      <div className="bg-emerald-700 text-white rounded-full h-10 w-10 flex items-center justify-center font-bold text-xs mr-3">
                        {selectedAgent.rank}
                      </div>
                    </button>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">{selectedAgent.name}</h2>
                      {selectedScenario ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">{selectedScenario.title}</span>
                          {selectedScenario.isMoralCourageChallenge && (
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                              <AlertTriangle className="h-2.5 w-2.5" />Moral Courage
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Free Chat</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {agentScenarios.length > 0 && (
                      <button onClick={() => setShowScenarioPicker(true)}
                        className="flex items-center space-x-1 px-3 py-2 text-slate-500 text-xs rounded-md hover:bg-slate-100 transition-colors">
                        <BookOpen className="h-3.5 w-3.5" /><span>Scenarios</span>
                      </button>
                    )}
                    <button onClick={() => exportTranscript()} disabled={messages.length === 0}
                      className="flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-md text-sm font-medium disabled:opacity-40 hover:bg-slate-200 transition-colors">
                      <Download className="h-4 w-4" /><span>Export</span>
                    </button>
                  </div>
                </div>

                <div className="flex-grow overflow-y-auto p-6 space-y-4 bg-slate-50">
                  {messages.length === 0 && (
                    <div className="text-center text-slate-400 py-10 text-sm">
                      Send a message to begin the simulation.
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[72%] rounded-2xl px-4 py-3 shadow-sm ${msg.role === 'user' ? 'bg-emerald-700 text-white' : 'bg-white border text-slate-800'}`}>
                        <div className="text-[10px] opacity-60 mb-1">
                          {msg.role === 'user' ? `${studentRank} ${studentName}` : selectedAgent.name}
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

                <div className="p-4 bg-white border-t flex-shrink-0">
                  <form onSubmit={handleSendMessage} className="flex space-x-2 max-w-4xl mx-auto">
                    <input type="text" value={inputText} onChange={e => setInputText(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-grow bg-slate-100 border-none rounded-full px-5 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                      disabled={isTyping} />
                    <button type="submit" disabled={!inputText.trim() || isTyping}
                      className="bg-amber-500 text-white rounded-full p-2.5 disabled:opacity-40 hover:bg-amber-600 transition-colors">
                      <Send className="h-5 w-5" />
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // ADMIN LOGIN VIEW
  // ---------------------------------------------------------------------------
  if (view === 'admin_login') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 mr-2 text-amber-500" />Admin Access
          </h2>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <input type="password" required placeholder="Admin Passcode" value={adminPasscode}
              onChange={e => setAdminPasscode(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-slate-500 outline-none" />
            {adminError && <p className="text-red-500 text-xs">{adminError}</p>}
            <button type="submit"
              className="w-full bg-slate-800 text-white py-2 rounded-md font-semibold hover:bg-slate-900 transition-colors">
              Login
            </button>
          </form>
          <button onClick={() => setView('landing')} className="mt-4 text-sm text-slate-500 w-full text-center hover:text-slate-700 transition-colors">
            Return
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // ADMIN DASHBOARD VIEW
  // ---------------------------------------------------------------------------
  if (view === 'admin_dashboard') {
    return (
      <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
        <Header />
        <div className="max-w-7xl mx-auto w-full px-4 py-8 flex-grow">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold text-slate-900">Instructor Dashboard</h2>
            <div className="flex bg-white rounded-md border p-1 shadow-sm gap-0.5">
              {[
                { key: 'transcripts', label: 'Logs' },
                { key: 'agents', label: 'Personas' },
                { key: 'scenarios', label: 'Scenarios' },
                { key: 'settings', label: 'Security' },
              ].map(tab => (
                <button key={tab.key} onClick={() => setAdminTab(tab.key)}
                  className={`px-4 py-2 text-sm rounded transition-all ${adminTab === tab.key ? 'bg-slate-100 font-bold text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden min-h-[400px]">

            {/* ---- TRANSCRIPTS TAB ---- */}
            {adminTab === 'transcripts' && (
              <div className="divide-y">
                {allTranscripts.length === 0
                  ? <div className="p-8 text-center text-slate-400">No transcripts recorded yet.</div>
                  : allTranscripts.map(transcript => (
                    <details key={transcript.id} className="p-4 group">
                      <summary className="flex justify-between items-center cursor-pointer list-none">
                        <div className="flex items-center gap-3 flex-wrap">
                          <ChevronRight className="h-4 w-4 text-slate-400 group-open:rotate-90 transition-transform flex-shrink-0" />
                          <span className="font-bold text-slate-800">{transcript.studentRank} {transcript.studentName}</span>
                          <span className="text-slate-400">/</span>
                          <span className="text-emerald-700 font-medium">{transcript.agentName}</span>
                          {transcript.scenarioTitle && (
                            <span className="text-xs text-slate-500 italic">{transcript.scenarioTitle}</span>
                          )}
                          {transcript.isMoralCourageChallenge && (
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="h-2.5 w-2.5" />MC
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                          <button onClick={e => { e.stopPropagation(); exportTranscript(transcript); }}
                            className="text-xs flex items-center text-slate-600 bg-slate-100 px-3 py-1.5 rounded hover:bg-slate-200 transition-colors">
                            <Download className="h-3.5 w-3.5 mr-1" />Export
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); if (window.confirm('Delete this transcript permanently?')) handleDeleteTranscript(transcript.id); }}
                            className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </summary>
                      <div className="mt-4 ml-8 bg-slate-50 p-6 rounded-lg text-sm max-h-96 overflow-y-auto border border-slate-200 shadow-inner">
                        {transcript.messages?.map((m, i) => (
                          <div key={i} className="mb-3 leading-relaxed">
                            <span className={`font-bold mr-2 uppercase text-[10px] tracking-wider ${m.role === 'user' ? 'text-emerald-700' : 'text-slate-600'}`}>
                              {m.role === 'user' ? 'Student' : 'Agent'}:
                            </span>
                            <span className="text-slate-800">{m.text}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))
                }
              </div>
            )}

            {/* ---- PERSONAS TAB ---- */}
            {adminTab === 'agents' && (
              <div className="divide-y">
                <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">Managed AI Personas</h3>
                  <button onClick={() => setIsAddingAgent(!isAddingAgent)}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-colors ${isAddingAgent ? 'bg-slate-200 text-slate-700' : 'bg-emerald-700 text-white hover:bg-emerald-800'}`}>
                    {isAddingAgent ? <X className="h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                    {isAddingAgent ? 'Cancel' : 'Create New Persona'}
                  </button>
                </div>

                {isAddingAgent && (
                  <div className="p-6 bg-emerald-50 border-b">
                    <form onSubmit={handleAddAgent} className="space-y-4 max-w-3xl">
                      <div className="grid grid-cols-3 gap-4">
                        <input required placeholder="Rank" value={newAgentData.rank}
                          onChange={e => setNewAgentData({ ...newAgentData, rank: e.target.value })}
                          className="border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
                        <input required placeholder="Full Name" value={newAgentData.name}
                          onChange={e => setNewAgentData({ ...newAgentData, name: e.target.value })}
                          className="border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
                        <input placeholder="Type (e.g. Micromanager)" value={newAgentData.type}
                          onChange={e => setNewAgentData({ ...newAgentData, type: e.target.value })}
                          className="border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
                      </div>
                      <textarea required placeholder="AI Directive (Behavior & Tone)" value={newAgentData.directive}
                        onChange={e => setNewAgentData({ ...newAgentData, directive: e.target.value })}
                        className="w-full border p-2 rounded text-sm h-24 outline-none focus:ring-2 focus:ring-emerald-400" />
                      <textarea placeholder="Backstory & Trivia" value={newAgentData.backstory}
                        onChange={e => setNewAgentData({ ...newAgentData, backstory: e.target.value })}
                        className="w-full border p-2 rounded text-sm h-20 outline-none focus:ring-2 focus:ring-emerald-400" />
                      <textarea placeholder="Win Condition" value={newAgentData.winCondition}
                        onChange={e => setNewAgentData({ ...newAgentData, winCondition: e.target.value })}
                        className="w-full border p-2 rounded text-sm h-20 outline-none focus:ring-2 focus:ring-emerald-400" />
                      <button type="submit"
                        className="bg-emerald-700 text-white px-6 py-2 rounded font-bold hover:bg-emerald-800 transition-colors">
                        Save New Persona
                      </button>
                    </form>
                  </div>
                )}

                {agents.map(agent => (
                  <div key={agent.id} className={`p-6 group transition-colors ${agent.active === false ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50'}`}>
                    {editingAgent?.id === agent.id ? (
                      <div className="space-y-3">
                        <div className="flex space-x-2">
                          <input value={editingAgent.rank}
                            onChange={e => setEditingAgent({ ...editingAgent, rank: e.target.value })}
                            className="w-20 border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
                          <input value={editingAgent.name}
                            onChange={e => setEditingAgent({ ...editingAgent, name: e.target.value })}
                            className="flex-grow border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
                        </div>
                        <textarea value={editingAgent.directive}
                          onChange={e => setEditingAgent({ ...editingAgent, directive: e.target.value })}
                          className="w-full border p-2 rounded text-sm h-32 outline-none focus:ring-2 focus:ring-emerald-400" />
                        <textarea value={editingAgent.winCondition}
                          onChange={e => setEditingAgent({ ...editingAgent, winCondition: e.target.value })}
                          className="w-full border p-2 rounded text-sm h-20 outline-none focus:ring-2 focus:ring-emerald-400" />
                        <div className="flex justify-end space-x-2">
                          <button onClick={() => setEditingAgent(null)} className="px-4 py-1.5 border rounded text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                          <button onClick={saveAgentEdit} className="px-4 py-1.5 bg-emerald-700 text-white rounded text-sm font-bold hover:bg-emerald-800 transition-colors">Save</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start">
                        <div className="flex-grow pr-10">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-bold text-slate-900">{agent.rank} {agent.name}</span>
                            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">{agent.type}</span>
                            {agent.active === false && (
                              <span className="text-[10px] bg-slate-300 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">Inactive</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 italic line-clamp-2">"{agent.directive}"</p>
                        </div>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleToggleAgent(agent)}
                            className={`p-2 rounded transition-all ${agent.active === false ? 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50' : 'text-emerald-500 hover:text-slate-500 hover:bg-slate-100'}`}
                            title={agent.active === false ? 'Enable Persona' : 'Disable Persona'}>
                            {agent.active === false
                              ? <ToggleLeft className="h-5 w-5" />
                              : <ToggleRight className="h-5 w-5" />}
                          </button>
                          <button onClick={() => setEditingAgent(agent)}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-all" title="Edit">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => { if (window.confirm('Delete this persona permanently?')) handleDeleteAgent(agent.id); }}
                            className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-all" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ---- SCENARIOS TAB ---- */}
            {adminTab === 'scenarios' && (
              <div className="divide-y">
                <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-800">Agent-Initiated Scenarios</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Scenarios where the agent speaks first with a defined task or order.</p>
                  </div>
                  <button onClick={() => setIsAddingScenario(!isAddingScenario)}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-colors ${isAddingScenario ? 'bg-slate-200 text-slate-700' : 'bg-emerald-700 text-white hover:bg-emerald-800'}`}>
                    {isAddingScenario ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    {isAddingScenario ? 'Cancel' : 'New Scenario'}
                  </button>
                </div>

                {isAddingScenario && (
                  <div className="p-6 bg-emerald-50 border-b">
                    <form onSubmit={handleAddScenario} className="space-y-4 max-w-3xl">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Persona</label>
                          <select required value={newScenarioData.agentId}
                            onChange={e => setNewScenarioData({ ...newScenarioData, agentId: e.target.value })}
                            className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
                            <option value="">Select persona...</option>
                            {agents.map(a => <option key={a.id} value={a.id}>{a.rank} {a.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Scenario Title</label>
                          <input required placeholder="e.g., The Inflated Report" value={newScenarioData.title}
                            onChange={e => setNewScenarioData({ ...newScenarioData, title: e.target.value })}
                            className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Brief Description (shown to student before entry)</label>
                        <input placeholder="Short summary visible on scenario card" value={newScenarioData.description}
                          onChange={e => setNewScenarioData({ ...newScenarioData, description: e.target.value })}
                          className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Opening Message (first thing the agent says)</label>
                        <textarea required placeholder="This is the agent's opening line — the task, order, or situation they present to the student."
                          value={newScenarioData.openingMessage}
                          onChange={e => setNewScenarioData({ ...newScenarioData, openingMessage: e.target.value })}
                          className="w-full border p-2 rounded text-sm h-28 outline-none focus:ring-2 focus:ring-emerald-400" />
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={newScenarioData.isMoralCourageChallenge}
                          onChange={e => setNewScenarioData({ ...newScenarioData, isMoralCourageChallenge: e.target.checked })}
                          className="w-4 h-4 accent-red-600" />
                        <span className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          Flag as Moral Courage Challenge
                        </span>
                      </label>
                      <button type="submit"
                        className="bg-emerald-700 text-white px-6 py-2 rounded font-bold hover:bg-emerald-800 transition-colors">
                        Save Scenario
                      </button>
                    </form>
                  </div>
                )}

                {scenarios.length === 0 && !isAddingScenario && (
                  <div className="p-8 text-center text-slate-400">No scenarios defined yet.</div>
                )}

                {scenarios.map(scenario => {
                  const linkedAgent = agents.find(a => a.id === scenario.agentId);
                  return (
                    <div key={scenario.id} className={`p-5 group transition-colors ${scenario.active === false ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50'}`}>
                      {editingScenario?.id === scenario.id ? (
                        <div className="space-y-3 max-w-3xl">
                          <input value={editingScenario.title}
                            onChange={e => setEditingScenario({ ...editingScenario, title: e.target.value })}
                            className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400 font-bold" />
                          <input value={editingScenario.description}
                            onChange={e => setEditingScenario({ ...editingScenario, description: e.target.value })}
                            className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
                          <textarea value={editingScenario.openingMessage}
                            onChange={e => setEditingScenario({ ...editingScenario, openingMessage: e.target.value })}
                            className="w-full border p-2 rounded text-sm h-28 outline-none focus:ring-2 focus:ring-emerald-400" />
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={editingScenario.isMoralCourageChallenge}
                              onChange={e => setEditingScenario({ ...editingScenario, isMoralCourageChallenge: e.target.checked })}
                              className="w-4 h-4 accent-red-600" />
                            <span className="text-sm text-slate-700 font-semibold">Moral Courage Challenge</span>
                          </label>
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingScenario(null)} className="px-4 py-1.5 border rounded text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                            <button onClick={saveScenarioEdit} className="px-4 py-1.5 bg-emerald-700 text-white rounded text-sm font-bold hover:bg-emerald-800 transition-colors">Save</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start">
                          <div className="flex-grow pr-8">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-bold text-slate-800">{scenario.title}</span>
                              {scenario.isMoralCourageChallenge && (
                                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                  <AlertTriangle className="h-2.5 w-2.5" />Moral Courage
                                </span>
                              )}
                              {scenario.active === false && (
                                <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">Inactive</span>
                              )}
                            </div>
                            {linkedAgent && (
                              <div className="text-xs text-emerald-700 font-medium mb-1">
                                {linkedAgent.rank} {linkedAgent.name}
                              </div>
                            )}
                            <p className="text-xs text-slate-500 mb-2">{scenario.description}</p>
                            <p className="text-xs text-slate-400 italic line-clamp-2">
                              Opening: "{scenario.openingMessage}"
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button onClick={() => handleToggleScenario(scenario)}
                              className={`p-2 rounded transition-all ${scenario.active === false ? 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50' : 'text-emerald-500 hover:text-slate-500 hover:bg-slate-100'}`}
                              title={scenario.active === false ? 'Enable' : 'Disable'}>
                              {scenario.active === false ? <ToggleLeft className="h-5 w-5" /> : <ToggleRight className="h-5 w-5" />}
                            </button>
                            <button onClick={() => setEditingScenario(scenario)}
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-all">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => { if (window.confirm('Delete this scenario permanently?')) handleDeleteScenario(scenario.id); }}
                              className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-all">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ---- SECURITY TAB ---- */}
            {adminTab === 'settings' && (
              <div className="p-8">
                <div className="max-w-2xl">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                    <Lock className="h-5 w-5 mr-2" />Access Management
                  </h3>

                  <div className="mb-8 p-4 bg-slate-50 rounded-lg border flex items-center shadow-sm">
                    <Shield className="h-5 w-5 text-amber-600 mr-3 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900">Master Key configured via environment variable</div>
                      <div className="text-xs text-slate-500">Set VITE_SUPER_ADMIN_PASSCODE in .env.local or Vercel settings</div>
                    </div>
                  </div>

                  <form onSubmit={handleAddPasscode} className="mb-8 flex space-x-2">
                    <div className="flex-grow relative">
                      <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input type="text" value={newPasscode} onChange={e => setNewPasscode(e.target.value)}
                        placeholder="New instructor passcode..."
                        className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                    </div>
                    <button type="submit"
                      className="bg-slate-800 text-white px-6 py-2 rounded-md font-bold hover:bg-slate-900 flex items-center shadow-sm whitespace-nowrap transition-colors">
                      <Plus className="h-4 w-4 mr-1" /> Add Key
                    </button>
                  </form>

                  <div className="border rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-4 py-3 border-b text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Active Access Keys
                    </div>
                    <div className="divide-y">
                      {storedPasscodes.length === 0
                        ? <div className="p-8 text-center text-sm text-slate-400 italic">No additional keys configured.</div>
                        : storedPasscodes.map(pass => (
                          <div key={pass} className="p-4 flex justify-between items-center group hover:bg-slate-50 transition-colors">
                            <code className="text-sm font-bold text-slate-700 tracking-wider bg-slate-100 px-2 py-1 rounded">{pass}</code>
                            <button onClick={() => handleRemovePasscode(pass)}
                              className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                  {passcodeStatus && <p className="mt-4 text-sm text-emerald-700 font-bold">{passcodeStatus}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
