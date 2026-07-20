# lecture-live-edit

브라우저에 띄운 HTML 강의자료를 **화면에서 바로 고치는** 도구.

고칠 문장을 드래그해 선택하고 "이렇게 바꿔줘"라고 적어 보내면, Claude 가 그 자리를 찾아
고치고 화면이 자동으로 갱신된다. "3번 슬라이드가 어떻다"고 채팅에 말로 지목할 필요가 없다.

## 왜 필요한가

강의자료를 Claude 와 만들 때 병목은 집필이 아니라 **수정 지시**다.
슬라이드 번호를 세고, 어느 문단인지 말로 설명하고, 결과를 다시 확인하는 왕복이 매번 든다.
이 도구는 그 왕복을 없앤다. 지목은 마우스가 하고, 지시만 말로 한다.

## 구성

| 파일 | 역할 |
|------|------|
| `server.py` | 정적 서빙 + 오버레이 주입 + 피드백 수집 (표준 라이브러리만, 127.0.0.1) |
| `editor.js` | 화면 오버레이 — 선택 감지·지시 입력·상태 표시·자동 새로고침 |
| `lle.py` | 큐 CLI — `pending` / `done` / `status` / `adopt` / `revert` |
| `lle_state.py` | 상태 파일 규약 (위 둘이 공유) |

Claude 쪽 사용법은 같은 폴더 상위의 `lecture-live-edit` 스킬에, 강의자료 제작 흐름은
`lecture-deck-orchestrator` 스킬에 규정돼 있다. 이 도구들은 그 스킬들이 호출한다.

## 구동

```bash
python3 <이 폴더>/server.py --root <프로젝트폴더> --port 4601
```

보통은 직접 치지 않는다. 프로젝트의 `.claude/launch.json` 에 등록해 두고
Claude 가 `preview_start` 로 띄운다.

```json
{ "version": "0.0.1", "configurations": [
  { "name": "<강의명>", "runtimeExecutable": "python3",
    "runtimeArgs": ["<이 폴더의 절대경로>/server.py",
                    "--root", "./<강의명>", "--port", "4601"],
    "port": 4601 }
]}
```

## 산출물은 항상 클린하다

오버레이 `<script>` 는 **서버가 응답할 때만** 끼워 넣는다. 디스크의 HTML 파일에는 들어가지 않는다.
그래서 편집 도중 어느 시점에 파일을 꺼내 전달해도 그대로 배포 가능하다.
원본 그대로 보려면 URL에 `?clean=1` 을 붙인다.

## 상태 파일 (`<프로젝트>/feedback/`)

| 파일 | 뜻 |
|------|-----|
| `queue.jsonl` | 피드백 원본. 추가 전용. 절대 편집하지 않는다 |
| `cursor` | 지금까지 처리한 줄 수 |
| `published` | 게시 토큰. 값이 바뀌면 브라우저가 새로고침한다 |
| `applied.jsonl` | 처리 결과 기록 (반영·보류·건너뜀) |

**미처리 = 줄 수 − 커서.** 이 산술 하나로만 판정하기 때문에 알림이 유실되거나 중복돼도,
반영 도중 새 피드백이 도착해도 아무것도 잃지 않는다.
편집 직전 상태는 `versions/<타임스탬프>/` 에 자동 보존되어 `lle.py revert` 로 되돌릴 수 있다.

## HTTP 인터페이스

| 경로 | 용도 |
|------|------|
| `GET /<파일>.html` | 오버레이를 주입해 서빙 (`?clean=1` 이면 원본) |
| `GET /__status` | `{version, queued, cursor, pending, needsInput, last}` |
| `GET /__editor/editor.js` | 오버레이 스크립트 |
| `POST /__feedback` | 피드백 1건 적재 (최대 64KB) |

`127.0.0.1` 에만 바인딩하므로 외부에 노출되지 않는다.
