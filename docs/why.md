# 왜 만들었나 · 상세 사용법

**한국어** · [English](#english)

README에서 덜어낸 배경과 사용 시나리오를 여기 둔다.

---

## 왜 만들었나

AI로 강의자료를 만들어 본 사람은 대개 첫 초안까지는 만족한다. 문제는 그다음, **고치는 단계**다.

초안을 훑다 보면 고칠 곳이 열 군데쯤 눈에 들어온다. 그런데 그걸 전달하려면 이렇게 해야 한다.

```
3번 슬라이드 두 번째 불릿이 너무 방어적이야
7번은 내용이 너무 많으니까 둘로 쪼개줘
아 그리고 아까 그 표 있잖아, 대비되게 바꿔줘 — 몇 번이더라
```

**슬라이드를 세고, 어느 문단인지 말로 설명하고, 결과를 다시 확인하는 왕복**이 수정 한 건마다 붙는다.
고칠 곳은 이미 화면에 보이는데, 그걸 가리키는 데 드는 비용이 고치는 비용보다 크다.
그래서 사람은 자연히 "이 정도는 그냥 두자"고 타협하게 된다. **수정의 병목은 집필이 아니라 지목이었다.**

이 킷은 지목을 없앤다. **가리키는 일은 마우스가 하고, 사람은 무엇을 원하는지만 말한다.**

화면에서 고칠 문장을 드래그하면 그 자리에 입력창이 뜬다. 거기 "근거가 약해요"라고 적어 보내면
Claude가 그 문장을 소스에서 찾아 고치고, 화면이 갱신된다. 슬라이드 번호를 셀 일이 없다.

한 가지 더 있다. 편집 도구를 붙였다고 **산출물이 지저분해지면 안 된다.** 그래서 편집 오버레이는
파일에 저장하지 않고 서버가 화면에 띄울 때만 끼워 넣는다. 편집 도중 어느 시점에 파일을 꺼내
전달해도 그대로 배포 가능하다. 마감 단계에 "편집 도구 제거" 같은 절차가 아예 없다.

---

## 무엇이 달라지나 — 전체 표

| | 채팅으로 지시할 때 | 이 킷 |
|---|---|---|
| 위치 지목 | 슬라이드 번호를 세고 문단을 말로 설명 | **드래그 한 번** |
| 오지목 위험 | 번호를 잘못 세면 엉뚱한 장이 고쳐짐 | 선택한 문장 원문이 그대로 전달됨 |
| 여러 건 처리 | 한 건씩 주고받음 | 눈에 띌 때마다 쌓아두면 모아서 반영 |
| 결과 확인 | 새로고침하고 그 장을 다시 찾아감 | 자동 갱신 + **보던 장 유지** |
| 산출물 상태 | — | 편집 중에도 항상 배포 가능 |

수정 열 건이면 왕복 열 번이 세 번쯤으로 줄어든다. 정확히 말하면, **줄어드는 건 왕복 횟수가 아니라
"이건 말로 설명하기 귀찮으니 그냥 두자"고 포기하던 수정들**이다.

---

## 상세 사용법

### 시나리오 1 — 백지에서 만들기

```
신입 연구원 대상 2시간 워크숍 자료 만들어줘. 주제는 정책연구 방법론.
```

다섯 가지를 묻고, 구성안을 보여주고, 승인받으면 덱을 만들어 브라우저에 띄운다.
이때부터 화면에서 고치면 된다.

### 시나리오 2 — 화면에서 고치기 (이 킷의 본체)

띄워진 덱에서:

| 하고 싶은 것 | 조작 |
|---|---|
| 특정 문장 고치기 | 그 문장을 **드래그** → 뜨는 `💬` 클릭 → 지시 입력 |
| 이 장 전체 | 슬라이드 위 `💬` 배지 |
| 자료 전체 | 우하단 `덱 전체` |
| 표·목록·그림 콕 집기 | 입력창의 `요소 지정` → 그 요소 클릭 |

입력창에는 자유롭게 적으면 되고, 자주 쓰는 것은 칩으로 준비돼 있다 —
`둘로 쪼개기` `근거 보강` `덜 방어적으로` `더 간결하게` `표를 대비형으로` `시각화 추가` `예시 추가` `톤 부드럽게`.

보내면 곧바로 반영된다. 여러 건을 연달아 보내도 모아서 한 번에 처리하고, 화면은 **다 끝난 뒤에 한 번만** 갱신된다.
반쯤 고쳐진 상태가 보이는 일이 없다.

### 시나리오 3 — 이미 있는 HTML 덱 고치기

```
이 강의자료 파일 열어서 라이브 편집 시작해줘
```

슬라이드에 고유 ID를 한 번 부여(입양)한 뒤 곧장 편집 모드로 들어간다.
ID 부여는 속성 하나만 추가하므로 내용·장수가 바뀌지 않는다(실측: 22장 덱에서 속성 외 차이 0).

### 되돌리기

```
방금 거 되돌려
```

반영 직전 상태가 매번 자동 보존되므로 한 번에 돌아간다. 되돌린 것도 다시 되돌릴 수 있다.

### 덱 조작 (발표할 때)

`←` `→` 이동 · `O` 목차 · `N` 발표자 노트 · `T` 밝게/어둡게 · `F` 전체화면 · `숫자+Enter` 점프

---

## 구성

에이전트 팀을 두지 않는다. 라이브 편집은 **반응 속도가 곧 품질**이라 위임 계층이 손해다.
대신 스킬 3종과 도구 1식으로 구성된다.

| 스킬 | 역할 |
|---|---|
| `lecture-deck-orchestrator` | 5단계 파이프라인 조율. "강의자료 만들어줘" 류 요청에 자동 반응 |
| `lecture-deck-build` | 덱 집필 규격 — 표준 골격·슬라이드 문법·인터뷰 질문 세트 |
| `lecture-live-edit` | 라이브 편집 운영 규약 — 드레인 절차·앵커링·입양·재개 의식 |

| 도구 (`lecture-live-edit/scripts/`) | 역할 |
|---|---|
| `server.py` | 정적 서빙 + 오버레이 주입 + 피드백 수집 (`127.0.0.1` 바인딩) |
| `editor.js` | 화면 오버레이 — 선택 감지·지시 입력·상태 표시·자동 새로고침 |
| `lle.py` | 큐 CLI — `pending` / `done` / `status` / `adopt` / `revert` |

> **표준 골격 동봉.** 새 덱은 `assets/deck-skeleton.html` 에서 시작한다 — 정적 슬라이드 마크업 +
> 목차·발표자 노트·진행바·해시 네비 런타임 + 인쇄 CSS + 밝음/어둠 테마. **외부 CDN을 쓰지 않아**
> 파일 하나로 오프라인에서 열리고, 그대로 공유·인쇄된다.

---
---

<a name="english"></a>

# Why I built this · Detailed usage

[한국어](#왜-만들었나--상세-사용법) · **English**

Background and usage scenarios trimmed out of the README.

---

## Why this exists

Most people are happy with the first AI-generated draft of a deck. The pain starts when they try to **change** it.

You skim the draft and spot ten things to fix. But to communicate them, you have to write:

```
The second bullet on slide 3 is too defensive
Slide 7 has too much — split it in two
And that table, the comparison one — which slide was it again?
```

Every single fix carries a round trip: **count the slides, describe the paragraph in words, then re-check the result.**
The thing you want to change is right there on screen, yet *pointing at it* costs more than *changing it*.
So you start settling — "this one's not worth explaining." **The bottleneck was never the writing. It was the pointing.**

This kit removes the pointing. **The mouse indicates; you only say what you want.**

Drag across a sentence and an input appears right there. Type "the evidence here is weak" and send.
Claude locates that sentence in the source, fixes it, and the page refreshes. No slide numbers involved.

One more thing: adding an editing tool must not **contaminate the deliverable**. So the editing overlay is never
written to the file — the server injects it only when serving the page. You can hand off the file at any point
mid-editing and it is deployable as is. There is no "remember to strip the editor" step, because there is nothing to strip.

---

## What changes — full table

| | Instructing via chat | This kit |
|---|---|---|
| Pointing | Count slides, describe the paragraph | **One drag** |
| Mis-targeting | Miscount and the wrong slide gets edited | The selected text itself is sent |
| Many edits | One exchange each | Queue them up, applied as a batch |
| Verification | Refresh, then navigate back | Auto-refresh, **stays on your slide** |
| Deliverable | — | Always deployable, even mid-edit |

Ten edits collapse from ten round trips to about three. More precisely, what disappears is
**the edits you used to skip because explaining them wasn't worth it.**

---

## Detailed usage

### 1 — From scratch

```
Make me a 2-hour workshop deck for new researchers on policy research methods.
```

It asks five questions, shows an outline, and once approved builds the deck and opens it in the browser.
From that point you edit on screen.

### 2 — Editing on screen (the core)

| What you want | How |
|---|---|
| Fix a sentence | **Drag** it → click `💬` → type the instruction |
| A whole slide | `💬` badge on the slide |
| The whole deck | `Deck-wide` button, bottom right |
| A table / list / figure | `Pick element` in the panel, then click it |

Type freely, or use the preset chips: split in two · strengthen evidence · less defensive · more concise ·
make the table comparative · add a visual · add an example · soften the tone.

Send several in a row and they are applied as one batch — the page refreshes **only once, at the end**,
so you never see a half-edited state.

### 3 — An existing HTML deck

```
Open this deck and start live editing.
```

Slides get a stable ID assigned once, then editing begins. The ID pass adds one attribute per slide —
content and slide count are untouched (measured: zero differences beyond the attribute on a 22-slide deck).

### Undo

```
Undo that last one.
```

The pre-edit state is snapshotted automatically before every batch, so one step goes back. Undo is itself undoable.

### Presenting

`←` `→` navigate · `O` outline · `N` speaker notes · `T` light/dark · `F` fullscreen · `number+Enter` jump

---

## Components

No agent team. For live editing, **responsiveness is quality**, and a delegation layer costs more than it gives.
Three skills and one toolset instead.

| Skill | Role |
|---|---|
| `lecture-deck-orchestrator` | Runs the five-phase pipeline; responds to "make me a lecture deck" requests |
| `lecture-deck-build` | Authoring spec — standard skeleton, slide grammar, interview questions |
| `lecture-live-edit` | Live-edit protocol — drain procedure, anchoring, adoption, session resume |

| Tool (`lecture-live-edit/scripts/`) | Role |
|---|---|
| `server.py` | Static serving + overlay injection + feedback intake (binds `127.0.0.1`) |
| `editor.js` | The overlay — selection capture, instruction input, status, auto-refresh |
| `lle.py` | Queue CLI — `pending` / `done` / `status` / `adopt` / `revert` |

> **Standard skeleton included.** New decks start from `assets/deck-skeleton.html`: static slide markup plus an
> outline view, speaker notes, progress bar, hash navigation, print CSS, and light/dark themes. **No external CDN**,
> so a single file opens offline and shares or prints as is.
