import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

// Restores writings from a JSON backup — either the array itself (the shape
// "Download full backup (JSON)" produces) or { writings: [...] }.
// Upserts by id (ON CONFLICT DO UPDATE), so this is safe to run more than
// once: restoring the same file twice never creates duplicates, and existing
// writings that share an id are overwritten with the backup's version rather
// than left duplicated. All rows are applied in a single transaction, so a
// bad row rolls back the whole restore instead of leaving the database half
// updated.
export async function POST(req) {
  try {
    const body = await req.json();
    const writings = Array.isArray(body) ? body : Array.isArray(body?.writings) ? body.writings : null;
    if (!writings) {
      return NextResponse.json({ error: 'Expected a backup file: an array of writings, or { writings: [...] }' }, { status: 400 });
    }
    if (!writings.length) {
      return NextResponse.json({ error: 'That backup file has no writings in it.' }, { status: 400 });
    }

    const bad = [];
    const queries = [];
    writings.forEach((w, i) => {
      if (!w || !w.id || !w.title || !w.class || !w.type || !w.body) {
        bad.push(i);
        return;
      }
      const now = Date.now();
      queries.push(sql`
        INSERT INTO writings
          (id, title, board, class, chapter, type, body, recipient_name, receiver_address, place, opening, closing,
           salutation, sender_name, sender_address, inst_name, notice_subject, issued_by, is_favorite, created_at, updated_at)
        VALUES
          (${w.id}, ${w.title}, ${w.board || ''}, ${w.class}, ${w.chapter || ''}, ${w.type}, ${w.body},
           ${w.recipient_name || ''}, ${w.receiver_address || ''}, ${w.place || ''}, ${w.opening || ''}, ${w.closing || ''},
           ${w.salutation || ''}, ${w.sender_name || ''}, ${w.sender_address || ''}, ${w.inst_name || ''},
           ${w.notice_subject || ''}, ${w.issued_by || ''}, ${!!w.is_favorite},
           ${w.created_at || now}, ${w.updated_at || now})
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title, board = EXCLUDED.board, class = EXCLUDED.class, chapter = EXCLUDED.chapter,
          type = EXCLUDED.type, body = EXCLUDED.body, recipient_name = EXCLUDED.recipient_name,
          receiver_address = EXCLUDED.receiver_address, place = EXCLUDED.place, opening = EXCLUDED.opening,
          closing = EXCLUDED.closing, salutation = EXCLUDED.salutation, sender_name = EXCLUDED.sender_name,
          sender_address = EXCLUDED.sender_address, inst_name = EXCLUDED.inst_name,
          notice_subject = EXCLUDED.notice_subject, issued_by = EXCLUDED.issued_by,
          is_favorite = EXCLUDED.is_favorite, updated_at = EXCLUDED.updated_at
      `);
    });

    if (!queries.length) {
      return NextResponse.json({ error: 'None of the rows in that file look like valid writings.' }, { status: 400 });
    }

    await sql.transaction(queries);

    return NextResponse.json({ ok: true, restored: queries.length, skipped: bad.length });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
