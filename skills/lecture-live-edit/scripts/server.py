#!/usr/bin/env python3
"""
lecture-live-edit — HTML 강의자료 라이브 편집 서버.

브라우저에 띄운 강의자료(HTML)에 편집 오버레이를 주입하고, 사용자가 화면에서
텍스트를 하이라이트해 남긴 수정 지시를 feedback/queue.jsonl 에 적재한다.
Claude 는 그 큐를 드레인해 HTML 을 고치고, 오버레이가 자동으로 화면을 갱신한다.

    python3 server.py --root <프로젝트폴더> --port 4601

원칙
  - 파이썬 표준 라이브러리만 사용한다 (설치 불필요).
  - 127.0.0.1 에만 바인딩한다 (외부 비노출 → 별도 인증 불필요).
  - 원본 HTML 파일은 절대 건드리지 않는다. 오버레이 <script> 는 응답 시점에만
    끼워 넣으므로, 디스크의 산출물은 언제나 그대로 배포 가능한 클린 상태다.
    (?clean=1 을 붙이면 주입 없이 원본 그대로 확인할 수 있다.)
"""
from __future__ import annotations

import argparse
import json
import os
import socket
import sys
import threading
import time
import unicodedata
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lle_state as st  # noqa: E402

TOOL_DIR = os.path.dirname(os.path.abspath(__file__))
EDITOR_JS = os.path.join(TOOL_DIR, "editor.js")
INJECT_MARK = b"/__editor/editor.js"
INJECT_TAG = b'<script src="/__editor/editor.js" data-lle-injected></script>'
MAX_BODY = 64 * 1024

_append_lock = threading.Lock()
_seq = [0]


def inject(body: bytes) -> bytes:
    """</body> 직전에 오버레이 스크립트를 끼운다. 없으면 말미에 붙인다."""
    if INJECT_MARK in body:
        return body
    idx = body.lower().rfind(b"</body>")
    if idx == -1:
        return body + b"\n" + INJECT_TAG + b"\n"
    return body[:idx] + INJECT_TAG + b"\n" + body[idx:]


