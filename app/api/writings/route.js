import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

// By default only her live shelf is returned. Pass ?trash=1 to see what's in the Trash
// instead — nothing is ever hard-deleted from the database, so it's always there to restore.
export async function GET(req) {
  try {
    const wantTrash = new URL(req.url).searchParams.get('trash') === '1';
    const rows = wantTrash
      ? await sql`SELECT * FROM writings WHERE is_deleted = true ORDER BY deleted_at DESC`
      : await sql`SELECT * FROM writings WHERE is_deleted = false ORDER BY updated_at DESC`;
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
    await sql`
      INSERT INTO writings
        (id, title, board, class, chapter, type, body, recipient_name, recipient_type, receiver_address, place, opening, closing,
         salutation, sender_name, sender_address, inst_name, notice_subject, issued_by, is_favorite, is_deleted, created_at, updated_at)
      VALUES
        (${id}, ${w.title}, ${w.board}, ${w.class}, ${w.chapter || ''}, ${w.type}, ${w.body},
         ${w.recipientName || ''}, ${w.recipientType || ''}, ${w.receiverAddress || ''}, ${w.place || ''}, ${w.opening || ''}, ${w.closing || ''},
         ${w.salutation || ''}, ${w.senderName || ''}, ${w.senderAddress || ''}, ${w.instName || ''}, ${w.noticeSubject || ''},
         ${w.issuedBy || ''}, ${!!w.isFavorite}, false, ${now}, ${now})
    `;
    return NextResponse.json({ id, createdAt: now, updatedAt: now });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
