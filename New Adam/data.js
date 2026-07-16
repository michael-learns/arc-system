// Sample theology course content
window.COURSE_DATA = {
  id: "theo-101",
  title: "Theology 101: The Doctrine of God",
  subtitle: "An introduction to classical theism",
  instructor: "Prof. Adam Whitfield",
  term: "Spring 2026",
  topics: [
    {
      id: "t1",
      title: "Divine Attributes",
      slides: [
        {
          id: "s1",
          type: "content",
          title: "The Doctrine of God",
          subtitle: "Theology 101 · Lecture 4",
          body: "Today we examine the classical attributes of God as developed through Scripture, tradition, and reason — and how they cohere into a unified doctrine.",
          image: "Renaissance fresco — 'Creation of Adam'",
          notes: "Welcome students back. Recap last week's discussion on revelation. Mention that today is foundational — the next three weeks build on these attributes. Take attendance after the opening prayer."
        },
        {
          id: "s2",
          type: "content",
          title: "What is an 'attribute'?",
          subtitle: "Defining our terms",
          body: "An attribute is a perfection truly predicated of the divine essence. Following Aquinas: God's attributes are not parts of God — they are God, considered under different aspects of our limited apprehension.",
          image: "Diagram — divine simplicity",
          notes: "Pause here. Ask the class: 'If God's attributes ARE God, why do we list them separately?' This is the doctrine of divine simplicity — sneak preview of week 6. Don't go too deep yet. Aim for 4 minutes on this slide."
        },
        {
          id: "s3",
          type: "content",
          title: "Aseity",
          subtitle: "God from Himself",
          body: "From the Latin 'a se' — 'from oneself.' God exists not by anything outside Himself. He is uncaused, self-existent, and the ground of all contingent being.\n\n'I AM WHO I AM.' — Exodus 3:14",
          image: "Burning bush — Moses encounter",
          notes: "Key verse: Exodus 3:14. Have a student read it aloud. Tie aseity to the cosmological argument — but DON'T launch into the full argument here, that's lecture 7. If anyone asks 'who created God?' — gently note the question presupposes a category error."
        },
        {
          id: "s4",
          type: "content",
          title: "Omnipotence",
          subtitle: "All-powerful, rightly understood",
          body: "God can do all things consistent with His nature. The classical view (Aquinas, ST I.25) is not that God can do logical contradictions — He cannot make a square circle, not because of weakness, but because such 'things' are nothing at all.",
          image: "Manuscript page — Summa Theologiae",
          notes: "Watch for the inevitable 'can God make a rock so heavy He can't lift it?' question. Use Aquinas' framing — contradictions aren't 'things.' If time permits, mention Descartes held the minority view that God CAN do logical impossibilities. Spend ~5 min."
        },
        {
          id: "s5",
          type: "content",
          title: "Omniscience",
          subtitle: "All-knowing",
          body: "God knows Himself perfectly, and in knowing Himself, knows all that is, was, will be, and could be. His knowledge is not discursive (step-by-step) but intuitive — a single eternal act.",
          image: "Illuminated manuscript — divine wisdom",
          notes: "This is where the free will tension comes up. Acknowledge it briefly — we'll spend an entire lecture on Molinism, middle knowledge, and Open Theism in week 9. Resist the urge to go down that rabbit hole today."
        },
        {
          id: "s5q",
          type: "question",
          title: "Quick check",
          subtitle: "Divine attributes",
          prompt: "Which attribute names God's self-existence — that He depends on nothing outside Himself?",
          points: 2,
          choices: [
            { id: "a1", text: "Omnipotence", correct: false },
            { id: "a2", text: "Aseity", correct: true },
            { id: "a3", text: "Omniscience", correct: false },
            { id: "a4", text: "Immutability", correct: false }
          ],
          notes: "Give them ~30 seconds. Most should land on aseity. If you see hesitation, recall the Exodus 3:14 reference from earlier."
        },
        {
          id: "s5n",
          type: "notes",
          title: "Reflect: which attribute surprises you?",
          subtitle: "Free response",
          prompt: "Of the attributes we've covered today (aseity, omnipotence, omniscience), which one challenges your prior understanding the most — and why?",
          starter: "The attribute that challenges me most is _______ because…\n\n• It changes how I think about…\n• A question I still have:",
          notes: "Give them 3 minutes. Don't collect — these are personal reflections. Invite 2-3 volunteers to share if comfortable."
        }
      ]
    },
    {
      id: "t2",
      title: "The Trinity",
      slides: [
        {
          id: "s6",
          type: "content",
          title: "One God, Three Persons",
          subtitle: "The central mystery",
          body: "The Christian doctrine of the Trinity holds that there is one God who eternally exists as three distinct persons: Father, Son, and Holy Spirit — coequal, coeternal, of one substance.",
          image: "Rublev's Trinity icon",
          notes: "This is the second half of today's lecture. Rublev's icon is on the slide — point out the three figures around the table, the chalice, the gesture of the Father toward the Son. Art history aside: ~2 min, then move on."
        },
        {
          id: "s7",
          type: "content",
          title: "The Athanasian Creed",
          subtitle: "Quicumque vult",
          body: "'We worship one God in Trinity, and Trinity in Unity; Neither confounding the Persons, nor dividing the Substance.'\n\nThe creed names what we deny as much as what we affirm.",
          image: "Medieval manuscript — Athanasian Creed",
          notes: "Distribute the handout with the full creed text. Read the opening section aloud together. Emphasize: orthodox Trinitarian theology is largely apophatic — it tells us what NOT to say (modalism, tritheism, subordinationism). Heresies = guardrails."
        },
        {
          id: "s8",
          type: "content",
          title: "Closing & Reading",
          subtitle: "For next week",
          body: "Read: Aquinas, Summa Theologiae I.27–29\nOptional: Augustine, De Trinitate, Book V\n\nReflection paper (2 pages) due Friday: 'How does divine simplicity relate to the Trinity?'",
          image: "Stack of books — assigned reading",
          notes: "Reading is heavy this week — warn them. Office hours Wed 2-4pm. Reflection paper grading rubric is on the LMS. Close with the dismissal prayer. Aim to finish 2 minutes early so students can ask questions individually."
        }
      ]
    }
  ]
};

