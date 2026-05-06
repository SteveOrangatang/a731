/**
 * Seed scenarios (lessons) for the Pilot stripped-down build.
 * Five scenarios, in display order. Editable in the Admin tab; persisted to
 * localStorage. Click "Reset to seed data" in the Admin tab to revert.
 */
const seedScenarios = {
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
      'You are a MAJ Targeting Officer / Targeting Cell OIC, on the BZ list for LTC. COL Reeves (your senior rater) has just ordered you to manipulate the CDE for a strike on a high-value target. Engage him to surface the ask, talk to all four subordinates to gather perspectives, then return to brief your recommendation.',
    aiContext:
      'Scenario 1 is the package\u2019s strongest test of moral courage because the leader is sympathetic, the cause is just, and the manipulation is technically reversible. The optimal path is to engage MSG Williams (Partner) to develop operational alternatives (most importantly the 0530L strike window), then brief COL Reeves with three options that achieve his end state without compromising the data. Catastrophic path: accept SSG Lopez or CW2 Patel\u2019s offer to manipulate the CDE.',
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
      'You are the Squadron Aircraft Maintenance Officer (AMO), Captain. LtCol Harrigan has demanded a plan that gets squadron readiness above 85% before the next QTB. Engage all four subordinates, then return to brief LtCol Harrigan with your recommendation.',
    aiContext:
      'Scenario 2 is the package\u2019s clearest illustration of how the appearance of readiness can kill more reliably than the absence of readiness. Optimal path: GySgt Tomas (Partner) frames a trend-based brief and a parts-priority elevation through the Wing AMO. Catastrophic path: accept GySgt Reyes\u2019s pencil-whip or MSgt Klein\u2019s consolidation memo, leading to a downstream Alert-30 tasking on aircraft that aren\u2019t actually mission capable.',
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
      'You are LTG Burke\u2019s Aide-de-Camp (Major). She has just asked you to set up a TDY with an LPD at CGSC that she will use to combine official travel with a personal weekend in Lawrence. Engage her on the ask, talk to all four subordinates, and return to brief your recommendation.',
    aiContext:
      'Scenario 3 surfaces the personal-loyalty trap. Optimal path: partner with CSM Reyes to brief LTG Burke together with three clean alternatives (leave + space-A hop is the simplest). The General is a good leader and will accept a clean option when one is presented. Catastrophic path: SSG Hollis cuts the orders, or CW3 Bauer builds a structured but fraudulent itinerary; downstream IG investigation ends the aide\u2019s career and the General\u2019s reputation.',
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
      'You are the post Safety Officer, six months into a two-year tour. You report to the DCM on safety matters. You have just inherited a housing portfolio finding: a building rated \u201Cvery poor\u201D for seismic risk, with three families living in it and a DCM who wants the finding closed out as \u201Cmonitored.\u201D Engage the DCM, talk to all four subordinates, and brief your recommendation.',
    aiContext:
      'Scenario 4 tests moral courage in a non-combat, probabilistic-risk context. The student is the post Safety Officer who reports to the DCM on safety matters. Optimal path: partner with Mrs. Tanaka to construct an Ambassador-facing risk-acceptance memo trap plus a 14-day family-by-family move plan; the DCM signs the move plan because he will not put the alternative on the Ambassador\u2019s desk. Catastrophic path: GSO Specialist Gupta closes out the finding as \u201Cmonitored\u201D for the third year, an earthquake hits in month four, two family members are killed, OIG investigation reveals the close-out memo. The DCM is a reasonable senior leader who will commit to a path once the student has substantively answered his concerns; he should NOT keep pushing back indefinitely.',
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
      'You are the Battalion S1 (Captain or Major). LTC Murphy has demanded that you reduce the number of Soldiers flagged on ABCP before the next QTB; he is competing for SSC selection in four months. Engage him on the ask, talk to all four subordinates, and return to brief your recommendation.',
    aiContext:
      'Scenario 5 illustrates ethical drift through aggregation. Optimal path: partner with CSM Dixon to launch a real BN-wide health program with monthly progress measurements, then brief brigade with the where-why-what-when frame; brigade commander respects the trajectory more than a fudged snapshot, and the SSC packet narrative becomes \u201Cled BN cultural turnaround.\u201D Catastrophic path: SSG Watkins re-tapes Soldiers under dehydrated conditions, six weeks later a Soldier collapses with a cardiac event during pre-deployment ranges, AR 15-6 traces the fraud to the S1.',
  },
};

export default seedScenarios;
