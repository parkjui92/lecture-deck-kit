---
name: lecture-live-edit
description: "브라우저에 띄운 HTML 강의자료·문서를 라이브로 고치는 운영 규약. 사용자가 화면에서 문장을 드래그 선택해 남긴 수정 지시를 큐에서 꺼내(pending) 해당 슬라이드를 고치고 게시(done)해 화면을 자동 갱신한다. 피드백 알림이 도착했을 때, '라이브 편집 시작·재개', '피드백 반영해줘', '밀린 것 처리', 'ㄱ'(반자동 드레인 신호), '되돌려', '기존 HTML 덱을 라이브 편집으로 열어줘' 요청 시 반드시 사용. 큐·커서·게시 토큰을 손으로 만지지 않고 lle.py CLI로만 다루는 멱등 드레인 절차, 선택 문장으로 소스를 찾는 앵커링, 모호한 지시의 보류 처리, 기존 덱 data-sid 입양, 세션 재개 의식, 자동 깨우기(Monitor) 장전을 규정한다. 강의자료 제작 전체 흐름은 lecture-deck-orchestrator가 담당한다."
---

# 라이브 편집 운영 규약

브라우저 → 큐 → Claude → 화면 갱신의 루프를 **유실 없이, 엉뚱한 슬라이드를 고치지 않고** 돌리는 절차.

## 왜 이 절차를 지켜야 하는가

상태의 진실은 두 파일뿐이다. `feedback/queue.jsonl`(피드백 원본, 추가 전용)과 `feedback/cursor`(처리한 줄 수).
**미처리 = 줄 수 − 커서**라는 산술 하나로만 판정하기 때문에, 알림이 유실되거나 중복돼도,
드레인 도중 새 피드백이 도착해도 아무것도 잃지 않는다.
이 불변식은 **`lle.py` 로만 상태를 바꿀 때** 유지된다. 커서를 손으로 고치거나 큐를 편집하면 깨진다.

## 도구 경로 확인 (세션에서 한 번)

스크립트 4종은 **이 스킬 폴더 안 `scripts/`** 에 있다. 설치 위치는 환경마다 다르므로 한 번 찾아 둔다.

```bash
TOOL=$(dirname "$(find ~/.claude -name lle.py -path '*lecture-live-edit/scripts*' 2>/dev/null | head -1)")
echo "$TOOL"     # 이후 python3 "$TOOL"/lle.py … 로 쓴다
```

찾지 못하면 플러그인이 설치되지 않은 것이다. 사용자에게 설치를 안내한다.
아래 예시의 `$TOOL` 은 모두 이 경로를 가리킨다.

---

## 드레인 절차 (알림이 오면 / "ㄱ" 신호를 받으면 / 턴 시작 시 pending>0이면)

### 1단계 — 꺼내기

```bash
python3 $TOOL/lle.py pending --root <프로젝트폴더>
```

출력의 `items` 가 처리 대상, `cursor_after` 를 3단계에 그대로 넘긴다.
이 명령이 **편집 직전 스냅샷**을 `versions/` 에 남기므로 되돌리기가 항상 가능하다.
(`pending` 이 0이면 아무것도 하지 않고 조용히 끝낸다. 중복 알림은 정상이다.)

### 2단계 — 고치기

항목 하나하나를 다음 순서로 처리한다.

1. **대상 슬라이드 찾기** — `sid` 로 `data-sid="..."` 를 찾는다.
2. **대조 검증 (필수)** — 그 슬라이드의 제목이 `titleExcerpt` 와 맞는지 본다.
   **어긋나면 편집하지 말고 그 항목을 `--needs-input` 으로 돌린다.**
   엉뚱한 슬라이드를 조용히 고치는 것이 이 시스템의 최악의 실패다.
3. **정확한 위치 앵커링** — `selectedText` 를 소스에서 찾는다. 여러 번 나오면
   `contextBefore` / `contextAfter` 로 좁힌다. `elemHint`(예: "표 셀 #2")가 있으면 그 요소 안에서 찾는다.
   `scope` 가 `slide` 면 그 장 전체, `deck` 이면 자료 전체가 대상이다.
4. **지시 반영** — `instruction` 이 본문, `quickActions` 는 보조 신호다. 둘이 충돌하면 `instruction` 이 이긴다.
   퀵칩의 뜻: `둘로 쪼개기`=슬라이드 분할 / `근거 보강`=수치·출처 추가 / `덜 방어적으로`=단정적으로 고쳐 씀
   / `더 간결하게`=문장 수 줄임 / `표를 대비형으로`=행 나열을 A vs B 열 구조로 / `시각화 추가`=흐름도·카드·통계 블록.
5. 마크업 문법은 `lecture-deck-build` 스킬의 `references/slide-contract.md` 를 따른다.

**슬라이드를 쪼갤 때** — 앞쪽이 기존 `sid` 를 승계하고, 뒤쪽은 `sNN-2`, `sNN-3` 을 새로 받는다.
**절대 전체 재번호를 매기지 않는다.** 대기 중인 다른 피드백이 엉뚱한 장을 가리키게 된다.
합칠 때는 앞쪽 `sid` 를 남긴다. 순서를 바꿔도 `sid` 는 따라다닌다(표시 번호는 런타임이 계산).

