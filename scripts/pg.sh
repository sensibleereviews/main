#!/bin/bash
# Sensiblee sandbox Postgres (embedded binaries, no root) — idempotent starter
# Usage: bash scripts/pg.sh   → ensures postgres is running on 127.0.0.1:5433
PGBIN=/home/z/my-project/scripts/pg/node_modules/@embedded-postgres/linux-x64/native/bin
PGDATA=/home/z/my-project/scripts/pg/data
PGURL="postgresql://sensiblee@127.0.0.1:5433/postgres"

chmod +x "$PGBIN"/* 2>/dev/null

if "$PGBIN/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then
  echo "postgres already running"
else
  if [ ! -f "$PGDATA/PG_VERSION" ]; then
    echo "initializing cluster..."
    "$PGBIN/initdb" -D "$PGDATA" -U sensiblee --auth=trust -E UTF8 >/dev/null
  fi
  "$PGBIN/pg_ctl" -D "$PGDATA" -l "$PGDATA/pg.log" -o "-p 5433 -c listen_addresses=127.0.0.1 -k /tmp" start
  for i in $(seq 1 30); do
    (echo > /dev/tcp/127.0.0.1/5433) >/dev/null 2>&1 && break
    sleep 1
  done
fi

(echo > /dev/tcp/127.0.0.1/5433) >/dev/null 2>&1 || { echo "FATAL: postgres not listening on 5433"; tail -20 "$PGDATA/pg.log"; exit 1; }

# create the app database if missing (idempotent — ignore "already exists")
cd /home/z/my-project && echo 'CREATE DATABASE sensiblee' | npx prisma db execute --url "$PGURL" --stdin >/dev/null 2>&1

(echo > /dev/tcp/127.0.0.1/5433) >/dev/null 2>&1 && echo "postgres ready: postgresql://sensiblee@127.0.0.1:5433/sensiblee"
