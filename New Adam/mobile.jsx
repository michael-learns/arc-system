// Mobile mockup — interactive iPhone frames for student + teacher

const { useState, useEffect, useMemo, useRef } = React;

// ── Interactive student phone screen ──────────────────────────
const StudentPhone = ({ initialState }) => {
  const c = window.COURSE_DATA;
  const flat = useMemo(() => {
    const out = [];
    c.topics.forEach((t, ti) => t.slides.forEach((s, si) =>
      out.push({ ...s, topicTitle: t.title, topicIndex: ti, slideIndexInTopic: si })));
    return out;
  }, []);

  // Map state preset → starting slide index
  const initialIdx = useMemo(() => {
    if (initialState === 'question') return flat.findIndex(s => s.type === 'question');
    if (initialState === 'notes') return flat.findIndex(s => s.type === 'notes');
    return 0; // content
  }, [initialState, flat]);

  const [idx, setIdx] = useState(initialIdx);
  const [answers, setAnswers] = useState({});
  const [notes, setNotes] = useState({});
  const [bump, setBump] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  // Pre-seed: question revealed correct, notes have starter text + a scribble
  useEffect(() => {
    if (initialState === 'question') {
      const qSlide = flat[initialIdx];
      const correct = qSlide?.choices?.find(c => c.correct);
      if (correct) {
        setAnswers({ [qSlide.id]: { choiceId: correct.id, revealed: true } });
      }
    } else if (initialState === 'notes') {
      const nSlide = flat[initialIdx];
      if (nSlide) {
        setNotes({
          [nSlide.id]: (nSlide.starter || '') + "\n\nOmniscience surprises me — I assumed God's knowledge worked like ours, just bigger. The 'single eternal act' framing changes everything."
        });
      }
    }
  }, []); // eslint-disable-line

  useEffect(() => { setIdx(initialIdx); }, [initialIdx]);

  // Bump animation on slide change
  useEffect(() => {
    setBump(true);
    const t = setTimeout(() => setBump(false), 720);
    return () => clearTimeout(t);
  }, [idx]);

  // Touch swipe
  const stageRef = useRef(null);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let startX = null, startY = null;
    const onStart = (e) => {
      const t = e.touches?.[0] || e;
      startX = t.clientX; startY = t.clientY;
    };
    const onEnd = (e) => {
      if (startX == null) return;
      const t = e.changedTouches?.[0] || e;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) setIdx(i => Math.min(flat.length - 1, i + 1));
        else setIdx(i => Math.max(0, i - 1));
      }
      startX = startY = null;
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('mousedown', onStart);
    el.addEventListener('mouseup', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('mousedown', onStart);
      el.removeEventListener('mouseup', onEnd);
    };
  }, [flat.length]);

  const slide = flat[idx];
  const total = flat.length;
  const pct = Math.round(((idx + 1) / total) * 100);

  const selectChoice = (cid) => {
    setAnswers(a => ({ ...a, [slide.id]: { choiceId: cid, revealed: false } }));
  };
  const revealAnswer = () => {
    setAnswers(a => ({ ...a, [slide.id]: { ...(a[slide.id] || {}), revealed: true } }));
  };
  const resetAnswer = () => {
    setAnswers(a => { const x = { ...a }; delete x[slide.id]; return x; });
  };
  const setNote = (val) => {
    setNotes(n => ({ ...n, [slide.id]: val }));
    setSavedAt(Date.now());
  };

  const answer = answers[slide.id];

  return (
    <div className="m m-screen" style={{position:'relative'}}>
      <header className="m-header">
        <div className="m-header-top">
          <div className="m-header-brand">
            <div className="m-brand-mark">N</div>
            <span className="m-brand-name">New Adam</span>
          </div>
          <span className="m-live-pill"><span className="m-live-dot"></span>Live</span>
        </div>
        <div className="m-course-title">{c.title}</div>
        <div className="m-course-meta">
          <span style={{fontFamily:"'JetBrains Mono', monospace"}}>THEO-101</span>
          <span className="m-dot"></span>
          <span>{slide?.topicTitle}</span>
          <span className="m-dot"></span>
          <span>{c.instructor}</span>
        </div>
      </header>

      <div className="m-slide-area" ref={stageRef}>
        <div className={`m-slide-card${bump ? ' bump' : ''}`}>
          {(!slide.type || slide.type === 'content') && (
            <>
              {slide.subtitle && <div className="m-slide-eyebrow">{slide.subtitle}</div>}
              <h1 className="m-slide-title">{slide.title}</h1>
              {slide.image && (
                <div className="m-slide-image">
                  <span className="m-slide-image-label">{slide.image}</span>
                </div>
              )}
              {slide.body && <div className="m-slide-body">{slide.body}</div>}
            </>
          )}

          {slide.type === 'question' && (
            <>
              <div className="m-q-eyebrow">
                <span>{slide.subtitle || 'Quick check'}</span>
                <span className="m-q-points">{slide.points || 1} {slide.points === 1 ? 'pt' : 'pts'}</span>
              </div>
              <h2 className="m-q-prompt">{slide.prompt}</h2>
              <div className="m-choices">
                {slide.choices.map((ch, i) => {
                  const letter = String.fromCharCode(65 + i);
                  let cls = 'm-choice';
                  if (answer?.choiceId === ch.id && !answer.revealed) cls += ' selected';
                  if (answer?.revealed) {
                    if (ch.correct) cls += ' correct';
                    else if (ch.id === answer.choiceId) cls += ' incorrect';
                  }
                  return (
                    <button
                      key={ch.id}
                      className={cls}
                      onClick={() => selectChoice(ch.id)}
                      disabled={answer?.revealed}
                    >
                      <span className="m-letter">{letter}</span>
                      <span style={{flex:1}}>{ch.text}</span>
                      {answer?.revealed && ch.correct && <span className="m-mark">Correct</span>}
                      {answer?.revealed && ch.id === answer.choiceId && !ch.correct && <span className="m-mark">Yours</span>}
                    </button>
                  );
                })}
              </div>
              {answer?.revealed && (
                <div className="m-q-feedback">
                  {answer.choiceId && slide.choices.find(c=>c.id===answer.choiceId)?.correct
                    ? <><strong>Correct.</strong> Aseity — God's self-existence.</>
                    : <><strong>Not quite.</strong> The correct answer is highlighted.</>}
                </div>
              )}
              <div style={{padding:'0 18px 16px', display:'flex', gap:8}}>
                {answer?.revealed
                  ? <button className="m-choice" style={{justifyContent:'center'}} onClick={resetAnswer}><span style={{fontWeight:500}}>Try again</span></button>
                  : <button
                      className="m-choice"
                      style={{justifyContent:'center', background:'var(--m-ink)', color:'#fff', borderColor:'var(--m-ink)', opacity: answer?.choiceId ? 1 : 0.4}}
                      disabled={!answer?.choiceId}
                      onClick={revealAnswer}
                    ><span style={{fontWeight:500}}>Check answer</span></button>
                }
              </div>
            </>
          )}

          {slide.type === 'notes' && (
            <>
              <div className="m-notes-intro">
                <div className="m-notes-eyebrow">{slide.subtitle || 'Reflection'}</div>
                <div className="m-notes-title">{slide.title}</div>
                {slide.prompt && <div className="m-notes-prompt">{slide.prompt}</div>}
              </div>
              <div className="m-notes-pad">
                <div className="m-notes-pad-head">
                  <span className="m-notes-pad-label">My notes</span>
                  <span className="m-notes-pad-saved">{savedAt ? 'saved' : 'auto-saves'}</span>
                </div>
                <textarea
                  className="m-notes-textarea"
                  value={notes[slide.id] != null ? notes[slide.id] : (slide.starter || '')}
                  onChange={e => setNote(e.target.value)}
                  spellCheck="false"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom dock */}
      <div className="m-dock">
        <div className="m-dock-row">
          <button
            className="m-dock-button"
            onClick={() => setIdx(i => Math.max(0, i - 1))}
            disabled={idx === 0}
            aria-label="Previous"
          >‹</button>
          <span className="m-dock-counter">{String(idx+1).padStart(2,'0')} / {String(total).padStart(2,'0')}</span>
          <div className="m-dock-progress">
            <div className="m-dock-progress-fill" style={{width: `${pct}%`}}></div>
          </div>
          <button
            className="m-dock-button"
            onClick={() => setSheetOpen(true)}
            aria-label="Outline"
            style={{background:'var(--m-bg)', color:'var(--m-ink)', border:'1px solid var(--m-line)'}}
          >☰</button>
          <button
            className="m-dock-button primary"
            onClick={() => setIdx(i => Math.min(total - 1, i + 1))}
            disabled={idx === total - 1}
            aria-label="Next"
          >›</button>
        </div>
      </div>

      {/* Bottom sheet — outline */}
      <div className={`m-sheet-backdrop${sheetOpen ? ' open' : ''}`} onClick={() => setSheetOpen(false)} />
      <div className={`m-sheet${sheetOpen ? ' open' : ''}`}>
        <div className="m-sheet-handle" />
        <div className="m-sheet-head">
          <span className="m-sheet-title">Course outline</span>
          <button className="m-sheet-close" onClick={() => setSheetOpen(false)}>×</button>
        </div>
        <div className="m-sheet-body">
          {c.topics.map((t, ti) => {
            const tStart = flat.findIndex(f => f.topicIndex === ti);
            const isCurrent = slide.topicIndex === ti;
            return (
              <div key={t.id} className={`m-sheet-topic${isCurrent ? ' current' : ''}`}>
                <div className="m-sheet-topic-head">
                  <span className="m-sheet-topic-num">{String(ti+1).padStart(2,'0')}</span>
                  <span>{t.title}</span>
                </div>
                <div className="m-sheet-slide-list">
                  {t.slides.map((s, si) => {
                    const g = tStart + si;
                    const isCur = g === idx;
                    const isPast = g < idx;
                    const slideTitle = s.type === 'question' ? (s.prompt || 'Question') : (s.title || 'Untitled');
                    return (
                      <div
                        key={s.id}
                        className={`m-sheet-slide${isCur ? ' current' : ''}${isPast ? ' past' : ''}`}
                        onClick={() => { setIdx(g); setSheetOpen(false); }}
                      >
                        <span className="m-sheet-slide-bullet">{isPast ? '✓' : (isCur ? '●' : si+1)}</span>
                        <span className="m-sheet-slide-text">{slideTitle}</span>
                        <span className={`m-sheet-type-chip ${s.type || 'content'}`}>
                          {s.type === 'question' ? 'Q' : s.type === 'notes' ? '✎' : '¶'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Teacher phone (compact present + notes) ───────────────────
const TeacherPhone = () => {
  const c = window.COURSE_DATA;
  const flat = useMemo(() => {
    const out = [];
    c.topics.forEach((t, ti) => t.slides.forEach((s, si) =>
      out.push({ ...s, topicTitle: t.title, topicIndex: ti })));
    return out;
  }, []);

  const [idx, setIdx] = useState(0);
  const [tab, setTab] = useState('notes'); // notes | preview
  const [elapsed, setElapsed] = useState('12:34');
  const slide = flat[idx];
  const next = flat[idx + 1];

  // fake tick the timer for life
  useEffect(() => {
    let s = 12*60 + 34;
    const id = setInterval(() => {
      s += 1;
      const mm = String(Math.floor(s/60)).padStart(2,'0');
      const ss = String(s%60).padStart(2,'0');
      setElapsed(`${mm}:${ss}`);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const fakeAttendees = 28;

  return (
    <div className="m m-screen" style={{position:'relative'}}>
      <header className="m-header">
        <div className="m-header-top">
          <div className="m-header-brand">
            <div className="m-brand-mark">N</div>
            <span className="m-brand-name">Teacher</span>
          </div>
          <span className="m-live-pill"><span className="m-live-dot"></span>Broadcasting</span>
        </div>
        <div className="m-course-title">{c.title}</div>
        <div className="m-course-meta">
          <span>{slide.topicTitle}</span>
          <span className="m-dot"></span>
          <span style={{fontFamily:"'JetBrains Mono', monospace", whiteSpace:'nowrap'}}>Slide {idx+1} / {flat.length}</span>
        </div>
      </header>

      <div className="m-teacher-stage">
        <div className="m-teacher-meta">
          <div className="m-teacher-meta-stat">
            <span className="m-teacher-meta-num">{fakeAttendees}</span>
            <span className="m-teacher-meta-label">in class</span>
          </div>
          <div className="m-teacher-meta-divider" />
          <div className="m-teacher-meta-stat">
            <span className="m-teacher-meta-num" style={{whiteSpace:'nowrap'}}>{idx+1}<span style={{color:'var(--m-ink-3)', fontSize:11, marginLeft:2}}>/ {flat.length}</span></span>
            <span className="m-teacher-meta-label">slide</span>
          </div>
          <div className="m-teacher-timer">
            <span className="m-live-dot" style={{background:'var(--m-accent)'}}></span>
            {elapsed}
          </div>
        </div>

        <div className="m-teacher-tabs">
          <button className={`m-teacher-tab${tab==='notes'?' active':''}`} onClick={()=>setTab('notes')}>Notes</button>
          <button className={`m-teacher-tab${tab==='preview'?' active':''}`} onClick={()=>setTab('preview')}>Slide</button>
        </div>

        {tab === 'notes' ? (
          <>
            <div className="m-teacher-notes">
              <div className="m-teacher-notes-label">
                <span>Presenter notes</span>
                <span style={{marginLeft:'auto', fontWeight:400, color:'#a89860', fontSize:10, letterSpacing:'0.04em', textTransform:'none'}}>only you see this</span>
              </div>
              {slide.notes || <em>No notes for this slide.</em>}
            </div>
            <div className="m-up-next">
              <div className="m-up-next-glyph">
                {next?.type === 'question' ? '?' : next?.type === 'notes' ? '✎' : '¶'}
              </div>
              <div className="m-up-next-text">
                <div className="m-up-next-label">Up next</div>
                <div className="m-up-next-title">
                  {next ? (next.type === 'question' ? next.prompt : next.title) : 'End of deck'}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="m-slide-card" style={{flex:'none'}}>
            {(!slide.type || slide.type === 'content') && (
              <>
                {slide.subtitle && <div className="m-slide-eyebrow">{slide.subtitle}</div>}
                <h1 className="m-slide-title" style={{fontSize:22}}>{slide.title}</h1>
                {slide.image && (
                  <div className="m-slide-image" style={{aspectRatio:'16 / 9'}}>
                    <span className="m-slide-image-label">{slide.image}</span>
                  </div>
                )}
                {slide.body && <div className="m-slide-body" style={{fontSize:14}}>{slide.body}</div>}
              </>
            )}
            {slide.type === 'question' && (
              <>
                <div className="m-q-eyebrow">
                  <span>{slide.subtitle}</span>
                  <span className="m-q-points">{slide.points} pts</span>
                </div>
                <h2 className="m-q-prompt" style={{fontSize:18}}>{slide.prompt}</h2>
                <div className="m-choices">
                  {slide.choices.map((ch, i) => (
                    <div key={ch.id} className={`m-choice${ch.correct?' correct':''}`}>
                      <span className="m-letter">{String.fromCharCode(65+i)}</span>
                      <span style={{flex:1, fontSize:13}}>{ch.text}</span>
                      {ch.correct && <span className="m-mark">Correct</span>}
                    </div>
                  ))}
                </div>
              </>
            )}
            {slide.type === 'notes' && (
              <div className="m-notes-intro" style={{borderRadius:'18px 18px 0 0'}}>
                <div className="m-notes-eyebrow">{slide.subtitle}</div>
                <div className="m-notes-title">{slide.title}</div>
                {slide.prompt && <div className="m-notes-prompt">{slide.prompt}</div>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Slide nav dock */}
      <div className="m-dock">
        <div className="m-dock-row">
          <button className="m-dock-button" onClick={()=>setIdx(i=>Math.max(0,i-1))} disabled={idx===0}>‹</button>
          <span className="m-dock-counter">Live · {idx+1} / {flat.length}</span>
          <div className="m-dock-progress">
            <div className="m-dock-progress-fill" style={{width:`${((idx+1)/flat.length)*100}%`}}></div>
          </div>
          <button className="m-dock-button primary" onClick={()=>setIdx(i=>Math.min(flat.length-1,i+1))} disabled={idx===flat.length-1}>›</button>
        </div>
      </div>
    </div>
  );
};

// ── Stage with role + state tabs ─────────────────────────────
const App = () => {
  const [role, setRole] = useState('student'); // student | teacher
  const [studentState, setStudentState] = useState('content'); // content | question | notes

  const studentCaptions = {
    content: { label: 'Content slide', sub: 'Tap the bottom-right arrow or swipe left to advance. Tap ☰ to open the course outline as a bottom sheet.' },
    question: { label: 'Question slide', sub: 'A multiple-choice question revealed correct. Tap "Try again" to reset; pick a different option to see the wrong-answer state.' },
    notes: { label: 'Notes slide', sub: 'Teacher-provided starter text pre-fills the pad. Students keep, edit, or replace it. Tap to type — auto-saves per slide.' },
  };

  return (
    <>
      <div className="role-tabs" style={{margin:'0 auto'}}>
        <button className={`role-tab${role==='student'?' active':''}`} onClick={()=>setRole('student')}>
          <span className="role-glyph"></span>Student
        </button>
        <button className={`role-tab${role==='teacher'?' active':''}`} onClick={()=>setRole('teacher')}>
          <span className="role-glyph"></span>Teacher
        </button>
      </div>

      {role === 'student' && (
        <div className="state-tabs">
          {[
            { id:'content',  label:'Content',  glyph:'¶' },
            { id:'question', label:'Question', glyph:'?' },
            { id:'notes',    label:'Notes',    glyph:'✎' },
          ].map(t => (
            <button
              key={t.id}
              className={`state-tab${studentState===t.id?' active':''}`}
              onClick={()=>setStudentState(t.id)}
            >
              <span className="chip-glyph">{t.glyph}</span>
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="phone-stage">
        <div className="phone-col">
          {role === 'student' ? (
            <IOSDevice key={studentState}>
              <StudentPhone initialState={studentState} />
            </IOSDevice>
          ) : (
            <IOSDevice>
              <TeacherPhone />
            </IOSDevice>
          )}
          <div className="phone-caption">
            <div className="phone-caption-label">{role === 'student' ? 'Student · ' + studentCaptions[studentState].label : 'Teacher · Present mode'}</div>
            <div className="phone-caption-sub">
              {role === 'student'
                ? studentCaptions[studentState].sub
                : 'Live timer, attendee count, and presenter notes — toggle to "Slide" to preview what students see. Slide nav docks at the bottom.'}
            </div>
          </div>
        </div>
      </div>

      <div className="phone-footnote">
        Use <span className="kbd">←</span> <span className="kbd">→</span> below the phone, swipe on the slide, or tap the dock arrows.
        The course is <strong>{window.COURSE_DATA.title}</strong> with {window.COURSE_DATA.topics.reduce((n,t)=>n+t.slides.length,0)} slides across {window.COURSE_DATA.topics.length} topics.
      </div>
    </>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
