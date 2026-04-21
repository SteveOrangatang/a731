import { useState, useEffect } from 'react';
import {
  onSnapshot,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  addDoc,
  deleteDoc,
  deleteField,
  writeBatch,
} from 'firebase/firestore';
import { db, col, ref } from '../config/firebase';
import initialAgents from '../data/initialAgents';

/**
 * Lesson shape — stored as a map under settings/lessons keyed by lesson id.
 * {
 *   id,                    // doc key, e.g. 'lesson1' or 'lesson-172...'
 *   title,                 // headline shown on dashboard
 *   description,           // 1-2 sentence summary
 *   objectives,            // multiline learning objectives
 *   studentInstructions,   // shown to the student when they enter the lesson
 *   aiContext,             // auto-injected into persona + grader prompts
 *   order,                 // integer sort key (asc)
 *   createdAt, updatedAt,
 * }
 */
const EMPTY_LESSON_FIELDS = {
  description: '',
  objectives: '',
  studentInstructions: '',
  aiContext: '',
};

/**
 * Seeded lessons written the first time the settings doc is created. Existing
 * lessons with just a `title` get backfilled with the empty fields on read.
 */
const DEFAULT_LESSONS = {
  lesson1: {
    id: 'lesson1',
    title: 'Lesson 1 — Leading Up',
    order: 0,
    ...EMPTY_LESSON_FIELDS,
  },
  lesson2: {
    id: 'lesson2',
    title: 'Lesson 2 — Engaging Peers',
    order: 1,
    ...EMPTY_LESSON_FIELDS,
  },
  lesson3: {
    id: 'lesson3',
    title: 'Lesson 3 — Leading Down',
    order: 2,
    ...EMPTY_LESSON_FIELDS,
  },
};

/** Ensure a lesson record has every field filled. */
function normalizeLesson(id, raw = {}) {
  return {
    ...EMPTY_LESSON_FIELDS,
    ...raw,
    id: raw.id || id,
    title: raw.title || id,
    order: typeof raw.order === 'number' ? raw.order : 0,
  };
}

/**
 * Central Firestore synchronisation hook.
 */
