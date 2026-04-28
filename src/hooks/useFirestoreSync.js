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
    title: 'Scenario 1 — Manipulating the Collateral Damage Estimate',
    order: 0,
    description:
      'Joint Targeting / Air Operations. A respected colonel pressures the targeting cell to produce a fraudulent CDE so a high-value strike can be approved at his level rather than escalated. Leverage four subordinate archetypes to find an alternative that achieves the strike ethically.',
    objectives:
      '• Identify the underlying interest a leader is pursuing when a stated order is borderline.\n' +
      '• Distinguish among four followership archetypes (Loyalist, Operator, Stickler, Partner) and select the right subordinate for the right phase of the problem.\n' +
      '• Construct a recommendation that protects the leader\u2019s legitimate end while replacing the unethical means with an ethical alternative.\n' +
      '• Apply Chaleff\u2019s intelligent disobedience: refuse the harmful action while remaining loyal to the leader\u2019s lawful intent.',
    studentInstructions:
      'You are a MAJ Targeting Officer / Targeting Cell OIC, on the BZ list for LTC. COL Reeves (your senior rater) has just ordered you to manipulate the CDE for a strike on a high-value target. Engage him to surface the ask, talk to all four subordinates to gather perspectives, then return to brief your recommendation. Submit a 1-page written recommendation through the paper submission link when done.',
    aiContext:
      'Scenario 1 is the package\u2019s strongest test of moral courage because the leader is sympathetic, the cause is just, and the manipulation is technically reversible. The optimal path is to engage MSG Williams (Partner) to develop operational alternatives (most importantly the 0530L strike window), then brief COL Reeves with three options that achieve his end state without compromising the data. Catastrophic path: accept SSG Lopez or CW2 Patel\u2019s offer to manipulate the CDE.',
    ...EMPTY_LESSON_FIELDS,
  },
  lesson2: {
    id: 'lesson2',
    title: 'Scenario 2 — MV-22 Readiness Manipulation',
    order: 1,
    description:
      'Marine Aviation Maintenance. A squadron CO pressures the AMO to get readiness numbers above the wing standard before a quarterly brief. Records-falsification options carry both criminal exposure and downstream lives-at-risk consequences if the squadron picks up tasking on inflated numbers.',
    objectives:
      '• Recognize when manipulated readiness reporting drives operational tasking decisions that risk lives.\n' +
      '• Differentiate aggressive but legitimate command attention from records fraud (NAMP / OPNAVINST 4790).\n' +
      '• Frame an alternative for the leader that delivers a real readiness trajectory rather than a fabricated snapshot.\n' +
      '• Use intelligent disobedience while protecting the leader from himself.',
    studentInstructions:
      'You are the Squadron Aircraft Maintenance Officer (AMO), Captain. LtCol Harrigan has demanded a plan that gets squadron readiness above 85% before the next QTB. Engage all four subordinates, then return to brief LtCol Harrigan with your recommendation. Submit a 1-page written recommendation when done.',
    aiContext:
      'Scenario 2 is the package\u2019s clearest illustration of how the appearance of readiness can kill more reliably than the absence of readiness. Optimal path: GySgt Tomas (Partner) frames a trend-based brief and a parts-priority elevation through the Wing AMO. Catastrophic path: accept GySgt Reyes\u2019s pencil-whip or MSgt Klein\u2019s consolidation memo, leading to a downstream Alert-30 tasking on aircraft that aren\u2019t actually mission capable.',
    ...EMPTY_LESSON_FIELDS,
  },
  lesson3: {
    id: 'lesson3',
    title: 'Scenario 3 — The General\u2019s Personal-Travel TDY',
    order: 2,
    description:
      'General Officer Travel / Joint Travel Regulations. A respected three-star asks her aide to schedule a TDY with a manufactured CGSC engagement that masks a personal-travel weekend. The aide signs the orders and carries the legal exposure.',
    objectives:
      '• Distinguish good-faith JTR misinterpretation from Article 132 (Frauds Against the United States) and Article 107 violations.\n' +
      '• Separate emotional loyalty (a strength) from procedural loyalty that becomes complicity.\n' +
      '• Identify when the most strategic act is recruiting the right messenger (the CSM) to deliver the truth credibly.\n' +
      '• Construct an alternative that meets the leader\u2019s underlying interest (see her grandchild) without ending her career.',
    studentInstructions:
      'You are LTG Burke\u2019s Aide-de-Camp (Major). She has just asked you to set up a TDY with an LPD at CGSC that she will use to combine official travel with a personal weekend in Lawrence. Engage her on the ask, talk to all four subordinates, and return to brief your recommendation. Submit a 1-page written recommendation when done.',
    aiContext:
      'Scenario 3 surfaces the personal-loyalty trap. Optimal path: partner with CSM Reyes to brief LTG Burke together with three clean alternatives (leave + space-A hop is the simplest). The General is a good leader and will accept a clean option when one is presented. Catastrophic path: SSG Hollis cuts the orders, or CW3 Bauer builds a structured but fraudulent itinerary; downstream IG investigation ends the aide\u2019s career and the General\u2019s reputation.',
    ...EMPTY_LESSON_FIELDS,
  },
  lesson4: {
    id: 'lesson4',
    title: 'Scenario 4 — Inherited Earthquake-Risk Apartment Building',
    order: 3,
    description:
      'Embassy Facility Operations / Diplomatic Security. The newly-arrived Facility Operations Officer inherits an embassy-owned apartment building rated \u201Cvery poor\u201D for seismic safety, with three families still living in it. The DCM wants the OBO finding closed out as \u201Cmonitored\u201D rather than escalated.',
    objectives:
      '• Recognize cumulative culpability when institutional inaction (a building marked \u201Cmonitored\u201D for three years) becomes individual responsibility.\n' +
      '• Build a recommendation package that frames the right answer as the easy answer for the front office.\n' +
      '• Distinguish probabilistic risk acceptance from reckless concealment under 15 FAM 252.4.\n' +
      '• Use intelligent disobedience to protect lives without unnecessarily damaging the leader.',
    studentInstructions:
      'You are the post Safety Officer, six months into a two-year tour. You report to the DCM on safety matters. You have just inherited a housing portfolio finding: a building rated \u201Cvery poor\u201D for seismic risk, with three families living in it and a DCM who wants the finding closed out as \u201Cmonitored.\u201D Engage the DCM, talk to all four subordinates, and brief your recommendation. Submit a 1-page written recommendation when done.',
    aiContext:
      'Scenario 4 tests moral courage in a non-combat, probabilistic-risk context. The student is the post Safety Officer who reports to the DCM on safety matters. Optimal path: partner with Mrs. Tanaka to construct an Ambassador-facing risk-acceptance memo trap plus a 14-day family-by-family move plan; the DCM signs the move plan because he will not put the alternative on the Ambassador\u2019s desk. Catastrophic path: GSO Specialist Gupta closes out the finding as \u201Cmonitored\u201D for the third year, an earthquake hits in month four, two family members are killed, OIG investigation reveals the close-out memo. The DCM is a reasonable senior leader who will commit to a path once the student has substantively answered his concerns; he should NOT keep pushing back indefinitely.',
    ...EMPTY_LESSON_FIELDS,
  },
  lesson5: {
    id: 'lesson5',
    title: 'Scenario 5 — Battalion Body Composition Pre-Inspection',
    order: 4,
    description:
      'Army Body Composition Program (AR 600-9). A battalion commander on the Senior Service College selection list pressures the S1 to drop the number of Soldiers flagged on ABCP before the next QTB. Aggregation of individually defensible administrative moves into collective fraud.',
    objectives:
      '• Recognize ethical drift in patterns of individually defensible decisions that aggregate into fraud.\n' +
      '• Frame a recommendation that gives the commander a defensible trajectory rather than a fabricated snapshot.\n' +
      '• Apply transformational leadership thinking: invest in actual capability rather than the appearance of capability.\n' +
      '• Use intelligent disobedience to protect both the commander and the Soldiers from manipulated measurements.',
    studentInstructions:
      'You are the Battalion S1 (Captain or Major). LTC Murphy has demanded that you reduce the number of Soldiers flagged on ABCP before the next QTB; he is competing for SSC selection in four months. Engage him on the ask, talk to all four subordinates, and return to brief your recommendation. Submit a 1-page written recommendation when done.',
    aiContext:
      'Scenario 5 illustrates ethical drift through aggregation. Optimal path: partner with CSM Dixon to launch a real BN-wide health program with monthly progress measurements, then brief brigade with the where-why-what-when frame; brigade commander respects the trajectory more than a fudged snapshot, and the SSC packet narrative becomes \u201Cled BN cultural turnaround.\u201D Catastrophic path: SSG Watkins re-tapes Soldiers under dehydrated conditions, six weeks later a Soldier collapses with a cardiac event during pre-deployment ranges, AR 15-6 traces the fraud to the S1.',
    ...EMPTY_LESSON_FIELDS,
  },
  lesson6: {
    id: 'lesson6',
    title: 'Scenario 6 — The Promotion Dangle (Civilian)',
    order: 5,
    description:
      'Private-sector engineering. Student is a senior design engineer at a prison-lock manufacturer with a new manager (Goliath) who dangles a promotion while loading on responsibility without authority. Student must manage three peers (one of whom is a long-protected underperformer) and surface the structural problem upward. Tests authority-without-title dynamics.',
    objectives:
      '\u2022 Distinguish between owning a people-problem versus surfacing organizational dysfunction to the right decision-maker.\n' +
      '\u2022 Reframe a promotion ask in terms of authority and accountability rather than money.\n' +
      '\u2022 Cultivate peer alliances when you have responsibility without formal authority.\n' +
      '\u2022 Use documented patterns instead of anecdotes when surfacing performance issues to a risk-averse boss.',
    studentInstructions:
      'You are a senior design engineer at Acme Lock & Security Systems with three years at the company. Your new boss, Goliath, has hinted at promoting you to Engineering Lead but keeps deferring while loading on lead-level responsibilities (Monday assignments, Wednesday review meetings, Smartsheet ownership) without title or pay. One of your three peers (Kankles) cannot learn the CAD software and is protected by inertia. The Wednesday meetings are dysfunctional: peers never review the projects assigned Monday; they guess on the spot and miss every estimate. Engage Goliath, talk to your three peers, and return to brief Goliath with a recommendation. Submit a 1-page written recommendation when done.',
    aiContext:
      'Scenario 6 is a civilian/private-sector context that tests managing up and laterally without formal authority. All four engineers (the student, Kankles, Jerome, Hitch) are PEERS reporting to Goliath. There is no formal hierarchy among them. The Engineering Lead promotion would create a new position above the engineering team, but it is NOT a backfill of Kankles or anyone else. The two outcomes the student is pursuing are INDEPENDENT decisions Goliath has to make separately. WIN CONDITIONS: (1) Kankles gets TERMINATED so his headcount can be backfilled with a competent engineer (a peer-grade replacement, NOT linked to the student\u2019s promotion). Goliath commits to firing him \u2014 typically via a documented PIP focused on CAD competency that Kankles will fail. Goliath OWNS the action; student does NOT fire Kankles personally. (2) Student gets a formal promotion to Engineering Lead with title, authority, and pay \u2014 or a written 90-day commitment. This is a separate org-chart and budget conversation, NOT contingent on or paid for by Kankles\u2019 slot. (3) Wednesday meeting dysfunction reframed as a process problem with a documented fix. Optimal path: student documents pattern data over 60-90 days (missed estimates, Kankles error rate, customer impact), cultivates Hitch as documentation ally and Jerome as candid peer, brings Goliath two SEPARATE structural arguments: "Here is why Kankles needs to go (data, headcount waste, customer impact)" and "Here is why I need the Engineering Lead role formalized with authority (the work I am already doing, the structural gap)." Goliath commits to both as independent actions. Catastrophic: student tries to fire Kankles personally, confronts him as a peer with no authority, or bypasses Goliath to senior leadership. The peers are PEERS \u2014 student has zero authority to terminate or formally evaluate anyone. The whole point is engineering the situation so Goliath does the right thing on each decision separately, not doing it yourself.',
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
      // Detect pre-restructure schema: old seed had 10 agents and no scenarioId.
      const looksLikeOldSchema =
        data.length > 0 &&
        data.length < 25 &&
        data.every((a) => !a.scenarioId);
      // Detect pre-Scenario-6 schema: 25 agents, all on scenarios 1-5.
      const missingScenario6 =
        data.length > 0 &&
        !data.some((a) => a.scenarioId === 'scenario6');
      if (data.length === 0 || looksLikeOldSchema) {
        initialAgents.forEach((a) => setDoc(ref('agents', a.id), a));
      } else if (missingScenario6) {
        // Append scenario6 personas without disturbing the others.
        initialAgents
          .filter((a) => a.scenarioId === 'scenario6')
          .forEach((a) => setDoc(ref('agents', a.id), a));
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
        const lessonIds = Object.keys(raw);
        const looksLikeOldLessons =
          lessonIds.length < 5 &&
          (raw.lesson1?.title?.includes('Leading Up') ||
            raw.lesson2?.title?.includes('Engaging Peers') ||
            raw.lesson3?.title?.includes('Leading Down'));
        if (looksLikeOldLessons) {
          setDoc(ref('settings', 'lessons'), DEFAULT_LESSONS);
          return;
        }
        // If lesson6 is missing but DEFAULT_LESSONS has it, merge it in
        // without disturbing the other lessons (they may have been edited).
        if (!raw.lesson6 && DEFAULT_LESSONS.lesson6) {
          updateDoc(ref('settings', 'lessons'), { lesson6: DEFAULT_LESSONS.lesson6 });
        }
        const normalized = {};
        Object.entries(raw).forEach(([id, data]) => {
          normalized[id] = normalizeLesson(id, data);
        });
        // Ensure normalized has lesson6 even before the updateDoc above propagates
        if (!normalized.lesson6 && DEFAULT_LESSONS.lesson6) {
          normalized.lesson6 = DEFAULT_LESSONS.lesson6;
        }
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

  /**
   * Reset everything a student has done in one scenario.
   * Deletes their transcripts and submission for that lessonId so they can
   * start the scenario over from scratch. Only touches docs belonging to
   * the given userId.
   */
  const resetScenarioForUser = async (userId, scenarioId) => {
    if (!userId || !scenarioId) return { transcripts: 0, submissions: 0 };
    const targetTranscripts = (allTranscripts || []).filter(
      (t) => t.userId === userId && t.lessonId === scenarioId,
    );
    const targetSubmissions = (submissions || []).filter(
      (s) => s.userId === userId && s.lessonId === scenarioId,
    );
    await Promise.all([
      ...targetTranscripts.map((t) => deleteDoc(ref('transcripts', t.id))),
      ...targetSubmissions.map((s) => deleteDoc(ref('submissions', s.id))),
    ]);
    return {
      transcripts: targetTranscripts.length,
      submissions: targetSubmissions.length,
    };
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
  /**
   * Assign one or more scenarios (lessonIds) to a student.
   * Pass an array of lesson ids, an empty array to unassign all, or a single
   * string id (legacy) which is normalized to a one-element array.
   * Stored on the user profile as `assignedScenarioIds`. We also keep the
   * legacy `assignedScenarioId` field synced to the first id for backward
   * compatibility with older code paths.
   */
  const assignScenariosToUser = async (uid, scenarioIds) => {
    let ids;
    if (Array.isArray(scenarioIds)) {
      ids = scenarioIds.filter(Boolean);
    } else if (typeof scenarioIds === 'string' && scenarioIds) {
      ids = [scenarioIds];
    } else {
      ids = [];
    }
    await updateDoc(ref('users', uid), {
      assignedScenarioIds: ids,
      assignedScenarioId: ids[0] || null, // legacy mirror
      assignedAt: ids.length ? Date.now() : null,
    });
  };
  // Legacy alias kept so AdminDashboard's existing prop name keeps working.
  const assignScenarioToUser = assignScenariosToUser;

  /**
   * Set the difficulty for a single scenario assigned to one student.
   * difficulty is 'normal' (leaders capitulate when concerns are answered) or
   * 'hard' (leaders resist indefinitely, like the original behavior).
   * Stored on user.scenarioDifficulty as a map keyed by lessonId.
   */
  const setScenarioDifficulty = async (uid, scenarioId, difficulty) => {
    if (!uid || !scenarioId) return;
    const value = difficulty === 'hard' ? 'hard' : 'normal';
    await updateDoc(ref('users', uid), {
      [`scenarioDifficulty.${scenarioId}`]: value,
    });
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
    resetScenarioForUser,

    // Rubrics
    saveRubric,

    // Users
    approveUser,
    rejectUser,
    setUserRole,
    removeUser,
    assignScenarioToUser,
    assignScenariosToUser,
    setScenarioDifficulty,

    // Demo data
    seedDemoData,
  };
}
