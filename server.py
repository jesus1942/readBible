#!/usr/bin/env python3
import http.server
import socketserver
import urllib.parse
import urllib.request
from functools import partial


class PWAHandler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors()
        self.end_headers()

    def do_GET(self):
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

    def _send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
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
