#!/usr/bin/env python3
"""
lle — 라이브 편집 큐를 다루는 Claude 전용 CLI.

Claude 는 이 CLI 로만 상태 파일을 만진다. 손으로 cursor 를 고치거나
queue.jsonl 을 편집하지 않는다 (멱등성이 깨진다).

드레인 의식 (2단계):

    python3 lle.py pending --root <프로젝트>
        → 미처리 피드백을 JSON 으로 출력하고, 편집 전 스냅샷을 versions/ 에 남긴다.
          출력의 "cursor_after" 값을 그대로 다음 단계에 넘긴다.

    ... 여기서 Claude 가 deck.html 을 Edit 로 수정 ...

    python3 lle.py done --root <프로젝트> --cursor <cursor_after> --note "무엇을 고쳤는지"
        → 처리 결과를 기록하고 커서를 전진시킨 뒤 게시 토큰을 올린다.
          이 시점에 브라우저가 자동으로 새로고침된다.

그 밖에:
    status  현재 대기 건수 확인
    adopt   data-sid 없는 기존 덱에 슬라이드 ID 를 1회 부여 (입양 의식)
    revert  가장 최근 스냅샷으로 되돌리기
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lle_state as st  # noqa: E402


def _root(args) -> str:
    return os.path.abspath(os.path.expanduser(args.root))


def _html_files(root: str) -> list[str]:
    return sorted(
        os.path.join(root, n) for n in os.listdir(root)
        if n.lower().endswith((".html", ".htm")) and os.path.isfile(os.path.join(root, n))
    )


def _snapshot(root: str, note: str = "") -> str | None:
    """편집 직전 상태를 versions/<타임스탬프>/ 에 보존한다."""
    files = _html_files(root)
    if not files:
        return None
    stamp = time.strftime("%Y%m%d-%H%M%S")
    dest = os.path.join(root, st.VERSIONS_DIR, stamp)
    if os.path.exists(dest):
        dest += "-2"
    os.makedirs(dest, exist_ok=True)
    for f in files:
        shutil.copy2(f, os.path.join(dest, os.path.basename(f)))
    if note:
        with open(os.path.join(dest, "NOTE.txt"), "w", encoding="utf-8") as fh:
            fh.write(note + "\n")
    return dest


# ── pending ─────────────────────────────────────────────────────
def cmd_pending(args) -> int:
    root = _root(args)
    st.ensure(root)
    records = st.queue_records(root)
    cursor = st.read_int(st.fb_path(root, st.CURSOR), 0)
    fresh = records[cursor:]

    snapshot = None
    if fresh and not args.no_snapshot:
        snapshot = _snapshot(root, "드레인 직전 스냅샷 (%d건 반영 예정)" % len(fresh))

    print(json.dumps({
        "root": root,
        "pending": len(fresh),
        "cursor_before": cursor,
        "cursor_after": len(records),
        "snapshot": os.path.relpath(snapshot, root) if snapshot else None,
        "items": fresh,
    }, ensure_ascii=False, indent=2))
    return 0


# ── done ────────────────────────────────────────────────────────
def cmd_done(args) -> int:
    root = _root(args)
    st.ensure(root)
    records = st.queue_records(root)
    cursor_before = st.read_int(st.fb_path(root, st.CURSOR), 0)
    target = args.cursor if args.cursor is not None else len(records)
    target = max(cursor_before, min(target, len(records)))

    def ids(raw: str | None) -> set[str]:
        return {x.strip() for x in (raw or "").split(",") if x.strip()}

    needs = ids(args.needs_input)
    skipped = ids(args.skipped)
    stamp = time.strftime("%Y-%m-%d %H:%M:%S")

    drained = records[cursor_before:target]
    tally = {"applied": 0, "needs-input": 0, "skipped": 0}
    for rec in drained:
        rid = rec.get("id")
        status = "needs-input" if rid in needs else ("skipped" if rid in skipped else "applied")
        tally[status] += 1
        st.append_record(st.fb_path(root, st.APPLIED), {
            "id": rid,
            "sid": rec.get("sid"),
            "status": status,
            "note": args.note or "",
            "at": stamp,
        })

    st.write_atomic(st.fb_path(root, st.CURSOR), "%d\n" % target)
    token = st.now_token()
    st.write_atomic(st.fb_path(root, st.PUBLISHED), token + "\n")

    print(json.dumps({
        "drained": len(drained),
        "applied": tally["applied"],
        "needs_input": tally["needs-input"],
        "skipped": tally["skipped"],
        "cursor": target,
        "published": token,
        "status": st.status(root),
    }, ensure_ascii=False, indent=2))
    return 0


# ── status ──────────────────────────────────────────────────────
def cmd_status(args) -> int:
    root = _root(args)
    st.ensure(root)
    print(json.dumps(st.status(root), ensure_ascii=False, indent=2))
    return 0


# ── adopt ───────────────────────────────────────────────────────
TAG_RE = re.compile(rb"<(section|div|article)\b[^>]*>", re.IGNORECASE)
CLASS_RE = re.compile(rb'class\s*=\s*["\'][^"\']*\bslide\b[^"\']*["\']', re.IGNORECASE)
SID_RE = re.compile(rb"data-sid\s*=", re.IGNORECASE)


def cmd_adopt(args) -> int:
    """기존 덱(정적 슬라이드 마크업)에 data-sid 를 한 번만 기계 부여한다.

    슬라이드 개수는 변하지 않고 diff 는 속성 추가뿐이므로 검증이 쉽다.
    이후 이 ID 는 영구 고정되어, 슬라이드를 쪼개거나 순서를 바꿔도
    대기 중인 피드백이 엉뚱한 슬라이드를 가리키지 않는다.
    """
    path = os.path.abspath(os.path.expanduser(args.deck))
    with open(path, "rb") as f:
        body = f.read()

    found = existing = added = 0
    out = bytearray()
    pos = 0
    for m in TAG_RE.finditer(body):
        tag = m.group(0)
        if not CLASS_RE.search(tag):
            continue
        found += 1
        out += body[pos:m.start()]
        if SID_RE.search(tag):
            existing += 1
            out += tag
        else:
            added += 1
            # 여는 태그의 태그명 바로 뒤에 끼운다: <section …> → <section data-sid="s01" …>
            name_end = m.end(1) - m.start()
            out += tag[:name_end] + b' data-sid="s%02d"' % found + tag[name_end:]
        pos = m.end()
    out += body[pos:]

    if added and not args.dry_run:
        backup = path + ".pre-adopt.bak"
        if not os.path.exists(backup):
            shutil.copy2(path, backup)
        with open(path, "wb") as f:
            f.write(bytes(out))

    print(json.dumps({
        "deck": path,
        "slides_found": found,
        "already_had_sid": existing,
        "sid_added": added,
        "dry_run": bool(args.dry_run),
        "backup": (path + ".pre-adopt.bak") if (added and not args.dry_run) else None,
        "verify": "슬라이드 수가 브라우저 표시 장수와 같은지 확인하세요.",
    }, ensure_ascii=False, indent=2))
    return 0


# ── revert ──────────────────────────────────────────────────────
def cmd_revert(args) -> int:
    root = _root(args)
    vdir = os.path.join(root, st.VERSIONS_DIR)
    if not os.path.isdir(vdir):
        print("되돌릴 스냅샷이 없습니다.", file=sys.stderr)
        return 1
    stamps = sorted(d for d in os.listdir(vdir) if os.path.isdir(os.path.join(vdir, d)))
    if not stamps:
        print("되돌릴 스냅샷이 없습니다.", file=sys.stderr)
        return 1
    pick = args.to or stamps[-1]
    src = os.path.join(vdir, pick)
    if not os.path.isdir(src):
        print("그런 스냅샷이 없습니다: %s (가능: %s)" % (pick, ", ".join(stamps[-5:])),
              file=sys.stderr)
        return 1

    _snapshot(root, "revert 직전 상태")
    restored = []
    for name in sorted(os.listdir(src)):
        if not name.lower().endswith((".html", ".htm")):
            continue
        shutil.copy2(os.path.join(src, name), os.path.join(root, name))
        restored.append(name)
    token = st.now_token()
    st.write_atomic(st.fb_path(root, st.PUBLISHED), token + "\n")
    print(json.dumps({"restored_from": pick, "files": restored, "published": token},
                     ensure_ascii=False, indent=2))
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="라이브 편집 큐 CLI")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("pending", help="미처리 피드백 출력 + 편집 전 스냅샷")
    p.add_argument("--root", default=".")
    p.add_argument("--no-snapshot", action="store_true")
    p.set_defaults(func=cmd_pending)

    p = sub.add_parser("done", help="처리 결과 기록 + 커서 전진 + 게시(자동 새로고침)")
    p.add_argument("--root", default=".")
    p.add_argument("--cursor", type=int, default=None, help="pending 이 알려준 cursor_after")
    p.add_argument("--note", default="", help="무엇을 고쳤는지 한 줄 요약")
    p.add_argument("--needs-input", default="", help="되물을 항목 id (쉼표 구분)")
    p.add_argument("--skipped", default="", help="건너뛴 항목 id (쉼표 구분)")
    p.set_defaults(func=cmd_done)

    p = sub.add_parser("status", help="대기 건수 확인")
    p.add_argument("--root", default=".")
    p.set_defaults(func=cmd_status)

    p = sub.add_parser("adopt", help="기존 덱에 data-sid 부여 (1회)")
    p.add_argument("--deck", required=True)
    p.add_argument("--dry-run", action="store_true")
    p.set_defaults(func=cmd_adopt)

    p = sub.add_parser("revert", help="최근 스냅샷으로 되돌리기")
    p.add_argument("--root", default=".")
    p.add_argument("--to", default=None, help="versions/ 하위 폴더명")
    p.set_defaults(func=cmd_revert)

    args = ap.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
