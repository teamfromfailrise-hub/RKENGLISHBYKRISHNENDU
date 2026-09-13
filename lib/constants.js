export const BOARD_OPTIONS = ['English Medium', 'Bengali Medium'];

export const CLASS_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i + 1));

// "format" controls how WritingViewer / lib/pdf.js lay the piece out.
// "openings" / "closings" are the BUILT-IN starter phrases — she can add her own in Settings,
// and those merge in on top of these at compose time. A closing may contain a "\n" — that
// renders as two separate lines (the WBBSE convention is a valediction line like
// "Thanking you," followed by a subscription line like "Yours faithfully").
// "format" controls how WritingViewer / lib/pdf.js lay the piece out.
// "color" is purely a screen convenience — a distinct accent so the shelf is easy to scan
// at a glance — and is never used in the printed PDF, which stays in the formal ink/seal palette.
// "openings" / "closings" are the BUILT-IN starter phrases — she can add her own in Settings,
// and those merge in on top of these at compose time. A closing may contain a "\n" — that
// renders as two separate lines (the WBBSE convention is a valediction line like
// "Thanking you," followed by a subscription line like "Yours faithfully").
export const WRITING_TYPES = {
  paragraph: { label: 'Paragraph', chapterField: true, format: 'plain', color: '#7C5CFF' },
  story: { label: 'Story / Story Completion', chapterField: true, format: 'plain', color: '#FF6FA5' },
  formal_letter: {
    label: 'Formal Letter',
    chapterField: false,
    format: 'formal_letter',
    color: '#1D8FE1',
    defaultSalutation: 'Sir',
    openings: [
      'At the outset, I would like to state that…',
      'I am writing this letter to bring to your notice that…',
      'With due respect, I beg to state that…'
    ],
    closings: ['Thanking you,\nYours faithfully', 'Thanking you,\nYours obediently', 'Yours faithfully', 'Yours obediently']
  },
  application: {
    label: 'Application',
    chapterField: false,
    format: 'formal_letter',
    color: '#12B8A6',
    defaultSalutation: 'Sir',
    openings: ['I beg to state that…', 'With due respect, I would like to inform you that…'],
    closings: ['Thanking you,\nYours faithfully', 'Thanking you,\nYours obediently', 'Yours faithfully']
  },
  personal_letter: {
    label: 'Personal Letter',
    chapterField: false,
    format: 'personal_letter',
    color: '#FF9F2E',
    openings: [
      'Hope this letter finds you in the best of health and spirits.',
      'I was really happy to receive your letter.'
    ],
    closings: ['Yours affectionately', 'Yours lovingly', 'Yours ever']
  },
  editorial_letter: {
    label: 'Letter to the Editor',
    chapterField: false,
    format: 'editor_letter',
    color: '#A855F7',
    defaultSalutation: 'Sir',
    openings: [
      'At the beginning of the letter, I would like to state that…',
      'Through the columns of your esteemed newspaper, I wish to draw the attention of the authority concerned to…',
      'I want to focus on a burning issue through the courtesy of your widely circulated daily.'
    ],
    closings: ['Thanking you,\nYours faithfully', 'Thanking you,\nSincerely yours', 'Yours faithfully', 'Yours truly']
  },
  newspaper_report: { label: 'Newspaper Report', chapterField: false, format: 'report', color: '#2563EB' },
  notice: { label: 'Notice', chapterField: false, format: 'notice', color: '#E11D48' },
  process_writing: { label: 'Process / Procedure Writing', chapterField: true, format: 'plain', color: '#16A34A' },
  speech: { label: 'Speech Writing', chapterField: false, format: 'plain', color: '#D97706' },
  dialogue: { label: 'Dialogue Writing', chapterField: false, format: 'plain', color: '#0EA5E9' },
  substance: { label: 'Substance Writing / Summary', chapterField: true, format: 'plain', color: '#64748B' },
  other: { label: 'Other', chapterField: true, format: 'plain', color: '#78716C' }
};

