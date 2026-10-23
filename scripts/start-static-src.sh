#!/bin/bash
# Start the static-export source server (prod build of the clone) on :3200
cd /home/z/my-project/sensiblee-static-build
export DATABASE_URL=file:/home/z/my-project/sensiblee-static-build/db/custom.db
export PORT=3200
if curl -s -o /dev/null -m 2 http://localhost:3200/; then echo "already up"; exit 0; fi
(setsid nohup npx next start -p 3200 >/tmp/static-src.log 2>&1 &)
for i in $(seq 1 30); do
  sleep 1
  if curl -s -o /dev/null -m 2 http://localhost:3200/; then echo "up after ${i}s"; exit 0; fi
done
echo "FAILED to start"; tail -20 /tmp/static-src.log; exit 1
