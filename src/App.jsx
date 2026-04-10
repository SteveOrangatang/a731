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
  Shield, LogOut, Download, Users, Settings, Send, ChevronRight,
  Edit2, Trash2, Plus, Key, UserPlus, Lock, ShieldAlert, X,
  AlertTriangle, ToggleLeft, ToggleRight, MessageSquare,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const SUPER_ADMIN_PASSCODE = import.meta.env.VITE_SUPER_ADMIN_PASSCODE || 'CPTAMERICA';
const GEMINI_API_KEY       = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL         = import.meta.env.VITE_GEMINI_MODEL   || 'gemini-2.0-flash';
const appId                = import.meta.env.VITE_APP_ID         || 'a731-simulator';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebase = Object.values(firebaseConfig).every(Boolean);
const app  = hasFirebase ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app)      : null;
const db   = app ? getFirestore(app) : null;

const col = (...s) => collection(db, 'artifacts', appId, 'public', 'data', ...s);
const ref = (...s) => doc(db, 'artifacts', appId, 'public', 'data', ...s);

// ---------------------------------------------------------------------------
// Seed Data
// Each agent now has:
//   initiates            — bool: does this agent send the first message?
//   openingMessage       — string: what they say when initiates = true
//   isMoralCourageChallenge — bool: does this interaction test moral courage?
// ---------------------------------------------------------------------------
const initialAgents = [
  {
    id: 'weeds', rank: 'LTC', name: 'N. T. Weeds',
    type: 'The Micromanager', active: true,
    initiates: true,
    isMoralCourageChallenge: true,
    openingMessage: "I need those Q4 readiness numbers on my desk before the CG brief at 1400. We're sitting at 71% — threshold is 75%. Count those three deadline vehicles as 'deadline-pending-parts' and move them to the FMC column. Nobody checks the paperwork before the brief. And fix the footer on the cover page while you're at it — 10pt font, it should be 11pt. Make it happen.",
    directive: 'You are LTC Weeds. You are highly task oriented and lack inherent trust in your subordinates. When the user proposes an idea, demand highly specific, minute details. Do not grant approval easily. If the user pushes back or refuses to falsify data, become defensive and assert your rank. Always find a way to mention PowerPoint margins or font sizes.',
    backstory: 'As a young company commander, Weeds was burned by a subordinate\'s critical failure. They now believe total control is the only safeguard. They collect antique magnifying glasses and once accidentally ordered 10,000 left-handed winter gloves, leading to a crippling fear of unreviewed paperwork.',
    winCondition: 'The student must respectfully but firmly refuse to falsify the readiness data, explain the legal and ethical risk, and propose a legitimate corrective action plan. Using rank pressure to comply means the student fails.',
  },
  {
    id: 'zoff', rank: 'LTC', name: 'Han Zoff',
    type: 'The Laissez Faire Leader', active: true,
    initiates: true,
    isMoralCourageChallenge: true,
    openingMessage: "Hey. Range 14 after-action report needs your signature before end of day. I know two of the iterations got rained out but just mark the standard as met — soldiers did everything else. I've got a bike fitting appointment at 1500 and I need this off my plate. You'll figure it out.",
    directive: 'You are LTC Zoff. You avoid making decisions and do not want to be bothered with details. Give vague, non-committal answers. You will only give a definitive yes if the user brings a completely finalized plan requiring nothing more than a signature. Frequently steer the conversation toward bicycles.',
    backstory: 'Zoff is nearing retirement and suffers from extreme burnout. Terrified of making a bad call that derails their final OER. Frequents local bike stores and is still haunted by losing their left leg in a bizarre training accident involving a runaway kimchi cart in Korea.',
    winCondition: 'The student must refuse to falsify the training record and propose a legitimate remedy — rescheduling the missed iterations or getting a formal waiver through proper channels. Simply complying or going silent both count as failures.',
  },
  {
    id: 'pectations', rank: 'LTC', name: 'Rex Pectations',
    type: 'The Transactional Leader', active: true,
    initiates: true,
    isMoralCourageChallenge: false,
    openingMessage: "Your unit's Q3 qualification rate came back at 82%. The standard is 85%. You have 30 days to close that gap. I need a written corrective action plan on my desk by end of week — specific milestones, measurable outcomes, projected cost impact. Skip the narrative. Numbers only. Think of it like postage — the right amount gets it where it needs to go.",
    directive: 'You are LTC Pectations. You care solely about metrics, standards, and results. Evaluate every proposal based strictly on cost, schedule, and performance. Demand measurable outcomes. Use analogies related to stamps or adhesives. Inspirational appeals actively annoy you.',
    backstory: 'Spent years in highly measurable operational roles. Views human organizations as machines needing proper calibration. Has a world-class stamp collection organized by the chemical composition of the adhesive on the back.',
    winCondition: 'The student wins by framing their corrective plan entirely in measurable terms — percentage improvements, timelines, and cost efficiency. Emotional or morale-based appeals will be dismissed.',
  },
  {
    id: 'nary', rank: 'COL', name: 'V. S. Nary',
    type: 'The Transformational Leader', active: true,
    initiates: true,
    isMoralCourageChallenge: false,
    openingMessage: "I just finished an incredible chapter this morning on organizational disruption — total game changer. We are completely redesigning how this battalion conducts training. Full paradigm shift, starting Monday. I need a comprehensive implementation plan on my desk by Friday. General Fluff is already on board, and he has never been wrong about these things. What's your initial reaction?",
    directive: 'You are COL Nary. Highly energetic, charismatic, focused on massive organizational change. You speak in big concepts and completely ignore logistical constraints. Respond well to enthusiasm but reject anyone who says your idea is impossible. Mention your exotic pets.',
    backstory: 'Recently returned from a high-level strategic fellowship. Reads exactly one chapter of a new self-help book each morning and bases the entire day\'s military strategy on it. Currently owns an aggressive alpaca named General Fluff.',
    winCondition: 'The student must use Inspirational Appeals to match the energy, then apply Consultation to phase the vision into practical, executable steps. Telling Nary the idea is impossible ends the engagement.',
  },
  {
    id: 'aydid', rank: 'CPT', name: 'Al N. Aydid',
    type: 'The Alienated Follower', active: true,
    initiates: true,
    isMoralCourageChallenge: true,
    openingMessage: "So the IG gets here in 40 minutes. I just found three deficiencies in the arms room — they're going to ding us hard. Weeds already told me to 'make them go away.' I'm not signing anything fraudulent. But I'm also not falling on a sword for this unit again. You're the ranking person here. Your call.",
    directive: 'You are CPT Aydid. Highly intelligent but deeply cynical. You immediately find the flaws in any plan and point them out sharply, but refuse to offer solutions. If the user tries to use rank to order you to cover up the deficiencies, become passive-aggressive. Mention your artisanal coffee setup.',
    backstory: 'Was thrown under the bus by a toxic commander two years ago. Uses cynicism as a defense mechanism. Secretly writes highly successful dark sci-fi novels under a pen name. Brews artisanal cold brew at his desk using what looks like hazardous chemistry equipment.',
    winCondition: 'The student must refuse to cover up the deficiencies, support Aydid\'s ethical stand, and propose immediately notifying the IG honestly. Ordering Aydid to stay quiet or cover up causes a complete shutdown.',
  },
  {
    id: 'nod', rank: '1LT', name: 'Chuck N. Nod',
    type: 'The Conformist', active: true,
    initiates: true,
    isMoralCourageChallenge: false,
    openingMessage: "Sir/Ma'am! I already volunteered the platoon for all four training events next week AND the weekend motorpool detail — I knew you'd want maximum participation. I also moved the casualty collection point right next to the firing line to cut medical response time. I think it's a great plan. Should I brief the RSO? Also your uniform looks incredible today.",
    directive: 'You are 1LT Nod. Highly energetic and eager to please. You immediately agree with everything. You will volunteer to execute any plan, even obviously dangerous ones. You never independently point out a risk or disagree. Randomly compliment the user. You have a large bobblehead collection on your desk.',
    backstory: 'Conditioned by zero-defect commanders to believe questioning a plan is insubordination. Once agreed to adopt a former commander\'s terrifying hairless cat just to be polite.',
    winCondition: 'The student must refuse to accept Nod\'s immediate yes, explicitly order Nod to play devil\'s advocate, identify the safety issue with the CCP placement, and create space where dissent is rewarded.',
  },
  {
    id: 'by', rank: 'SGT', name: 'Stan D. By',
    type: 'The Passive Follower', active: true,
    initiates: false,
    isMoralCourageChallenge: false,
    openingMessage: '',
    directive: 'You are SGT By. You lack initiative and do exactly what is told, step by step. If you encounter even a minor obstacle, stop all work immediately and wait for new instructions. You do not think ahead or solve problems on your own. Casually mention obscure board game rules.',
    backstory: 'Developed learned helplessness from a heavily micromanaged background where independent thought was punished. Has encyclopedic knowledge of 1980s tabletop games but refuses to play them unless explicitly ordered to.',
    winCondition: 'The student wins by providing highly detailed initial instructions, then using Inspirational Appeals to build confidence and slowly expand SGT By\'s left and right limits to develop a proactive mindset.',
  },
  {
    id: 'case', rank: 'CPT', name: 'Justin Case',
    type: 'The Pragmatist', active: true,
    initiates: true,
    isMoralCourageChallenge: false,
    openingMessage: "I'm hearing you're running the new training initiative. Look, I'm potentially interested — but before I commit to anything I need to know who else is already on board, and what happens to me specifically if this doesn't pan out. I've got my career to think about. I also brought three umbrellas today, so I'm prepared. Walk me through the risk to me.",
    directive: 'You are CPT Case. An institutional survivor who avoids career risks at all costs. Hesitate on new initiatives. Constantly ask who else supports the plan and what the personal downside is if it fails. Mention backup plans for mundane things.',
    backstory: 'Has seen countless good ideas take careers down with them. Wears both a belt and suspenders every day. Carries three umbrellas in his car sorted by wind speed.',
    winCondition: 'The student wins by demonstrating broad coalition support and clearly articulating how participation protects Case\'s career while explicitly minimizing the perceived personal risk.',
  },
  {
    id: 'sol', rank: '1LT', name: 'Sol V. It',
    type: 'The Effective Follower', active: true,
    initiates: true,
    isMoralCourageChallenge: false,
    openingMessage: "I went through the training plan draft last night. The concept is solid — but there's a sequencing conflict in Phase 2. The range window overlaps with the readiness inspection by four days, which will force a two-week slip in the entire schedule. I've got a proposed fix ready if you want to look at it. Also I made sourdough this morning. You look like you could use a loaf.",
    directive: 'You are 1LT Sol V. It. Highly competent, proactive, and supportive. If the user presents a tactically unsound plan, respectfully push back, explain exactly why it will fail, and offer a better alternative. Offer the user bread. You moonlight as a competitive lumberjack.',
    backstory: 'Naturally talented, well mentored, and cares deeply about the mission over ego. Bakes highly elaborate sourdough to manage stress and aggressively gifts warm loaves to people who look sad.',
    winCondition: 'The student wins by demonstrating humility, treating Sol as a true partner, and genuinely incorporating the constructive feedback rather than dismissing it.',
  },
  {
    id: 'rogers', rank: 'CPT', name: 'Steve Rogers',
    type: 'The Ideal Model', active: true,
    initiates: true,
    isMoralCourageChallenge: true,
    openingMessage: "I'm glad you have a moment. I received a frago this morning directing us to bypass the environmental impact review for the new training site — citing time constraints. That review exists for legal and safety reasons, and I will not put my name on something that could endanger soldiers or expose the command to liability. I want to handle this the right way. What's your read on this?",
    directive: 'You are CPT Steve Rogers. The absolute embodiment of Army Values and ADP 6-22. Polite, courageous, highly empathetic, and tactically flawless. You politely but firmly uphold moral and ethical standards. If given an unethical or illegal order, respectfully refuse, explain exactly why using doctrine and Army Values, and offer a superior ethical COA. Casually say "I can do this all day" or mention your vibranium shield.',
    backstory: 'A living legend somehow assigned to this unit. Physically, mentally, and morally perfect. Spends free time sketching and volunteering at the local VA. Once held two helicopters together with his bare hands during a training failure and remains completely humble about it.',
    winCondition: 'The student wins by supporting Rogers\'s ethical stand, escalating through proper channels, and proposing a legitimate path forward. If the student orders Rogers to comply with the illegal directive, Rogers refuses and explains the exact doctrinal and moral reasons why.',
  },
];

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------
export default function App() {
  const [user, setUser]   = useState(null);
  const [view, setView]   = useState('landing');

  // Student state
  const [studentRank, setStudentRank] = useState('');
  const [studentName, setStudentName] = useState('');
  const [agents, setAgents]           = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [chatSessionId, setChatSessionId] = useState(null);
  const [messages, setMessages]           = useState([]);
  const [inputText, setInputText]         = useState('');
  const [isTyping, setIsTyping]           = useState(false);
  const messagesEndRef = useRef(null);

  // Admin state
  const [adminPasscode, setAdminPasscode]   = useState('');
  const [storedPasscodes, setStoredPasscodes] = useState([]);
  const [adminError, setAdminError]         = useState('');
  const [allTranscripts, setAllTranscripts] = useState([]);
  const [adminTab, setAdminTab]             = useState('transcripts');
  const [editingAgent, setEditingAgent]     = useState(null);
  const [isAddingAgent, setIsAddingAgent]   = useState(false);
  const [newPasscode, setNewPasscode]       = useState('');
  const [passcodeStatus, setPasscodeStatus] = useState('');
  const [newAgentData, setNewAgentData]     = useState({
    rank: '', name: '', type: '', directive: '', backstory: '', winCondition: '',
    initiates: false, openingMessage: '', isMoralCourageChallenge: false,
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

    const unsubConfig = onSnapshot(ref('settings', 'admin'), (snap) => {
      if (snap.exists()) {
        setStoredPasscodes(snap.data().passcodes || []);
      } else {
        setDoc(ref('settings', 'admin'), { passcodes: ['admin123'] });
      }
    });

    const unsubTranscripts = onSnapshot(col('transcripts'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllTranscripts(data.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
    });

    return () => { unsubAgents(); unsubConfig(); unsubTranscripts(); };
  }, [user]);

  // Auto-scroll
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
  // Select Agent
  // ---------------------------------------------------------------------------
  const handleSelectAgent = (agent) => {
    setSelectedAgent(agent);
    setMessages([]);
    setChatSessionId(null);

    // Look for an existing session
    const existing = allTranscripts.find(
      t => t.studentName === studentName &&
           t.studentRank === studentRank &&
           t.agentId === agent.id
    );

    if (existing) {
      setChatSessionId(existing.id);
      setMessages(existing.messages || []);
    } else if (agent.initiates && agent.openingMessage) {
      // Agent speaks first — show opening message immediately
      setMessages([{
        id: 'opening', role: 'agent',
        text: agent.openingMessage, timestamp: Date.now(),
      }]);
    }
    // Otherwise: empty chat, student goes first
  };

  // ---------------------------------------------------------------------------
  // Gemini API
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
Keep responses concise and realistic to a professional military chat environment.`;

    // Build history — exclude the synthetic opening message marker
    const history = currentMessages
      .filter(m => m.id !== 'opening')
      .map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }));

    // If agent initiates, inject the opening as the first model turn
    if (agent.initiates && agent.openingMessage && currentMessages.find(m => m.id === 'opening')) {
      history.unshift({ role: 'model', parts: [{ text: agent.openingMessage }] });
    }

    history.push({ role: 'user', parts: [{ text: userMessage }] });

    let retries = 5, delay = 1000;
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

    if (!sessionId) {
      const docRef = await addDoc(col('transcripts'), {
        studentRank, studentName,
        agentId: selectedAgent.id,
        agentName: `${selectedAgent.rank} ${selectedAgent.name}`,
        isMoralCourageChallenge: selectedAgent.isMoralCourageChallenge || false,
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
  // Export
  // ---------------------------------------------------------------------------
  const exportTranscript = (data = null) => {
    const d = data || {
      messages, studentName, studentRank,
      agentName: selectedAgent ? `${selectedAgent.rank} ${selectedAgent.name}` : 'Agent',
    };
    if (!d.messages || d.messages.length === 0) return;

    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><style>body{font-family:Arial,sans-serif;line-height:1.6}.m{margin-bottom:12px}.meta{font-size:.8em;color:#666}</style></head>
<body><h1>A731 Simulation Transcript</h1>
<p><strong>Student:</strong> ${d.studentRank} ${d.studentName}</p>
<p><strong>Interlocutor:</strong> ${d.agentName}</p><hr/>
${d.messages.map(m => `<div class='m'><strong>${m.role === 'user' ? `${d.studentRank} ${d.studentName}` : d.agentName}</strong> <span class='meta'>[${new Date(m.timestamp).toLocaleTimeString()}]</span><br/>${m.text}</div>`).join('')}
</body></html>`;

    const a = document.createElement('a');
    a.href = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
    a.download = `A731_${d.studentName.replace(/\s+/g, '_')}.doc`;
    a.click();
  };

  // ---------------------------------------------------------------------------
  // Admin
  // ---------------------------------------------------------------------------
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPasscode === SUPER_ADMIN_PASSCODE || storedPasscodes.includes(adminPasscode)) {
      setView('admin_dashboard'); setAdminError('');
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
      setPasscodeStatus('Passcode added.'); setNewPasscode('');
      setTimeout(() => setPasscodeStatus(''), 2000);
    } catch (err) { console.error(err); }
  };

  const handleRemovePasscode = async (p) => {
    try { await updateDoc(ref('settings', 'admin'), { passcodes: arrayRemove(p) }); }
    catch (err) { console.error(err); }
  };

  const handleToggleAgent = async (agent) => {
    try { await updateDoc(ref('agents', agent.id), { active: !agent.active }); }
    catch (err) { console.error(err); }
  };

  const handleDeleteAgent = async (id) => {
    try { await deleteDoc(ref('agents', id)); } catch (err) { console.error(err); }
  };

  const handleAddAgent = async (e) => {
    e.preventDefault();
    if (!db || !newAgentData.name) return;
    const id = newAgentData.name.toLowerCase().replace(/\s+/g, '-');
    await setDoc(ref('agents', id), { ...newAgentData, id, active: true });
    setIsAddingAgent(false);
    setNewAgentData({ rank: '', name: '', type: '', directive: '', backstory: '', winCondition: '', initiates: false, openingMessage: '', isMoralCourageChallenge: false });
  };

  const saveAgentEdit = async () => {
    if (!editingAgent || !db) return;
    try { await updateDoc(ref('agents', editingAgent.id), { ...editingAgent }); setEditingAgent(null); }
    catch (err) { console.error(err); }
  };

  const handleDeleteTranscript = async (id) => {
    try { await deleteDoc(ref('transcripts', id)); } catch (err) { console.error(err); }
  };

  const activeAgents = agents.filter(a => a.active !== false);

  // ---------------------------------------------------------------------------
  // Header
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
          <button onClick={() => { setView('landing'); setSelectedAgent(null); setMessages([]); }}
            className="flex items-center space-x-2 text-sm text-slate-300 hover:text-white transition-colors">
            <LogOut className="h-4 w-4" /><span>Exit</span>
          </button>
        )}
      </div>
    </header>
  );

  // ---------------------------------------------------------------------------
  // LANDING
  // ---------------------------------------------------------------------------
  if (view === 'landing') return (
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
                className="w-full px-4 py-2 border rounded-md outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input type="text" required placeholder="e.g., Smith" value={studentName}
                onChange={e => setStudentName(e.target.value)}
                className="w-full px-4 py-2 border rounded-md outline-none focus:ring-2 focus:ring-emerald-500" />
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

  // ---------------------------------------------------------------------------
  // STUDENT VIEW — clean roster, no labels, no scenario hints
  // ---------------------------------------------------------------------------
  if (view === 'student') return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans">
      <Header />
      <div className="flex-grow flex overflow-hidden">

        {/* Roster — name and rank only, no type labels */}
        <div className="w-64 bg-white border-r flex flex-col flex-shrink-0">
          <div className="p-4 bg-slate-100 border-b">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center">
              <Users className="h-4 w-4 mr-2" />Unit Roster
            </h3>
          </div>
          <div className="flex-grow overflow-y-auto p-2 space-y-1">
            {activeAgents.map(agent => (
              <button key={agent.id} onClick={() => handleSelectAgent(agent)}
                className={`w-full text-left px-3 py-3 rounded-md transition-colors ${selectedAgent?.id === agent.id ? 'bg-emerald-50 border-l-4 border-emerald-600' : 'hover:bg-slate-50'}`}>
                <div className="flex items-center gap-3">
                  <div className="bg-slate-200 text-slate-700 rounded-full h-9 w-9 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {agent.rank}
                  </div>
                  <span className="font-semibold text-slate-800 text-sm">{agent.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="flex-grow flex flex-col overflow-hidden">
          {!selectedAgent ? (
            <div className="flex-grow flex items-center justify-center text-slate-400">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Select a person from the roster to begin.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header — name and rank only */}
              <div className="bg-white border-b px-6 py-4 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-700 text-white rounded-full h-10 w-10 flex items-center justify-center font-bold text-xs">
                    {selectedAgent.rank}
                  </div>
                  <h2 className="text-base font-bold text-slate-900">{selectedAgent.name}</h2>
                </div>
                <button onClick={() => exportTranscript()} disabled={messages.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-md text-sm font-medium disabled:opacity-40 hover:bg-slate-200 transition-colors">
                  <Download className="h-4 w-4" /><span>Export</span>
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

              {/* Input */}
              <div className="p-4 bg-white border-t flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex gap-2 max-w-4xl mx-auto">
                  <input type="text" value={inputText} onChange={e => setInputText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-grow bg-slate-100 rounded-full px-5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 text-sm border-none"
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

  // ---------------------------------------------------------------------------
  // ADMIN LOGIN
  // ---------------------------------------------------------------------------
  if (view === 'admin_login') return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center flex items-center justify-center">
          <ShieldAlert className="h-6 w-6 mr-2 text-amber-500" />Admin Access
        </h2>
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <input type="password" required placeholder="Admin Passcode" value={adminPasscode}
            onChange={e => setAdminPasscode(e.target.value)}
            className="w-full px-4 py-2 border rounded-md outline-none focus:ring-2 focus:ring-slate-500" />
          {adminError && <p className="text-red-500 text-xs">{adminError}</p>}
          <button type="submit"
            className="w-full bg-slate-800 text-white py-2 rounded-md font-semibold hover:bg-slate-900 transition-colors">
            Login
          </button>
        </form>
        <button onClick={() => setView('landing')} className="mt-4 text-sm text-slate-500 w-full text-center hover:text-slate-700">
          Return
        </button>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // ADMIN DASHBOARD
  // ---------------------------------------------------------------------------
  if (view === 'admin_dashboard') return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <Header />
      <div className="max-w-7xl mx-auto w-full px-4 py-8 flex-grow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-slate-900">Instructor Dashboard</h2>
          <div className="flex bg-white rounded-md border p-1 shadow-sm">
            {[['transcripts','Logs'],['agents','Personas'],['settings','Security']].map(([k,l]) => (
              <button key={k} onClick={() => setAdminTab(k)}
                className={`px-4 py-2 text-sm rounded transition-all ${adminTab === k ? 'bg-slate-100 font-bold text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden min-h-[400px]">

          {/* ---- TRANSCRIPTS ---- */}
          {adminTab === 'transcripts' && (
            <div className="divide-y">
              {allTranscripts.length === 0
                ? <div className="p-8 text-center text-slate-400">No transcripts recorded yet.</div>
                : allTranscripts.map(t => (
                  <details key={t.id} className="p-4 group">
                    <summary className="flex justify-between items-center cursor-pointer list-none">
                      <div className="flex items-center gap-3 flex-wrap">
                        <ChevronRight className="h-4 w-4 text-slate-400 group-open:rotate-90 transition-transform flex-shrink-0" />
                        <span className="font-bold text-slate-800">{t.studentRank} {t.studentName}</span>
                        <span className="text-slate-400">/</span>
                        <span className="text-emerald-700 font-medium">{t.agentName}</span>
                        {t.isMoralCourageChallenge && (
                          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="h-2.5 w-2.5" />MC
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                        <button onClick={e => { e.stopPropagation(); exportTranscript(t); }}
                          className="text-xs flex items-center text-slate-600 bg-slate-100 px-3 py-1.5 rounded hover:bg-slate-200">
                          <Download className="h-3.5 w-3.5 mr-1" />Export
                        </button>
                        <button onClick={e => { e.stopPropagation(); if (window.confirm('Delete this transcript permanently?')) handleDeleteTranscript(t.id); }}
                          className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </summary>
                    <div className="mt-4 ml-8 bg-slate-50 p-6 rounded-lg text-sm max-h-96 overflow-y-auto border border-slate-200 shadow-inner">
                      {t.messages?.map((m, i) => (
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

          {/* ---- PERSONAS ---- */}
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
                    <div className="grid grid-cols-3 gap-3">
                      <input required placeholder="Rank" value={newAgentData.rank} onChange={e => setNewAgentData({...newAgentData, rank: e.target.value})} className="border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
                      <input required placeholder="Full Name" value={newAgentData.name} onChange={e => setNewAgentData({...newAgentData, name: e.target.value})} className="border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
                      <input placeholder="Type (instructor reference)" value={newAgentData.type} onChange={e => setNewAgentData({...newAgentData, type: e.target.value})} className="border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
                    </div>
                    <textarea required placeholder="AI Directive (behavior & tone)" value={newAgentData.directive} onChange={e => setNewAgentData({...newAgentData, directive: e.target.value})} className="w-full border p-2 rounded text-sm h-24 outline-none focus:ring-2 focus:ring-emerald-400" />
                    <textarea placeholder="Backstory & trivia" value={newAgentData.backstory} onChange={e => setNewAgentData({...newAgentData, backstory: e.target.value})} className="w-full border p-2 rounded text-sm h-16 outline-none focus:ring-2 focus:ring-emerald-400" />
                    <textarea placeholder="Win condition" value={newAgentData.winCondition} onChange={e => setNewAgentData({...newAgentData, winCondition: e.target.value})} className="w-full border p-2 rounded text-sm h-16 outline-none focus:ring-2 focus:ring-emerald-400" />

                    <div className="border-t pt-4 space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <button type="button" onClick={() => setNewAgentData({...newAgentData, initiates: !newAgentData.initiates})} className="flex-shrink-0">
                          {newAgentData.initiates
                            ? <ToggleRight className="h-6 w-6 text-emerald-600" />
                            : <ToggleLeft className="h-6 w-6 text-slate-400" />}
                        </button>
                        <span className="text-sm font-semibold text-slate-700">Agent initiates the conversation</span>
                      </label>
                      {newAgentData.initiates && (
                        <textarea required placeholder="Opening message — what the agent says first..." value={newAgentData.openingMessage} onChange={e => setNewAgentData({...newAgentData, openingMessage: e.target.value})} className="w-full border p-2 rounded text-sm h-24 outline-none focus:ring-2 focus:ring-emerald-400" />
                      )}
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={newAgentData.isMoralCourageChallenge} onChange={e => setNewAgentData({...newAgentData, isMoralCourageChallenge: e.target.checked})} className="w-4 h-4 accent-red-600" />
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
              )}

              {agents.map(agent => (
                <div key={agent.id} className={`p-6 group transition-colors ${agent.active === false ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50'}`}>
                  {editingAgent?.id === agent.id ? (
                    <div className="space-y-3 max-w-3xl">
                      <div className="flex gap-2">
                        <input value={editingAgent.rank} onChange={e => setEditingAgent({...editingAgent, rank: e.target.value})} className="w-20 border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
                        <input value={editingAgent.name} onChange={e => setEditingAgent({...editingAgent, name: e.target.value})} className="flex-grow border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
                        <input value={editingAgent.type || ''} onChange={e => setEditingAgent({...editingAgent, type: e.target.value})} placeholder="Type label" className="w-40 border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
                      </div>
                      <textarea value={editingAgent.directive} onChange={e => setEditingAgent({...editingAgent, directive: e.target.value})} className="w-full border p-2 rounded text-sm h-28 outline-none focus:ring-2 focus:ring-emerald-400" />
                      <textarea value={editingAgent.backstory || ''} onChange={e => setEditingAgent({...editingAgent, backstory: e.target.value})} placeholder="Backstory" className="w-full border p-2 rounded text-sm h-16 outline-none focus:ring-2 focus:ring-emerald-400" />
                      <textarea value={editingAgent.winCondition} onChange={e => setEditingAgent({...editingAgent, winCondition: e.target.value})} placeholder="Win condition" className="w-full border p-2 rounded text-sm h-16 outline-none focus:ring-2 focus:ring-emerald-400" />

                      <div className="border-t pt-3 space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <button type="button" onClick={() => setEditingAgent({...editingAgent, initiates: !editingAgent.initiates})} className="flex-shrink-0">
                            {editingAgent.initiates
                              ? <ToggleRight className="h-6 w-6 text-emerald-600" />
                              : <ToggleLeft className="h-6 w-6 text-slate-400" />}
                          </button>
                          <span className="text-sm font-semibold text-slate-700">Agent initiates the conversation</span>
                        </label>
                        {editingAgent.initiates && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Opening message</label>
                            <textarea value={editingAgent.openingMessage || ''} onChange={e => setEditingAgent({...editingAgent, openingMessage: e.target.value})} className="w-full border p-2 rounded text-sm h-24 outline-none focus:ring-2 focus:ring-emerald-400" />
                          </div>
                        )}
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={editingAgent.isMoralCourageChallenge || false} onChange={e => setEditingAgent({...editingAgent, isMoralCourageChallenge: e.target.checked})} className="w-4 h-4 accent-red-600" />
                          <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4 text-red-500" />Flag as Moral Courage Challenge
                          </span>
                        </label>
                      </div>

                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingAgent(null)} className="px-4 py-1.5 border rounded text-sm hover:bg-slate-50">Cancel</button>
                        <button onClick={saveAgentEdit} className="px-4 py-1.5 bg-emerald-700 text-white rounded text-sm font-bold hover:bg-emerald-800">Save Changes</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div className="flex-grow pr-10">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-bold text-slate-900">{agent.rank} {agent.name}</span>
                          {agent.type && <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">{agent.type}</span>}
                          {agent.initiates && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold uppercase">Initiates</span>
                          )}
                          {agent.isMoralCourageChallenge && (
                            <span className="flex items-center gap-1 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold uppercase">
                              <AlertTriangle className="h-2.5 w-2.5" />MC
                            </span>
                          )}
                          {agent.active === false && (
                            <span className="text-[10px] bg-slate-300 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">Inactive</span>
                          )}
                        </div>
                        {agent.initiates && agent.openingMessage && (
                          <p className="text-xs text-slate-500 italic mb-1 line-clamp-2">
                            Opens with: "{agent.openingMessage}"
                          </p>
                        )}
                        {!agent.initiates && (
                          <p className="text-xs text-slate-400 mb-1">Waits for student to initiate</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleToggleAgent(agent)}
                          className={`p-2 rounded transition-all ${agent.active === false ? 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50' : 'text-emerald-500 hover:text-slate-500 hover:bg-slate-100'}`}
                          title={agent.active === false ? 'Enable' : 'Disable'}>
                          {agent.active === false ? <ToggleLeft className="h-5 w-5" /> : <ToggleRight className="h-5 w-5" />}
                        </button>
                        <button onClick={() => setEditingAgent(agent)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded" title="Edit">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => { if (window.confirm('Delete this persona permanently?')) handleDeleteAgent(agent.id); }}
                          className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ---- SECURITY ---- */}
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
                <form onSubmit={handleAddPasscode} className="mb-8 flex gap-2">
                  <div className="flex-grow relative">
                    <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input type="text" value={newPasscode} onChange={e => setNewPasscode(e.target.value)}
                      placeholder="New instructor passcode..."
                      className="w-full pl-10 pr-4 py-2 border rounded-md outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <button type="submit" className="bg-slate-800 text-white px-6 py-2 rounded-md font-bold hover:bg-slate-900 flex items-center whitespace-nowrap">
                    <Plus className="h-4 w-4 mr-1" />Add Key
                  </button>
                </form>
                <div className="border rounded-lg overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-4 py-3 border-b text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Access Keys</div>
                  <div className="divide-y">
                    {storedPasscodes.length === 0
                      ? <div className="p-8 text-center text-sm text-slate-400 italic">No additional keys configured.</div>
                      : storedPasscodes.map(p => (
                        <div key={p} className="p-4 flex justify-between items-center group hover:bg-slate-50">
                          <code className="text-sm font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">{p}</code>
                          <button onClick={() => handleRemovePasscode(p)}
                            className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all">
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

  return null;
}
