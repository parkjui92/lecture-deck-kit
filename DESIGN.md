# lecture-deck-kit 디자인과 내 스타일로 바꾸는 법

이 문서는 [기본 HTML 골격](skills/lecture-deck-build/assets/deck-skeleton.html)에 실제로 들어 있는 디자인을 정리한 것입니다. **흰 슬라이드, 파란 강조색, 넓은 여백, 한글 고딕체**가 기본입니다. 아래 수치는 기본 골격의 값이며, 이미 만든 강의자료는 별도로 수정되어 있을 수 있습니다.

디자인을 바꾸려면 **내 강의자료인 `deck.html`의 CSS**를 바꾸면 됩니다. 이 `DESIGN.md`를 수정하는 것만으로 화면이 바뀌지는 않습니다. 플러그인 설치 폴더의 골격보다 강의별 파일을 수정하는 편이 업데이트 후에도 내 스타일을 유지하기 좋습니다.

## 먼저 이렇게 요청해 보세요

코드를 직접 고치지 않아도 됩니다. 색·글꼴·여백·로고 크기를 구체적으로 적어 요청하세요.

```text
이 DESIGN.md와 내 deck.html을 읽고 강의자료 디자인을 바꿔줘.
강조색은 짙은 청록 #0F766E, 바탕은 흰색, 본문은 #172B29로 해줘.
글꼴은 내 컴퓨터에 설치된 맑은 고딕을 우선 사용해줘.
카드 모서리는 6px, 표지 배경은 단색으로 바꿔줘.
로고는 표지 오른쪽 아래에만 가로 96px 이하로 넣고 비율을 유지해줘.
내용과 슬라이드 ID는 유지하고, 밝은 테마와 어두운 테마를 함께 조정해줘.
표지·간지·표·흐름도와 가장 빽빽한 장을 열어 잘림과 줄바꿈을 확인해줘.
```

내가 쓰던 PPT·PDF·이미지가 있다면 함께 주고 “이 자료의 색, 제목 크기, 여백을 추출해 적용해줘”라고 요청할 수도 있습니다. 참조 자료가 없으면 아래 기본값에서 시작하면 됩니다.

## 1. 화면 크기와 배치

| 항목 | 기본값 | 화면에서 보이는 모습 |
|---|---|---|
| 슬라이드 크기 | `1280 × 720px`, 16:9 | 화면 크기에 맞춰 한 장 전체를 축소·확대 |
| 슬라이드 안쪽 여백 | 위 `64px`, 좌우 `76px`, 아래 `76px` | 제목과 본문이 가장자리에서 떨어짐 |
| 세로 요소 간격 | `22px` | 제목·설명·도표 사이 간격 |
| 슬라이드 외곽 | 반경 `16px`, 그림자 | 브라우저 배경 위에 떠 있는 흰 판 |
| 본문 정렬 | 위에서 아래로, 왼쪽 정렬 | 제목 다음에 본문을 쌓음 |
| 표지 | 세로 중앙·왼쪽 정렬, 요소 간격 `26px` | 제목과 부제를 크게 배치 |
| 간지 | 가로·세로 중앙, 강조색 배경 | 강의의 장이 바뀌는 지점 |
| 전환 | 불투명도 전환 `0.22초` | 장을 이동할 때 짧게 나타남 |

**비율을 유지하려면 `--stage-w`와 `--stage-h`는 그대로 두세요.** 화면 자동 배율을 계산하는 JavaScript의 `fit()`에도 `1280`, `720`이 직접 들어 있습니다. 비율을 바꿀 때는 CSS 변수, `fit()`의 분모, 인쇄 CSS를 함께 수정하고 확인해야 합니다.

## 2. 색상: 여기부터 바꾸세요

`deck.html`의 `<style>` 앞부분에 있는 `:root`가 밝은 테마, `html[data-theme="dark"]`가 어두운 테마입니다. 발표 화면에서 `T`를 누르면 테마가 바뀝니다.

