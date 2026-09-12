import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM writings ORDER BY updated_at DESC`;
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const w = await req.json();
    if (!w.title || !w.class || !w.body || !w.type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const id = w.id || crypto.randomUUID();
    const now = Date.now();
    const rows = await sql`
      INSERT INTO writings
        (id, title, board, class, chapter, type, body, recipient_name, receiver_address, place, opening, closing,
         salutation, sender_name, sender_address, inst_name, notice_subject, issued_by, is_favorite, created_at, updated_at)
      VALUES
        (${id}, ${w.title}, ${w.board}, ${w.class}, ${w.chapter || ''}, ${w.type}, ${w.body},
         ${w.recipientName || ''}, ${w.receiverAddress || ''}, ${w.place || ''}, ${w.opening || ''}, ${w.closing || ''},
         ${w.salutation || ''}, ${w.senderName || ''}, ${w.senderAddress || ''}, ${w.instName || ''}, ${w.noticeSubject || ''},
         ${w.issuedBy || ''}, ${!!w.isFavorite}, ${now}, ${now})
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `;
    // A conflict here means this exact id was already saved (e.g. a retried
    // request after a slow network) — treat it as success rather than
    // silently losing the writing or erroring out.
    if (!rows.length) return NextResponse.json({ id, createdAt: now, updatedAt: now, alreadySaved: true });
    return NextResponse.json({ id, createdAt: now, updatedAt: now });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Bulk-delete used by "Select" mode on the shelf, so cleaning up several
// writings at once doesn't need one request per item.
export async function DELETE(req) {
  try {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || !ids.length) {
      return NextResponse.json({ error: 'No writings specified to delete' }, { status: 400 });
    }
    const rows = await sql`DELETE FROM writings WHERE id = ANY(${ids}) RETURNING id`;
    return NextResponse.json({ ok: true, deleted: rows.length });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
