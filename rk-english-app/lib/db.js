import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  // Thrown only when a request actually tries to use the DB, not at build time.
  console.warn('DATABASE_URL is not set. Add it in .env.local or your Vercel project settings.');
}

export const sql = neon(process.env.DATABASE_URL);
