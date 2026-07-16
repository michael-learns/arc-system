// Teacher app — dashboard + present mode

const { useState, useEffect, useMemo, useCallback } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "showNotes": true,
  "compactSlide": false
}/*EDITMODE-END*/;

function relativeTime(ts) {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 30) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ------- DASHBOARD -------
const Dashboard = ({ onStart, onNewCourse, onEditCourse }) => {
  const [courses, setCourses] = useState(() => window.CourseStore.list());
  const c = window.COURSE_DATA;
  const totalSlidesPrimary = c.topics.reduce((n, t) => n + t.slides.length, 0);
  const [students, setStudents] = useState(() => window.LiveSync.getStudents());
  useEffect(() => {
    const a = window.LiveSync.subscribeStudents((list) => setStudents(list));
    const b = window.CourseStore.subscribe((list) => setCourses(list));
    return () => { a(); b(); };
  }, []);

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      return (b.viewed?.length || 0) - (a.viewed?.length || 0);
    });
  }, [students]);

  const avgPct = students.length
    ? Math.round(students.reduce((sum, s) => sum + ((s.viewed?.length || 0) / totalSlidesPrimary), 0) / students.length * 100)
    : 0;
  const onlineCount = students.filter(s => s.online).length;
  return (
    <div className="dash">
      <header className="topbar">
        <div className="hstack" style={{gap:10}}>
          <div className="brand-mark">N</div>
          <span className="brand-name">New Adam</span>
          <span style={{color:'var(--line-strong)'}}>/</span>
          <span style={{color:'var(--ink-3)', fontSize:14}}>Teacher</span>
        </div>
        <div className="hstack">
          <span className="muted" style={{fontSize:13}}>{c.instructor}</span>
          <div className="avatar">AW</div>
        </div>
      </header>

      <main className="dash-main">
        <div className="dash-head">
          <div>
            <div className="muted" style={{fontSize:13, fontWeight:500, letterSpacing:'0.04em', textTransform:'uppercase'}}>{c.term}</div>
            <h1 className="dash-title">My courses</h1>
          </div>
          <div className="hstack">
            <button className="btn">Import deck</button>
            <button className="btn btn-primary" onClick={onNewCourse}>+ New course</button>
          </div>
        </div>

        <div className="course-list">
          {courses.map((course, ci) => {
            const total = course.topics.reduce((n, t) => n + t.slides.length, 0);
            const totalQ = course.topics.reduce((n, t) => n + t.slides.filter(s => s.type === 'question').length, 0);
            const isPrimary = course.id === window.COURSE_DATA.id;
            const codeLabel = (course.title || '').split(/\s+/).slice(0,2).join('').slice(0,4).toUpperCase() || `C${ci+1}`;
            return (
              <div key={course.id} className="card course-card card-hover">
                <div className="course-card-cover" style={isPrimary ? {} : { background: `linear-gradient(135deg, oklch(0.94 0.03 ${(ci*60)%360}), oklch(0.88 0.04 ${(ci*60+30)%360}))` }}>
                  <div className="cover-stripe"></div>
                  <div className="cover-label mono">{codeLabel}</div>
                </div>
                <div className="course-card-body">
                  <div className="hstack" style={{justifyContent:'space-between', alignItems:'flex-start'}}>
                    <div style={{minWidth:0}}>
                      <h3 className="course-card-title">{course.title || <span className="muted" style={{fontStyle:'italic'}}>Untitled course</span>}</h3>
                      <div className="muted" style={{fontSize:13, marginTop:4}}>{course.subtitle || course.description || '—'}</div>
                    </div>
                    {isPrimary && <span className="badge">Active</span>}
                  </div>
                  <div className="course-meta">
                    <span>{course.topics.length} topics</span>
                    <span className="dot-sep"></span>
                    <span>{total} slides</span>
                    <span className="dot-sep"></span>
                    <span>{totalQ} {totalQ === 1 ? 'question' : 'questions'}</span>
                  </div>
                  {course.topics.length > 0 && (
                    <div className="topics-row">
                      {course.topics.map((t, i) => (
                        <div key={t.id} className="topic-chip">
                          <span className="mono" style={{color:'var(--ink-4)', fontSize:11}}>{String(i+1).padStart(2,'0')}</span>
                          <span>{t.title || 'Untitled'}</span>
                          <span className="muted" style={{fontSize:12}}>· {t.slides.length} slides</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="course-card-actions">
                    <button className="btn" onClick={() => onEditCourse(course.id)}>Edit course</button>
                    {isPrimary ? (
                      <button className="btn btn-accent" onClick={onStart}>
                        <span style={{fontSize:10, marginRight:2}}>●</span> Start live session
                      </button>
                    ) : (
                      <button className="btn" disabled title="Live present mode is wired to the active course in this prototype">Start live session</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <button className="card course-add card-hover" onClick={onNewCourse}>
            <div className="course-add-glyph">+</div>
            <div>
              <div style={{fontFamily:'var(--font-serif)', fontSize:18, fontWeight:500}}>New course</div>
              <div className="muted" style={{fontSize:13, marginTop:2}}>Add topics, slides, and a questionnaire</div>
            </div>
          </button>
        </div>

        <section className="roster-section">
          <div className="roster-head">
            <div>
              <h2 className="roster-title">My students</h2>
              <div className="muted" style={{fontSize:13, marginTop:4}}>
                Course progress for {c.title}
              </div>
            </div>
            <div className="roster-stats">
              <div className="roster-stat">
                <div className="roster-stat-num">{students.length}</div>
                <div className="roster-stat-label">enrolled</div>
              </div>
              <div className="roster-stat">
                <div className="roster-stat-num"><span className="dot on" style={{marginRight:6, verticalAlign:'middle'}}></span>{onlineCount}</div>
                <div className="roster-stat-label">online now</div>
              </div>
              <div className="roster-stat">
                <div className="roster-stat-num">{avgPct}<span style={{fontSize:'0.55em', color:'var(--ink-3)', marginLeft:2}}>%</span></div>
                <div className="roster-stat-label">avg progress</div>
              </div>
            </div>
          </div>

          <div className="card roster-card">
            <div className="roster-table-head">
              <div>Student</div>
              <div>Last seen</div>
              <div>Slides viewed</div>
              <div className="roster-th-progress">Progress</div>
            </div>
            {sortedStudents.map(s => {
              const seen = s.viewed?.length || 0;
              const pct = Math.round((seen / totalSlidesPrimary) * 100);
              const last = relativeTime(s.lastSeenAt);
              const initials = (s.name || '??').split(' ').map(p => p[0]).slice(0,2).join('').toUpperCase();
              return (
                <div key={s.id} className="roster-row">
                  <div className="hstack" style={{gap:10, minWidth:0}}>
                    <div className="roster-avatar">{initials}</div>
                    <div className="vstack" style={{gap:1, minWidth:0}}>
                      <div className="hstack" style={{gap:6}}>
                        <span style={{fontWeight:500, fontSize:14}}>{s.name}</span>
                        {s.online && <span className="online-tag">● online</span>}
                      </div>
                      <span className="mono" style={{fontSize:11, color:'var(--ink-4)'}}>{s.id}</span>
                    </div>
                  </div>
                  <div className="muted" style={{fontSize:13}}>{last}</div>
                  <div style={{fontSize:13, color:'var(--ink-2)'}}>
                    <span className="mono" style={{fontVariantNumeric:'tabular-nums'}}>{seen}</span>
                    <span className="muted"> / {totalSlidesPrimary}</span>
                  </div>
                  <div className="roster-progress">
                    <div className="roster-progress-track">
                      <div className="roster-progress-fill" style={{width: `${pct}%`}}></div>
                    </div>
                    <span className="mono" style={{fontSize:12, color:'var(--ink-2)', fontVariantNumeric:'tabular-nums', minWidth:36, textAlign:'right'}}>{pct}%</span>
                  </div>
                </div>
              );
            })}
            {sortedStudents.length === 0 && (
              <div className="roster-empty muted">No students yet — share the class code to get them joining.</div>
            )}
          </div>
        </section>

        <div className="dash-foot muted">
          Recent sessions · <span style={{textDecoration:'underline'}}>Lecture 3 — Revelation & Authority</span> · 32 attendees · 2 days ago
        </div>
      </main>
    </div>
  );
};

// ------- PRESENT MODE -------
const Present = ({ onExit, tweaks, setTweaks }) => {
  const c = window.COURSE_DATA;
  // Flatten slides for simpler nav
  const flat = useMemo(() => {
    const out = [];
    c.topics.forEach((t, ti) => t.slides.forEach((s, si) => out.push({ ...s, topicTitle: t.title, topicIndex: ti, slideIndexInTopic: si })));
    return out;
  }, []);

  const [idx, setIdx] = useState(() => window.LiveSync.getState().slideIndex || 0);
  const [live, setLive] = useState(() => window.LiveSync.getState().live);
  const [attendees, setAttendees] = useState(() => window.LiveSync.getState().attendees || 0);
  const [elapsed, setElapsed] = useState("00:00");
  const [startedAt, setStartedAt] = useState(() => window.LiveSync.getState().startedAt);

  // Write state on changes
  useEffect(() => {
    window.LiveSync.setState({ slideIndex: idx });
  }, [idx]);

  // Listen for attendee updates from student tabs
  useEffect(() => {
    return window.LiveSync.subscribe((state) => {
      setAttendees(state.attendees || 0);
    });
  }, []);

  // Timer
  useEffect(() => {
    if (!live || !startedAt) { setElapsed("00:00"); return; }
    const tick = () => {
      const s = Math.floor((Date.now() - startedAt) / 1000);
      const mm = String(Math.floor(s / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      setElapsed(`${mm}:${ss}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [live, startedAt]);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault(); setIdx(i => Math.min(flat.length - 1, i + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault(); setIdx(i => Math.max(0, i - 1));
      } else if (e.key === 'Escape') {
        // do nothing — explicit End button
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flat.length]);

  const startLive = () => {
    const now = Date.now();
    setLive(true); setStartedAt(now);
    window.LiveSync.setState({ live: true, startedAt: now, slideIndex: idx });
  };
  const endLive = () => {
    setLive(false); setStartedAt(null);
    window.LiveSync.setState({ live: false, startedAt: null });
  };

  const slide = flat[idx];
  const next = flat[idx + 1];
  const prev = flat[idx - 1];

  return (
    <div className="present">
      <header className="topbar present-topbar">
        <div className="hstack" style={{gap:14, minWidth:0, flex:1}}>
          <button className="btn btn-ghost" onClick={onExit}>← Exit</button>
          <span style={{color:'var(--line-strong)'}}>|</span>
          <div className="vstack topbar-title" style={{gap:2}}>
            <div style={{fontSize:13, fontWeight:500}}>{c.title}</div>
            <div className="muted" style={{fontSize:12}}>Topic: {slide.topicTitle}</div>
          </div>
        </div>
        <div className="hstack" style={{gap:14, flexShrink:0}}>
          {live ? (
            <>
              <span className="live-pill">Live</span>
              <span className="mono" style={{fontSize:13, color:'var(--ink-2)'}}>{elapsed}</span>
              <span style={{color:'var(--line-strong)'}}>|</span>
              <span className="hstack" style={{gap:6, fontSize:13, color:'var(--ink-2)'}}>
                <span className="dot on"></span>{attendees} {attendees === 1 ? 'attendee' : 'attendees'}
              </span>
              <button className="btn" onClick={endLive}>End session</button>
            </>
          ) : (
            <>
              <span className="muted" style={{fontSize:13}}>Not broadcasting</span>
              <button className="btn btn-accent" onClick={startLive}>
                <span style={{fontSize:10}}>●</span> Go live
              </button>
            </>
          )}
        </div>
      </header>

      <main className="present-main">
        <div className="stage">
          <Slide
            slide={slide}
            compact={tweaks.compactSlide}
            courseTitle={c.title}
            slideNumber={idx + 1}
            totalSlides={flat.length}
          />
          <div className="stage-controls">
            <button className="btn btn-sm" onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}>
              ← Previous
            </button>
            <div className="hstack" style={{gap:4}}>
              {flat.map((_, i) => (
                <button
                  key={i}
                  className={`pip${i === idx ? ' active' : ''}`}
                  onClick={() => setIdx(i)}
                  aria-label={`Slide ${i+1}`}
                />
              ))}
            </div>
            <button className="btn btn-sm" onClick={() => setIdx(i => Math.min(flat.length - 1, i + 1))} disabled={idx === flat.length - 1}>
              Next →
            </button>
          </div>
        </div>

        {tweaks.showNotes && (
          <section className="notes-rail">
            <div className="notes-head">
              <div className="hstack" style={{gap:8}}>
                <span className="notes-tag mono">NOTES</span>
                <span className="muted" style={{fontSize:12}}>Visible only to you</span>
              </div>
              <div className="hstack" style={{gap:6, fontSize:12, color:'var(--ink-3)'}}>
                <span className="kbd">←</span><span className="kbd">→</span> to navigate
              </div>
            </div>
            <div className="notes-body">{slide.notes}</div>
            <div className="notes-foot">
              <div className="next-up">
                <div className="muted" style={{fontSize:11, fontWeight:500, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:4}}>Up next</div>
                {next ? (
                  <div>
                    <div style={{fontWeight:500, fontSize:14}}>{next.title}</div>
                    <div className="muted" style={{fontSize:12, marginTop:2}}>{next.subtitle}</div>
                  </div>
                ) : <div className="muted" style={{fontSize:13}}>End of deck</div>}
              </div>
              <div className="prev-thumb">
                <div className="muted" style={{fontSize:11, fontWeight:500, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:4}}>Previous</div>
                {prev ? (
                  <div className="muted" style={{fontSize:13}}>{prev.title}</div>
                ) : <div className="muted" style={{fontSize:13}}>—</div>}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

// ------- ROOT -------
const App = () => {
  const [tweaks, setTweaks] = useTweaks(TWEAK_DEFAULTS);
  const [view, setView] = useState('dashboard');
  const [editorCourseId, setEditorCourseId] = useState(null);

  return (
    <>
      {view === 'dashboard' && (
        <Dashboard
          onStart={() => setView('present')}
          onNewCourse={() => { setEditorCourseId(null); setView('editor'); }}
          onEditCourse={(id) => { setEditorCourseId(id); setView('editor'); }}
        />
      )}
      {view === 'present' && (
        <Present onExit={() => setView('dashboard')} tweaks={tweaks} setTweaks={setTweaks} />
      )}
      {view === 'editor' && (
        <CourseEditor courseId={editorCourseId} onClose={() => setView('dashboard')} />
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Presenter view">
          <TweakToggle label="Show presenter notes" value={tweaks.showNotes} onChange={v => setTweaks('showNotes', v)} />
          <TweakToggle label="Compact slide layout" value={tweaks.compactSlide} onChange={v => setTweaks('compactSlide', v)} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