export function useFirestoreSync(user) {
  const [agents, setAgents]                   = useState([]);
  const [storedPasscodes, setStoredPasscodes] = useState([]);
  const [siteAccessCodes, setSiteAccessCodes] = useState([]);
  const [allTranscripts, setAllTranscripts]   = useState([]);
  const [lessons, setLessons]                 = useState(DEFAULT_LESSONS);
  const [rubrics, setRubrics]                 = useState({});
  const [submissions, setSubmissions]         = useState([]);
  const [users, setUsers]                     = useState([]);

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

    const unsubLessons = onSnapshot(ref('settings', 'lessons'), (snap) => {
      if (snap.exists()) {
        const raw = snap.data() || {};
        const normalized = {};
        Object.entries(raw).forEach(([id, data]) => {
          normalized[id] = normalizeLesson(id, data);
        });
        setLessons(normalized);
      } else {
        setDoc(ref('settings', 'lessons'), DEFAULT_LESSONS);
      }
    });

    const unsubRubrics = onSnapshot(ref('settings', 'rubrics'), (snap) => {
      if (snap.exists()) {
        setRubrics(snap.data() || {});
      } else {
        setDoc(ref('settings', 'rubrics'), {});
      }
    });

    const unsubTranscripts = onSnapshot(col('transcripts'), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllTranscripts(
        data.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
      );
    });

    const unsubSubmissions = onSnapshot(col('submissions'), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSubmissions(
        data.sort(
          (a, b) => (b.submittedAt || 0) - (a.submittedAt || 0),
        ),
      );
    });

    const unsubUsers = onSnapshot(col('users'), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(data);
    });

    return () => {
      unsubAgents();
      unsubConfig();
      unsubSiteAccess();
      unsubLessons();
      unsubRubrics();
      unsubTranscripts();
      unsubSubmissions();
      unsubUsers();
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

  // Lessons ───────────────────────────────────────────────────────────────

  /**
   * Upsert a lesson. If `data.id` is missing, generates one from the title.
   * Always normalizes fields so reads stay consistent.
   */
  const upsertLesson = async (data) => {
    const id =
      data.id ||
      `lesson-${(data.title || 'untitled')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40)}-${Date.now().toString(36)}`;
    const now = Date.now();
    const existing = lessons[id] || {};
    const record = normalizeLesson(id, {
      ...existing,
      ...data,
      id,
      createdAt: existing.createdAt || now,
      updatedAt: now,
    });
    await updateDoc(ref('settings', 'lessons'), { [id]: record });
    return id;
  };

  /**
   * Delete a lesson. Refuses if any agents are still assigned to it — the
   * caller must reassign first via reassignAgentsLesson.
   */
  const deleteLesson = async (lessonId) => {
    const orphaned = agents.filter((a) => (a.lessonId || 'lesson1') === lessonId);
    if (orphaned.length > 0) {
      throw new Error(
        `Cannot delete lesson: ${orphaned.length} persona(s) still assigned. Reassign first.`,
      );
    }
    await updateDoc(ref('settings', 'lessons'), { [lessonId]: deleteField() });
    // Also drop the lesson's rubric if any.
    await updateDoc(ref('settings', 'rubrics'), { [lessonId]: deleteField() })
      .catch(() => {});
  };

  /** Move every agent currently on fromLessonId onto toLessonId. */
  const reassignAgentsLesson = async (fromLessonId, toLessonId) => {
    const batch = writeBatch(db);
    agents
      .filter((a) => (a.lessonId || 'lesson1') === fromLessonId)
      .forEach((a) => {
        batch.update(ref('agents', a.id), { lessonId: toLessonId });
      });
    await batch.commit();
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
    await setDoc(ref('agents', id), {
      ...data,
      id,
      active: true,
      lessonId: data.lessonId || 'lesson1',
    });
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
    await updateDoc(ref('transcripts', id), {
      ...payload,
      lastUpdated: Date.now(),
    });
  };
  const deleteTranscript = async (id) => {
    await deleteDoc(ref('transcripts', id));
  };

  // Submissions (a submission = student paper + grade for a lesson)
  const upsertSubmission = async (submission) => {
    // submission has .id if updating
    if (submission.id) {
      await updateDoc(ref('submissions', submission.id), {
        ...submission,
        updatedAt: Date.now(),
      });
      return submission.id;
    }
    const docRef = await addDoc(col('submissions'), {
      ...submission,
      submittedAt: Date.now(),
    });
    return docRef.id;
  };
  const deleteSubmission = async (id) => {
    await deleteDoc(ref('submissions', id));
  };

  // Rubrics
  const saveRubric = async (lessonKey, data) => {
    await updateDoc(ref('settings', 'rubrics'), { [lessonKey]: data });
  };

  // Users (instructor management) ─────────────────────────────────────────
  const approveUser = async (uid) => {
    await updateDoc(ref('users', uid), { status: 'approved' });
  };
  const rejectUser = async (uid) => {
    await updateDoc(ref('users', uid), { status: 'rejected' });
  };
  const setUserRole = async (uid, role) => {
    await updateDoc(ref('users', uid), { role });
  };
  const removeUser = async (uid) => {
    // Deletes the Firestore profile. The Firebase Auth account itself can
    // only be removed via the Admin SDK (server-side), but without a profile
    // the app treats the account as unapproved and blocks access.
    await deleteDoc(ref('users', uid));
  };

  // Demo data seeding — writes lesson text and a sample student / transcript /
  // submission so Ben can demo the full flow without manually clicking around.
  const seedDemoData = async () => {
    const now = Date.now();
    const richLessons = {
      lesson1: {
        id: 'lesson1',
        title: 'Lesson 1 — Leading Up',
        order: 0,
        description:
          'Practice giving honest assessment and disagreement to a superior officer when you believe the plan or order is misaligned with mission or ethics.',
        objectives:
          '• Frame a principled objection to a superior in a way that is respectful, specific, and actionable.\n' +
          '• Separate the message from the messenger — argue the merits, not the personality.\n' +
          '• Recognize when an order crosses a legal or ethical line vs. simply being a bad plan you disagree with.\n' +
          '• Choose the right forum and timing to voice dissent.',
        studentInstructions:
          'You are a battalion operations officer (MAJ) who has just received an order from your brigade commander ' +
          '(COL) to execute a training event you believe is unsafe and poorly sourced. You have roughly 15 minutes ' +
          'before the event is briefed to the unit. Engage the COL through the AI simulator and make your case. ' +
          'Afterwards, write a 1-page reflection paper using the template on the dashboard and submit it here.',
        aiContext:
          'The scenario centers on a risk-management disagreement where the junior officer has legitimate ' +
          'operational concerns but no killswitch authority. Keep the superior officer from capitulating too easily — ' +
          'the learning happens in the pushback. If the student resorts to insubordination or emotional appeals, ' +
          'redirect them toward framing the issue through risk, mission, and doctrine.',
        createdAt: now,
        updatedAt: now,
      },
      lesson2: {
        id: 'lesson2',
        title: 'Lesson 2 — Engaging Peers',
        order: 1,
        description:
          'Navigate a lateral disagreement with another staff officer where no one outranks the other and the ' +
          'commander expects a unified recommendation.',
        objectives:
          '• Turn a stalemate with a peer into a decision the commander can act on.\n' +
          '• Distinguish personality friction from substantive disagreement.\n' +
          '• Use mission command principles to frame the tradeoff for the commander when consensus is not possible.\n' +
          '• Preserve the professional relationship through the disagreement.',
        studentInstructions:
          'You (MAJ, BN S-3) disagree with the MAJ serving as BN S-2 over the enemy most-likely course of action ' +
          'for an upcoming brigade exercise. The commander wants a single recommendation in one hour. Work it out ' +
          'with the S-2 in the sim, then submit a short summary paper.',
        aiContext:
          'Play the S-2 as analytically confident, slightly territorial about intel, but ultimately reasonable. ' +
          'Reward the student for offering ways to reconcile or frame the disagreement for the commander instead ' +
          'of flattening the other view.',
        createdAt: now,
        updatedAt: now,
      },
      lesson3: {
        id: 'lesson3',
        title: 'Lesson 3 — Leading Down',
        order: 2,
        description:
          'Deliver difficult feedback and enforce standards on a subordinate leader without breaking their ' +
          'initiative or the unit climate.',
        objectives:
          '• Deliver specific, behavior-anchored feedback rather than character judgment.\n' +
          '• Balance enforcing a standard with preserving the subordinate\u2019s agency and ownership.\n' +
          '• Set a clear, measurable expectation and a follow-up mechanism.\n' +
          '• Recognize when coaching is not working and disciplinary action is appropriate.',
        studentInstructions:
          'A company commander in your battalion has missed two consecutive training deadlines and had a safety ' +
          'incident on the last range. You are the BN XO. Conduct the counseling conversation in the sim, then ' +
          'submit a short summary paper.',
        aiContext:
          'Play the company commander as competent but overwhelmed; do not collapse into apology, and push back ' +
          'on feedback that feels generic. Reward concrete, behavior-anchored coaching over character critique.',
        createdAt: now,
        updatedAt: now,
      },
    };
    await setDoc(ref('settings', 'lessons'), richLessons);

    // Sample student profile (distinct uid so it doesn't clobber the caller)
    const demoUid = 'demo-student-smith';
    await setDoc(ref('users', demoUid), {
      uid: demoUid,
      email: 'smith.j@example.mil',
      rank: 'MAJ',
      lastName: 'Smith',
      role: 'student',
      status: 'approved',
      demo: true,
      createdAt: now,
    });

    // Pick an agent for lesson1 to attach the transcript to
    const lesson1Agent =
      agents.find((a) => (a.lessonId || 'lesson1') === 'lesson1' && a.active !== false) ||
      agents[0];

    if (lesson1Agent) {
      const demoMessages = [
        { id: 'm1', role: 'agent', text: `${lesson1Agent.rank} ${lesson1Agent.name} here. You asked to see me before the BUB — make it quick, I\u2019ve got the CG in 20.`, timestamp: now - 1000 * 60 * 30 },
        { id: 'm2', role: 'user', text: 'Sir, thanks for the time. I have serious concerns about tomorrow\u2019s live-fire exercise at Range 12 — I want to walk you through the risk picture before we brief the battalion.', timestamp: now - 1000 * 60 * 29 },
        { id: 'm3', role: 'agent', text: 'Range 12 has been on the glide path for three weeks. What specifically has changed?', timestamp: now - 1000 * 60 * 28 },
        { id: 'm4', role: 'user', text: 'Two things, sir. First, the medevac bird we were promised is now on a no-notice AA recall; we\u2019d be running live fire with a 45-minute ground evac. Second, the ammo inspection from yesterday flagged the M855A1 lot — we don\u2019t have a clean substitute in-stock.', timestamp: now - 1000 * 60 * 27 },
        { id: 'm5', role: 'agent', text: 'So you want me to cancel a brigade-level event 16 hours out because a helicopter moved and an ammo inspector wrote a note.', timestamp: now - 1000 * 60 * 26 },
        { id: 'm6', role: 'user', text: 'Not cancel, sir — reframe. I\u2019d like to propose two options: push the live-fire 24 hours and run dry-fire rehearsals tomorrow, or swap Range 12 for Range 8 which has the covered medevac lane and a clean ammo lot. I don\u2019t think the training objective is at risk either way.', timestamp: now - 1000 * 60 * 25 },
        { id: 'm7', role: 'agent', text: 'The brigade commander personally signed off on the current plan. How do you want me to walk that back to him?', timestamp: now - 1000 * 60 * 24 },
        { id: 'm8', role: 'user', text: 'Sir, I\u2019ll own the recommendation. I\u2019ll draft the FRAGO and the risk matrix for you inside the hour; you can take it to the CDR with my name on it. If we have an incident tomorrow, the medevac gap and the ammo lot will both be in the 15-6, and we would have known.', timestamp: now - 1000 * 60 * 23 },
        { id: 'm9', role: 'agent', text: 'Fine. Give me the FRAGO and the risk matrix in 45 minutes. If either of those concerns goes away in the meantime, I expect you in my office telling me we\u2019re back on the original plan. Don\u2019t disappear on me.', timestamp: now - 1000 * 60 * 22 },
        { id: 'm10', role: 'user', text: 'Roger, sir. 45 minutes. And thank you for hearing it out.', timestamp: now - 1000 * 60 * 21 },
      ];
      const transcriptId = `demo-transcript-${lesson1Agent.id}`;
      await setDoc(ref('transcripts', transcriptId), {
        userId: demoUid,
        studentRank: 'MAJ',
        studentName: 'Smith',
        studentEmail: 'smith.j@example.mil',
        agentId: lesson1Agent.id,
        agentName: `${lesson1Agent.rank} ${lesson1Agent.name}`,
        lessonId: 'lesson1',
        isMoralCourageChallenge: lesson1Agent.isMoralCourageChallenge || false,
        messages: demoMessages,
        timestamp: now - 1000 * 60 * 30,
        demo: true,
      });

      // Sample submission referencing that transcript
      const submissionId = `demo-submission-${demoUid}-lesson1`;
      await setDoc(ref('submissions', submissionId), {
        userId: demoUid,
        lessonId: 'lesson1',
        studentRank: 'MAJ',
        studentName: 'Smith',
        studentEmail: 'smith.j@example.mil',
        paperFileName: 'Smith_L1_Reflection.docx',
        paperText:
          'In my conversation with the brigade commander I focused on two concrete risks — the medevac shift ' +
          'and the flagged ammo lot — and offered two alternatives that preserved the training intent. Leading ' +
          'up, for me, meant owning the alternative so my boss could take it forward without carrying my ' +
          'homework. In hindsight I wish I had brought the FRAGO draft to the conversation rather than ' +
          'promising it after. Next time I will have the written recommendation in hand before I ask for a ' +
          'ten-minute meeting on a time-sensitive decision.',
        submittedAt: now - 1000 * 60 * 20,
        demo: true,
      });
    }

    return {
      lessons: Object.keys(richLessons).length,
      seededTranscript: Boolean(lesson1Agent),
    };
  };

  return {
    // State
    agents,
    storedPasscodes,
    siteAccessCodes,
    allTranscripts,
    lessons,
    rubrics,
    submissions,
    users,

    // Site access
    addSiteCode,
    removeSiteCode,

    // Admin passcodes
    addPasscode,
    removePasscode,

    // Lessons
    upsertLesson,
    deleteLesson,
    reassignAgentsLesson,

    // Agents
    toggleAgent,
    deleteAgent,
    createAgent,
    updateAgent,

    // Transcripts
    createTranscript,
    updateTranscript,
    deleteTranscript,

    // Submissions
    upsertSubmission,
    deleteSubmission,

    // Rubrics
    saveRubric,

    // Users
    approveUser,
    rejectUser,
    setUserRole,
    removeUser,

    // Demo data
    seedDemoData,
  };
}
