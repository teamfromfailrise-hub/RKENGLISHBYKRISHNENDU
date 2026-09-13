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
        recipient_type = ${w.recipientType || ''},
        receiver_address = ${w.receiverAddress || ''}, place = ${w.place || ''}, opening = ${w.opening || ''},
        closing = ${w.closing || ''}, salutation = ${w.salutation || ''}, sender_name = ${w.senderName || ''},
        sender_address = ${w.senderAddress || ''}, inst_name = ${w.instName || ''},
        notice_subject = ${w.noticeSubject || ''}, issued_by = ${w.issuedBy || ''},
        is_favorite = ${!!w.isFavorite}, updated_at = ${now}
      WHERE id = ${params.id} AND is_deleted = false
      RETURNING id
    `;
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true, updatedAt: now });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Quick partial updates used by the UI without resubmitting the whole form:
//  - { isFavorite } toggles the star on a card
//  - { restore: true } brings a writing back out of the Trash
export async function PATCH(req, { params }) {
  try {
    const body = await req.json();
    const now = Date.now();

    if (body.restore) {
      const rows = await sql`
        UPDATE writings SET is_deleted = false, deleted_at = NULL, updated_at = ${now}
        WHERE id = ${params.id}
        RETURNING id
      `;
      if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ ok: true, restored: true, updatedAt: now });
    }

    if (typeof body.isFavorite === 'boolean') {
      const rows = await sql`
        UPDATE writings SET is_favorite = ${body.isFavorite}, updated_at = ${now}
        WHERE id = ${params.id} AND is_deleted = false
        RETURNING id
      `;
      if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ ok: true, updatedAt: now });
    }

    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Moves a writing to the Trash. This NEVER erases the row from the database — she can
// restore it from Settings → Trash at any time, for as long as she keeps the app.
export async function DELETE(req, { params }) {
  try {
    const now = Date.now();
    const rows = await sql`
      UPDATE writings SET is_deleted = true, deleted_at = ${now}
      WHERE id = ${params.id} AND is_deleted = false
      RETURNING id
    `;
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
