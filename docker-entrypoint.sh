#!/bin/sh
set -e

# Ensure the SQLite volume directory exists.
mkdir -p /data

# Apply pending migrations to the persistent database.
npx prisma migrate deploy

# Seed mock users on first boot (idempotent upserts).
if [ "${SEED_ON_START:-true}" = "true" ]; then
  node prisma/seed.mjs || true
fi

exec "$@"
