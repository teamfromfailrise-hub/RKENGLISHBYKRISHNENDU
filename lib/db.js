import { neon } from '@neondatabase/serverless';

let _client;

function getClient() {
  if (!_client) {
    if (!process.env.DATABASE_URL) {
      // Thrown only when a request actually tries to use the DB, not at build time.
      throw new Error('DATABASE_URL is not set. Add it in .env.local or your Vercel project settings.');
    }
    _client = neon(process.env.DATABASE_URL);
  }
  return _client;
}

// Forwards tagged-template calls (sql`SELECT ...`) to a lazily-created neon
// client, so importing this module never touches DATABASE_URL until a request
// actually runs a query. This avoids build-time crashes when env vars aren't
// available during Vercel's "collect page data" step.
export const sql = (...args) => getClient()(...args);

// Runs several sql`...` queries as a single all-or-nothing Postgres transaction
// (e.g. restoring many writings, or an insert-then-prune pair). If any query
// in the list fails, none of them are applied — the data never ends up
// half-written. Build each query with sql`...` as usual and pass them as an
// array to this.
sql.transaction = (queries, opts) => getClient().transaction(queries, opts);
