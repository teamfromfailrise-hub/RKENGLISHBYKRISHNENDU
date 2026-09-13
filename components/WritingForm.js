'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { WRITING_TYPES, CLASS_OPTIONS, BOARD_OPTIONS, LETTER_FORMATS, ADDRESS_BLOCK_FORMATS, RECIPIENT_PICKER_FORMATS, OFFICIAL_RECIPIENTS, openingsFor, closingsFor, uid } from '../lib/constants';
import ScanCropModal from './ScanCropModal';
import { ConfirmDialog } from './Feedback';
import VoiceButton from './VoiceButton';

const BLANK = {
  title: '', board: 'English Medium', class: '', type: 'paragraph', chapter: '', body: '',
  recipientName: '', recipientType: '', receiverAddress: '', place: '', opening: '', closing: '', salutation: '',
  senderName: '', senderAddress: '', instName: '', noticeSubject: '', issuedBy: ''
};

// If she gets called away mid-writing — a phone call, a knock at the door, the browser
// closing by accident — nothing typed is lost. A new (unsaved) writing quietly autosaves
// here, and is offered back the next time she opens "Add a writing".
const DRAFT_KEY = 'rk_new_writing_draft_v1';

export default function WritingForm({ existing, presets, templates, globalDefaults, recipients, onSaveRecipient, onSave, onCancel, showToast }) {
  const isEdit = !!(existing && existing.id);
  const [form, setForm] = useState(() => (existing ? { ...BLANK, ...existing } : { ...BLANK }));
  const [type, setType] = useState(existing?.type || 'paragraph');
  const [scanImage, setScanImage] = useState(null);
  const [replaceConfirm, setReplaceConfirm] = useState(false);
  const [recipientPicker, setRecipientPicker] = useState('');
  const [draftRestored, setDraftRestored] = useState(false);
  const fileInputRef = useRef(null);
  const meta = WRITING_TYPES[type];

  // Offer back an unsaved draft, once, when opening a brand-new (not edit) form.
  useEffect(() => {
    if (isEdit) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft?.form && (draft.form.title?.trim() || draft.form.body?.trim())) {
        setForm({ ...BLANK, ...draft.form });
        setType(draft.type || 'paragraph');
        setDraftRestored(true);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quietly autosave every change, debounced, while adding something new.
  useEffect(() => {
    if (isEdit) return;
    const t = setTimeout(() => {
      try {
        if (form.title.trim() || form.body.trim()) {
          localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, type }));
        }
      } catch {}
    }, 600);
    return () => clearTimeout(t);
  }, [form, type, isEdit]);

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  }

  function discardDraft() {
    clearDraft();
    setForm({ ...BLANK });
    setType('paragraph');
    setDraftRestored(false);
  }

  function applyRecipientChoice(value) {
    setRecipientPicker(value);
    if (!value) return;
    if (value.startsWith('saved:')) {
      const saved = (recipients || []).find((r) => r.id === value.slice(6));
      if (!saved) return;
      setForm((f) => ({ ...f, recipientType: saved.type || '', recipientName: saved.recipientName || '', receiverAddress: saved.receiverAddress || f.receiverAddress }));
    } else if (value.startsWith('preset:')) {
      const preset = OFFICIAL_RECIPIENTS.find((r) => r.key === value.slice(7));
      if (!preset) return;
      setForm((f) => ({ ...f, recipientType: preset.key, recipientName: preset.key === 'other' ? f.recipientName : preset.recipientName }));
    }
  }

  function handleSaveRecipient() {
    if (!form.recipientName.trim()) { showToast('Add a recipient name first.'); return; }
    onSaveRecipient?.({
      id: uid(),
      type: form.recipientType || 'other',
      label: form.recipientName.trim(),
      recipientName: form.recipientName.trim(),
      receiverAddress: form.receiverAddress || ''
    });
  }

  function applyDefaultsForType(nextType) {
    if (isEdit) return; // never clobber an existing writing's own values
    const remembered = presets?.[nextType] || {};
    const t = templates?.[nextType] || {};
    const g = globalDefaults || {};
    setForm((f) => ({
      ...f,
      senderName: f.senderName || remembered.senderName || t.defaultSenderName || g.senderName || '',
      senderAddress: f.senderAddress || remembered.senderAddress || t.defaultSenderAddress || g.senderAddress || '',
      receiverAddress: f.receiverAddress || remembered.receiverAddress || t.defaultReceiverAddress || '',
      place: f.place || remembered.place || g.place || '',
      instName: f.instName || remembered.instName || g.instName || '',
      issuedBy: f.issuedBy || remembered.issuedBy || t.defaultIssuedBy || g.issuedBy || '',
      salutation: f.salutation || remembered.salutation || t.defaultSalutation || WRITING_TYPES[nextType]?.defaultSalutation || '',
      closing: f.closing || remembered.closing || (WRITING_TYPES[nextType]?.closings || [])[0] || ''
    }));
  }

  useMemo(() => { applyDefaultsForType(type); /* run once on mount */ }, []); // eslint-disable-line

  function set(key, val) { setForm((f) => ({ ...f, [key]: val })); }

  function changeType(t) {
    setType(t);
    applyDefaultsForType(t);
  }

  const hasRememberedDefaults = !isEdit && presets?.[type] && Object.keys(presets[type]).length > 0;
  const hasTaughtFormat = !!templates?.[type]?.layout;

  function pickPhoto() {
    fileInputRef.current?.click();
  }
  function onFileChosen(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => setScanImage(img);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
  function handleOcrDone(text, errorMsg) {
    setScanImage(null);
    if (errorMsg) { showToast(errorMsg); return; }
    if (form.body.trim()) {
      setReplaceConfirm(text);
    } else {
      set('body', text);
      showToast('Scanned text added — please check it over before saving.');
    }
  }

  function submit() {
    if (!form.title.trim()) { showToast('Please add a title.'); return; }
    if (!form.class) { showToast('Please choose a class.'); return; }
    if (!form.body.trim()) { showToast('Please write or scan the body text.'); return; }
    if (!isEdit) clearDraft();
    onSave({ ...form, type, title: form.title.trim(), body: form.body.trim() });
  }

  const openings = openingsFor(type, templates);
  const closings = closingsFor(type, templates);

  return (
    <div className="sheet">
      <div className="sheet-header">
        <button className="icon-btn" onClick={onCancel}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h2>{isEdit ? 'Edit writing' : 'Add a writing'}</h2>
      </div>
      <div className="sheet-body">
        {draftRestored && (
          <div className="draft-banner">
            <span>Restored an unsaved draft from before — carry on, or start fresh.</span>
            <button type="button" className="link-btn" onClick={discardDraft}>Discard draft</button>
          </div>
        )}
        <div className="section-title">Basics</div>
        <div className="field">
          <div className="field-label-row">
            <label>Title</label>
            <VoiceButton onResult={(text) => set('title', form.title ? form.title + ' ' + text : text)} />
          </div>
          <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Letter to a friend about your annual exam" />
        </div>
        <div className="row2">
          <div className="field">
            <label>Board / Medium</label>
            <select value={form.board} onChange={(e) => set('board', e.target.value)}>
              {BOARD_OPTIONS.map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Class</label>
            <select value={form.class} onChange={(e) => set('class', e.target.value)}>
              <option value="">Select</option>
              {CLASS_OPTIONS.map((c) => <option key={c} value={c}>Class {c}</option>)}
            </select>
          </div>
        </div>
        {meta.chapterField && (
          <div className="field">
            <label>Chapter (if textual)</label>
            <input type="text" value={form.chapter} onChange={(e) => set('chapter', e.target.value)}
              placeholder="e.g. Fable / The Passing Away of Bapu" />
          </div>
        )}

        <div className="section-title">Type of writing</div>
        <div className="type-grid">
          {Object.entries(WRITING_TYPES).map(([k, v]) => (
            <button
              key={k} type="button"
              className={`type-chip ${type === k ? 'active' : ''}`}
              style={type === k ? { background: v.color, borderColor: v.color } : { borderColor: v.color + '55' }}
              onClick={() => changeType(k)}
            >
              <span className="type-chip-dot" style={{ background: type === k ? '#fff' : v.color }} />
              {v.label}
            </button>
          ))}
        </div>

        {hasRememberedDefaults && (
          <div className="remembered-badge">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 13l4 4L19 7" /></svg>
            Filled in from what you used last time — change anything below if needed
          </div>
        )}
        {(ADDRESS_BLOCK_FORMATS.includes(type) || meta.format === 'notice') && (
          hasTaughtFormat ? (
            <div className="remembered-badge">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 13l4 4L19 7" /></svg>
              Following the format taught for {WRITING_TYPES[type].label} from her book
            </div>
          ) : (
            <div className="remembered-badge" style={{ background: '#FBF3E4', borderColor: '#EBD9AE', color: '#8A6D22' }}>
              No format taught yet for {WRITING_TYPES[type].label} — using the standard layout. Teach it in Settings.
            </div>
          )
        )}

        {LETTER_FORMATS.includes(type) && (
          <>
            <div className="section-title">Letter details</div>
            {RECIPIENT_PICKER_FORMATS.includes(type) && (
              <div className="field">
                <label>Send to (official letters — pick to fill in automatically)</label>
                <select value={recipientPicker} onChange={(e) => applyRecipientChoice(e.target.value)}>
                  <option value="">— choose, or just type below —</option>
                  {recipients && recipients.length > 0 && (
                    <optgroup label="★ Your saved recipients">
                      {recipients.map((r) => <option key={r.id} value={'saved:' + r.id}>{r.label}</option>)}
                    </optgroup>
                  )}
                  <optgroup label="Common official recipients">
                    {OFFICIAL_RECIPIENTS.map((r) => <option key={r.key} value={'preset:' + r.key}>{r.label}</option>)}
                  </optgroup>
                </select>
                <div className="hint">Fills in the recipient line and, for a saved one, the full address too — the letter's own layout never changes, only who it's addressed to.</div>
              </div>
            )}
            <div className="field">
              <label>{meta.format === 'editor_letter' ? 'Newspaper name' : "Recipient's name / designation"}</label>
              <input type="text" value={form.recipientName} onChange={(e) => set('recipientName', e.target.value)}
                placeholder={meta.format === 'editor_letter' ? 'e.g. The Hindu' : 'e.g. Ravi / The Headmaster'} />
              <div className="hint">
                {meta.format === 'editor_letter' ? 'Used as "The Editor, [Newspaper]".' : meta.format === 'personal_letter' ? `Used to write "Dear ${form.recipientName || '____'},".` : 'Used as "To, [this],".'}
              </div>
            </div>
            {ADDRESS_BLOCK_FORMATS.includes(type) && (
              <div className="field">
                <label>Receiver's address (one line each, optional)</label>
                <textarea style={{ minHeight: 80 }} value={form.receiverAddress} onChange={(e) => set('receiverAddress', e.target.value)}
                  placeholder={OFFICIAL_RECIPIENTS.find((r) => r.key === form.recipientType)?.addressHint || '1st floor, LMJ Chambers,\n15, Hemanta Basu Sarani,\nKolkata 700 001'} />
                {RECIPIENT_PICKER_FORMATS.includes(type) && form.recipientName.trim() && (
                  <button type="button" className="link-btn" style={{ marginTop: 8 }} onClick={handleSaveRecipient}>
                    💾 Save this recipient for next time
                  </button>
                )}
              </div>
            )}
            {meta.format !== 'personal_letter' && (
              <div className="field">
                <label>Salutation</label>
                <input type="text" value={form.salutation} onChange={(e) => set('salutation', e.target.value)} placeholder="Sir" />
              </div>
            )}
            <div className="field">
              <label>Opening line (optional)</label>
              <select value={form.opening} onChange={(e) => set('opening', e.target.value)}>
                <option value="">— none —</option>
                {openings.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Closing / subscription</label>
              <select value={form.closing} onChange={(e) => set('closing', e.target.value)}>
                {closings.map((c) => <option key={c} value={c}>{c.replace('\n', ' / ')}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Sender's name</label>
              <input type="text" value={form.senderName} onChange={(e) => set('senderName', e.target.value)} placeholder="[Your Name]" />
            </div>
            {ADDRESS_BLOCK_FORMATS.includes(type) && (
              <div className="field">
                <label>Sender's address (one line each, optional)</label>
                <textarea style={{ minHeight: 70 }} value={form.senderAddress} onChange={(e) => set('senderAddress', e.target.value)}
                  placeholder={'B-1/1, Rabindra Nagar,\nKolkata 700 018'} />
              </div>
            )}
          </>
        )}

        {meta.format === 'notice' && (
          <>
            <div className="section-title">Notice details</div>
            <div className="field"><label>Institution name</label>
              <input type="text" value={form.instName} onChange={(e) => set('instName', e.target.value)} placeholder="e.g. Sunrise Public School" />
            </div>
            <div className="field"><label>Subject / heading</label>
              <input type="text" value={form.noticeSubject} onChange={(e) => set('noticeSubject', e.target.value)} placeholder="e.g. Annual Sports Day" />
            </div>
            <div className="field"><label>Issued by (name &amp; designation)</label>
              <input type="text" value={form.issuedBy} onChange={(e) => set('issuedBy', e.target.value)} placeholder="e.g. Headmaster" />
            </div>
          </>
        )}

        {meta.format === 'report' && (
          <>
            <div className="section-title">Report details</div>
            <div className="field"><label>Place</label>
              <input type="text" value={form.place} onChange={(e) => set('place', e.target.value)} placeholder="e.g. Kolkata" />
            </div>
          </>
        )}

        <div className="section-title">The writing itself</div>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" style={{ display: 'none' }} onChange={onFileChosen} />
        <button type="button" className="scan-btn" onClick={pickPhoto}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M8 6l1.5-2.5h5L16 6" /><circle cx="12" cy="13" r="3.5" /></svg>
          Scan from a photo
        </button>
        <div className="field">
          <div className="field-label-row">
            <label>Body</label>
            <VoiceButton onResult={(text) => set('body', form.body ? form.body + ' ' + text : text)} />
          </div>
          <textarea value={form.body} onChange={(e) => set('body', e.target.value)}
            placeholder="Type or paste the writing here — separate paragraphs with a blank line." />
          <div className="hint">Tap the mic to dictate in Indian English instead of typing. Only the body is compulsory — leave any name/style field above blank to skip it.</div>
        </div>

        <button type="button" className="primary-btn" onClick={submit}>{isEdit ? 'Save changes' : 'Save writing'}</button>
        {isEdit && <button type="button" className="secondary-btn" onClick={onCancel}>Cancel</button>}
      </div>

      {scanImage && <ScanCropModal image={scanImage} onDone={handleOcrDone} onCancel={() => setScanImage(null)} />}
      {replaceConfirm !== false && replaceConfirm !== null && typeof replaceConfirm === 'string' && (
        <ConfirmDialog
          config={{ title: 'Replace the body text?', message: 'The body already has text. Replace it with the scanned text, or add the scan below it?', okLabel: 'Replace', cancelLabel: 'Add below instead' }}
          onCancel={() => { set('body', form.body + '\n\n' + replaceConfirm); setReplaceConfirm(false); showToast('Scanned text added below the existing body.'); }}
          onConfirm={() => { set('body', replaceConfirm); setReplaceConfirm(false); showToast('Body replaced with the scanned text.'); }}
        />
      )}
    </div>
  );
}
