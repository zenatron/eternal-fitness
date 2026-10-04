#!/bin/sh
set -e

MAX_RETRIES=30
RETRY_INTERVAL=2
retry=0

echo "Waiting for database to be ready..."
until bun run scripts/migrate.ts 2>&1 | tee /tmp/migrate.log; do
  # A cold compose start needs retries while Postgres boots. A DETERMINISTIC
  # failure (bad SQL, dirty migration state) is not going to heal — retrying
  # it 30 times under restart=unless-stopped meant an invisible 60s×∞ crash
  # loop instead of a fast, loud halt. Connection failures retry; anything
  # else fails immediately.
  if ! grep -qiE "ECONNREFUSED|ETIMEDOUT|ENOTFOUND|connection.*(refused|timeout)" /tmp/migrate.log; then
    echo "Migration failed with a non-connection error; not retrying. Output:"
    cat /tmp/migrate.log
    exit 1
  fi
  retry=$((retry + 1))
  if [ $retry -ge $MAX_RETRIES ]; then
    echo "Migration failed after $MAX_RETRIES attempts. Check DATABASE_URL and that the database is reachable."
    exit 1
  fi
  echo "Database not ready (attempt $retry/$MAX_RETRIES). Retrying in ${RETRY_INTERVAL}s..."
  sleep $RETRY_INTERVAL
done

echo "Starting application..."
# The standalone server, not `next start`: Next 15 explicitly refuses
# `next start` against an `output: standalone` build, and it only ever booted
# because next.config.mjs (where the flag lives) is not copied into the
# runner. server.js is the supported entrypoint for this output mode.
exec bun server.js
