import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export async function PUT(req, { params }) {
  try {
    const w = await req.json();
    if (!w.title || !w.class || !w.body || !w.type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const now = Date.now();
    const rows = await sql`
      UPDATE writings SET
        title = ${w.title}, board = ${w.board}, class = ${w.class}, chapter = ${w.chapter || ''},
        type = ${w.type}, body = ${w.body}, recipient_name = ${w.recipientName || ''},
        receiver_address = ${w.receiverAddress || ''}, place = ${w.place || ''}, opening = ${w.opening || ''},
        closing = ${w.closing || ''}, salutation = ${w.salutation || ''}, sender_name = ${w.senderName || ''},
        sender_address = ${w.senderAddress || ''}, inst_name = ${w.instName || ''},
        notice_subject = ${w.noticeSubject || ''}, issued_by = ${w.issuedBy || ''},
        is_favorite = ${!!w.isFavorite}, updated_at = ${now}
      WHERE id = ${params.id}
      RETURNING id
    `;
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true, updatedAt: now });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Quick toggle used by the star button on a card — doesn't require resubmitting the whole form.
export async function PATCH(req, { params }) {
  try {
    const { isFavorite } = await req.json();
    const now = Date.now();
    const rows = await sql`
      UPDATE writings SET is_favorite = ${!!isFavorite}, updated_at = ${now}
      WHERE id = ${params.id}
      RETURNING id
    `;
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true, updatedAt: now });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const rows = await sql`DELETE FROM writings WHERE id = ${params.id} RETURNING id`;
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
