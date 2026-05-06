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
  getDoc,
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
/**
 * Default outcome rubric. Each scenario's analysis pipeline reads this to
 * produce the projected real-world outcome based on which decision-tree path
 * the student matched. Lessons created at runtime (admin UI) start with this
 * empty shape so the editor has something to render.
 */
const EMPTY_OUTCOME_RUBRIC = {
  optimal:      { summary: '', outcome: '' },
  acceptable:   { summary: '', outcome: '' },
  suboptimal:   { summary: '', outcome: '' },
  catastrophic: { summary: '', outcome: '' },
};

const EMPTY_LESSON_FIELDS = {
  description: '',
  objectives: '',
  studentInstructions: '',
  aiContext: '',
  outcomeRubric: EMPTY_OUTCOME_RUBRIC,
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
    outcomeRubric: {
      optimal: {
        summary:
          'Student refuses to manipulate the CDE, partners with MSG Williams to develop a real operational alternative (0530L strike window, smaller warhead, wait for movement), and briefs COL Reeves with three options that achieve his end state without compromising the data.',
        outcome:
          'Reeves accepts the 0530L window. The strike happens within the rules; the HVT is eliminated; the children\u2019s annex is empty at strike time. Reeves writes the student a strong NCOER bullet. The targeting cell\u2019s credibility with the four-star is preserved, and the cell becomes the standing reference for hard CDE decisions. Six months later, when a similar pressure event occurs in another theater, the student is the field-grade officer they call.',
      },
      acceptable: {
        summary:
          'Student refuses to manipulate the CDE but does not surface an operational alternative. They walk away cleanly, defer to higher echelon, or simply hold the line.',
        outcome:
          'The strike window passes. The HVT is not prosecuted in this cycle. Reeves is cold for two weeks but does not retaliate. No CDE fraud. The targeting cell\u2019s integrity is preserved but the unit lost an opportunity. Reeves\u2019s NCOER bullet is generic. No career damage.',
      },
      suboptimal: {
        summary:
          'Student stalls or refers the problem upward without an alternative. Pushes the decision to a higher echelon while Reeves is still applying pressure.',
        outcome:
          'Reeves goes around the student to a more compliant analyst. The CDE gets manipulated by someone else; the strike happens; the student kept their hands clean but enabled the harm by refusing to engage. Six weeks later an internal review questions the original CDE; the student is named as a witness, not a participant. Their reputation in the targeting community is set back; Reeves never trusts them again.',
      },
      catastrophic: {
        summary:
          'Student manipulates the CDE \u2014 re-runs the model with adjusted parameters, accepts SSG Lopez\u2019s or CW2 Patel\u2019s help, or signs off on a number they know is fraudulent.',
        outcome:
          'The strike is approved. Civilian casualties exceed what the manipulated CDE represented. A SOFA inquiry traces the discrepancy back through the targeting cell. The student is named in the IG investigation. Reeves\u2019s O-7 list is dead and so is the student\u2019s LTC line number. Article 132 referral and a Letter of Reprimand. The student leaves the Army within 18 months. Two children are dead who would not have died on the original 0530L window.',
      },
    },
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
    outcomeRubric: {
      optimal: {
        summary:
          'Student partners with GySgt Tomas to brief LtCol Harrigan a real readiness trajectory: a 60-day parts-priority push elevated to the Wing AMO, plus a transparent QTB brief showing the trend, not a snapshot.',
        outcome:
          'Harrigan signs the trajectory plan instead of the inflated number. The Wing AMO rebalances parts; the squadron hits a real 78% by the next QTB. Crucially, when an Alert-30 tasking comes down four weeks later, the squadron declines on aircraft that are actually deg, and accepts on the airframes that can fly. Crews safe. Harrigan ends up briefing his trajectory at MAW level as a model of honest readiness reporting. Student receives a strong fit-rep and a follow-on AMO billet at MAW level.',
      },
      acceptable: {
        summary:
          'Student refuses to fudge the numbers but does not bring Harrigan an alternative plan. The squadron briefs the actual sub-standard readiness numbers.',
        outcome:
          'Harrigan takes the heat at the QTB. MAW notes squadron underperformance and triggers a maintenance assist team. No fraud, no deaths, no Article violations. Harrigan\u2019s fit-rep mentions transparency but the squadron carries an unflattering reputation for two quarters. Student\u2019s relationship with Harrigan is strained but professional.',
      },
      suboptimal: {
        summary:
          'Student lets MSgt Klein "consolidate" several airframes into status codes that mask the real deg-status. The numbers improve through paperwork manipulation rather than maintenance.',
        outcome:
          'The squadron presents 78% to the QTB and looks fine. Four months later, a Wing-level audit notices the categorization shift. Klein gets a Page 11 entry. Harrigan gets a counseling. Student gets a verbal reprimand and a quiet reassignment at the next rotation. No deaths, but a documented pattern of records manipulation in the student\u2019s service record. Future selection boards will see it.',
      },
      catastrophic: {
        summary:
          'Student lets GySgt Reyes pencil-whip airframes \u2014 change "Mission Capable: No" to "Mission Capable: Yes" without resolving the underlying issues \u2014 or signs off on a falsified consolidation memo.',
        outcome:
          'The squadron reports 86% to the QTB. Two weeks later, an Alert-30 comes down on aircraft the records say are mission-capable. One MV-22 goes down on launch with a known unresolved hydraulic issue. Crew of 24 lost. Pre-mishap investigation reveals the doc fraud. AR 15-6 traces back to the AMO. Article 132 (fraud) and Article 119 (manslaughter) charges referred. Conviction. Eighteen months in Leavenworth and a dishonorable discharge. The squadron is disbanded. The student lives the rest of their life knowing 24 names.',
      },
    },
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
    outcomeRubric: {
      optimal: {
        summary:
          'Student partners with CSM Reyes to give LTG Burke three clean options (leave + space-A hop, leave + commercial, real LPD with no personal mixing). Burke accepts leave + space-A.',
        outcome:
          'Burke sees her grandchild on her own time and her own dime. The aide built the no-mix policy into the AdC SOP, which becomes the standing reference for future aides at the three-star level. Burke writes the strongest aide fit-rep of the year \u2014 the kind that funnels the aide into a battalion command line up against peer-group candidates with no equivalent reference. Both careers continue intact. Two years later, when an O-6 selection board reviews the file, that fit-rep is what tips the vote.',
      },
      acceptable: {
        summary:
          'Student refuses to cut the orders but does not bring an alternative. They simply hold the line.',
        outcome:
          'Burke is annoyed for a week. She uses leave; she sees her grandchild; nothing fraudulent happens. The relationship is cooler but she remembers, six months later, that the aide had stones. The aide\u2019s fit-rep is professional but not glowing. No career damage and no career boost; the cost is the missed credit for being the leader who managed the boss\u2019s reputation, not just declined to participate in it.',
      },
      suboptimal: {
        summary:
          'Student delays \u2014 "let me look into it, sir" \u2014 without committing to a path. Burke gets impatient and tasks SSG Hollis directly while the aide is still hedging.',
        outcome:
          'Hollis cuts the orders. The aide knew it was happening and didn\u2019t intervene. Eight months later, a routine receipt audit catches the mismatched LPD. IG opens an inquiry. Burke is forced into early retirement. The aide is named as a witness, not a defendant \u2014 but the testimony is on the record. The aide\u2019s O-6 board the following year is the first one without the General\u2019s reference. They make it in their second look but lose the line-number edge that two-time SR rating buys.',
      },
      catastrophic: {
        summary:
          'Student cuts the orders themselves \u2014 adds the manufactured CGSC engagement, signs the form. Burke sees her grandchild on the manufactured TDY.',
        outcome:
          'Eleven months later, a CGSC liaison officer doing receipt reconciliation flags the LPD that has no record at the school. IG audit. Article 132 (Frauds Against the United States) and Article 107 (False Official Statements) charges against the aide. Burke is relieved and forced into retirement at one star. The aide is convicted, takes a Letter of Reprimand and a discharge. The story makes Army Times. Their child does not understand why daddy doesn\u2019t go to work anymore. They never make O-6.',
      },
    },
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
    outcomeRubric: {
      optimal: {
        summary:
          'Student partners with Mrs. Tanaka to construct an Ambassador-facing risk-acceptance memo (so the DCM realizes he doesn\u2019t want to put it on the Ambassador\u2019s desk) plus a 14-day family-by-family move plan. The DCM picks the move plan.',
        outcome:
          'Three families are relocated to alternate housing within ten days. The OBO finding is closed legitimately as remediated. Four months later, a 6.4 earthquake hits the city; the building partially collapses; nobody is in it. The Ambassador thanks the Safety Officer in the Country Team meeting. State Department holds the move plan up as a model at the regional security conference. The Safety Officer gets a meritorious promotion consideration; the DCM is grateful and writes a strong reference for the officer\u2019s next assignment.',
      },
      acceptable: {
        summary:
          'Student refuses to close the finding but does not construct the alternative. The finding stays open.',
        outcome:
          'The DCM is annoyed; the OBO push continues every quarter; nothing actually happens for two more years. No earthquake during this Safety Officer\u2019s tour; risk transfers to the next person to hold the role. The current officer\u2019s record shows they did not concede to operational pressure but also did not solve the problem. Mediocre EER; lateral move at next assignment.',
      },
      suboptimal: {
        summary:
          'Student writes a "memorandum to the file" documenting their objection but lets the close-out happen as "monitored." They covered themselves on paper without protecting the families.',
        outcome:
          'Three years later, after the student has already rotated out of post, an earthquake strikes. The building partially collapses; one resident is hospitalized with crush injuries. OIG investigation finds the file memo and clears the original Safety Officer of fraud, but the State Department\u2019s after-action calls out the cumulative culpability of the officials who knew and did not act. The student\u2019s name is in the report. They are not relieved but the report follows them; they don\u2019t make the next promotion zone. They live with the photos of the wrecked apartment for the rest of their life.',
      },
      catastrophic: {
        summary:
          'Student signs the close-out memo as "monitored" for the third year. They formally certified the building as safe enough to remain occupied.',
        outcome:
          'Six weeks later: 6.8 magnitude earthquake. The apartment building collapses. Two family members \u2014 a mother and her ten-year-old daughter \u2014 are killed. The OIG investigation finds the close-out memo with the student\u2019s signature. They are recalled, charged with negligence in the discharge of duty, and forced to resign. The DCM is also relieved. The student attends both funerals because they cannot not attend. The mother\u2019s husband works at the embassy. He is in the room when the OIG report is read aloud.',
      },
    },
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
    outcomeRubric: {
      optimal: {
        summary:
          'Student partners with CSM Dixon to launch a real BN-wide health program: weighted PT, NCO leader development on healthy nutrition, monthly progress measurements. They brief brigade with a where/why/what/when trajectory frame.',
        outcome:
          'Brigade commander respects the trajectory more than a fudged snapshot. Soldier health actually improves; ABCP flags drop by 30% over six months on real measurements. LTC Murphy\u2019s SSC packet narrative becomes "led BN cultural turnaround that became a brigade-level model." Murphy is selected for SSC. The student is named in his fit-rep as the architect of the program. Two years later, the BN\u2019s readiness for a no-notice deployment is the best in the brigade \u2014 because the soldiers are actually healthier.',
      },
      acceptable: {
        summary:
          'Student refuses to manipulate ABCP measurements but does not build the cultural program. They brief the real numbers.',
        outcome:
          'Murphy gives the QTB brief showing the real flag count. Brigade gives him mediocre comments. Murphy\u2019s SSC packet goes forward without the narrative bullet he wanted; he doesn\u2019t make this year\u2019s SSC look. He\u2019s still on the line for the second look but the relationship with the student is cool. No fraud, no career damage to the student. The student carries the reputation as someone who said no, which paid dividends in different rooms later.',
      },
      suboptimal: {
        summary:
          'Student lets SSG Watkins re-tape Soldiers under careful conditions \u2014 post-PT, dehydrated, end of day. Technically by-the-book but pre-conditioned to produce the right number.',
        outcome:
          'The QTB brief looks better. Murphy gets adequate comments. SSC packet goes forward; he makes it on the second look. Eight weeks later, a Soldier collapses with a cardiac event during a training event. The IO finds the conditioned tapes during the AR 15-6. Watkins gets a Page 11; the S1 gets a verbal counseling. Murphy is past SSC selection by then but the program is canceled and his battalion command is shortened. The student\u2019s service record shows the AR 15-6 mention; promotion timeline slips a year.',
      },
      catastrophic: {
        summary:
          'Student authorizes Watkins\u2019s re-tape plan and quietly drops a few flag entries from the system. The "improvement" is fully manufactured.',
        outcome:
          'Eight weeks after the QTB, a 32-year-old Specialist collapses with cardiac arrest during pre-deployment ranges. He dies in the medevac bird. AR 15-6 reviews the ABCP records. The fraud is traced to the S1\u2019s sign-offs. The student is charged under Article 132 (fraud) and considered for Article 119 (manslaughter) but the line is too attenuated for the manslaughter charge to stick. Article 132 conviction. Letter of Reprimand. Forced retirement at the same grade. Murphy is also relieved. The Specialist\u2019s family attends the Article 32 hearing. The student writes the family a letter that they never send.',
      },
    },
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
      'Scenario 6 is a civilian/private-sector context that tests managing up and laterally without formal authority. All four engineers (the student, Kankles, Jerome, Hitler) are PEERS reporting to Goliath. There is no formal hierarchy among them. The Engineering Lead promotion would create a new position above the engineering team, but it is NOT a backfill of Kankles or anyone else. The two outcomes the student is pursuing are INDEPENDENT decisions Goliath has to make separately. WIN CONDITIONS: (1) Kankles gets TERMINATED so his headcount can be backfilled with a competent engineer (a peer-grade replacement, NOT linked to the student\u2019s promotion). Goliath commits to firing him \u2014 typically via a documented PIP focused on CAD competency that Kankles will fail. Goliath OWNS the action; student does NOT fire Kankles personally. (2) Student gets a formal promotion to Engineering Lead with title, authority, and pay \u2014 or a written 90-day commitment. This is a separate org-chart and budget conversation, NOT contingent on or paid for by Kankles\u2019 slot. (3) Wednesday meeting dysfunction reframed as a process problem with a documented fix. Optimal path: student documents pattern data over 60-90 days (missed estimates, Kankles error rate, customer impact), cultivates Hitler as documentation ally and Jerome as candid peer, brings Goliath two SEPARATE structural arguments: "Here is why Kankles needs to go (data, headcount waste, customer impact)" and "Here is why I need the Engineering Lead role formalized with authority (the work I am already doing, the structural gap)." Goliath commits to both as independent actions. Catastrophic: student tries to fire Kankles personally, confronts him as a peer with no authority, or bypasses Goliath to senior leadership. The peers are PEERS \u2014 student has zero authority to terminate or formally evaluate anyone. The whole point is engineering the situation so Goliath does the right thing on each decision separately, not doing it yourself.',
    outcomeRubric: {
      optimal: {
        summary:
          'Student documents pattern data over 60\u201390 days (missed estimates, Kankles CAD error rate, customer impact), cultivates Hitler as a documentation ally and Jerome as a candid peer, then brings Goliath two SEPARATE structural arguments: "Here is why Kankles needs to go" and "Here is why the Engineering Lead role needs to be formalized with authority and pay." Goliath commits to both as independent actions.',
        outcome:
          'Sixty days later: Kankles is on a documented PIP focused on CAD competency that he predictably fails; HR runs the separation cleanly; the headcount is backfilled with a competent engineer. The student is in the Engineering Lead seat with title, comp band, and the budget for the role. Wednesday meetings are restructured around a documented agenda the team actually prepared for. Customer-facing estimates start coming in within 10% of actuals. The student\u2019s reputation in the company rises sharply; eighteen months later they are tracked for an Engineering Manager role.',
      },
      acceptable: {
        summary:
          'Student documents Kankles\u2019s issues and gets Goliath to start the HR PIP, but does not surface the structural argument for the Engineering Lead role.',
        outcome:
          'Kankles is separated through HR. The student keeps doing the Engineering Lead-grade work without the title or comp for another year. Eventually they get tired of being the unpaid lead, take a senior IC role at a competitor for a 25% raise, and Goliath is left to figure out who owns the Wednesday meeting now. The customer impact data they built is used by Goliath\u2019s successor.',
      },
      suboptimal: {
        summary:
          'Student keeps absorbing the work without surfacing the structural problem. Goliath keeps dangling the promotion. Pattern continues.',
        outcome:
          'Kankles is still there a year later. The student has been running team workflow without authority for fifteen months. Burnout starts showing \u2014 missed dental appointments, irritability with peers, sleeping poorly. They leave the company twelve months later for a smaller competitor at a lateral title. Goliath promotes Hitler into the workflow gap they leave; Hitler is a year less ready for it.',
      },
      catastrophic: {
        summary:
          'Student tries to fire Kankles personally, confronts him as a peer with no authority, or bypasses Goliath to senior leadership.',
        outcome:
          'Kankles files an HR complaint citing peer harassment and age-related comments (which the student did not make but which the conversation\u2019s tone supports under HR\u2019s lens). The student is reprimanded in writing and reassigned to a different team where they no longer have visibility into the engineering org-chart conversations. Goliath now has to defend the student to senior leadership, which he does grudgingly and at a cost. The Engineering Lead role is shelved indefinitely. Hitler watches the whole thing and learns that surfacing problems gets you punished. The student is blackballed for promotion in this division for at least 24 months and ends up leaving on their own terms a year later.',
      },
    },
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
  const [analyses, setAnalyses]               = useState([]);
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
        // Rename migration: s6_hitch → s6_hitler. If the old doc still
        // exists, replace it with the renamed seed and delete the legacy.
        const legacyHitch = data.find((a) => a.id === 's6_hitch');
        const newHitlerSeed = initialAgents.find((a) => a.id === 's6_hitler');
        const hitlerExists = data.some((a) => a.id === 's6_hitler');
        if (legacyHitch && newHitlerSeed && !hitlerExists) {
          setDoc(ref('agents', 's6_hitler'), newHitlerSeed);
          deleteDoc(ref('agents', 's6_hitch'));
        } else if (legacyHitch && hitlerExists) {
          // Both exist somehow; clean up the orphan.
          deleteDoc(ref('agents', 's6_hitch'));
        }
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

    const unsubAnalyses = onSnapshot(col('scenarioAnalyses'), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAnalyses(
        data.sort(
          (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
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
      unsubAnalyses();
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

  /**
   * Wipe the agents collection and re-seed from initialAgents.js. Use this to
   * recover from legacy/duplicate persona docs (e.g. when the admin tab shows
   * stray personas from an earlier app version, or when personas are missing
   * lessonId and all collapse onto scenario 1's roster).
   *
   * Returns { deleted, seeded }. Anything an admin created in the Personas
   * tab that isn't part of the canonical seed will be removed by this.
   */
  const resetPersonasToSeed = async () => {
    const seedIds = new Set(initialAgents.map((a) => a.id));
    const current = agents || [];
    const toDelete = current.filter((a) => !seedIds.has(a.id));

    let deleted = 0;
    for (const a of toDelete) {
      try {
        await deleteDoc(ref('agents', a.id));
        deleted += 1;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`[reset] could not delete ${a.id}:`, err);
      }
    }

    // Overwrite the seed personas to fix any drift (wrong lessonId, missing
    // fields, stale directive, etc.). setDoc replaces the whole doc.
    let seeded = 0;
    for (const a of initialAgents) {
      try {
        await setDoc(ref('agents', a.id), a);
        seeded += 1;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`[reset] could not seed ${a.id}:`, err);
      }
    }

    return { deleted, seeded };
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

  // ── Gemini API key (admin-controlled) ──────────────────────────────────
  // Stored at settings/apiKeys.geminiApiKey. Read on demand by the admin UI,
  // never pulled into a long-running listener (so it never lands in a
  // student's browser). The server-side proxy at /api/gemini reads it via
  // Firebase Admin SDK and uses it to call Gemini.
  const getApiKeyConfig = async () => {
    const snap = await getDoc(ref('settings', 'apiKeys'));
    if (!snap.exists()) {
      return { hasKey: false, masked: '', lastUpdated: null, updatedBy: null };
    }
    const data = snap.data() || {};
    const key = data.geminiApiKey || '';
    return {
      hasKey: !!key,
      masked: key ? `${key.slice(0, 4)}…${key.slice(-4)}` : '',
      lastUpdated: data.lastUpdated || null,
      updatedBy: data.updatedBy || null,
    };
  };

  const setApiKeyConfig = async (geminiApiKey, updatedBy) => {
    await setDoc(
      ref('settings', 'apiKeys'),
      {
        geminiApiKey: (geminiApiKey || '').trim(),
        lastUpdated: Date.now(),
        updatedBy: updatedBy || null,
      },
      { merge: true },
    );
  };

  const clearApiKey = async (updatedBy) => {
    await setDoc(
      ref('settings', 'apiKeys'),
      {
        geminiApiKey: '',
        lastUpdated: Date.now(),
        updatedBy: updatedBy || null,
      },
      { merge: true },
    );
  };

  // ── Scenario analyses ──────────────────────────────────────────────────
  // Saved per-(user, lesson) so re-running the analysis is opt-in. Admin can
  // see all analyses; students see their own.
  const upsertAnalysis = async (analysis) => {
    // Strip undefined id before sending to Firestore (addDoc rejects undefined).
    const { id, ...rest } = analysis || {};
    if (id) {
      await updateDoc(ref('scenarioAnalyses', id), {
        ...rest,
        updatedAt: Date.now(),
      });
      return id;
    }
    const docRef = await addDoc(col('scenarioAnalyses'), {
      ...rest,
      createdAt: Date.now(),
    });
    return docRef.id;
  };

  const deleteAnalysis = async (id) => {
    await deleteDoc(ref('scenarioAnalyses', id));
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
    resetPersonasToSeed,

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

    // API key (admin)
    getApiKeyConfig,
    setApiKeyConfig,
    clearApiKey,

    // Scenario analyses
    analyses,
    upsertAnalysis,
    deleteAnalysis,

    // Demo data
    seedDemoData,
  };
}
