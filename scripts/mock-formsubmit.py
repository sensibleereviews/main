#!/usr/bin/env python3
"""Mock FormSubmit AJAX endpoint for local E2E testing of the static export forms.

POST /ajax  -> logs the JSON body to scripts/mock-formsubmit.log and replies
               {"success":"true","message":"Test delivery queued"}
POST /fail  -> replies success:false (error-path testing)
"""

import json
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

LOG = Path(__file__).resolve().parent / "mock-formsubmit.log"


class Handler(BaseHTTPRequestHandler):
    def _reply(self, code: int, body: dict) -> None:
        raw = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._reply(204, {})

    def do_POST(self) -> None:  # noqa: N802
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length).decode("utf-8", "replace")
        ok = self.path != "/fail"
        with LOG.open("a", encoding="utf-8") as fh:
            fh.write(f"\n===== {time.strftime('%H:%M:%S')} {self.path} =====\n{raw}\n")
        self._reply(200 if ok else 400, {"success": "true" if ok else "false", "message": "ok"})

    def log_message(self, *args) -> None:  # silence default stderr noise
        pass


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 8799), Handler).serve_forever()
