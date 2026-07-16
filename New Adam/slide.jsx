// Shared Slide rendering component
// Supports three slide types: content | question | notes

const Slide = ({
  slide,
  compact,
  courseTitle,
  slideNumber,
  totalSlides,
  // interaction callbacks — only relevant on the student side
  selectedChoiceId,
  revealed,                 // for questions: show correct/incorrect feedback
  onSelectChoice,           // (choiceId) => void
  noteValue,                // for notes slides: current student note
  onChangeNote,             // (value) => void
  noteSavedAt,              // timestamp for "saved" indicator
  readOnlyInteractions,     // teacher preview mode: disable interactions
}) => {
  if (!slide) {
    return (
      <div className="slide">
        <div className="slide-inner" style={{gridTemplateColumns: '1fr', placeItems:'center', padding:'8%'}}>
          <div style={{textAlign:'center', color:'var(--ink-3)', fontFamily:'var(--font-sans)'}}>
            <div style={{fontSize:14, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8}}>Standby</div>
            <div style={{fontSize:24, color:'var(--ink-2)', fontFamily:'var(--font-serif)'}}>Class hasn't started yet</div>
          </div>
        </div>
      </div>
    );
  }

  const type = slide.type || 'content';

  return (
    <div className={`slide${compact ? ' compact' : ''} slide-type-${type}`}>
      {type === 'content' && <ContentBody slide={slide} />}
      {type === 'question' && (
        <QuestionBody
          slide={slide}
          selectedChoiceId={selectedChoiceId}
          revealed={revealed}
          onSelectChoice={onSelectChoice}
          readOnly={readOnlyInteractions}
        />
      )}
      {type === 'notes' && (
        <NotesBody
          slide={slide}
          value={noteValue}
          onChange={onChangeNote}
          savedAt={noteSavedAt}
          readOnly={readOnlyInteractions}
        />
      )}
      <div className="slide-footer">
        <span>{courseTitle}</span>
        <span>{slideNumber} / {totalSlides}</span>
      </div>
    </div>
  );
};

// ── Content body (classic text + image) ─────────────────────
const ContentBody = ({ slide }) => (
  <div className="slide-inner">
    <div className="slide-text">
      {slide.subtitle && <div className="slide-eyebrow">{slide.subtitle}</div>}
      <h1 className="slide-title">{slide.title || <span style={{color:'var(--ink-4)', fontStyle:'italic'}}>Untitled slide</span>}</h1>
      <div className="slide-body">{slide.body}</div>
    </div>
    <div className="slide-image">
      <div className="slide-image-label">{slide.image || 'Image'}</div>
    </div>
  </div>
);

// ── Question body ───────────────────────────────────────────
const QuestionBody = ({ slide, selectedChoiceId, revealed, onSelectChoice, readOnly }) => {
  const choices = slide.choices || [];
  const selected = choices.find(c => c.id === selectedChoiceId);
  const isCorrect = selected && selected.correct;

  return (
    <div className="slide-inner" style={{gridTemplateColumns:'1fr', padding:0}}>
      <div className="slide-question">
        <div className="q-eyebrow">
          <span>{slide.subtitle || 'Quick check'}</span>
          <span className="q-points">{slide.points || 1} {slide.points === 1 ? 'pt' : 'pts'}</span>
        </div>
        <h2 className={`q-prompt${!slide.prompt ? ' empty' : ''}`}>
          {slide.prompt || 'Write your question here…'}
        </h2>
        <div className="q-choices">
          {choices.map((c, i) => {
            const letter = String.fromCharCode(65 + i);
            let cls = 'q-choice';
            if (selectedChoiceId === c.id && !revealed) cls += ' selected';
            if (revealed) {
              if (c.correct) cls += ' correct';
              else if (c.id === selectedChoiceId) cls += ' incorrect';
            }
            return (
              <button
                key={c.id}
                className={cls}
                onClick={() => !readOnly && onSelectChoice && onSelectChoice(c.id)}
                disabled={readOnly || revealed}
              >
                <span className="q-letter">{letter}</span>
                <span>{c.text || <em style={{color:'var(--ink-4)'}}>Answer option {letter}</em>}</span>
                {revealed && c.correct && <span className="q-mark">Correct</span>}
                {revealed && c.id === selectedChoiceId && !c.correct && <span className="q-mark">Your pick</span>}
              </button>
            );
          })}
        </div>
        {revealed && selected && (
          <div className="q-feedback">
            {isCorrect
              ? <><strong>Correct.</strong> Well done.</>
              : <><strong>Not quite.</strong> The correct answer is highlighted above.</>}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Notes body ──────────────────────────────────────────────
const NotesBody = ({ slide, value, onChange, savedAt, readOnly }) => {
  const displayValue = value != null ? value : (slide.starter || '');
  const [justSaved, setJustSaved] = React.useState(false);
  React.useEffect(() => {
    if (!savedAt) return;
    setJustSaved(true);
    const t = setTimeout(() => setJustSaved(false), 1400);
    return () => clearTimeout(t);
  }, [savedAt]);

  return (
    <div className="slide-inner" style={{gridTemplateColumns:'1fr', padding:0}}>
      <div className="slide-notes-layout">
        <div className="slide-notes-intro">
          <div className="n-eyebrow">{slide.subtitle || 'Reflection'}</div>
          <h2 className="n-title">{slide.title || <span style={{color:'var(--ink-4)', fontStyle:'italic'}}>Untitled notes prompt</span>}</h2>
          {slide.prompt && <div className="n-prompt">{slide.prompt}</div>}
        </div>
        <div className="slide-notes-pad">
          <div className="slide-notes-pad-head">
            <span className="slide-notes-pad-label">Your notes</span>
            {!readOnly && (
              <span className="slide-notes-pad-save">
                {justSaved ? 'saved' : (value ? 'auto-saves' : '')}
              </span>
            )}
          </div>
          {readOnly ? (
            <div className="slide-notes-readonly">
              {slide.starter || <em style={{color:'var(--ink-4)'}}>Student will type their notes here. Any text you provide becomes their starting point.</em>}
            </div>
          ) : (
            <textarea
              className="slide-notes-textarea"
              value={displayValue}
              onChange={(e) => onChange && onChange(e.target.value)}
              placeholder={slide.starter ? '' : 'Start writing…'}
              spellCheck="false"
            />
          )}
        </div>
      </div>
    </div>
  );
};

window.Slide = Slide;
