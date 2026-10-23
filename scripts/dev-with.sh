#!/bin/bash
# Start the Next dev server, wait for readiness, then keep it in foreground of this script.
cd /home/z/my-project
pkill -f "next-server" 2>/dev/null
pkill -f "bun run dev" 2>/dev/null
sleep 1
bun run dev > /tmp/next-dev.log 2>&1 &
DEV_PID=$!
for i in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ 2>/dev/null)
  if [ "$code" = "200" ]; then echo "dev ready after ${i}s"; break; fi
  sleep 1
done
if [ $# -gt 0 ]; then
  "$@"
  TEST_RC=$?
  kill $DEV_PID 2>/dev/null
  exit $TEST_RC
fi
wait $DEV_PID
