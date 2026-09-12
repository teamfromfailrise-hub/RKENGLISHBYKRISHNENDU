'use client';
import { useState } from 'react';
import { WRITING_TYPES } from '../lib/constants';
import LearnFormatModal from './LearnFormatModal';

// Walks her through every learnable type (formal letter, application, personal letter,
// editor's letter, notice) one after another, so she can load her book's formats in a
// single sitting instead of hunting through Settings for each one individually.
export default function FormatSetupWizard({ types, onSaveType, onFinish }) {
  const [index, setIndex] = useState(0);
  const currentType = types[index];
  const isLast = index === types.length - 1;

  function advance() {
    if (isLast) onFinish();
    else setIndex((i) => i + 1);
  }

  return (
    <div className="sheet">
      <div className="sheet-header">
        <button className="icon-btn" onClick={onFinish}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <h2>Set up formats — {index + 1} of {types.length}</h2>
      </div>
      <div style={{ padding: '10px 16px 0' }}>
        <div className="quick-chips" style={{ padding: '0 0 10px' }}>
          {types.map((t, i) => (
            <span key={t} className={`quick-chip ${i === index ? 'active' : ''}`} style={{ pointerEvents: 'none' }}>
              {WRITING_TYPES[t].label}
            </span>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <LearnFormatModal
          key={currentType}
          typeLabel={WRITING_TYPES[currentType].label}
          isNotice={currentType === 'notice'}
          embedded
          onClose={advance}
          onLearned={(detected) => { onSaveType(currentType, detected); advance(); }}
        />
      </div>
    </div>
  );
}
