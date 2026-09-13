'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LETTER_FORMATS, LEARNABLE_FORMATS, WRITING_TYPES, OFFICIAL_RECIPIENTS, uid } from '../../lib/constants';
import { Toast, ConfirmDialog } from '../../components/Feedback';
import { buildPdf } from '../../lib/pdf';
import LearnFormatModal from '../../components/LearnFormatModal';
import FormatSetupWizard from '../../components/FormatSetupWizard';

async function api(url, opts) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

export default function SettingsPage() {
  const [templates, setTemplates] = useState({ __global: {} });
  const [presets, setPresets] = useState({});
  const [recipients, setRecipients] = useState([]);
  const [writings, setWritings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [newPhrase, setNewPhrase] = useState({}); // { "formal_letter_opening": "text" }
  const [exporting, setExporting] = useState(false);
  const [learningType, setLearningType] = useState(null); // which type's LearnFormatModal is open
  const [wizardOpen, setWizardOpen] = useState(false);
  const [newRecipient, setNewRecipient] = useState({ label: '', type: 'other', recipientName: '', receiverAddress: '' });
  const [trash, setTrash] = useState(null); // null = not loaded yet, [] = loaded & empty
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashLoading, setTrashLoading] = useState(false);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2600); }

  useEffect(() => {
    (async () => {
      try {
        const [t, p, r, w] = await Promise.all([
          api('/api/settings?key=templates'),
          api('/api/settings?key=presets'),
          api('/api/settings?key=recipients'),
          api('/api/writings')
        ]);
        setTemplates(t && Object.keys(t).length ? t : { __global: {} });
        setPresets(p || {});
        setRecipients(Array.isArray(r) ? r : (r?.list || []));
        setWritings(w || []);
      } catch (e) {
        showToast("Couldn't load settings.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function saveRecipients(next) {
    setRecipients(next);
    try { await api('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'recipients', data: next }) }); } catch (e) { showToast("Couldn't save — " + e.message); }
  }

  function addRecipient() {
    if (!newRecipient.recipientName.trim()) { showToast('Add a recipient name first.'); return; }
    const entry = { id: uid(), type: newRecipient.type, label: newRecipient.label.trim() || newRecipient.recipientName.trim(), recipientName: newRecipient.recipientName.trim(), receiverAddress: newRecipient.receiverAddress };
    saveRecipients([...recipients, entry]);
    setNewRecipient({ label: '', type: 'other', recipientName: '', receiverAddress: '' });
    showToast('Recipient saved — pick it from the dropdown next time you write to them.');
  }

  function removeRecipient(id) {
    setConfirmConfig({
      title: 'Remove this saved recipient?',
      message: 'This only removes it from your quick-pick list. Any writings already addressed to them are not affected.',
      okLabel: 'Remove',
      run: () => saveRecipients(recipients.filter((r) => r.id !== id))
    });
  }

  async function loadTrash() {
    setTrashOpen((o) => !o);
    if (trash !== null) return;
    setTrashLoading(true);
    try {
      const rows = await api('/api/writings?trash=1');
      setTrash(rows || []);
    } catch (e) {
      showToast("Couldn't load the Trash — " + e.message);
    } finally {
      setTrashLoading(false);
    }
  }

  async function restoreFromTrash(w) {
    try {
      await api(`/api/writings/${w.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ restore: true }) });
      setTrash((t) => (t || []).filter((x) => x.id !== w.id));
      showToast(`"${w.title}" restored to your shelf.`);
    } catch (e) {
      showToast("Couldn't restore — " + e.message);
    }
  }

  async function saveTemplates(next) {
    setTemplates(next);
    try {
      await api('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'templates', data: next }) });
    } catch (e) {
      showToast("Couldn't save — " + e.message);
    }
  }

  function setGlobal(key, val) {
    const next = { ...templates, __global: { ...templates.__global, [key]: val } };
    saveTemplates(next);
  }

  function addPhrase(type, field) {
    const key = type + '_' + field;
    const val = (newPhrase[key] || '').trim();
    if (!val) return;
    const list = templates?.[type]?.[field] || [];
    if (list.includes(val)) { setNewPhrase((n) => ({ ...n, [key]: '' })); return; }
    const next = { ...templates, [type]: { ...(templates[type] || {}), [field]: [...list, val] } };
    saveTemplates(next);
    setNewPhrase((n) => ({ ...n, [key]: '' }));
  }
  function removePhrase(type, field, val) {
    const list = (templates?.[type]?.[field] || []).filter((x) => x !== val);
    const next = { ...templates, [type]: { ...(templates[type] || {}), [field]: list } };
    saveTemplates(next);
  }

  function saveLearnedFormat(type, detected) {
    const isNotice = type === 'notice';
    const existingClosings = templates?.[type]?.extraClosings || [];
    const closings = !isNotice && detected.closingText && !existingClosings.includes(detected.closingText)
      ? [...existingClosings, detected.closingText]
      : existingClosings;
    const next = {
      ...templates,
      [type]: {
        ...(templates[type] || {}),
        layout: { dateAlign: detected.dateAlign, datePosition: detected.datePosition, closingAlign: detected.closingAlign },
        ...(isNotice
          ? { defaultIssuedBy: detected.senderName || templates?.[type]?.defaultIssuedBy || '' }
          : {
              defaultSalutation: detected.salutationText || templates?.[type]?.defaultSalutation,
              defaultReceiverAddress: detected.receiverAddress || templates?.[type]?.defaultReceiverAddress || '',
              defaultSenderName: detected.senderName || templates?.[type]?.defaultSenderName || '',
              defaultSenderAddress: detected.senderAddress || templates?.[type]?.defaultSenderAddress || '',
              extraClosings: closings
            })
      }
    };
    saveTemplates(next);
    setLearningType(null);
    showToast(`Saved the format for ${WRITING_TYPES[type].label} — new writings of this type will follow it.`);
  }

  function forgetLearnedFormat(type) {
    setConfirmConfig({
      title: 'Forget this taught format?',
      message: `${WRITING_TYPES[type].label} will go back to the standard layout and defaults. Your own added phrases are kept.`,
      okLabel: 'Forget it',
      run: () => {
        const { layout, defaultReceiverAddress, defaultSenderName, defaultSenderAddress, defaultIssuedBy, ...rest } = templates[type] || {};
        const next = { ...templates, [type]: rest };
        saveTemplates(next);
        showToast('Back to the standard format.');
      }
    });
  }

  function clearRemembered() {
    setConfirmConfig({
      title: 'Clear remembered defaults?',
      message: 'The name, place and closing style that get auto-filled from your last entry will be cleared. Your saved writings are not affected.',
      okLabel: 'Clear',
      run: async () => {
        setPresets({});
        try { await api('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'presets', data: {} }) }); showToast('Remembered defaults cleared.'); } catch (e) { showToast("Couldn't clear — " + e.message); }
      }
    });
  }

  async function downloadJsonBackup() {
    setExporting(true);
    try {
      const writings = await api('/api/writings');
      const blob = new Blob([JSON.stringify(writings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rk-english-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Downloaded a backup of ${writings.length} writings.`);
    } catch (e) {
      showToast("Couldn't create the backup — " + e.message);
    } finally {
      setExporting(false);
    }
  }

  async function downloadEverythingAsPdf() {
    setExporting(true);
    try {
      const writings = await api('/api/writings');
      if (!writings.length) { showToast('Nothing to export yet.'); return; }
      const doc = buildPdf(writings.map((w) => ({
        ...w, class: w.class, recipientName: w.recipient_name, senderName: w.sender_name,
        instName: w.inst_name, noticeSubject: w.notice_subject, issuedBy: w.issued_by
      })), templates);
      doc.save(`rk-english-all-writings-${new Date().toISOString().slice(0, 10)}.pdf`);
      showToast(`Exported ${writings.length} writings as one PDF.`);
    } catch (e) {
      showToast("Couldn't build the PDF — " + e.message);
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <div id="app"><div className="loading-row">Loading settings…</div></div>;

  return (
    <div id="app">
      <div className="app-header">
        <Link href="/" className="icon-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg></Link>
        <div className="app-icon"><img src="/icons/icon-192.png" alt="RK English" width={52} height={52} /></div>
        <div className="app-titles"><h1>Settings</h1><p>Make the format your own</p></div>
      </div>

      <div className="sheet-body">
        <div className="settings-section" style={{ background: 'var(--ink)', border: 'none' }}>
          <h3 style={{ color: '#fff' }}>Set up all your formats</h3>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, marginBottom: 12 }}>
            Every writing type looks different — a formal letter isn't a notice isn't a personal letter. Go
            through her book once and teach RK English all {LEARNABLE_FORMATS.length} formats in one guided pass.
          </p>
          <button className="primary-btn" onClick={() => setWizardOpen(true)}>Start guided setup</button>
        </div>

        <div className="settings-section stats-section">
          <h3>At a glance</h3>
          <div className="stats-grid">
            <div className="stat-tile"><div className="stat-num">{writings.length}</div><div className="stat-label">Writings on the shelf</div></div>
            <div className="stat-tile"><div className="stat-num">{writings.filter((w) => w.is_favorite).length}</div><div className="stat-label">★ Favourites</div></div>
            <div className="stat-tile"><div className="stat-num">{new Set(writings.map((w) => w.class)).size}</div><div className="stat-label">Classes in use</div></div>
            <div className="stat-tile"><div className="stat-num">{new Set(writings.map((w) => w.type)).size}</div><div className="stat-label">Writing types used</div></div>
          </div>
        </div>

        <div className="settings-section">
          <h3>Global defaults</h3>
          <div className="field"><label>Your name (for letters)</label>
            <input type="text" defaultValue={templates.__global?.senderName || ''} onBlur={(e) => setGlobal('senderName', e.target.value)} placeholder="[Your Name]" />
          </div>
          <div className="field"><label>Your address (for letters)</label>
            <textarea style={{ minHeight: 70 }} defaultValue={templates.__global?.senderAddress || ''} onBlur={(e) => setGlobal('senderAddress', e.target.value)} placeholder={'B-1/1, Rabindra Nagar,\nKolkata 700 018'} />
            <div className="hint">Used whenever a writing type hasn't learned its own address from a photo.</div>
          </div>
          <div className="field"><label>Usual place (for reports / editor letters)</label>
            <input type="text" defaultValue={templates.__global?.place || ''} onBlur={(e) => setGlobal('place', e.target.value)} placeholder="e.g. Kolkata" />
          </div>
          <div className="field"><label>Usual institution name (for notices)</label>
            <input type="text" defaultValue={templates.__global?.instName || ''} onBlur={(e) => setGlobal('instName', e.target.value)} placeholder="e.g. Sunrise Public School" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}><label>Usual issuing authority (for notices)</label>
            <input type="text" defaultValue={templates.__global?.issuedBy || ''} onBlur={(e) => setGlobal('issuedBy', e.target.value)} placeholder="e.g. Headmaster" />
          </div>
        </div>

        {LEARNABLE_FORMATS.map((type) => {
          const layout = templates?.[type]?.layout;
          return (
            <div className="settings-section" key={'learn-' + type}>
              <h3>{WRITING_TYPES[type].label} — teach the format</h3>
              {layout ? (
                <>
                  <p style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.5, marginBottom: 10 }}>
                    Learned from a photo: date at the <strong>{layout.datePosition || 'top'}</strong> ({layout.dateAlign}-aligned),
                    closing on the <strong>{layout.closingAlign}</strong>
                    {templates?.[type]?.defaultSenderAddress ? ', with her address remembered' : ''}.
                  </p>
                  <button className="secondary-btn" onClick={() => setLearningType(type)}>Re-scan a photo</button>
                  <button className="secondary-btn" onClick={() => forgetLearnedFormat(type)}>Forget this format</button>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.5, marginBottom: 10 }}>
                    Using the standard format for now. Photograph a sample {WRITING_TYPES[type].label.toLowerCase()}
                    {' '}from her book and RK English will match its layout.
                  </p>
                  <button className="secondary-btn" onClick={() => setLearningType(type)}>Learn from a photo</button>
                </>
              )}
            </div>
          );
        })}

        {LETTER_FORMATS.map((type) => (
          <div className="settings-section" key={type}>
            <h3>{WRITING_TYPES[type].label} — your own phrases</h3>
            <label style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-soft)', fontWeight: 700 }}>Opening lines</label>
            <div className="chip-list">
              {(templates?.[type]?.extraOpenings || []).map((o) => (
                <span className="chip" key={o}>{o}<button onClick={() => removePhrase(type, 'extraOpenings', o)}>×</button></span>
              ))}
              {(templates?.[type]?.extraOpenings || []).length === 0 && <span style={{ fontSize: 12.5, color: 'var(--text-soft)' }}>None added yet</span>}
            </div>
            <div className="add-chip-row">
              <input placeholder="Add an opening line you use often…" value={newPhrase[type + '_extraOpenings'] || ''}
                onChange={(e) => setNewPhrase((n) => ({ ...n, [type + '_extraOpenings']: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && addPhrase(type, 'extraOpenings')} />
              <button onClick={() => addPhrase(type, 'extraOpenings')}>Add</button>
            </div>

            <label style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-soft)', fontWeight: 700, marginTop: 14, display: 'block' }}>Closing phrases</label>
            <div className="chip-list">
              {(templates?.[type]?.extraClosings || []).map((o) => (
                <span className="chip" key={o}>{o}<button onClick={() => removePhrase(type, 'extraClosings', o)}>×</button></span>
              ))}
              {(templates?.[type]?.extraClosings || []).length === 0 && <span style={{ fontSize: 12.5, color: 'var(--text-soft)' }}>None added yet</span>}
            </div>
            <div className="add-chip-row">
              <input placeholder="Add a closing you use often…" value={newPhrase[type + '_extraClosings'] || ''}
                onChange={(e) => setNewPhrase((n) => ({ ...n, [type + '_extraClosings']: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && addPhrase(type, 'extraClosings')} />
              <button onClick={() => addPhrase(type, 'extraClosings')}>Add</button>
            </div>
          </div>
        ))}

        <div className="settings-section">
          <h3>Saved recipients</h3>
          <p style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.5, marginBottom: 12 }}>
            Type a recurring official recipient's full address once — the Headmaster, the local BDO office,
            the Gram Panchayat — and pick it from a dropdown every time after that, for any class's letter.
          </p>
          {recipients.length > 0 && (
            <div className="recipient-list">
              {recipients.map((r) => (
                <div className="recipient-row" key={r.id}>
                  <div>
                    <div className="recipient-name">{r.label}</div>
                    {r.receiverAddress && <div className="recipient-addr">{r.receiverAddress.split('\n').join(', ')}</div>}
                  </div>
                  <button className="icon-btn danger" onClick={() => removeRecipient(r.id)} aria-label="Remove">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="field"><label>Designation</label>
            <select value={newRecipient.type} onChange={(e) => setNewRecipient((n) => ({ ...n, type: e.target.value, recipientName: OFFICIAL_RECIPIENTS.find((r) => r.key === e.target.value)?.recipientName || n.recipientName }))}>
              {OFFICIAL_RECIPIENTS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>
          <div className="field"><label>Recipient name / designation (as it should print)</label>
            <input type="text" value={newRecipient.recipientName} onChange={(e) => setNewRecipient((n) => ({ ...n, recipientName: e.target.value }))} placeholder="e.g. The Headmaster, Sunrise Public School" />
          </div>
          <div className="field"><label>Full address (one line each)</label>
            <textarea style={{ minHeight: 70 }} value={newRecipient.receiverAddress} onChange={(e) => setNewRecipient((n) => ({ ...n, receiverAddress: e.target.value }))} placeholder={'Sunrise Public School,\nMain Road,\nHaldia, Purba Medinipur, 721657'} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}><label>Short label for the list (optional)</label>
            <input type="text" value={newRecipient.label} onChange={(e) => setNewRecipient((n) => ({ ...n, label: e.target.value }))} placeholder="e.g. Our School Headmaster" />
          </div>
          <button className="secondary-btn" onClick={addRecipient}>Save this recipient</button>
        </div>

        <div className="settings-section">
          <h3>Trash</h3>
          <p style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.5, marginBottom: 12 }}>
            Nothing is ever permanently erased. Anything deleted from the shelf lands here and can be
            restored, for as long as you keep using the app.
          </p>
          <button className="secondary-btn" onClick={loadTrash}>{trashOpen ? 'Hide Trash' : 'Open Trash'}</button>
          {trashOpen && (
            trashLoading ? (
              <div className="loading-row" style={{ padding: '14px 0' }}>Loading Trash…</div>
            ) : (trash && trash.length > 0) ? (
              <div className="recipient-list" style={{ marginTop: 12 }}>
                {trash.map((w) => (
                  <div className="recipient-row" key={w.id}>
                    <div>
                      <div className="recipient-name">{w.title}</div>
                      <div className="recipient-addr">{WRITING_TYPES[w.type]?.label || w.type} · Class {w.class}</div>
                    </div>
                    <button className="secondary-btn" style={{ padding: '7px 12px', fontSize: 12.5 }} onClick={() => restoreFromTrash(w)}>Restore</button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 10 }}>The Trash is empty.</p>
            )
          )}
        </div>

        <div className="settings-section">
          <h3>Backup &amp; export</h3>
          <p style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.5, marginBottom: 12 }}>
            Vercel also takes an automatic daily snapshot in the background. These two buttons let you take
            a copy yourself, any time you like.
          </p>
          <button className="secondary-btn" disabled={exporting} onClick={downloadJsonBackup}>
            {exporting ? 'Working…' : 'Download full backup (JSON)'}
          </button>
          <button className="secondary-btn" disabled={exporting} onClick={downloadEverythingAsPdf}>
            {exporting ? 'Working…' : 'Download everything as one PDF'}
          </button>
        </div>

        <div className="settings-section">
          <h3>Remembered last-used values</h3>
          <p style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.5, marginBottom: 12 }}>
            RK English quietly remembers the name, place and closing style you used last time for each writing
            type, and fills them in automatically next time — so you rarely have to type them twice.
          </p>
          <button className="secondary-btn" onClick={clearRemembered}>Clear remembered defaults</button>
        </div>

        <p className="credit-line" style={{ textAlign: 'center', marginTop: 6 }}>Made by Krishnendu © 2026</p>
      </div>

      <Toast message={toast} />
      <ConfirmDialog config={confirmConfig} onCancel={() => setConfirmConfig(null)} onConfirm={() => { confirmConfig?.run?.(); setConfirmConfig(null); }} />
      {learningType && (
        <LearnFormatModal
          typeLabel={WRITING_TYPES[learningType].label}
          isNotice={learningType === 'notice'}
          onClose={() => setLearningType(null)}
          onLearned={(detected) => saveLearnedFormat(learningType, detected)}
        />
      )}
      {wizardOpen && (
        <FormatSetupWizard
          types={LEARNABLE_FORMATS}
          onSaveType={(type, detected) => saveLearnedFormat(type, detected)}
          onFinish={() => { setWizardOpen(false); showToast('All set — those formats will be used from now on.'); }}
        />
      )}
    </div>
  );
}
