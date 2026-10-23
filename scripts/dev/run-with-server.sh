#!/bin/bash
# Start next dev on :3000 inside this command's lifetime, run the given command, stop server.
# Usage: bash scripts/dev/run-with-server.sh <command...>
cd /home/z/my-project || exit 1

setsid node node_modules/.bin/next dev -p 3000 > scripts/dev/next-dev.log 2>&1 &
SERVER_PID=$!
PGID=$(ps -o pgid= -p "$SERVER_PID" 2>/dev/null | tr -d ' ')
cleanup() {
  if [ -n "$PGID" ]; then
    kill -TERM -- -"$PGID" 2>/dev/null
    sleep 1
    kill -KILL -- -"$PGID" 2>/dev/null
  fi
}
trap cleanup EXIT

up=0
for i in $(seq 1 90); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null)
  if [ "$code" = "200" ]; then up=1; break; fi
  sleep 1
done
if [ "$up" != "1" ]; then
  echo "SERVER FAILED TO START"
  tail -20 scripts/dev/next-dev.log
  exit 1
fi
echo "server ready (attempt $i)"

"$@"
RC=$?
echo "command exit: $RC"
exit $RC
