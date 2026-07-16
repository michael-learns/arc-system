// Course Editor — course meta + topics + unified slide flow
// Slides are polymorphic: content | question | notes

const SLIDE_TYPES = [
  { id: 'content',  label: 'Content',  glyph: '¶', hint: 'Text + image' },
  { id: 'question', label: 'Question', glyph: '?', hint: 'Multiple choice' },
  { id: 'notes',    label: 'Notes',    glyph: '✎', hint: 'Student writes' },
];

const Editor = ({ courseId, onClose }) => {
  const [course, setCourse] = React.useState(() => {
    if (courseId) {
      const c = JSON.parse(JSON.stringify(window.CourseStore.get(courseId)));
      // backfill type on legacy slides
      c.topics.forEach(t => t.slides.forEach(s => { if (!s.type) s.type = 'content'; }));
      return c;
    }
    return window.CourseStore.newCourseTemplate();
  });
  const [activeTopicId, setActiveTopicId] = React.useState(() => course.topics[0]?.id || null);
  const [selectedSlideId, setSelectedSlideId] = React.useState(() => course.topics[0]?.slides?.[0]?.id || null);
  const [dirty, setDirty] = React.useState(false);

  const update = (patch) => {
    setCourse(prev => ({ ...prev, ...patch }));
    setDirty(true);
  };
  const updateTopic = (topicId, patch) => {
    setCourse(prev => ({
      ...prev,
      topics: prev.topics.map(t => t.id === topicId ? { ...t, ...patch } : t),
    }));
    setDirty(true);
  };
  const updateSlide = (topicId, slideId, patch) => {
    setCourse(prev => ({
      ...prev,
      topics: prev.topics.map(t =>
        t.id === topicId
          ? { ...t, slides: t.slides.map(s => s.id === slideId ? { ...s, ...patch } : s) }
          : t
      ),
    }));
    setDirty(true);
  };

  const addTopic = () => {
    const t = window.CourseStore.newTopic();
    t.title = `Topic ${course.topics.length + 1}`;
    setCourse(prev => ({ ...prev, topics: [...prev.topics, t] }));
    setActiveTopicId(t.id);
    setDirty(true);
  };
  const removeTopic = (topicId) => {
    setCourse(prev => ({ ...prev, topics: prev.topics.filter(t => t.id !== topicId) }));
    if (activeTopicId === topicId) setActiveTopicId(course.topics.find(t => t.id !== topicId)?.id || null);
    setDirty(true);
  };

  const addSlide = (topicId, type = 'content') => {
    let s;
    if (type === 'question') s = window.CourseStore.newQuestionSlide();
    else if (type === 'notes') s = window.CourseStore.newNotesSlide();
    else s = window.CourseStore.newSlide();
    setCourse(prev => ({
      ...prev,
      topics: prev.topics.map(t => t.id === topicId ? { ...t, slides: [...t.slides, s] } : t),
    }));
    setSelectedSlideId(s.id);
    setDirty(true);
  };
  const removeSlide = (topicId, slideId) => {
    setCourse(prev => ({
      ...prev,
      topics: prev.topics.map(t => t.id === topicId ? { ...t, slides: t.slides.filter(s => s.id !== slideId) } : t),
    }));
    setDirty(true);
  };

  // Choice helpers for question slides
  const addChoice = (topicId, slideId) => {
    const newChoice = { id: 'a-'+Math.random().toString(36).slice(2,6), text: "", correct: false };
    setCourse(prev => ({
      ...prev,
      topics: prev.topics.map(t => t.id === topicId
        ? { ...t, slides: t.slides.map(s => s.id === slideId
            ? { ...s, choices: [...(s.choices || []), newChoice] }
            : s) }
        : t),
    }));
    setDirty(true);
  };
  const updateChoice = (topicId, slideId, choiceId, patch) => {
    setCourse(prev => ({
      ...prev,
      topics: prev.topics.map(t => t.id === topicId
        ? { ...t, slides: t.slides.map(s => s.id === slideId
            ? { ...s, choices: s.choices.map(c => c.id === choiceId ? { ...c, ...patch } : c) }
            : s) }
        : t),
    }));
    setDirty(true);
  };
  const removeChoice = (topicId, slideId, choiceId) => {
    setCourse(prev => ({
      ...prev,
      topics: prev.topics.map(t => t.id === topicId
        ? { ...t, slides: t.slides.map(s => s.id === slideId
            ? { ...s, choices: s.choices.filter(c => c.id !== choiceId) }
            : s) }
        : t),
    }));
    setDirty(true);
  };

  const save = () => { window.CourseStore.upsert(course); setDirty(false); };
  const saveAndClose = () => { window.CourseStore.upsert(course); onClose(); };

  const activeTopic = course.topics.find(t => t.id === activeTopicId) || null;
  const totalSlides = course.topics.reduce((n, t) => n + t.slides.length, 0);
  const totalQuestions = course.topics.reduce(
    (n, t) => n + t.slides.filter(s => s.type === 'question').length, 0);
  const totalNotes = course.topics.reduce(
    (n, t) => n + t.slides.filter(s => s.type === 'notes').length, 0);

  return (
    <div className="editor">
      <header className="topbar editor-topbar">
        <div className="hstack" style={{gap:14, minWidth:0, flex:1}}>
          <button className="btn btn-ghost" onClick={() => { if (!dirty || confirm('Discard unsaved changes?')) onClose(); }}>← Back</button>
          <span style={{color:'var(--line-strong)'}}>|</span>
          <div className="topbar-title vstack" style={{gap:2, minWidth:0}}>
            <div style={{fontSize:13, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
              {courseId ? 'Edit course' : 'New course'}
              {dirty && <span className="muted" style={{fontWeight:400, marginLeft:8}}>· unsaved changes</span>}
            </div>
            <div className="muted" style={{fontSize:12}}>
              {course.topics.length} topics · {totalSlides} slides · {totalQuestions} questions · {totalNotes} notes
            </div>
          </div>
        </div>
        <div className="hstack" style={{gap:8, flexShrink:0}}>
          <button className="btn" onClick={save} disabled={!dirty}>Save draft</button>
          <button className="btn btn-primary" onClick={saveAndClose}>Save & close</button>
        </div>
      </header>

      <div className="editor-body">
        {/* LEFT — course meta + topic list */}
        <aside className="editor-rail">
          <div className="editor-rail-section">
            <div className="rail-section-head">
              <span className="rail-section-label">Course</span>
            </div>
            <input className="input rail-input-title" placeholder="Course title" value={course.title} onChange={e => update({ title: e.target.value })} />
            <input className="input rail-input-sub" placeholder="Subtitle" value={course.subtitle} onChange={e => update({ subtitle: e.target.value })} />
            <textarea className="input rail-textarea" placeholder="Description — what this course is about, who it's for..." rows={3} value={course.description} onChange={e => update({ description: e.target.value })} />
          </div>

          <div className="editor-rail-section" style={{flex:1, minHeight:0, display:'flex', flexDirection:'column'}}>
            <div className="rail-section-head">
              <span className="rail-section-label">Topics</span>
              <button className="btn btn-sm" onClick={addTopic}>+ Add</button>
            </div>
            <div className="rail-topic-list">
              {course.topics.map((t, i) => {
                const isActive = t.id === activeTopicId;
                const qCount = t.slides.filter(s => s.type === 'question').length;
                const nCount = t.slides.filter(s => s.type === 'notes').length;
                return (
                  <div
                    key={t.id}
                    className={`rail-topic${isActive ? ' active' : ''}`}
                    onClick={() => { setActiveTopicId(t.id); setSelectedSlideId(t.slides[0]?.id || null); }}
                  >
                    <div className="hstack" style={{justifyContent:'space-between', minWidth:0}}>
                      <div className="hstack" style={{gap:8, minWidth:0}}>
                        <span className="mono" style={{fontSize:11, color:'var(--ink-4)'}}>{String(i+1).padStart(2,'0')}</span>
                        <span style={{fontSize:13.5, fontWeight: isActive ? 500 : 400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                          {t.title || <span className="muted" style={{fontStyle:'italic'}}>Untitled topic</span>}
                        </span>
                      </div>
                      <button
                        className="rail-remove"
                        onClick={(e) => { e.stopPropagation(); if (confirm(`Remove "${t.title}"?`)) removeTopic(t.id); }}
                        title="Remove topic"
                      >×</button>
                    </div>
                    <div className="rail-topic-meta">
                      <span>{t.slides.length} slides</span>
                      {qCount > 0 && <><span className="dot-sep"></span><span>{qCount} Q</span></>}
                      {nCount > 0 && <><span className="dot-sep"></span><span>{nCount} notes</span></>}
                    </div>
                  </div>
                );
              })}
              {course.topics.length === 0 && (
                <div className="rail-empty muted">
                  No topics yet.<br/>Click <strong>+ Add</strong> to start.
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* RIGHT — content for selected topic */}
        <main className="editor-canvas">
          {!activeTopic ? (
            <div className="editor-empty">
              <div className="editor-empty-glyph">⌘</div>
              <h2 className="editor-empty-title">Start by adding a topic</h2>
              <p className="muted" style={{maxWidth:'40ch'}}>Topics group your slides together. You can add as many as you need.</p>
              <button className="btn btn-primary" onClick={addTopic}>+ Add first topic</button>
            </div>
          ) : (
            <>
              <div className="canvas-head" style={{paddingBottom:20, borderBottom:'1px solid var(--line)'}}>
                <input
                  className="canvas-topic-input"
                  placeholder="Topic title"
                  value={activeTopic.title}
                  onChange={e => updateTopic(activeTopic.id, { title: e.target.value })}
                />
              </div>

              <SlidesEditor
                topic={activeTopic}
                selectedSlideId={selectedSlideId}
                onSelect={setSelectedSlideId}
                onAdd={(type) => addSlide(activeTopic.id, type)}
                onRemove={(sid) => removeSlide(activeTopic.id, sid)}
                onUpdate={(sid, patch) => updateSlide(activeTopic.id, sid, patch)}
                onAddChoice={(sid) => addChoice(activeTopic.id, sid)}
                onUpdateChoice={(sid, cid, patch) => updateChoice(activeTopic.id, sid, cid, patch)}
                onRemoveChoice={(sid, cid) => removeChoice(activeTopic.id, sid, cid)}
                course={course}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
};

// ── Unified slides editor (all slide types in one flow) ────────────
const SlidesEditor = ({ topic, selectedSlideId, onSelect, onAdd, onRemove, onUpdate, onAddChoice, onUpdateChoice, onRemoveChoice, course }) => {
  const slide = topic.slides.find(s => s.id === selectedSlideId) || topic.slides[0];
  const [addMenuOpen, setAddMenuOpen] = React.useState(false);
  const addRef = React.useRef(null);

  React.useEffect(() => {
    if (!addMenuOpen) return;
    const close = (e) => {
      if (addRef.current && !addRef.current.contains(e.target)) setAddMenuOpen(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [addMenuOpen]);

  return (
    <div className="slides-editor">
      <div className="slides-thumb-rail">
        {topic.slides.map((s, i) => {
          const isActive = slide && s.id === slide.id;
          const type = s.type || 'content';
          const typeMeta = SLIDE_TYPES.find(t => t.id === type);
          return (
            <div
              key={s.id}
              className={`thumb thumb-${type}${isActive ? ' active' : ''}`}
              onClick={() => onSelect(s.id)}
            >
              <div className="thumb-head">
                <span className="thumb-num mono">{String(i+1).padStart(2,'0')}</span>
                <span className={`slide-type-chip ${type}`}>
                  <span aria-hidden="true">{typeMeta?.glyph}</span>
                  {typeMeta?.label}
                </span>
              </div>
              <div className="thumb-preview">
                <div className="thumb-preview-title">
                  {thumbTitle(s) || <span className="muted" style={{fontStyle:'italic'}}>Untitled</span>}
                </div>
                {thumbSub(s) && <div className="thumb-preview-sub">{thumbSub(s)}</div>}
              </div>
              <button
                className="thumb-remove"
                onClick={(e) => { e.stopPropagation(); if (confirm('Remove this slide?')) onRemove(s.id); }}
              >×</button>
            </div>
          );
        })}
        <div ref={addRef} style={{position:'relative'}}>
          <button className="thumb-add" onClick={() => setAddMenuOpen(v => !v)}>
            + Add slide
          </button>
          {addMenuOpen && (
            <div className="add-menu">
              {SLIDE_TYPES.map(t => (
                <button
                  key={t.id}
                  className="add-menu-item"
                  onClick={() => { onAdd(t.id); setAddMenuOpen(false); }}
                >
                  <span className="add-menu-glyph">{t.glyph}</span>
                  <div className="vstack" style={{gap:1, alignItems:'flex-start'}}>
                    <span style={{fontSize:13, fontWeight:500}}>{t.label}</span>
                    <span className="muted" style={{fontSize:11.5}}>{t.hint}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {slide ? (
        <div className="slide-edit-area">
          <div className="slide-preview-wrap">
            <Slide
              slide={slide}
              compact={false}
              courseTitle={course.title || "Untitled course"}
              slideNumber={topic.slides.findIndex(s => s.id === slide.id) + 1}
              totalSlides={topic.slides.length}
              readOnlyInteractions={true}
            />
          </div>

          {/* Type-specific fields */}
          {(!slide.type || slide.type === 'content') && (
            <ContentFields slide={slide} onUpdate={onUpdate} />
          )}
          {slide.type === 'question' && (
            <QuestionFields
              slide={slide}
              onUpdate={onUpdate}
              onAddChoice={() => onAddChoice(slide.id)}
              onUpdateChoice={(cid, patch) => onUpdateChoice(slide.id, cid, patch)}
              onRemoveChoice={(cid) => onRemoveChoice(slide.id, cid)}
            />
          )}
          {slide.type === 'notes' && (
            <NotesFields slide={slide} onUpdate={onUpdate} />
          )}
        </div>
      ) : (
        <div className="editor-empty" style={{padding:60}}>
          <h3 style={{margin:0, fontFamily:'var(--font-serif)', fontWeight:500}}>No slides in this topic</h3>
          <p className="muted" style={{maxWidth:'40ch', margin:'4px 0 12px'}}>
            Choose what kind of slide to start with.
          </p>
          <div className="hstack" style={{gap:10}}>
            {SLIDE_TYPES.map(t => (
              <button key={t.id} className="btn" onClick={() => onAdd(t.id)}>
                <span style={{marginRight:6}}>{t.glyph}</span>{t.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Field blocks per slide type ───────────────────────────────

const ContentFields = ({ slide, onUpdate }) => (
  <div className="slide-fields">
    <div className="field-grid">
      <label className="field">
        <span className="field-label">Title</span>
        <input className="input" value={slide.title} onChange={e => onUpdate(slide.id, { title: e.target.value })} placeholder="What this slide is about" />
      </label>
      <label className="field">
        <span className="field-label">Eyebrow / subtitle</span>
        <input className="input" value={slide.subtitle} onChange={e => onUpdate(slide.id, { subtitle: e.target.value })} placeholder="Section or context label" />
      </label>
    </div>
    <label className="field">
      <span className="field-label">Body</span>
      <textarea className="input" rows={4} value={slide.body} onChange={e => onUpdate(slide.id, { body: e.target.value })} placeholder="The main text shown on the slide..." />
    </label>
    <label className="field">
      <span className="field-label">Image description <span className="muted" style={{fontWeight:400}}>(placeholder label)</span></span>
      <input className="input" value={slide.image} onChange={e => onUpdate(slide.id, { image: e.target.value })} placeholder="e.g. Diagram of divine simplicity" />
    </label>
    <label className="field">
      <span className="field-label">Presenter notes <span className="muted" style={{fontWeight:400}}>(only you see these)</span></span>
      <textarea className="input" rows={4} value={slide.notes || ''} onChange={e => onUpdate(slide.id, { notes: e.target.value })} placeholder="Talking points, timing cues, anticipated questions..." />
    </label>
  </div>
);

const QuestionFields = ({ slide, onUpdate, onAddChoice, onUpdateChoice, onRemoveChoice }) => (
  <div className="slide-fields">
    <div className="field-grid">
      <label className="field">
        <span className="field-label">Label <span className="muted" style={{fontWeight:400}}>(shown above prompt)</span></span>
        <input className="input" value={slide.subtitle || ''} onChange={e => onUpdate(slide.id, { subtitle: e.target.value })} placeholder="e.g. Quick check" />
      </label>
      <label className="field">
        <span className="field-label">Points</span>
        <input
          type="number"
          min="0"
          className="input mono"
          value={slide.points ?? 1}
          onChange={e => onUpdate(slide.id, { points: Math.max(0, parseInt(e.target.value) || 0) })}
        />
      </label>
    </div>
    <label className="field">
      <span className="field-label">Question prompt</span>
      <textarea className="input" rows={2} value={slide.prompt || ''} onChange={e => onUpdate(slide.id, { prompt: e.target.value })} placeholder="Ask your question..." />
    </label>
    <div className="field">
      <span className="field-label">Answer choices <span className="muted" style={{fontWeight:400}}>(click ○ to mark correct)</span></span>
      <div className="choice-list">
        {(slide.choices || []).map((c, ci) => (
          <div key={c.id} className={`choice-row${c.correct ? ' correct' : ''}`}>
            <button
              className={`choice-correct${c.correct ? ' on' : ''}`}
              onClick={() => onUpdateChoice(c.id, { correct: !c.correct })}
              title={c.correct ? 'Marked correct' : 'Mark as correct'}
            >
              {c.correct ? '✓' : ''}
            </button>
            <span className="choice-letter mono">{String.fromCharCode(65 + ci)}</span>
            <input
              className="choice-text"
              value={c.text}
              onChange={e => onUpdateChoice(c.id, { text: e.target.value })}
              placeholder={`Choice ${String.fromCharCode(65 + ci)}`}
            />
            {(slide.choices?.length || 0) > 2 && (
              <button className="choice-remove" onClick={() => onRemoveChoice(c.id)} title="Remove choice">×</button>
            )}
          </div>
        ))}
        <button className="add-choice" onClick={onAddChoice}>+ Add choice</button>
      </div>
    </div>
    <label className="field">
      <span className="field-label">Presenter notes <span className="muted" style={{fontWeight:400}}>(only you see these)</span></span>
      <textarea className="input" rows={3} value={slide.notes || ''} onChange={e => onUpdate(slide.id, { notes: e.target.value })} placeholder="Why this question, what to watch for..." />
    </label>
  </div>
);

const NotesFields = ({ slide, onUpdate }) => (
  <div className="slide-fields">
    <div className="field-grid">
      <label className="field">
        <span className="field-label">Title</span>
        <input className="input" value={slide.title || ''} onChange={e => onUpdate(slide.id, { title: e.target.value })} placeholder="What students reflect on" />
      </label>
      <label className="field">
        <span className="field-label">Label <span className="muted" style={{fontWeight:400}}>(eyebrow)</span></span>
        <input className="input" value={slide.subtitle || ''} onChange={e => onUpdate(slide.id, { subtitle: e.target.value })} placeholder="e.g. Reflection" />
      </label>
    </div>
    <label className="field">
      <span className="field-label">Prompt <span className="muted" style={{fontWeight:400}}>(italic, shown above notepad)</span></span>
      <textarea className="input" rows={2} value={slide.prompt || ''} onChange={e => onUpdate(slide.id, { prompt: e.target.value })} placeholder="A question or instruction for the student..." />
    </label>
    <label className="field">
      <span className="field-label">Starter text <span className="muted" style={{fontWeight:400}}>(pre-fills the student's notepad — they can edit or replace it)</span></span>
      <textarea className="input" rows={5} value={slide.starter || ''} onChange={e => onUpdate(slide.id, { starter: e.target.value })} placeholder={"e.g.\nKey points:\n•\n•\n\nMy reflection:"} style={{fontFamily:'var(--font-serif)', lineHeight:1.55}} />
    </label>
    <label className="field">
      <span className="field-label">Presenter notes <span className="muted" style={{fontWeight:400}}>(only you see these)</span></span>
      <textarea className="input" rows={3} value={slide.notes || ''} onChange={e => onUpdate(slide.id, { notes: e.target.value })} placeholder="How long to give students, what to do with the notes after..." />
    </label>
  </div>
);

// ── thumb helpers ─────────────────────────────────────────────
function thumbTitle(s) {
  if (s.type === 'question') return s.prompt;
  return s.title;
}
function thumbSub(s) {
  if (s.type === 'question') {
    const n = (s.choices || []).length;
    const correct = (s.choices || []).filter(c => c.correct).length;
    return `${n} choice${n === 1 ? '' : 's'} · ${correct} correct`;
  }
  if (s.type === 'notes') return s.prompt ? truncate(s.prompt, 40) : 'Free-response notes';
  return s.subtitle;
}
function truncate(str, n) { return str && str.length > n ? str.slice(0, n) + '…' : str; }

window.CourseEditor = Editor;
