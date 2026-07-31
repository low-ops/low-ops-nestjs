#!/bin/sh
set -e

build_database_url() {
  node <<'NODE'
const user = process.env.POSTGRES_USER;
const password = process.env.POSTGRES_PASSWORD;
const host = process.env.POSTGRES_HOST;
const port = process.env.POSTGRES_PORT || '5432';
const database = process.env.POSTGRES_DATABASE;

if (process.env.DATABASE_URL) {
  process.stdout.write(process.env.DATABASE_URL);
  process.exit(0);
}

if (!user || !password || !host || !database) {
  process.exit(0);
}

process.stdout.write(
  `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}?schema=public`,
);
NODE
}

DB_URL="$(build_database_url || true)"

if [ -n "$DB_URL" ]; then
  export DATABASE_URL="$DB_URL"
  echo "Running Prisma migrations..."

  attempt=1
  max_attempts=30
  until npx prisma migrate deploy; do
    if [ "$attempt" -ge "$max_attempts" ]; then
      echo "Prisma migrate deploy failed after ${max_attempts} attempts"
      exit 1
    fi
    echo "Database not ready (attempt ${attempt}/${max_attempts}), retrying in 2s..."
    attempt=$((attempt + 1))
    sleep 2
  done
else
  echo "WARNING: POSTGRES_* / DATABASE_URL not set. Skipping migrations and using in-memory fallback."
fi

exec node dist/main.js
