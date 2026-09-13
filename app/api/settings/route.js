import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

const ALLOWED_KEYS = new Set(['presets', 'templates', 'recipients']);

export async function GET(req) {
  try {
    const key = new URL(req.url).searchParams.get('key');
    if (!ALLOWED_KEYS.has(key)) return NextResponse.json({ error: 'Unknown settings key' }, { status: 400 });
    const rows = await sql`SELECT data FROM app_settings WHERE key = ${key}`;
    return NextResponse.json(rows[0]?.data || {});
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { key, data } = await req.json();
    if (!ALLOWED_KEYS.has(key)) return NextResponse.json({ error: 'Unknown settings key' }, { status: 400 });
    await sql`
      INSERT INTO app_settings (key, data) VALUES (${key}, ${JSON.stringify(data)}::jsonb)
      ON CONFLICT (key) DO UPDATE SET data = ${JSON.stringify(data)}::jsonb
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
