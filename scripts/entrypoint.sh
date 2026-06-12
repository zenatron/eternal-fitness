#!/bin/sh
set -e

MAX_RETRIES=30
RETRY_INTERVAL=2
retry=0

echo "Waiting for database to be ready..."
until bun run scripts/migrate.ts; do
  retry=$((retry + 1))
  if [ $retry -ge $MAX_RETRIES ]; then
    echo "Migration failed after $MAX_RETRIES attempts. Check DATABASE_URL and that the database is reachable."
    exit 1
  fi
  echo "Database not ready (attempt $retry/$MAX_RETRIES). Retrying in ${RETRY_INTERVAL}s..."
  sleep $RETRY_INTERVAL
done

echo "Starting application..."
exec bun run start
