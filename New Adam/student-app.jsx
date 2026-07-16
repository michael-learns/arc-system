// Student app — join screen + live viewer with layout variations

const { useState, useEffect, useMemo, useRef } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "layout": "focus",
  "compactSlide": false
}/*EDITMODE-END*/;

// ------- JOIN SCREEN -------
const Join = ({ onJoin }) => {
  const [code, setCode] = useState("THEO-101");
  const [name, setName] = useState("");

  return (
    <div className="join-wrap">
      <div className="join-card card">
        <div className="hstack" style={{justifyContent:'space-between', marginBottom: 28}}>
          <div className="hstack" style={{gap:10}}>
            <div className="brand-mark">N</div>
            <span className="brand-name">New Adam</span>
          </div>
          <span className="muted" style={{fontSize:13}}>Student</span>
        </div>

        <h1 className="join-title">Join your class</h1>
        <p className="join-sub">Enter the code your instructor shared. The lecture will appear here once they go live.</p>

        <div className="vstack" style={{gap:14, marginTop: 28}}>
          <label className="field">
            <span className="field-label">Class code</span>
            <input className="input mono" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="ABCD-123" />
          </label>
          <label className="field">
            <span className="field-label">Your name <span className="muted" style={{fontWeight:400}}>(optional)</span></span>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alex Rivera" />
          </label>
        </div>

        <button className="btn btn-primary btn-lg" style={{width:'100%', marginTop: 24, justifyContent:'center'}} onClick={() => onJoin({ code, name })}>
          Join class
        </button>

        <div className="join-hint">
          <span className="muted">Open <a href="teacher.html" style={{color:'var(--accent-ink)'}}>teacher.html</a> in another tab and click "Go live" to see slides arrive in real time.</span>
        </div>
      </div>
    </div>
  );
};

