#!/bin/bash
# Keeper: keep the Next dev server alive in the 4GB sandbox.
# If port 3000 stops answering, restart it. Logs to /tmp/keeper.log.
cd /home/z/my-project
while true; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 http://127.0.0.1:3000/ 2>/dev/null)
  if [ "$code" != "200" ]; then
    echo "$(date '+%H:%M:%S') down (code=$code) — restarting" >> /tmp/keeper.log
    pkill -f "next dev" 2>/dev/null
    pkill -f next-server 2>/dev/null
    sleep 2
    NODE_OPTIONS="--max-old-space-size=1536" setsid nohup bun run dev > /tmp/next-dev.log 2>&1 < /dev/null &
    for i in $(seq 1 90); do
      sleep 1
      c=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 http://127.0.0.1:3000/ 2>/dev/null)
      [ "$c" = "200" ] && { echo "$(date '+%H:%M:%S') up after ${i}s" >> /tmp/keeper.log; break; }
    done
  fi
  sleep 10
done