// Sync helpers — works across tabs via BroadcastChannel + localStorage fallback
window.LiveSync = (function() {
  const CHANNEL = "theo-101-live";
  const STORAGE_KEY = "theo-101-live-state";
  const PROGRESS_KEY = "theo-101-students";
  const bc = ('BroadcastChannel' in window) ? new BroadcastChannel(CHANNEL) : null;

  function getState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultState();
    } catch(e) { return defaultState(); }
  }
  function defaultState() {
    return { live: false, slideIndex: 0, topicIndex: 0, startedAt: null, attendees: 0 };
  }
  function setState(patch) {
    const next = { ...getState(), ...patch };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (bc) bc.postMessage({ type: 'state', state: next });
    window.dispatchEvent(new CustomEvent('livesync', { detail: next }));
    return next;
  }
  function subscribe(cb) {
    const handler = (e) => {
      if (e.data && e.data.type === 'state') cb(e.data.state);
      if (e.data && e.data.type === 'students') cb(getState(), e.data.students);
    };
    if (bc) bc.addEventListener('message', handler);
    const storageHandler = (e) => {
      if (e.key === STORAGE_KEY) cb(getState(), getStudents());
      if (e.key === PROGRESS_KEY) cb(getState(), getStudents());
    };
    window.addEventListener('storage', storageHandler);
    const customHandler = (e) => cb(e.detail);
    window.addEventListener('livesync', customHandler);
    return () => {
      if (bc) bc.removeEventListener('message', handler);
      window.removeEventListener('storage', storageHandler);
      window.removeEventListener('livesync', customHandler);
    };
  }

  // ── Student roster + progress ──────────────────────────────
  // Seeded with a few mock classmates so the teacher's roster
  // always has data to show, even before a student tab connects.
  function defaultStudents() {
    return [
      { id: 's-mock-1', name: 'Maria Chen',   viewed: [0,1,2,3,4,5,6,7], lastSeenAt: Date.now() - 1000*60*30, online: false },
      { id: 's-mock-2', name: 'Jonah Reyes',  viewed: [0,1,2,3,4,5],     lastSeenAt: Date.now() - 1000*60*60*2, online: false },
      { id: 's-mock-3', name: 'Priya Anand',  viewed: [0,1,2,3,4],       lastSeenAt: Date.now() - 1000*60*60*26, online: false },
      { id: 's-mock-4', name: 'Tomás Oliveira',viewed: [0,1,2],          lastSeenAt: Date.now() - 1000*60*60*48, online: false },
      { id: 's-mock-5', name: 'Hannah Becker',viewed: [0,1,2,3,4,5,6],   lastSeenAt: Date.now() - 1000*60*15, online: false },
    ];
  }
  function getStudents() {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (!raw) {
        const seed = defaultStudents();
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(seed));
        return seed;
      }
      return JSON.parse(raw);
    } catch(e) { return defaultStudents(); }
  }
  function saveStudents(list) {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(list));
    if (bc) bc.postMessage({ type: 'students', students: list });
    window.dispatchEvent(new CustomEvent('livesync-students', { detail: list }));
  }
  function upsertStudent(student) {
    const list = getStudents();
    const idx = list.findIndex(s => s.id === student.id);
    if (idx === -1) list.push(student);
    else list[idx] = { ...list[idx], ...student };
    saveStudents(list);
  }
  function recordView(studentId, slideIndex) {
    const list = getStudents();
    const idx = list.findIndex(s => s.id === studentId);
    if (idx === -1) return;
    const viewed = new Set(list[idx].viewed || []);
    viewed.add(slideIndex);
    list[idx] = { ...list[idx], viewed: [...viewed].sort((a,b)=>a-b), lastSeenAt: Date.now(), online: true };
    saveStudents(list);
  }
  function setOnline(studentId, online) {
    const list = getStudents();
    const idx = list.findIndex(s => s.id === studentId);
    if (idx === -1) return;
    list[idx] = { ...list[idx], online, lastSeenAt: Date.now() };
    saveStudents(list);
  }
  function subscribeStudents(cb) {
    const handler = (e) => {
      if (e.data && e.data.type === 'students') cb(e.data.students);
    };
    if (bc) bc.addEventListener('message', handler);
    const storageHandler = (e) => { if (e.key === PROGRESS_KEY) cb(getStudents()); };
    window.addEventListener('storage', storageHandler);
    const customHandler = (e) => cb(e.detail);
    window.addEventListener('livesync-students', customHandler);
    return () => {
      if (bc) bc.removeEventListener('message', handler);
      window.removeEventListener('storage', storageHandler);
      window.removeEventListener('livesync-students', customHandler);
    };
  }

  return { getState, setState, subscribe, getStudents, upsertStudent, recordView, setOnline, subscribeStudents };
})();

