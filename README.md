# lecture-deck-kit

[![Version](https://img.shields.io/badge/version-0.9.2-blue.svg)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Claude Code](https://img.shields.io/badge/Claude_Code-Plugin-purple.svg)

**한국어** · [English](README.en.md)

강의자료를 HTML 슬라이드덱으로 만들고, **브라우저에 띄운 그 화면에서 바로 고치는** [Claude Code](https://claude.com/claude-code) 플러그인.
고칠 문장을 드래그로 긁고 "덜 방어적으로"라고 적으면, 그 자리가 고쳐지고 화면이 새로고침된다. 보던 슬라이드에 그대로 머문 채로.

<!-- 데모 GIF 자리 -->

## 무엇이 달라지나 — 수정 한 건의 비용

고칠 곳은 이미 화면에 보이는데, 그걸 가리키는 데 드는 비용이 고치는 비용보다 크다. **수정의 병목은 집필이 아니라 지목이었다.**

| | 채팅으로 지시할 때 | 이 킷 |
|---|---|---|
| 위치 지목 | 슬라이드 번호를 세고 문단을 말로 설명 | **드래그 한 번** |
| 결과 확인 | 새로고침하고 그 장을 다시 찾아감 | 자동 갱신 + **보던 장 유지** |
| 산출물 상태 | — | 편집 중에도 항상 배포 가능 |

수정 열 건이면 왕복 열 번이 세 번쯤으로 줄어든다. 정확히 말하면, 줄어드는 건 왕복 횟수가 아니라 **"이건 말로 설명하기 귀찮으니 그냥 두자"고 포기하던 수정들**이다.

→ [왜 만들었나·상세 사용법](docs/why.md) · [설계 근거와 기각한 대안](docs/architecture.md)

## 파이프라인

```
인터뷰(청중·목적·시간·톤·기존자료) → 구성안 → ★사용자 승인 게이트 → HTML 빌드·표시 → 🔁라이브 편집 → 배포
```

**인터뷰는 일부러 짧다.** 다섯 가지만 확정하고 바로 만든다 — 세부 표현을 인터뷰로 확정하려 들면 이 킷의 강점을 스스로 버리는 셈이다.
**게이트는 한 번뿐이다.** 구조(장 순서·헤드 메시지)는 나중에 고치면 비싸므로 집필 전에 승인받고, 문장·표현은 화면에서 즉시 고칠 수 있으므로 막지 않는다.

## 설치

```
/plugin marketplace add parkjui92/lecture-deck-kit
/plugin install lecture-deck-kit@lecture-deck-kit
```

## 쓰는 법

```
신입 연구원 대상 2시간 워크숍 자료 만들어줘. 주제는 정책연구 방법론   ← 백지에서
이 강의자료 파일 열어서 라이브 편집 시작해줘                          ← 기존 HTML 덱
방금 거 되돌려                                                        ← 반영 직전 상태로
```

띄워진 덱에서는 **고칠 문장을 드래그** → 뜨는 `💬` 클릭 → 지시 입력이면 끝이다. 이 장 전체는 슬라이드 위 `💬` 배지, 자료 전체는 우하단 `덱 전체`, 표·목록·그림은 `요소 지정`으로 콕 집는다.
여러 건을 연달아 보내도 모아서 한 번에 처리하고, 화면은 **다 끝난 뒤에 한 번만** 갱신된다 — 반쯤 고쳐진 상태가 보이는 일이 없다.

## 어떻게 동작하나

값어치는 문장 생성이 아니라 **루프의 신뢰성**에 있다. 피드백은 추가 전용 큐에 쌓이고 어디까지 처리했는지는 커서가 기억한다. **미처리 = 줄 수 − 커서**라는 산술 하나로만 판정하므로, 깨우기 알림이 유실되거나 중복돼도 **반영 도중 새 피드백이 도착해도** 아무것도 잃지 않는다.
슬라이드 내부 ID(`data-sid`)는 영구 고정이고 **전체 재번호를 매기지 않는다** — 그래야 대기 중인 피드백이 엉뚱한 장을 가리키지 않는다. 반영 전에는 슬라이드 제목까지 대조해 어긋나면 편집을 멈추고 되묻는다.
에이전트 팀은 두지 않는다. 라이브 편집은 **반응 속도가 곧 품질**이라 위임 계층이 손해다 — 스킬 3종과 도구 1식뿐이다.

## 무엇이 남는가

편집 오버레이 `<script>`는 서버가 HTTP 응답에 끼워 넣을 뿐 **파일에 쓰지 않는다.** 편집 도중 어느 시점에 파일을 꺼내 전달해도 그대로 배포 가능하고, 마감 단계에 "편집 도구 제거" 같은 절차가 아예 없다.
덱은 외부 CDN을 쓰지 않아 **파일 하나로 오프라인에서 열리고**, 그대로 공유·인쇄된다.

동봉 예제: [실제 왕복 3건의 전후 기록](examples/live-edit-demo/)

## 요구사항·한계

- **`python3`** 만 필요하다(표준 라이브러리만 쓰므로 `pip install` 이 없다). 브라우저 창은 Claude Code 데스크톱 앱의 것을 쓰고, 없으면 직접 `localhost:4601` 을 열어도 동일하게 동작한다
- **슬라이드를 JS가 런타임 생성하는 덱**은 라이브 편집 대상이 되지 못한다 — 고칠 자리가 소스에 없다
- **`.pptx` 를 만들지 않는다.** 산출물은 HTML이다
- 지시가 모호하면 추측해서 반영하지 않고 되묻는다. 같은 프로젝트를 두 세션이 동시에 편집하는 것은 지원하지 않는다
- 한국어 강의 관행(한글 조판, 국문 슬라이드)에 맞춰져 있다
- [포트·경로·폴백](docs/runtime-notes.md)

## 시리즈

**에이전트 팀 킷** — [policy-research-kit](https://github.com/parkjui92/policy-research-kit) (정책연구보고서) · [rnd-proposal-kit](https://github.com/parkjui92/rnd-proposal-kit) (정부 R&D 제안서) · [socsci-paper-kit](https://github.com/parkjui92/socsci-paper-kit) (사회과학 논문)

**단독 스킬** — [fact-verify](https://github.com/parkjui92/fact-verify) (출처 검증) · [paper-proofread](https://github.com/parkjui92/paper-proofread) (한국어 학술 교정교열) · [form-tailor](https://github.com/parkjui92/form-tailor) (기관 양식 맞춤) · [report-to-brief](https://github.com/parkjui92/report-to-brief) (보고서 압축)

## 라이선스

[MIT](LICENSE). 동봉된 예제 덱은 합성 플레이스홀더이며, 실제 강의 내용·수탁 산출물은 포함하지 않는다.