// Quick "who is this to" presets for official letters/applications — picking one fills in
// the recipient line and salutation for that authority, while the letter's overall layout
// (To, / salutation / body / Thanking you / signature / date) stays exactly the same, since
// that structure is personal to her taught format, not tied to who the letter is addressed to.
export const OFFICIAL_RECIPIENTS = [
  { key: 'headmaster', label: 'Headmaster / Headmistress', recipientName: 'The Headmaster/Headmistress', addressHint: 'e.g. [School name],\n[School address]' },
  { key: 'class_teacher', label: 'Class Teacher', recipientName: 'The Class Teacher', addressHint: 'e.g. [School name],\n[School address]' },
  { key: 'bdo', label: 'BDO (Block Development Officer)', recipientName: 'The Block Development Officer', addressHint: 'e.g. [Block] Development Block,\n[District], [PIN]' },
  { key: 'gram_panchayat', label: 'Gram Panchayat Pradhan', recipientName: 'The Pradhan, [Gram Panchayat Name] Gram Panchayat', addressHint: 'e.g. [Gram Panchayat name],\n[Post Office], [District], [PIN]' },
  { key: 'municipality', label: 'Municipality Chairman / Councillor', recipientName: 'The Chairman, [Municipality Name] Municipality', addressHint: 'e.g. [Municipality office address]' },
  { key: 'sdo', label: 'SDO (Sub-Divisional Officer)', recipientName: 'The Sub-Divisional Officer', addressHint: 'e.g. [Sub-division], [District], [PIN]' },
  { key: 'district_magistrate', label: 'District Magistrate', recipientName: 'The District Magistrate', addressHint: 'e.g. [District] Collectorate,\n[District], [PIN]' },
  { key: 'officer_in_charge', label: 'Officer-in-Charge (Police Station)', recipientName: 'The Officer-in-Charge, [Police Station Name] Police Station', addressHint: 'e.g. [Police Station address]' },
  { key: 'postmaster', label: 'Postmaster', recipientName: 'The Postmaster', addressHint: 'e.g. [Post Office name and address]' },
  { key: 'bank_manager', label: 'Bank Manager', recipientName: 'The Manager, [Bank Name]', addressHint: 'e.g. [Branch address]' },
  { key: 'other', label: 'Someone else / custom', recipientName: '', addressHint: '' }
];

export const LETTER_FORMATS = ['formal_letter', 'application', 'personal_letter', 'editorial_letter'];
// Formats where the "who is this addressed to" quick-picker (OFFICIAL_RECIPIENTS) applies —
// personal letters and letters to the editor already have their own dedicated recipient field.
export const RECIPIENT_PICKER_FORMATS = ['formal_letter', 'application'];
// Formats that use the "To, [receiver's address] ... Sir, ... Thanking you, Yours faithfully ...
// [sender's name and address] ... Dated ___" structure, as opposed to the simpler "Dear X" personal style.
export const ADDRESS_BLOCK_FORMATS = ['formal_letter', 'application', 'editorial_letter'];
export const LEARNABLE_FORMATS = [...LETTER_FORMATS, 'notice'];

export function uid() {
  return (crypto.randomUUID ? crypto.randomUUID() : 'w' + Date.now() + Math.random().toString(36).slice(2));
}

export function todayStr() {
  return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function paragraphs(body) {
  const parts = (body || '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : [(body || '').trim()];
}

// Splits a possibly-multi-line address/closing string into its individual, trimmed lines.
export function textLines(s) {
  return (s || '').split('\n').map((l) => l.trim()).filter(Boolean);
}

// Merge her custom phrases (from Settings) on top of the built-ins for a given type.
export function openingsFor(type, templates) {
  const base = WRITING_TYPES[type]?.openings || [];
  const extra = templates?.[type]?.extraOpenings || [];
  return [...base, ...extra];
}
export function closingsFor(type, templates) {
  const base = WRITING_TYPES[type]?.closings || [];
  const extra = templates?.[type]?.extraClosings || [];
  return [...base, ...extra];
}
