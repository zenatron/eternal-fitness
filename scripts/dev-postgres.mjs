/**
 * Starts a throwaway embedded Postgres for local testing — no Docker needed.
 *
 *   bun run scripts/dev-postgres.mjs           # start (blocks)
 *
 * Matches DATABASE_URL in .env (eternal:eternal@localhost:5433/eternal_fitness)
 * so migrations, integration tests and a dev server all work unchanged.
 * Data lives in .pgdata-test/ — delete it for a fresh database.
 */
import EmbeddedPostgres from 'embedded-postgres';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const pg = new EmbeddedPostgres({
  databaseDir: path.join(ROOT, '.pgdata-test'),
  user: 'eternal',
  password: 'eternal',
  port: 5433,
  persistent: true,
});

await pg.initialise();
await pg.start();
try {
  await pg.createDatabase('eternal_fitness');
} catch (err) {
  if (!String(err).includes('already exists')) throw err;
}
console.log('postgres ready on localhost:5433');

const shutdown = async () => {
  try {
    await pg.stop();
  } finally {
    process.exit(0);
  }
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
