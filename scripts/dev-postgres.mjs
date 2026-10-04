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
import fs from 'node:fs';

const ROOT = path.resolve(import.meta.dirname, '..');

const DATA_DIR = path.join(ROOT, '.pgdata-test');
// initdb refuses a non-empty directory, so a leftover data dir from a previous
// run used to crash the script with a raw initdb error. An existing,
// initialised cluster is reused as-is (the data IS the point of `persistent`).
const dataDirExists = fs.existsSync(path.join(DATA_DIR, 'PG_VERSION'));
if (dataDirExists) {
  console.log('reusing existing data dir .pgdata-test (delete it for a fresh database)');
}

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: 'eternal',
  password: 'eternal',
  port: 5433,
  persistent: true,
});

if (!dataDirExists) {
  await pg.initialise();
}
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
