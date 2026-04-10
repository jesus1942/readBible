#!/usr/bin/env python3
import http.server
import os
import socketserver
import urllib.parse
import urllib.request
from functools import partial


class PWAHandler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _read_request_body(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0:
            return None
        return self.rfile.read(length)

    def _proxy_api(self):
        target_base = os.environ.get("API_PROXY_TARGET", "").rstrip("/")
        if not target_base:
            self.send_response(502)
            self._send_cors()
            self.end_headers()
            self.wfile.write(b"API proxy target not configured")
            return
        target_url = f"{target_base}{self.path[4:]}"
        body = self._read_request_body()
        headers = {
            key: value
            for key, value in self.headers.items()
            if key.lower() not in {"host", "connection", "origin"}
        }
        try:
            req = urllib.request.Request(
                target_url,
                data=body,
                headers=headers,
                method=self.command,
            )
            with urllib.request.urlopen(req, timeout=20) as resp:
                response_body = resp.read()
                self.send_response(resp.status)
                self._send_cors()
                for key, value in resp.headers.items():
                    lower = key.lower()
                    if lower in {"transfer-encoding", "connection", "access-control-allow-origin", "content-length"}:
                        continue
                    self.send_header(key, value)
                self.send_header("Content-Length", str(len(response_body)))
                self.end_headers()
                self.wfile.write(response_body)
        except urllib.error.HTTPError as exc:
            response_body = exc.read()
            self.send_response(exc.code)
            self._send_cors()
            content_type = exc.headers.get("Content-Type")
            if content_type:
                self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(response_body)))
            self.end_headers()
            self.wfile.write(response_body)
        except Exception as exc:
            self.send_response(502)
            self._send_cors()
            payload = f"API proxy error: {exc}".encode("utf-8")
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

    def do_OPTIONS(self):
        if self.path.startswith("/api/"):
            self.send_response(204)
            self._send_cors()
            self.end_headers()
            return
        self.send_response(204)
        self._send_cors()
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/api/"):
            self._proxy_api()
            return
        if self.path.startswith("/proxy"):
            parsed = urllib.parse.urlparse(self.path)
            params = urllib.parse.parse_qs(parsed.query)
            target = params.get("url", [None])[0]
            if not target:
                self.send_response(400)
                self._send_cors()
                self.end_headers()
                self.wfile.write(b"Missing url parameter")
                return
            try:
                req = urllib.request.Request(
                    target,
                    headers={"User-Agent": "BibleApp-PWA-Proxy"},
                )
                with urllib.request.urlopen(req, timeout=20) as resp:
                    body = resp.read()
                    self.send_response(resp.status)
                    self._send_cors()
                    self.send_header("Content-Type", resp.headers.get("Content-Type", "text/html"))
                    self.end_headers()
                    self.wfile.write(body)
            except Exception as exc:
                self.send_response(502)
                self._send_cors()
                self.end_headers()
                self.wfile.write(f"Proxy error: {exc}".encode("utf-8"))
            return
        super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/"):
            self._proxy_api()
            return
        self.send_response(405)
        self._send_cors()
        self.end_headers()

    def _send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--directory", default=".")
    args = parser.parse_args()

    handler = partial(PWAHandler, directory=args.directory)
    with socketserver.ThreadingTCPServer(("", args.port), handler) as httpd:
        print(f"Servidor PWA en http://0.0.0.0:{args.port}/")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