| CSS 변수 | 밝은 테마 | 어두운 테마 | 바뀌는 곳 |
|---|---|---|---|
| `--bg` | `#F7F8FB` | `#0B1020` | 브라우저 바탕, 일반 카드·단계 상자 |
| `--panel` | `#FFFFFF` | `#121A2E` | 슬라이드 판, 노트·도움말 패널 |
| `--ink` | `#101728` | `#EAEEFB` | 제목·본문 글자 |
| `--muted` | `#5B6478` | `#9AA6C2` | 보조 설명, 출처, 번호 |
| `--line` | `#E3E7EF` | `#243150` | 카드·표 구분선 |
| `--accent` | `#3B5BDB` | `#7C93FF` | 제목 밑줄, 불릿, 주요 수치, 진행바, 간지 배경 |
| `--accent-soft` | `#E8ECFD` | `#1B2545` | 표 머리행, 강조 카드, 콜아웃, 표지 그라데이션 |
| `--accent-2` | `#0D9488` | `#2DD4BF` | 추가 도표에 쓸 보조색; 기본 예시 요소에는 적용되지 않음 |
| `--warn` | `#B45309` | `#FBBF24` | 경고 콜아웃 |

내 대표색을 적용할 때는 `--accent`와 `--accent-soft`를 함께 바꾸세요. 배경색을 바꾸면 `--ink`·`--muted`도 함께 확인해야 작은 글자가 묻히지 않습니다. **간지 제목은 기본적으로 흰색으로 고정**되어 있으므로 밝은 강조색을 쓰면 `.slide.divider`의 글자색도 조정해야 합니다.

## 3. 글꼴과 글자 크기

기본 글꼴 순서는 다음과 같습니다. 앞의 글꼴이 설치되어 있지 않으면 다음 글꼴로 표시됩니다. 글꼴 파일을 내려받거나 HTML에 포함하는 기능은 없습니다.

```css
body {
  font-family: "Pretendard", "Apple SD Gothic Neo", -apple-system,
               BlinkMacSystemFont, "Malgun Gothic", "Noto Sans KR", sans-serif;
  word-break: keep-all;
  line-height: 1.6;
}
```

| 바꾸려는 글자 | CSS 선택자 | 기본 크기 / 굵기 |
|---|---|---|
| 표지 제목 | `.slide.cover h1` | `60px` / `800`, 줄 간격 `1.2` |
| 간지 제목 | `.slide.divider h2` | `52px` / `800` |
| 일반 제목 | `.slide > h2` | `40px` / `800`, 줄 간격 `1.25` |
| 첫 설명 문장 | `.slide .lead` | `23px`, 줄 간격 `1.62` |
| 불릿 본문 | `ul.bullets` | `20.5px` |
| 카드 제목 / 설명 | `.card h3` / `.card p` | `20px` / `750` · `16.5px` |
| 표 본문 / 머리행 | `table` / `th` | `17px` · `15.5px` / `750` |
| 핵심 수치 / 설명 | `.stat .num` / `.stat .cap` | `46px` / `800` · `15.5px` |
| 강조 문장 | `.callout` | `18.5px` |
| 보조 문장 / 출처 | `.slide .sub` / `.src` | `17.5px` · `13.5px` |

단위는 HTML의 CSS 픽셀입니다. PowerPoint의 포인트 크기에 숫자를 그대로 옮기지 마세요. 글꼴을 바꾸면 같은 크기여도 글자 폭과 줄바꿈이 달라지므로 제목과 표를 다시 확인해야 합니다.

## 4. 카드·표·흐름도의 모양

| 요소 | CSS 선택자 | 기본값 | 내 스타일로 바꾸는 지점 |
|---|---|---|---|
| 2열 / 3열 | `.grid-2` / `.grid-3` | 같은 폭, 간격 `22px` / `18px` | `grid-template-columns`, `gap` |
| 카드 | `.card` | 반경 `13px`, 안쪽 `22px 24px`, 선 `1px` | `border-radius`, `padding`, `border`, `background` |
| 제목 밑줄 | `.slide > h2` | 강조색 `3px`, 아래 여백 `14px` | `border-bottom`, `padding-bottom` |
| 표 셀 | `th, td` | 안쪽 `12px 14px`, 아래 구분선 | `padding`, `border-bottom` |
| 강조 상자 | `.callout` | 왼쪽 선 `4px`, 안쪽 `18px 22px` | `border-left`, `background`, `border-radius` |
| 절차 상자 | `.flow .step` | 최소 폭 `150px`, 반경 `12px`, 안쪽 `16px 18px` | `min-width`, `border-radius`, `padding` |
| 불릿 기호 | `ul.bullets li::before` | 강조색 `9px` 사각형을 45도 회전 | 원형이면 `border-radius: 50%; transform: none` |
| 표지 배경 | `.slide.cover` | 옅은 강조색 → 슬라이드색 그라데이션 | 단색이면 `background: var(--panel)` |

