import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

// Vercel calls this automatically on the schedule set in vercel.json, sending
// "Authorization: Bearer <CRON_SECRET>". If someone else calls this URL without
// that header matching, it's rejected.
export async function GET(req) {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const rows = await sql`SELECT * FROM writings`;
    await sql`
      INSERT INTO backups (writing_count, snapshot) VALUES (${rows.length}, ${JSON.stringify(rows)}::jsonb)
    `;
    // Keep only the most recent 30 daily snapshots so the table doesn't grow forever.
    await sql`
      DELETE FROM backups WHERE id NOT IN (
        SELECT id FROM backups ORDER BY created_at DESC LIMIT 30
      )
    `;
    return NextResponse.json({ ok: true, backedUp: rows.length, at: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
