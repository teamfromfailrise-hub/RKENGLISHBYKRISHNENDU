'use client';
import { useRef, useState } from 'react';
import CropStage from './CropStage';
import { extractLines, classifyScan } from '../lib/format-detect';

const ALIGN_OPTIONS = [
  { v: 'left', l: 'Left' },
  { v: 'center', l: 'Centre' },
  { v: 'right', l: 'Right' }
];
const POSITION_OPTIONS = [
  { v: 'top', l: 'Near the top' },
  { v: 'bottom', l: 'At the very end' }
];

// Full flow: pick a photo -> crop -> OCR with position data -> detect the structure ->
// show an editable review screen -> only on her explicit confirm does onLearned(result) fire.
// `isNotice` swaps out the letter-specific fields (receiver's address, salutation, sender's
// address) for the one thing a notice actually has: an issuing authority line.
export default function LearnFormatModal({ typeLabel, isNotice, embedded, onLearned, onClose }) {
  const [image, setImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState('');
  const [detected, setDetected] = useState(null);
  const fileInputRef = useRef(null);

  function pickPhoto() { fileInputRef.current?.click(); }
  function onFileChosen(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => setImage(img);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  async function handleCropped(canvas) {
    setBusy(true);
    setLabel('Reading the page…');
    try {
      const Tesseract = (await import('tesseract.js')).default;
      const result = await Tesseract.recognize(canvas.toDataURL('image/png'), 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') setLabel('Reading the page… ' + Math.round(m.progress * 100) + '%');
        }
      });
      const lines = extractLines(result.data);
      const guess = classifyScan(lines, canvas.width);
      setImage(null);
      setDetected({
        dateAlign: guess.dateAlign,
        datePosition: guess.datePosition,
        salutationText: guess.salutationText || '',
        closingAlign: guess.closingAlign,
        closingText: guess.closingText || '',
        receiverAddress: (guess.receiverAddressLines || []).join('\n'),
        senderName: guess.senderName || '',
        senderAddress: (guess.senderAddressLines || []).join('\n'),
        linesRead: guess.linesRead
      });
    } catch (e) {
      setImage(null);
      setDetected({
        dateAlign: 'right', datePosition: isNotice ? 'top' : 'bottom', salutationText: 'Sir', closingAlign: isNotice ? 'right' : 'left',
        closingText: 'Thanking you,\nYours faithfully', receiverAddress: '', senderName: '', senderAddress: '',
        linesRead: 0, readFailed: true
      });
    } finally {
      setBusy(false);
    }
  }

  if (image) {
    return <CropStage image={image} busy={busy} busyLabel={label} onConfirm={handleCropped} onCancel={() => setImage(null)} />;
  }

  const body = (
    <>
      {!detected && (
        <>
          <p style={{ fontSize: 13.5, color: 'var(--text-soft)', lineHeight: 1.55, marginBottom: 16 }}>
            Photograph a clear, well-lit example of a <strong>{typeLabel}</strong> from her book — the whole
            piece, {isNotice ? 'from the institution name down to who issued it' : 'from "To," down to the date at the end'}.
            RK English will work out the layout, then show you exactly what it found so you can correct
            anything before saving it.
          </p>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onFileChosen} />
          <button type="button" className="scan-btn" onClick={pickPhoto}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M8 6l1.5-2.5h5L16 6" /><circle cx="12" cy="13" r="3.5" /></svg>
            Photograph a sample page
          </button>
          {embedded && <button type="button" className="secondary-btn" onClick={onClose}>Skip this one for now</button>}
        </>
      )}

      {detected && (
        <>
          {detected.readFailed ? (
            <p style={{ fontSize: 13.5, color: 'var(--seal-dark)', marginBottom: 16 }}>
              Couldn't read that photo clearly. You can still set the format by hand below, or go back and try
              a clearer photo.
            </p>
          ) : (
            <div className="remembered-badge" style={{ marginBottom: 18 }}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 13l4 4L19 7" /></svg>
              Read {detected.linesRead} lines — review and correct anything below before saving
            </div>
          )}

          <div className="field">
            <label>Where does the date sit?</label>
            <div className="type-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {POSITION_OPTIONS.map((o) => (
                <button key={o.v} type="button" className={`type-chip ${detected.datePosition === o.v ? 'active' : ''}`}
                  onClick={() => setDetected((d) => ({ ...d, datePosition: o.v }))}>{o.l}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Date alignment</label>
            <div className="type-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              {ALIGN_OPTIONS.map((o) => (
                <button key={o.v} type="button" className={`type-chip ${detected.dateAlign === o.v ? 'active' : ''}`}
                  onClick={() => setDetected((d) => ({ ...d, dateAlign: o.v }))}>{o.l}</button>
              ))}
            </div>
          </div>

          {!isNotice && (
            <div className="field">
              <label>Receiver's address (as printed, one line each)</label>
              <textarea style={{ minHeight: 90 }} value={detected.receiverAddress}
                onChange={(e) => setDetected((d) => ({ ...d, receiverAddress: e.target.value }))}
                placeholder="e.g. The Hindu,&#10;1st floor, LMJ Chambers,&#10;Kolkata 700 001" />
              <div className="hint">Saved as this type's default receiver's address — she won't need to retype it.</div>
            </div>
          )}

          {!isNotice && (
            <div className="field">
              <label>Salutation wording</label>
              <input type="text" value={detected.salutationText} onChange={(e) => setDetected((d) => ({ ...d, salutationText: e.target.value }))} placeholder="e.g. Sir" />
            </div>
          )}

          <div className="field">
            <label>Where does the {isNotice ? 'issuing authority line' : 'closing / signature'} sit?</label>
            <div className="type-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              {ALIGN_OPTIONS.map((o) => (
                <button key={o.v} type="button" className={`type-chip ${detected.closingAlign === o.v ? 'active' : ''}`}
                  onClick={() => setDetected((d) => ({ ...d, closingAlign: o.v }))}>{o.l}</button>
              ))}
            </div>
          </div>

          {!isNotice && (
            <div className="field">
              <label>Exact closing wording (one or two lines)</label>
              <textarea style={{ minHeight: 60 }} value={detected.closingText} onChange={(e) => setDetected((d) => ({ ...d, closingText: e.target.value }))} placeholder={'Thanking you,\nYours faithfully'} />
              <div className="hint">Added to the dropdown of closing choices for this type.</div>
            </div>
          )}

          <div className="field">
            <label>{isNotice ? 'Issuing authority (name & designation)' : "Your name, as it should appear"}</label>
            <input type="text" value={detected.senderName} onChange={(e) => setDetected((d) => ({ ...d, senderName: e.target.value }))} placeholder={isNotice ? 'e.g. Headmaster' : '[Your Name]'} />
            <div className="hint">{isNotice ? "Saved as this type's default issuing authority." : ''}</div>
          </div>
          {!isNotice && (
            <div className="field">
              <label>Your address (one line each)</label>
              <textarea style={{ minHeight: 70 }} value={detected.senderAddress} onChange={(e) => setDetected((d) => ({ ...d, senderAddress: e.target.value }))} placeholder={'B-1/1, Rabindra Nagar,\nKolkata 700 018'} />
              <div className="hint">Saved as this type's default sender's address.</div>
            </div>
          )}

          <button type="button" className="primary-btn" onClick={() => onLearned(detected)}>Save this as the format</button>
          <button type="button" className="secondary-btn" onClick={() => setDetected(null)}>Scan a different photo</button>
        </>
      )}
    </>
  );

  if (embedded) {
    return <div className="sheet-body">{body}</div>;
  }

  return (
    <div className="sheet">
      <div className="sheet-header">
        <button className="icon-btn" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h2>Learn {typeLabel} format</h2>
      </div>
      <div className="sheet-body">{body}</div>
    </div>
  );
}
