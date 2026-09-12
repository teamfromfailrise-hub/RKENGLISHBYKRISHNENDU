'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LETTER_FORMATS, LEARNABLE_FORMATS, WRITING_TYPES } from '../../lib/constants';
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
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [newPhrase, setNewPhrase] = useState({}); // { "formal_letter_opening": "text" }
  const [exporting, setExporting] = useState(false);
  const [learningType, setLearningType] = useState(null); // which type's LearnFormatModal is open
  const [wizardOpen, setWizardOpen] = useState(false);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2600); }

  useEffect(() => {
    (async () => {
      try {
        const [t, p] = await Promise.all([api('/api/settings?key=templates'), api('/api/settings?key=presets')]);
        setTemplates(t && Object.keys(t).length ? t : { __global: {} });
        setPresets(p || {});
      } catch (e) {
        showToast("Couldn't load settings.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

  function restoreFromBackup(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again later
    if (!file) return;
    setConfirmConfig({
      title: 'Restore from this backup?',
      message: `This will add or overwrite writings from "${file.name}". Writings already saved that aren't in the backup are left alone — nothing is deleted.`,
      okLabel: 'Restore',
      run: async () => {
        setExporting(true);
        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          const result = await api('/api/writings/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed),
          });
          showToast(`Restored ${result.restored} writing${result.restored === 1 ? '' : 's'}.${result.skipped ? ` (${result.skipped} skipped — missing required fields.)` : ''}`);
        } catch (err) {
          showToast("Couldn't restore — " + (err.message || 'the file may not be a valid backup.'));
        } finally {
          setExporting(false);
        }
      },
    });
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
          <label className="secondary-btn" style={{ display: 'inline-block', textAlign: 'center', cursor: exporting ? 'default' : 'pointer', opacity: exporting ? 0.6 : 1 }}>
            {exporting ? 'Working…' : 'Restore from a JSON backup'}
            <input type="file" accept="application/json,.json" onChange={restoreFromBackup} disabled={exporting} style={{ display: 'none' }} />
          </label>
          <p style={{ fontSize: 12, color: 'var(--text-soft)', lineHeight: 1.5, marginTop: 8 }}>
            Use a file from "Download full backup (JSON)" above. Restoring never deletes anything — it only
            adds writings that are missing and refreshes ones that already exist.
          </p>
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