// ------- LIVE VIEWER -------
const LiveViewer = ({ name, code, onLeave, tweaks, setTweaks }) => {
  const c = window.COURSE_DATA;
  const flat = useMemo(() => {
    const out = [];
    c.topics.forEach((t, ti) => t.slides.forEach((s, si) => out.push({ ...s, topicTitle: t.title, topicIndex: ti, slideIndexInTopic: si })));
    return out;
  }, []);

  const [state, setState] = useState(() => window.LiveSync.getState());
  const [justChanged, setJustChanged] = useState(false);
  const lastIdx = useRef(state.slideIndex);

  // Stable per-tab student id, persisted across reloads
  const studentId = useMemo(() => {
    let id = localStorage.getItem('student-id');
    if (!id) { id = 's-' + Math.random().toString(36).slice(2, 9); localStorage.setItem('student-id', id); }
    return id;
  }, []);

  // Local student progress (slides this student has seen)
  const [myProgress, setMyProgress] = useState(() => {
    const me = window.LiveSync.getStudents().find(s => s.id === studentId);
    return me ? (me.viewed || []) : [];
  });

  // Register student on mount, mark online
  useEffect(() => {
    window.LiveSync.upsertStudent({
      id: studentId,
      name: name || 'Anonymous student',
      viewed: myProgress,
      lastSeenAt: Date.now(),
      online: true,
    });
    const cur = window.LiveSync.getState();
    window.LiveSync.setState({ attendees: (cur.attendees || 0) + 1 });
    return () => {
      window.LiveSync.setOnline(studentId, false);
      const cur2 = window.LiveSync.getState();
      window.LiveSync.setState({ attendees: Math.max(0, (cur2.attendees || 1) - 1) });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return window.LiveSync.subscribe((s) => {
      setState(s);
      if (s.slideIndex !== lastIdx.current) {
        lastIdx.current = s.slideIndex;
        setJustChanged(true);
        setTimeout(() => setJustChanged(false), 800);
      }
    });
  }, []);

  const idx = state.slideIndex || 0;
  const slide = state.live ? flat[idx] : null;
  const totalSlides = flat.length;

  // ── Per-slide interaction state (question answers + notes-slide text) ──
  const [answers, setAnswers] = useState(() => {
    try { return JSON.parse(localStorage.getItem('student-answers') || '{}'); }
    catch { return {}; }
  });
  const [freeNotes, setFreeNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('student-free-notes') || '{}'); }
    catch { return {}; }
  });
  const [noteSavedAt, setNoteSavedAt] = useState(null);

  const selectChoice = (choiceId) => {
    if (!slide) return;
    const next = { ...answers, [slide.id]: { choiceId, revealed: false, ts: Date.now() } };
    setAnswers(next);
    localStorage.setItem('student-answers', JSON.stringify(next));
  };
  const revealAnswer = () => {
    if (!slide || !answers[slide.id]) return;
    const next = { ...answers, [slide.id]: { ...answers[slide.id], revealed: true } };
    setAnswers(next);
    localStorage.setItem('student-answers', JSON.stringify(next));
  };
  const resetAnswer = () => {
    if (!slide) return;
    const next = { ...answers };
    delete next[slide.id];
    setAnswers(next);
    localStorage.setItem('student-answers', JSON.stringify(next));
  };
  const setNoteValue = (val) => {
    if (!slide) return;
    const next = { ...freeNotes, [slide.id]: val };
    setFreeNotes(next);
    localStorage.setItem('student-free-notes', JSON.stringify(next));
    setNoteSavedAt(Date.now());
  };

  // Seed the notes textarea with starter text if student hasn't touched it
  const currentNoteValue = slide && slide.type === 'notes'
    ? (freeNotes[slide.id] != null ? freeNotes[slide.id] : (slide.starter || ''))
    : null;
  const currentAnswer = slide && slide.type === 'question' ? answers[slide.id] : null;

  // Build Slide props depending on type
  const slideProps = slide ? {
    slide,
    compact: tweaks.compactSlide,
    courseTitle: c.title,
    slideNumber: idx + 1,
    totalSlides,
    ...(slide.type === 'question' && {
      selectedChoiceId: currentAnswer?.choiceId,
      revealed: !!currentAnswer?.revealed,
      onSelectChoice: selectChoice,
    }),
    ...(slide.type === 'notes' && {
      noteValue: currentNoteValue,
      onChangeNote: setNoteValue,
      noteSavedAt,
    }),
  } : { slide: null };

  // Record view whenever slide changes during a live session
  useEffect(() => {
    if (!state.live) return;
    window.LiveSync.recordView(studentId, idx);
    setMyProgress(prev => {
      if (prev.includes(idx)) return prev;
      return [...prev, idx].sort((a,b)=>a-b);
    });
  }, [state.live, idx, studentId]);

  const seenCount = myProgress.length;
  const progressPct = Math.round((seenCount / totalSlides) * 100);

  return (
    <div className={`viewer layout-${tweaks.layout}`}>
      <header className="topbar viewer-topbar">
        <div className="hstack" style={{gap:14, minWidth:0, flex:1}}>
          <div className="hstack" style={{gap:10, flexShrink:0}}>
            <div className="brand-mark">N</div>
            <span className="brand-name">New Adam</span>
          </div>
          <span style={{color:'var(--line-strong)', flexShrink:0}}>|</span>
          <div className="vstack topbar-title" style={{gap:2}}>
            <div style={{fontSize:13, fontWeight:500}}>{c.title}</div>
            <div className="muted" style={{fontSize:12}}>
              <span className="mono">{code}</span>
              {name && <span> · {name}</span>}
            </div>
          </div>
        </div>
        <div className="hstack" style={{gap:14, flexShrink:0}}>
          {state.live ? (
            <>
              <span className="live-pill">Live</span>
              <span className="muted" style={{fontSize:13}}>{c.instructor}</span>
            </>
          ) : (
            <span className="muted hstack" style={{gap:8, fontSize:13}}>
              <span className="dot"></span> Waiting for instructor
            </span>
          )}
          <button className="btn btn-ghost btn-sm" onClick={onLeave}>Leave</button>
        </div>
      </header>

      <div className="course-progress-strip">
        <div className="hstack" style={{gap:10, minWidth:0, flexShrink:0}}>
          <span className="muted" style={{fontSize:11.5, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase'}}>Course progress</span>
          <span className="muted" style={{fontSize:12}}>{seenCount} / {totalSlides} slides</span>
        </div>
        <div className="course-progress-track">
          <div className="course-progress-fill" style={{width: `${progressPct}%`}}></div>
          {flat.map((_, i) => (
            <div
              key={i}
              className={`progress-tick${myProgress.includes(i) ? ' seen' : ''}${state.live && i === idx ? ' current' : ''}`}
              style={{left: `${(i / Math.max(1, totalSlides - 1)) * 100}%`}}
              title={`Slide ${i+1}`}
            />
          ))}
        </div>
        <div className="mono" style={{fontSize:12, color:'var(--ink-2)', flexShrink:0, fontVariantNumeric:'tabular-nums'}}>{progressPct}%</div>
      </div>

      {/* === LAYOUT: FOCUS — full-bleed slide, minimal chrome === */}
      {tweaks.layout === 'focus' && (
        <main className="viewer-focus">
          <div className={`focus-stage${justChanged ? ' bump' : ''}`}>
            <Slide {...slideProps} />
          </div>
          {state.live && slide && slide.type === 'question' && (
            <QuestionControls answer={currentAnswer} onReveal={revealAnswer} onReset={resetAnswer} />
          )}
          {state.live && (!slide || slide.type !== 'question') && (
            <div className="focus-progress">
              <div className="muted" style={{fontSize:12}}>
                <span className="mono">{String(idx+1).padStart(2,'0')}</span>
                <span style={{margin:'0 8px', color:'var(--line-strong)'}}>/</span>
                <span className="mono">{String(totalSlides).padStart(2,'0')}</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{width: `${((idx+1)/totalSlides)*100}%`}}></div>
              </div>
              <div className="muted" style={{fontSize:12}}>{slide && slide.topicTitle}</div>
            </div>
          )}
        </main>
      )}

      {/* === LAYOUT: OUTLINE — slide + topic outline sidebar === */}
      {tweaks.layout === 'outline' && (
        <main className="viewer-outline">
          <aside className="outline-rail">
            <div className="outline-section-title">Topics</div>
            <div className="outline-list">
              {c.topics.map((t, ti) => {
                const tStart = flat.findIndex(f => f.topicIndex === ti);
                const isCurrentTopic = state.live && flat[idx].topicIndex === ti;
                return (
                  <div key={t.id} className={`outline-topic${isCurrentTopic ? ' current' : ''}`}>
                    <div className="outline-topic-head">
                      <span className="mono outline-num">{String(ti+1).padStart(2,'0')}</span>
                      <span>{t.title}</span>
                    </div>
                    <div className="outline-slides">
                      {t.slides.map((s, si) => {
                        const globalIdx = tStart + si;
                        const isCurrent = state.live && globalIdx === idx;
                        const isPast = state.live && globalIdx < idx;
                        return (
                          <div key={s.id} className={`outline-slide${isCurrent ? ' current' : ''}${isPast ? ' past' : ''}`}>
                            <span className="outline-bullet"></span>
                            <span>{s.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
          <div className={`outline-stage${justChanged ? ' bump' : ''}`}>
            <Slide {...slideProps} />
            {state.live && slide && slide.type === 'question' && (
              <QuestionControls answer={currentAnswer} onReveal={revealAnswer} onReset={resetAnswer} />
            )}
          </div>
        </main>
      )}

      {/* === LAYOUT: NOTEBOOK — slide + student's own notes pad === */}
      {tweaks.layout === 'notebook' && (
        <main className="viewer-notebook">
          <div className={`notebook-stage${justChanged ? ' bump' : ''}`}>
            <Slide {...slideProps} />
            {state.live && (
              <div className="notebook-meta">
                <span className="muted" style={{fontSize:12}}>Currently on</span>
                <span style={{fontWeight:500, fontSize:13}}>{slide && slide.topicTitle}</span>
                <span className="dot-sep"></span>
                <span className="mono" style={{fontSize:12, color:'var(--ink-3)'}}>Slide {idx+1} of {totalSlides}</span>
                {slide && slide.type === 'question' && (
                  <>
                    <span className="dot-sep"></span>
                    <QuestionControlsInline answer={currentAnswer} onReveal={revealAnswer} onReset={resetAnswer} />
                  </>
                )}
              </div>
            )}
          </div>
          <NotebookPad slideId={slide && slide.id} />
        </main>
      )}
    </div>
  );
};

// Controls for question slides — shown below stage
const QuestionControls = ({ answer, onReveal, onReset }) => {
  const selected = !!answer?.choiceId;
  const revealed = !!answer?.revealed;
  return (
    <div className="q-controls">
      <div className="muted" style={{fontSize:12.5}}>
        {!selected && "Select an answer above"}
        {selected && !revealed && "Ready to check your answer"}
        {revealed && "Answer revealed"}
      </div>
      <div className="hstack" style={{gap:8}}>
        {revealed ? (
          <button className="btn btn-sm" onClick={onReset}>Try again</button>
        ) : (
          <button className="btn btn-sm btn-primary" onClick={onReveal} disabled={!selected}>
            Check answer
          </button>
        )}
      </div>
    </div>
  );
};
const QuestionControlsInline = ({ answer, onReveal, onReset }) => {
  const selected = !!answer?.choiceId;
  const revealed = !!answer?.revealed;
  if (revealed) return <button className="btn btn-sm btn-ghost" onClick={onReset}>Try again</button>;
  return <button className="btn btn-sm btn-primary" onClick={onReveal} disabled={!selected}>Check answer</button>;
};

// Per-slide notes pad, persisted to localStorage
const NotebookPad = ({ slideId }) => {
  const key = `student-notes:${slideId || 'standby'}`;
  const [text, setText] = useState("");
  useEffect(() => {
    setText(localStorage.getItem(key) || "");
  }, [key]);
  const save = (v) => {
    setText(v);
    localStorage.setItem(key, v);
  };
  return (
    <aside className="notebook-pad">
      <div className="notebook-pad-head">
        <span className="notes-tag mono">MY NOTES</span>
        <span className="muted" style={{fontSize:11}}>Auto-saved</span>
      </div>
      <textarea
        className="notebook-textarea"
        value={text}
        onChange={(e) => save(e.target.value)}
        placeholder={slideId ? "Jot down anything from this slide..." : "Notes will appear once class begins."}
        disabled={!slideId}
      />
      <div className="notebook-pad-foot muted">
        Notes are scoped to each slide and stay on this device.
      </div>
    </aside>
  );
};

// ------- ROOT -------
const App = () => {
  const [tweaks, setTweaks] = useTweaks(TWEAK_DEFAULTS);
  const [joined, setJoined] = useState(null);

  return (
    <>
      {!joined
        ? <Join onJoin={(info) => setJoined(info)} />
        : <LiveViewer {...joined} onLeave={() => setJoined(null)} tweaks={tweaks} setTweaks={setTweaks} />}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Student layout">
          <TweakRadio
            label="Live viewer layout"
            value={tweaks.layout}
            onChange={v => setTweaks('layout', v)}
            options={[
              { value: 'focus', label: 'Focus' },
              { value: 'outline', label: 'Outline' },
              { value: 'notebook', label: 'Notebook' },
            ]}
          />
          <TweakToggle label="Compact slide layout" value={tweaks.compactSlide} onChange={v => setTweaks('compactSlide', v)} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
