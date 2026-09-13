'use client';
import { WRITING_TYPES } from '../lib/constants';

export default function WritingCard({ w, selectMode, selected, onOpen, onToggle, onToggleFavorite }) {
  const snippet = (w.body || '').replace(/\s+/g, ' ').trim();
  const typeColor = WRITING_TYPES[w.type]?.color || '#78716C';
  return (
    <div className="card" style={{ borderLeftColor: typeColor }} onClick={() => (selectMode ? onToggle(w.id) : onOpen(w.id))}>
      {selectMode && (
        <div
          className={`card-check ${selected ? 'checked' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggle(w.id); }}
        >
          {selected && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
          )}
        </div>
      )}
      <div className="card-body">
        <div className="card-top">
          <div className="card-title">{w.title}</div>
          {!selectMode && (
            <button className={`star-btn ${w.isFavorite ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); onToggleFavorite(w); }}>
              <svg viewBox="0 0 24 24" fill={w.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
              </svg>
            </button>
          )}
        </div>
        <div className="card-tags">
          <span className="tag type-tag" style={{ background: typeColor }}>{WRITING_TYPES[w.type]?.label || w.type}</span>
          <span className="tag">{w.board}</span>
          <span className="tag">Class {w.class}</span>
          {w.chapter && <span className="tag">{w.chapter}</span>}
        </div>
        <div className="card-snippet">{snippet}</div>
      </div>
      {!selectMode && (
        <div className="card-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
        </div>
      )}
    </div>
  );
}
