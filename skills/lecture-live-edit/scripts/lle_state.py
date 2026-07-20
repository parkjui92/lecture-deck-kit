#!/usr/bin/env python3
"""
lecture-live-edit 상태 파일 규약 (server.py / lle.py 공용).

프로젝트 폴더 안의 feedback/ 디렉토리가 시스템의 유일한 상태 저장소다.

    feedback/queue.jsonl    피드백 원본. append-only. 절대 수정·삭제하지 않는다.
    feedback/cursor         지금까지 처리한 queue 라인 수 (정수 1줄).
    feedback/published      게시 토큰. 값이 바뀌면 브라우저가 새로고침한다.
    feedback/applied.jsonl  처리 결과 기록 (id, status, note). append-only.

핵심 원리 — 상태와 신호의 분리:
  "무엇이 미처리인가"는 오직 (queue 라인 수 - cursor) 산술로만 판정한다.
  깨우기 신호(Monitor 알림)는 유실되거나 중복돼도 무해한 힌트일 뿐이다.
  따라서 드레인 도중 새 피드백이 도착해도 유실되지 않는다.
"""
from __future__ import annotations

import json
import os
import time

FEEDBACK_DIR = "feedback"
VERSIONS_DIR = "versions"
QUEUE = "queue.jsonl"
CURSOR = "cursor"
PUBLISHED = "published"
APPLIED = "applied.jsonl"


def fb_dir(root: str) -> str:
    return os.path.join(root, FEEDBACK_DIR)


def fb_path(root: str, name: str) -> str:
    return os.path.join(root, FEEDBACK_DIR, name)


def now_token() -> str:
    return str(int(time.time() * 1000))


def ensure(root: str) -> str:
    """feedback/ 와 상태 파일들을 만든다. 서버 기동 시 반드시 먼저 호출.

    queue.jsonl 을 미리 만들어 두어야 Monitor 의 `tail -F` 가
    파일 부재 상태에서 붙는 경합을 피할 수 있다.
    """
    d = fb_dir(root)
    os.makedirs(d, exist_ok=True)
    for name, initial in ((QUEUE, ""), (APPLIED, ""), (CURSOR, "0\n"),
                          (PUBLISHED, now_token() + "\n")):
        p = os.path.join(d, name)
        if not os.path.exists(p):
            with open(p, "w", encoding="utf-8") as f:
                f.write(initial)
    return d


def read_text(path: str, default: str = "") -> str:
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except OSError:
        return default


def write_atomic(path: str, text: str) -> None:
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(text)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)


def read_int(path: str, default: int = 0) -> int:
    raw = read_text(path).strip()
    try:
        return int(raw)
    except (TypeError, ValueError):
        return default


def read_records(path: str) -> list[dict]:
    out = []
    for line in read_text(path).splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rec = json.loads(line)
        except ValueError:
            continue
        if isinstance(rec, dict):
            out.append(rec)
    return out


def queue_records(root: str) -> list[dict]:
    return read_records(fb_path(root, QUEUE))


def append_record(path: str, record: dict) -> None:
    """정확히 1줄을 append 한다 (개행은 JSON 이스케이프되므로 라인 경계가 깨지지 않는다)."""
    line = json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n"
    with open(path, "ab") as f:
        f.write(line.encode("utf-8"))
        f.flush()
        os.fsync(f.fileno())


def status(root: str) -> dict:
    """오버레이(/__status)와 lle.py 가 함께 쓰는 상태 요약."""
    total = len(queue_records(root))
    cursor = read_int(fb_path(root, CURSOR), 0)
    version = read_text(fb_path(root, PUBLISHED), "0").strip() or "0"

    # 같은 id 가 여러 번 기록되면 마지막 상태가 유효하다 (보류 → 해소 반영).
    final: dict[str, dict] = {}
    for rec in read_records(fb_path(root, APPLIED)):
        rid = rec.get("id")
        if rid:
            final[rid] = rec
    needs_input = sum(1 for r in final.values() if r.get("status") == "needs-input")
    last = None
    applied = read_records(fb_path(root, APPLIED))
    if applied:
        tail = applied[-1]
        last = {k: tail.get(k) for k in ("id", "status", "note", "at") if k in tail}

    return {
        "version": version,
        "queued": total,
        "cursor": cursor,
        "pending": max(0, total - cursor),
        "needsInput": needs_input,
        "last": last,
    }