### 3단계 — 마치기

```bash
python3 $TOOL/lle.py done --root <폴더> --cursor <1단계의 cursor_after> \
        --note "무엇을 고쳤는지 한 줄" [--needs-input <id,id>] [--skipped <id>]
```

이 순간 게시 토큰이 올라가고 브라우저가 자동으로 새로고침된다.
**모든 Edit 를 마친 뒤 마지막에 한 번만 실행한다** — 중간에 실행하면 사용자가 반쯤 고쳐진 화면을 본다.

`--cursor` 에 **반드시 1단계가 알려준 값**을 넣는다. 현재 줄 수를 다시 세면
드레인 도중 도착한 피드백을 처리하지 않고 삼켜버린다.

### 4단계 — 보고

한 줄로 무엇을 고쳤는지 말한다. 보류가 있으면 **무엇이 모호한지 구체적으로 되묻는다.**
`done` 실행 후 `pending` 이 남아 있으면(드레인 중 새 피드백 도착) 곧바로 1단계로 돌아간다.

---

## 모호한 지시의 처리

**추측해서 반영하지 않는다.** 다음은 되묻는다.
- 지시 대상이 화면에 여러 개 있고 어느 것인지 불명 (`selectedText` 도 `elemHint` 도 없는 "이거 고쳐줘")
- 사실·수치 추가 요구인데 근거가 없음 ("통계 붙여줘" → 무슨 통계인지, 조사해도 되는지)
- 자료 전체 구조를 바꾸는 지시 ("순서 다 바꿔") → 먼저 새 순서안을 제시하고 승인받는다

되물을 항목만 `--needs-input` 으로 표시하고 **나머지는 반영한다.** 전체를 멈추지 않는다.

---

## 자동 깨우기 (Monitor) 장전

프로젝트당 1회. 세션이 살아 있는 동안 피드백 1건마다 알림이 온다.

```
Monitor(
  persistent: true, timeout_ms: 3600000,
  description: "<강의명> 라이브 편집 피드백",
  command: '''tail -F -n 0 "<절대경로>/feedback/queue.jsonl" 2>/dev/null | python3 -c "
import sys, json
for line in sys.stdin:
    line = line.strip()
    if not line: continue
    try: r = json.loads(line)
    except ValueError: continue
    sid = r.get('sid') or ('#%s' % r.get('index'))
    msg = r.get('instruction') or ' / '.join(r.get('quickActions') or [])
    sel = r.get('selectedText')
    print('[라이브편집] %s %s | 선택: %s | 지시: %s' % (sid, r.get('titleExcerpt') or '', ('\\"%s\\"' % sel[:40]) if sel else '(장 전체)', msg), flush=True)
"'''
)
```

- **서버를 먼저 띄운 뒤 장전한다** (서버가 `queue.jsonl` 을 만들어 `tail -F` 의 경합을 없앤다).
- 재장전 전에는 이전 것을 `TaskStop` 한다 (중복 알림 방지). task id 를 기억해 둔다.
- Monitor 가 죽어도 데이터는 안전하다. 반자동 모드로 강등될 뿐이다 —
  오버레이가 60초 뒤 "채팅에 ㄱ 입력" 을 띄우고, 사용자가 아무 말이나 하면 턴 시작 검사에 걸린다.

---

## 기존 덱 입양 (data-sid 가 없는 자료)

라이브 편집을 시작하기 **전에 한 번만** 슬라이드 ID를 부여한다. 순번은 편집하면 밀리므로 신뢰할 수 없다.

```bash
python3 $TOOL/lle.py adopt --deck <파일.html> --dry-run   # 먼저 장수 확인
python3 $TOOL/lle.py adopt --deck <파일.html>             # 부여 (.pre-adopt.bak 자동 생성)
```

- `slides_found` 가 브라우저에 보이는 실제 장수와 같은지 **반드시 대조**한다. 다르면 되돌리고 수동 검토.
- 슬라이드를 JS 가 런타임 생성하는 덱은 `slides_found` 가 0이다. 이때는 정적 마크업으로
  변환하는 편이 낫다(사용자와 상의). 변환 없이는 라이브 편집 대상이 되지 못한다.
- 스크롤형 문서(핸드아웃)는 `<section>` 에 `class="slide"` 가 없어 입양이 안 될 수 있다.
  이때 오버레이는 순번 기반(`sid: null, index: n`)으로 동작하며, 반영 시
  `titleExcerpt` 로 대상을 확정한다. 구조를 바꾸는 편집(장 추가·삭제) 전에 큐를 비운다.

---

## 되돌리기

```bash
python3 $TOOL/lle.py revert --root <폴더>            # 가장 최근 스냅샷으로
python3 $TOOL/lle.py revert --root <폴더> --to 20260720-180253
```
되돌리기 자체도 스냅샷을 남기므로 "되돌린 걸 다시 되돌리기"도 된다. 실행하면 화면도 자동 갱신된다.

## 문제가 생기면

`references/troubleshooting.md` 를 Read 한다 (서버·포트·오버레이·NFD 경로·큐 이상 진단).