`--radius`는 슬라이드 판의 모서리 값입니다. **카드·절차 상자·콜아웃의 모서리는 별도로 지정**되어 있어 이 변수 하나로 모두 바뀌지는 않습니다. 슬라이드 안에 `style="..."`로 직접 지정한 값이나 인라인 SVG의 색도 해당 요소에서 바꿔야 합니다.

## 5. 복사해서 적용하는 예시: 짙은 청록 + 각진 카드

내 `deck.html`을 복사해 보관한 뒤, 아래 블록을 **기존 `<style>` 뒤, `</head>` 바로 앞**에 붙여 넣으세요. 기존 CSS를 지우지 않고 원하는 값만 덮어씁니다. 프로젝트마다 이 블록을 재사용하면 됩니다.

```html
<style id="my-deck-theme">
:root {
  --bg: #f3f6f5;
  --panel: #ffffff;
  --ink: #172b29;
  --muted: #536863;
  --line: #dbe5e1;
  --accent: #0f766e;
  --accent-soft: #e6f4f1;
  --accent-2: #9a6700;
  --warn: #b45309;
  --radius: 6px;
  --shadow: 0 10px 30px rgba(23, 43, 41, .08);
}
html[data-theme="dark"] {
  --bg: #0c1917;
  --panel: #142622;
  --ink: #edf6f2;
  --muted: #afc6be;
  --line: #345048;
  --accent: #5eead4;
  --accent-soft: #173e35;
  --accent-2: #facc15;
  --warn: #fbbf24;
  --shadow: 0 10px 30px rgba(0, 0, 0, .3);
}
body {
  font-family: "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
}
.slide.cover { background: var(--panel); }
.card, .flow .step { border-radius: 6px; }
.callout { border-radius: 0 6px 6px 0; }
/* 어두운 테마에서는 강조색이 밝아지므로 간지 글자도 함께 조정 */
html[data-theme="dark"] .slide.divider,
html[data-theme="dark"] .slide.divider h2,
html[data-theme="dark"] .slide.divider .sub { color: #0c1917; }
</style>
```

로고가 필요하면 이미지를 제공하고 **위치와 최대 크기**를 함께 지정하세요. 예를 들어 “표지 오른쪽 아래, 가로 96px·세로 32px 이내, 원래 비율 유지”처럼 요청합니다. 로고가 없는 현재 기본 골격에 큰 로고를 공통 배경으로 넣을 필요는 없습니다. 이미지 파일을 상대경로로 연결했다면 배포할 때 함께 전달하고, 파일 하나로 배포하려면 이미지를 HTML 안에 포함해야 합니다.

## 6. 바꾼 뒤 확인할 것

1. **표지·간지·표·흐름도·가장 긴 본문**을 열어 제목 줄바꿈, 글자 잘림, 상자 넘침을 확인합니다. 글자를 무조건 줄이기보다 긴 내용을 다음 장으로 나눕니다.
2. `T`로 밝은/어두운 테마를 모두 확인합니다. 특히 간지의 제목, 보조 설명, 표 머리행의 글자가 배경에 묻히지 않아야 합니다.
3. `←`·`→` 이동, `O` 목차, `N` 발표자 노트가 그대로 동작하는지 봅니다. 라이브 편집을 사용한다면 수정 후 같은 장으로 돌아오는지도 확인합니다.
4. 발표할 컴퓨터에서 다시 엽니다. 글꼴이 없으면 대체 글꼴이 쓰이며, 작은 브라우저 창에서는 슬라이드 전체가 축소됩니다.
5. 인쇄용 PDF나 PPTX가 필요하면 [PowerPoint·PDF 안내](docs/powerpoint.md)에 따라 별도로 확인합니다.

### 디자인을 바꿔도 유지할 구조

- `<section class="slide" data-sid="…">`와 이미 부여한 `data-sid`: 피드백이 가리키는 슬라이드를 유지합니다.
- `<html data-lle-runtime>`과 `<aside class="notes">`: 위치 복원과 발표자 노트에 쓰입니다.
- `#stage`, `#bar`, `#num`, `#notes`, `#overview`, `#ovlist`, `#help`: 화면 이동·목차·노트 기능이 찾는 요소입니다.

상세 규약은 [슬라이드 구조](skills/lecture-deck-build/references/slide-contract.md)를 참고하세요. 말풍선·수정 입력창 같은 **편집 도구의 디자인은 별도**입니다. [editor.js](skills/lecture-live-edit/scripts/editor.js)의 Shadow DOM 내부 CSS를 사용하므로, 덱의 강조색을 바꾼다고 편집 버튼 색까지 바뀌지는 않습니다.
