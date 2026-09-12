export const BOARD_OPTIONS = ['English Medium', 'Bengali Medium'];

export const CLASS_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i + 1));

// "format" controls how WritingViewer / lib/pdf.js lay the piece out.
// "openings" / "closings" are the BUILT-IN starter phrases — she can add her own in Settings,
// and those merge in on top of these at compose time. A closing may contain a "\n" — that
// renders as two separate lines (the WBBSE convention is a valediction line like
// "Thanking you," followed by a subscription line like "Yours faithfully").
export const WRITING_TYPES = {
  paragraph: { label: 'Paragraph', chapterField: true, format: 'plain' },
  story: { label: 'Story / Story Completion', chapterField: true, format: 'plain' },
  formal_letter: {
    label: 'Formal Letter',
    chapterField: false,
    format: 'formal_letter',
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
    defaultSalutation: 'Sir',
    openings: ['I beg to state that…', 'With due respect, I would like to inform you that…'],
    closings: ['Thanking you,\nYours faithfully', 'Thanking you,\nYours obediently', 'Yours faithfully']
  },
  personal_letter: {
    label: 'Personal Letter',
    chapterField: false,
    format: 'personal_letter',
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
    defaultSalutation: 'Sir',
    openings: [
      'At the beginning of the letter, I would like to state that…',
      'Through the columns of your esteemed newspaper, I wish to draw the attention of the authority concerned to…',
      'I want to focus on a burning issue through the courtesy of your widely circulated daily.'
    ],
    closings: ['Thanking you,\nYours faithfully', 'Thanking you,\nSincerely yours', 'Yours faithfully', 'Yours truly']
  },
  newspaper_report: { label: 'Newspaper Report', chapterField: false, format: 'report' },
  notice: { label: 'Notice', chapterField: false, format: 'notice' },
  process_writing: { label: 'Process / Procedure Writing', chapterField: true, format: 'plain' },
  speech: { label: 'Speech Writing', chapterField: false, format: 'plain' },
  dialogue: { label: 'Dialogue Writing', chapterField: false, format: 'plain' },
  substance: { label: 'Substance Writing / Summary', chapterField: true, format: 'plain' },
  other: { label: 'Other', chapterField: true, format: 'plain' }
};

export const LETTER_FORMATS = ['formal_letter', 'application', 'personal_letter', 'editorial_letter'];
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