class Handler(SimpleHTTPRequestHandler):
    server_version = "lecture-live-edit/1.0"

    # ── 경로 해석 ────────────────────────────────────────────────
    def translate_path(self, path: str) -> str:
        """macOS 한글 파일명 정규화(NFC/NFD) 불일치를 흡수한다.

        사용자가 떨군 한글 이미지 파일이 404 나는 실측 함정에 대한 방어.
        """
        p = super().translate_path(path)
        if os.path.exists(p):
            return p
        for form in ("NFD", "NFC"):
            alt = unicodedata.normalize(form, p)
            if alt != p and os.path.exists(alt):
                return alt
        return p

    # ── GET ─────────────────────────────────────────────────────
    def do_GET(self) -> None:  # noqa: N802
        parts = urlsplit(self.path)
        route = unquote(parts.path)

        if route == "/__editor/editor.js":
            return self._serve_editor()
        if route == "/__status":
            return self._serve_status()

        fs_path = self.translate_path(self.path)
        if os.path.isdir(fs_path):
            for cand in ("deck.html", "index.html"):
                probe = os.path.join(fs_path, cand)
                if os.path.isfile(probe):
                    fs_path = probe
                    break
        if fs_path.lower().endswith((".html", ".htm")) and os.path.isfile(fs_path):
            return self._serve_html(fs_path, parts.query)
        return super().do_GET()

    def _serve_bytes(self, body: bytes, ctype: str, code: int = 200) -> None:
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _serve_html(self, fs_path: str, query: str) -> None:
        try:
            with open(fs_path, "rb") as f:
                body = f.read()
        except OSError:
            self.send_error(404, "File not found")
            return
        if "clean=1" not in query:
            body = inject(body)
        self._serve_bytes(body, "text/html; charset=utf-8")

    def _serve_editor(self) -> None:
        try:
            with open(EDITOR_JS, "rb") as f:
                body = f.read()
        except OSError:
            self.send_error(500, "editor.js missing")
            return
        self._serve_bytes(body, "text/javascript; charset=utf-8")

    def _serve_status(self) -> None:
        payload = json.dumps(st.status(self.server.lle_root), ensure_ascii=False)
        self._serve_bytes(payload.encode("utf-8"), "application/json; charset=utf-8")

    # ── POST ────────────────────────────────────────────────────
    def do_POST(self) -> None:  # noqa: N802
        if urlsplit(self.path).path != "/__feedback":
            self.send_error(404, "Unknown endpoint")
            return
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = 0
        if length <= 0:
            self.send_error(400, "Empty body")
            return
        if length > MAX_BODY:
            self.send_error(413, "Feedback too large")
            return
        try:
            item = json.loads(self.rfile.read(length).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            self.send_error(400, "Invalid JSON")
            return
        if not isinstance(item, dict):
            self.send_error(400, "Expected an object")
            return

        instruction = (item.get("instruction") or "").strip()
        quick = item.get("quickActions") or []
        if not instruction and not quick:
            self.send_error(400, "Empty feedback")
            return

        root = self.server.lle_root
        with _append_lock:
            _seq[0] += 1
            item["id"] = "f%d-%d" % (int(time.time() * 1000), _seq[0])
            item["at"] = time.strftime("%Y-%m-%d %H:%M:%S")
            st.append_record(st.fb_path(root, st.QUEUE), item)
            queued = len(st.queue_records(root))

        sid = item.get("sid") or ("#%s" % item.get("index")) or "?"
        preview = (instruction or " / ".join(quick))[:60].replace("\n", " ")
        sys.stdout.write("[feedback] %s | %s | queued=%d\n" % (sid, preview, queued))
        sys.stdout.flush()

        body = json.dumps({"ok": True, "id": item["id"], "queued": queued}).encode()
        self._serve_bytes(body, "application/json; charset=utf-8")

    # ── 로그 ────────────────────────────────────────────────────
    def log_message(self, fmt: str, *args) -> None:
        # 1초 폴링(/__status)과 오버레이 요청이 로그를 뒤덮지 않게 한다.
        line = fmt % args
        if "/__status" in line or "/__editor/" in line:
            return
        sys.stderr.write("%s\n" % line)


def main() -> int:
    ap = argparse.ArgumentParser(description="HTML 강의자료 라이브 편집 서버")
    ap.add_argument("--root", default=".", help="강의 프로젝트 폴더 (deck.html 이 있는 곳)")
    ap.add_argument("--port", type=int, default=4601, help="포트 (launch.json 과 일치해야 함)")
    args = ap.parse_args()

    root = os.path.abspath(os.path.expanduser(args.root))
    if not os.path.isdir(root):
        sys.stderr.write("[오류] --root 폴더가 없습니다: %s\n" % root)
        return 1

    st.ensure(root)
    ThreadingHTTPServer.allow_reuse_address = True
    try:
        httpd = ThreadingHTTPServer(("127.0.0.1", args.port),
                                    partial(Handler, directory=root))
    except OSError as exc:
        if exc.errno in (48, 98):  # EADDRINUSE (macOS 48 / Linux 98)
            sys.stderr.write(
                "[오류] 포트 %d 를 이미 다른 프로세스가 쓰고 있습니다.\n"
                "       이 강의의 서버가 이미 떠 있다면 그대로 쓰면 됩니다.\n"
                "       다른 프로그램이라면 .claude/launch.json 의 포트를 바꾸세요.\n"
                % args.port)
        else:
            sys.stderr.write("[오류] 서버 기동 실패: %s\n" % exc)
        return 1

    httpd.lle_root = root
    sys.stdout.write("lecture-live-edit  http://127.0.0.1:%d/  (root=%s)\n"
                     % (args.port, root))
    sys.stdout.write("피드백 큐: %s\n" % st.fb_path(root, st.QUEUE))
    sys.stdout.flush()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
