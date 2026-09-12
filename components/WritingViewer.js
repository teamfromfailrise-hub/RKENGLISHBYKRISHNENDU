'use client';
import { WRITING_TYPES, todayStr, paragraphs, textLines } from '../lib/constants';
import { exportPdf, shareOnWhatsapp } from '../lib/pdf';

function DateLine({ layout }) {
  return <div className="p-date" style={{ textAlign: layout.dateAlign || 'right' }}>{layout.datePosition === 'bottom' ? 'Dated ' : ''}{todayStr()}</div>;
}

function PaperPreview({ w, layout }) {
  const meta = WRITING_TYPES[w.type] || WRITING_TYPES.other;
  const paras = paragraphs(w.body);
  const closingStyle = layout.closingAlign ? { textAlign: layout.closingAlign } : undefined;
  const datePosition = layout.datePosition || (meta.format === 'notice' ? 'top' : 'bottom');

  let inner;
  if (meta.format === 'formal_letter' || meta.format === 'editor_letter') {
    const isEditor = meta.format === 'editor_letter';
    const receiverLines = textLines(w.receiverAddress);
    const senderLines = textLines(w.senderAddress);
    inner = (
      <>
        {datePosition === 'top' && <DateLine layout={{ ...layout, datePosition: 'top' }} />}
        <div className="p-to">
          To,<br />
          {isEditor ? <>The Editor,<br />{w.recipientName || '[Newspaper Name]'},<br /></> : <>{w.recipientName || '[Recipient / Designation]'},<br /></>}
          {receiverLines.map((l, i) => <span key={i}>{l}{i < receiverLines.length - 1 ? ',' : ''}<br /></span>)}
        </div>
        <div className="p-sal">{w.salutation || 'Sir'},</div>
        {w.opening && <p>{w.opening}</p>}
        {paras.map((p, i) => <p key={i}>{p}</p>)}
        <div className="p-sub" style={closingStyle}>
          {textLines(w.closing || 'Thanking you,\nYours faithfully').map((l, i) => <div key={i}>{l}</div>)}
          <div style={{ marginTop: 10 }}>{w.senderName || '[Your Name]'}</div>
          {senderLines.map((l, i) => <div key={i}>{l}</div>)}
          {datePosition === 'bottom' && <div style={{ marginTop: 4 }}>Dated {todayStr()}</div>}
        </div>
      </>
    );
  } else if (meta.format === 'personal_letter') {
    const senderLines = textLines(w.senderAddress);
    inner = (
      <>
        {senderLines.length > 0 && <div className="p-to">{senderLines.map((l, i) => <span key={i}>{l}<br /></span>)}</div>}
        <DateLine layout={{ ...layout, datePosition: 'top' }} />
        <div className="p-sal">Dear {w.recipientName || '____'},</div>
        {w.opening && <p>{w.opening}</p>}
        {paras.map((p, i) => <p key={i}>{p}</p>)}
        <div className="p-sub">
          {textLines(w.closing || 'Yours affectionately').map((l, i) => <div key={i}>{l}</div>)}
          <div>{w.senderName || '[Your Name]'}</div>
        </div>
      </>
    );
  } else if (meta.format === 'notice') {
    inner = (
      <>
        <div className="p-inst">{w.instName || '[Institution Name]'}</div>
        <div className="p-noticeword">NOTICE</div>
        <div className="p-noticedate" style={{ textAlign: layout.dateAlign || 'right' }}>Date: {todayStr()}</div>
        <div className="p-noticesubj">{w.noticeSubject || w.title}</div>
        {paras.map((p, i) => <p key={i}>{p}</p>)}
        <div className="p-issued" style={{ textAlign: layout.closingAlign || 'right' }}>{w.issuedBy || '[Issued by]'}</div>
      </>
    );
  } else if (meta.format === 'report') {
    inner = (
      <>
        <div className="p-headline">{w.title}</div>
        <div className="p-byline">{w.place || '[Place]'}, {todayStr()}: (Own Correspondent) —</div>
        {paras.map((p, i) => <p key={i}>{p}</p>)}
      </>
    );
  } else {
    inner = paras.map((p, i) => <p key={i}>{p}</p>);
  }

  return (
    <>
      <div className="meta-strip">
        <span className="tag type-tag">{meta.label}</span>
        <span className="tag">{w.board}</span>
        <span className="tag">Class {w.class}</span>
        {w.chapter && <span className="tag">{w.chapter}</span>}
      </div>
      <div className="paper-sheet">{inner}</div>
    </>
  );
}

export default function WritingViewer({ w, templates, onEdit, onDelete, onDuplicate, onClose, showToast }) {
  const wordCount = (w.body || '').trim().split(/\s+/).filter(Boolean).length;
  const layout = templates?.[w.type]?.layout || {};
  return (
    <div className="sheet">
      <div className="sheet-header">
        <button className="icon-btn" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h2>{w.title}</h2>
        <button className="icon-btn" onClick={onEdit}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
        </button>
        <button className="icon-btn danger" onClick={onDelete}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
        </button>
      </div>
      <div className="sheet-body">
        <PaperPreview w={w} layout={layout} />
        <div className="word-count">{wordCount} {wordCount === 1 ? 'word' : 'words'}</div>
        <div className="viewer-actions">
          <button className="icon-text-btn" onClick={() => exportPdf([w], templates)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v13m0 0l-4-4m4 4l4-4M4 20h16" /></svg>
            PDF
          </button>
          <button
            className="icon-text-btn wa"
            onClick={async () => {
              const r = await shareOnWhatsapp([w], templates);
              if (r.fallback) showToast("Your device doesn't support sending the file directly — a text summary opened in WhatsApp instead. You can also download the PDF and attach it manually.");
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 00-8.5 15.2L2 22l4.9-1.3A10 10 0 1012 2z" /></svg>
            WhatsApp
          </button>
          <button className="icon-text-btn" onClick={onDuplicate}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" /></svg>
            Duplicate
          </button>
        </div>
      </div>
    </div>
  );
}
