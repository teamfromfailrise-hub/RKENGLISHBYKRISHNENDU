'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { WRITING_TYPES, CLASS_OPTIONS, BOARD_OPTIONS, LETTER_FORMATS, LEARNABLE_FORMATS } from '../lib/constants';
import WritingCard from '../components/WritingCard';
import WritingForm from '../components/WritingForm';
import WritingViewer from '../components/WritingViewer';
import { Toast, ConfirmDialog } from '../components/Feedback';
import { exportPdf, shareOnWhatsapp } from '../lib/pdf';

async function api(url, opts) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

export default function Home() {
  const [writings, setWritings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [presets, setPresets] = useState({});
  const [templates, setTemplates] = useState({});
  const [globalDefaults, setGlobalDefaults] = useState({});

  const [filters, setFilters] = useState({ board: '', cls: '', type: '', chapter: '', q: '', favOnly: false });
  const [showFilters, setShowFilters] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [formOpen, setFormOpen] = useState(false);
  const [editingWriting, setEditingWriting] = useState(null);
  const [viewingId, setViewingId] = useState(null);

  const [toast, setToast] = useState('');
  const [confirmConfig, setConfirmConfig] = useState(null);

  function showToast(msg, ms = 2800) {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(''), ms);
  }

  useEffect(() => {
    (async () => {
      try {
        const [w, presetData, templateData] = await Promise.all([
          api('/api/writings'),
          api('/api/settings?key=presets'),
          api('/api/settings?key=templates')
        ]);
        setWritings(w.map(normalizeRow));
        setPresets(presetData || {});
        setTemplates(templateData || {});
        setGlobalDefaults(templateData?.__global || {});
      } catch (e) {
        setLoadError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function normalizeRow(row) {
    return {
      ...row,
      recipientName: row.recipient_name ?? row.recipientName ?? '',
      receiverAddress: row.receiver_address ?? row.receiverAddress ?? '',
      senderName: row.sender_name ?? row.senderName ?? '',
      senderAddress: row.sender_address ?? row.senderAddress ?? '',
      instName: row.inst_name ?? row.instName ?? '',
      noticeSubject: row.notice_subject ?? row.noticeSubject ?? '',
      issuedBy: row.issued_by ?? row.issuedBy ?? '',
      isFavorite: row.is_favorite ?? row.isFavorite ?? false,
      createdAt: row.created_at ?? row.createdAt,
      updatedAt: row.updated_at ?? row.updatedAt
    };
  }

  async function toggleFavorite(w) {
    const next = !w.isFavorite;
    setWritings((ws) => ws.map((x) => (x.id === w.id ? { ...x, isFavorite: next } : x)));
    try {
      await api(`/api/writings/${w.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isFavorite: next }) });
    } catch (e) {
      setWritings((ws) => ws.map((x) => (x.id === w.id ? { ...x, isFavorite: !next } : x)));
      showToast("Couldn't update — " + e.message);
    }
  }

  function duplicateWriting(w) {
    const { id, createdAt, updatedAt, isFavorite, ...rest } = w;
    setEditingWriting({ ...rest, title: w.title + ' (copy)' });
    setViewingId(null);
    setFormOpen(true);
  }

  const filtered = useMemo(() => {
    return writings
      .filter((w) => {
        if (filters.favOnly && !w.isFavorite) return false;
        if (filters.board && w.board !== filters.board) return false;
        if (filters.cls && String(w.class) !== String(filters.cls)) return false;
        if (filters.type && w.type !== filters.type) return false;
        if (filters.chapter && !(w.chapter || '').toLowerCase().includes(filters.chapter.toLowerCase())) return false;
        if (filters.q) {
          const hay = (w.title + ' ' + w.body + ' ' + (w.chapter || '')).toLowerCase();
          if (!hay.includes(filters.q.toLowerCase())) return false;
        }
        return true;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [writings, filters]);

  const filtersActive = filters.board || filters.cls || filters.type || filters.chapter;

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function rememberDefaults(type, w) {
    const next = {
      ...presets,
      [type]: {
        senderName: w.senderName || '', senderAddress: w.senderAddress || '', receiverAddress: w.receiverAddress || '',
        place: w.place || '', instName: w.instName || '',
        issuedBy: w.issuedBy || '', salutation: w.salutation || '', closing: w.closing || ''
      }
    };
    setPresets(next);
    try { await api('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'presets', data: next }) }); } catch {}
  }

  async function handleSave(record) {
    try {
      if (record.id) {
        await api(`/api/writings/${record.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record) });
        setWritings((ws) => ws.map((w) => (w.id === record.id ? { ...record, updatedAt: Date.now() } : w)));
        showToast('Changes saved.');
      } else {
        const res = await api('/api/writings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record) });
        setWritings((ws) => [{ ...record, id: res.id, createdAt: res.createdAt, updatedAt: res.updatedAt }, ...ws]);
        showToast('Writing added to the shelf.');
      }
      rememberDefaults(record.type, record);
      setFormOpen(false);
      setEditingWriting(null);
    } catch (e) {
      showToast("Couldn't save — " + e.message);
    }
  }

  async function handleDelete(w) {
    setConfirmConfig({
      title: 'Delete this writing?',
      message: `"${w.title}" will be permanently removed. This cannot be undone.`,
      okLabel: 'Delete',
      run: async () => {
        try {
          await api(`/api/writings/${w.id}`, { method: 'DELETE' });
          setWritings((ws) => ws.filter((x) => x.id !== w.id));
          setViewingId(null);
          showToast('Writing deleted.');
        } catch (e) {
          showToast("Couldn't delete — " + e.message);
        }
      }
    });
  }

  const viewingWriting = writings.find((w) => w.id === viewingId) || null;
  const selectedWritings = writings.filter((w) => selectedIds.has(w.id));

  return (
    <div id="app">
      <div className="app-header">
        <div className="app-icon">
          <svg viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="16" r="8" fill="#F2ECDB" />
            <path d="M8 41c1-9 7-14 16-14s15 5 16 14" stroke="#F2ECDB" strokeWidth="3" fill="none" strokeLinecap="round" />
            <rect x="15" y="27" width="18" height="4" rx="1.5" fill="#A3323D" />
          </svg>
        </div>
        <div className="app-titles">
          <h1>RK English</h1>
          <p>Every writing, always at hand</p>
        </div>
        <div className="header-right">
          <div className="header-count">{writings.length} {writings.length === 1 ? 'piece' : 'pieces'}</div>
          <Link href="/settings" className="settings-link">Settings</Link>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-row">
          <div className="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            <input placeholder="Search by title or text…" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
          </div>
          <button className={`filter-toggle ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters((s) => !s)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
            {filtersActive && <span className="filter-dot" />}
          </button>
        </div>

        {showFilters && (
          <div className="filter-panel">
            <div className="f-field"><label>Board / Medium</label>
              <select value={filters.board} onChange={(e) => setFilters((f) => ({ ...f, board: e.target.value }))}>
                <option value="">All</option>{BOARD_OPTIONS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="f-field"><label>Class</label>
              <select value={filters.cls} onChange={(e) => setFilters((f) => ({ ...f, cls: e.target.value }))}>
                <option value="">All</option>{CLASS_OPTIONS.map((c) => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </div>
            <div className="f-field"><label>Writing type</label>
              <select value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}>
                <option value="">All</option>{Object.entries(WRITING_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="f-field"><label>Chapter</label>
              <input value={filters.chapter} onChange={(e) => setFilters((f) => ({ ...f, chapter: e.target.value }))} placeholder="e.g. The Passing Away…" />
            </div>
            <div className="filter-actions full">
              <button className="link-btn" onClick={() => setFilters({ board: '', cls: '', type: '', chapter: '', q: filters.q, favOnly: false })}>Clear all filters</button>
              <span className="credit-line">Made by Krishnendu © 2026</span>
            </div>
          </div>
        )}
      </div>

      {!loading && !LEARNABLE_FORMATS.some((t) => templates?.[t]?.layout) && (
        <div style={{ margin: '0 16px 4px', padding: '11px 13px', borderRadius: 12, background: 'var(--paper-deep)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, color: 'var(--text)', flex: 1, lineHeight: 1.4 }}>
            Letters and notices are using the standard layout. Teach RK English your book's actual format.
          </span>
          <Link href="/settings" className="link-btn" style={{ flex: 'none' }}>Set up</Link>
        </div>
      )}

      <div className="quick-chips">
        <button className={`quick-chip ${!filters.cls && !filters.favOnly ? 'active' : ''}`} onClick={() => setFilters((f) => ({ ...f, cls: '', favOnly: false }))}>All</button>
        <button className={`quick-chip ${filters.favOnly ? 'active' : ''}`} onClick={() => setFilters((f) => ({ ...f, favOnly: !f.favOnly }))}>★ Favourites</button>
        {CLASS_OPTIONS.map((c) => (
          <button key={c} className={`quick-chip ${filters.cls === c ? 'active' : ''}`}
            onClick={() => setFilters((f) => ({ ...f, cls: f.cls === c ? '' : c }))}>
            Class {c}
          </button>
        ))}
      </div>

      <div className="list-wrap">
        <div className="list-meta-row">
          <span>{loading ? 'Loading…' : `${filtered.length} ${filtered.length === 1 ? 'writing' : 'writings'}`}</span>
          <div style={{ display: 'flex', gap: 14 }}>
            {selectMode && filtered.length > 0 && (
              <button className="select-mode-btn" onClick={() => setSelectedIds(new Set(filtered.map((w) => w.id)))}>
                Select all {filtered.length}
              </button>
            )}
            <button className="select-mode-btn" onClick={() => { setSelectMode((s) => !s); setSelectedIds(new Set()); }}>
              {selectMode ? 'Done' : 'Select'}
            </button>
          </div>
        </div>

        {loading && <div className="loading-row">Opening the shelf…</div>}
        {!loading && loadError && (
          <div className="empty-state">
            <h3>Couldn't load your writings</h3>
            <p>{loadError}<br />Check that DATABASE_URL is set correctly and the database schema has been created.</p>
          </div>
        )}
        {!loading && !loadError && filtered.length === 0 && (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V4a2 2 0 00-2-2H6.5A2.5 2.5 0 004 4.5v15z" /></svg>
            <h3>{writings.length === 0 ? 'Your shelf is empty' : 'Nothing matches'}</h3>
            <p>{writings.length === 0 ? 'Tap the + button to add the first writing — type it, or scan it from a book.' : 'Try clearing a filter or searching a different word.'}</p>
          </div>
        )}
        {!loading && !loadError && filtered.map((w) => (
          <WritingCard key={w.id} w={w} selectMode={selectMode} selected={selectedIds.has(w.id)}
            onOpen={setViewingId} onToggle={toggleSelect} onToggleFavorite={toggleFavorite} />
        ))}
      </div>

      {!formOpen && !viewingWriting && (
        <button className="fab" onClick={() => { setEditingWriting(null); setFormOpen(true); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      )}

      {selectMode && selectedIds.size > 0 && (
        <div className="bulk-bar">
          <span>{selectedIds.size} selected</span>
          <div className="bulk-actions">
            <button className="bb-btn" onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}>Cancel</button>
            <button className="bb-btn" onClick={() => exportPdf(selectedWritings, templates)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v13m0 0l-4-4m4 4l4-4M4 20h16" /></svg>PDF
            </button>
            <button className="bb-btn primary" onClick={async () => {
              const r = await shareOnWhatsapp(selectedWritings, templates);
              if (r.fallback) showToast("Your device doesn't support sending the file directly — a text summary opened in WhatsApp instead.");
            }}>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 00-8.5 15.2L2 22l4.9-1.3A10 10 0 1012 2z" /></svg>WhatsApp
            </button>
          </div>
        </div>
      )}

      {formOpen && (
        <WritingForm
          existing={editingWriting}
          presets={presets}
          templates={templates}
          globalDefaults={globalDefaults}
          onSave={handleSave}
          onCancel={() => { setFormOpen(false); setEditingWriting(null); }}
          showToast={showToast}
        />
      )}

      {viewingWriting && !formOpen && (
        <WritingViewer
          w={viewingWriting}
          templates={templates}
          onClose={() => setViewingId(null)}
          onEdit={() => { setEditingWriting(viewingWriting); setViewingId(null); setFormOpen(true); }}
          onDelete={() => handleDelete(viewingWriting)}
          onDuplicate={() => duplicateWriting(viewingWriting)}
          showToast={showToast}
        />
      )}

      <Toast message={toast} />
      <ConfirmDialog config={confirmConfig} onCancel={() => setConfirmConfig(null)} onConfirm={() => { confirmConfig?.run?.(); setConfirmConfig(null); }} />
    </div>
  );
}