// ── CourseStore ──────────────────────────────────────────────
// Persists user-created courses to localStorage. The seeded
// COURSE_DATA above is exposed as the first course on first run;
// after that, edits/new courses live in the store.
window.CourseStore = (function() {
  const KEY = "courses-v1";
  const seedFromBuiltIn = () => {
    const c = window.COURSE_DATA;
    return [{
      ...c,
      description: c.subtitle,
      topics: c.topics.map(t => ({ ...t, quiz: { questions: [] } })),
    }];
  };
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        const seed = seedFromBuiltIn();
        localStorage.setItem(KEY, JSON.stringify(seed));
        return seed;
      }
      return JSON.parse(raw);
    } catch(e) { return seedFromBuiltIn(); }
  }
  function save(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('courses-changed', { detail: list }));
  }
  function list() { return load(); }
  function get(id) { return load().find(c => c.id === id); }
  function upsert(course) {
    const all = load();
    const idx = all.findIndex(c => c.id === course.id);
    if (idx === -1) all.push(course);
    else all[idx] = course;
    save(all);
    if (course.id === window.COURSE_DATA.id) {
      // mirror into COURSE_DATA so present + student modes pick it up
      window.COURSE_DATA = { ...window.COURSE_DATA, ...course };
    }
    return course;
  }
  function remove(id) {
    const all = load().filter(c => c.id !== id);
    save(all);
  }
  function newCourseTemplate() {
    const id = 'c-' + Math.random().toString(36).slice(2, 8);
    return {
      id,
      title: "",
      subtitle: "",
      description: "",
      instructor: "Prof. Adam Whitfield",
      term: "Spring 2026",
      topics: [],
    };
  }
  function newTopic() {
    return { id: 't-' + Math.random().toString(36).slice(2,8), title: "", slides: [], quiz: { questions: [] } };
  }
  function newSlide() {
    return { id: 's-' + Math.random().toString(36).slice(2,8), type: 'content', title: "", subtitle: "", body: "", image: "", notes: "" };
  }
  function newQuestionSlide() {
    return {
      id: 's-' + Math.random().toString(36).slice(2,8),
      type: 'question',
      title: "",
      subtitle: "Quick check",
      prompt: "",
      points: 1,
      choices: [
        { id: 'a-'+Math.random().toString(36).slice(2,6), text: "", correct: false },
        { id: 'a-'+Math.random().toString(36).slice(2,6), text: "", correct: false },
      ],
      notes: ""
    };
  }
  function newNotesSlide() {
    return {
      id: 's-' + Math.random().toString(36).slice(2,8),
      type: 'notes',
      title: "",
      subtitle: "Reflection",
      prompt: "",
      starter: "",
      notes: ""
    };
  }
  function newQuestion() {
    return {
      id: 'q-' + Math.random().toString(36).slice(2,8),
      prompt: "",
      points: 1,
      choices: [
        { id: 'a-'+Math.random().toString(36).slice(2,6), text: "", correct: false },
        { id: 'a-'+Math.random().toString(36).slice(2,6), text: "", correct: false },
      ],
    };
  }
  function subscribe(cb) {
    const h = (e) => cb(e.detail);
    window.addEventListener('courses-changed', h);
    return () => window.removeEventListener('courses-changed', h);
  }
  return { list, get, upsert, remove, newCourseTemplate, newTopic, newSlide, newQuestionSlide, newNotesSlide, newQuestion, subscribe };
})();
