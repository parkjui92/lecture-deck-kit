# HTML 강의자료를 PowerPoint·PDF로 쓰는 방법

현재 `lecture-deck-kit`의 기본 결과물은 **`deck.html`**입니다. `.pptx` 내보내기 버튼이나 변환 스크립트는 포함되어 있지 않습니다. PowerPoint가 필요하면 원하는 편집 수준에 따라 아래 방법으로 별도 제작할 수 있습니다.

| 필요한 결과 | 만드는 방법 | PowerPoint에서 수정할 수 있는 것 |
|---|---|---|
| **브라우저 화면과 최대한 같은 PPT** | 각 장을 PNG로 저장 → 16:9 빈 슬라이드에 한 장씩 배치 | 그림 이동·크기, 그 위에 새 글자 추가. 그림 속 문장·표는 직접 수정 불가 |
| **글자·표·도형을 고칠 수 있는 PPT** | HTML 내용과 디자인 기준을 읽어 PowerPoint 요소로 재구성 | 텍스트·표·도형 등 실제로 재구성한 요소 |
| **인쇄·배포용 PDF** | 브라우저의 인쇄 → PDF로 저장 | 열람·인쇄용. 편집 가능한 PPT가 되는 것은 아님 |

**발표할 때 화면이 같아야 하면 첫 번째, 동료가 PowerPoint에서 내용을 고쳐야 하면 두 번째**를 선택하세요. 일부 복잡한 그림만 이미지로 넣고 나머지는 편집 가능한 요소로 만드는 절충도 가능합니다.

## 1. 화면을 그대로 담는 PPT

HTML을 브라우저에서 완성한 뒤 각 슬라이드의 화면을 이미지로 저장합니다. 사용한 컴퓨터의 글꼴과 CSS가 이미지에 담기므로 다른 컴퓨터에서도 그 모습으로 표시됩니다. 확대하면 선명도가 떨어질 수 있어 원본 1280×720보다 큰 **2560×1440 PNG**를 권장합니다.

### 이렇게 요청하세요

```text
이 deck.html을 화면 모양이 유지되는 16:9 PPTX로 만들어줘.
밝은 테마를 사용하고, 브라우저의 각 슬라이드 영역만 2560×1440 PNG로 저장해줘.
브라우저 테두리, 진행바, 번호, 목차, 노트, 라이브 편집 버튼은 제외해줘.
장 순서대로 빈 슬라이드에 이미지를 꽉 차게 넣고 발표자료.pptx로 저장해줘.
aside.notes 내용은 가능하면 PPT 발표자 노트로 따로 옮겨줘.
이미지 속 글자는 편집할 수 없다는 점을 결과 안내에 적어줘.
원본 HTML도 함께 남기고, 장수·순서·잘림을 확인해줘.
```

이 요청을 실행하려면 브라우저 캡처와 PPTX 제작 도구가 별도로 필요합니다. 위 요청문이 이 플러그인에 변환 기능을 추가하는 것은 아닙니다.

### 직접 만드는 순서

1. 완성한 `deck.html`을 열고 원하는 테마를 정합니다. 목차·노트·도움말·편집 패널을 닫습니다.
2. 각 장의 **슬라이드 판만** 캡처해 `slide-001.png`, `slide-002.png`처럼 순서를 붙입니다. 자동화할 때는 브라우저에서 장을 하나씩 활성화하고 글꼴과 전환이 끝난 뒤 `#stage` 영역을 캡처합니다. CSS 기준 크기 1280×720, 배율 1, 픽셀 배율 2이면 2560×1440이 됩니다. **`#stage`만 캡처해도 진행바·번호가 함께 잡힐 수 있으므로**, 캡처용 브라우저에만 아래 CSS를 적용해 숨깁니다. 수동 캡처에서도 개발자 도구로 같은 스타일을 임시 적용할 수 있습니다.
3. PowerPoint에서 **와이드스크린(16:9)** 크기의 빈 슬라이드를 만듭니다.
4. 각 PNG를 **삽입 → 그림**으로 넣고 슬라이드 전체를 채웁니다. 비율이 다른 이미지를 억지로 늘리지 않습니다. 장수만큼 반복하고 `.pptx`로 저장합니다.
5. 처음·중간·마지막 장을 슬라이드 쇼로 열어 빠진 장, 테두리, 잘린 글자가 없는지 확인합니다.

```css
/* 캡처할 때만 적용. 원본 HTML에는 저장하지 않아도 됩니다. */
#bar, #num, #notes, #overview, #help, #lecture-live-edit-host {
  display: none !important;
}
```

여러 장을 코드로 묶을 때는 [PptxGenJS의 이미지 삽입](https://gitbrent.github.io/PptxGenJS/docs/api-images/) 기능을 사용할 수 있습니다. 예를 들어 PNG들이 이미 준비된 폴더에서는 다음처럼 만들 수 있습니다. **이 코드는 HTML 캡처를 수행하지 않습니다.** Node.js와 `pptxgenjs`는 별도 설치가 필요하며, 기본 HTML·라이브 편집에는 필요하지 않습니다.

```bash
npm install pptxgenjs
```

아래를 같은 폴더에 `images-to-pptx.mjs`로 저장합니다.

```js
import pptxgen from "pptxgenjs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const dir = "./slides"; // slide-001.png, slide-002.png, …
const files = (await readdir(dir))
  .filter(name => /^slide-\d+\.png$/i.test(name))
  .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
if (!files.length) throw new Error("slides 폴더에 슬라이드 PNG가 없습니다.");

const pptx = new pptxgen();
const width = 40 / 3; // 13⅓ × 7½ inches, 정확한 16:9
const height = 7.5;
pptx.defineLayout({ name: "HTML_16_9", width, height });
pptx.layout = "HTML_16_9";
for (const name of files) {
  const slide = pptx.addSlide();
  slide.addImage({ path: join(dir, name), x: 0, y: 0, w: width, h: height });
}
await pptx.writeFile({ fileName: "lecture.pptx" });
```

```bash
node images-to-pptx.mjs
```

위 최소 예시는 이미지와 장 순서만 옮깁니다. HTML의 발표자 노트, 링크, 애니메이션은 옮기지 않습니다. 슬라이드 크기 설정은 [PptxGenJS 레이아웃 문서](https://gitbrent.github.io/PptxGenJS/docs/usage-pres-options/)를 참고하세요.

## 2. 글자·표·도형을 편집할 수 있는 PPT

HTML의 내용을 읽어 **제목은 텍스트 상자, 표는 PowerPoint 표, 카드는 도형과 텍스트**로 다시 만듭니다. 브라우저 CSS와 PowerPoint의 배치 방식이 달라 글꼴 폭·줄 간격·줄바꿈은 조정이 필요합니다.

### 이렇게 요청하세요

```text
deck.html과 DESIGN.md를 기준으로 편집 가능한 16:9 PPTX를 만들어줘.
슬라이드 순서와 내용, 출처, 발표자 노트는 유지해줘.
제목·본문은 텍스트 상자, 표는 PowerPoint 표,
카드·절차도는 도형과 연결선, 수치 차트는 가능한 경우 편집 가능한 차트로 만들어줘.
회사 PPT 템플릿이 있으면 그 템플릿의 마스터와 글꼴을 우선 사용해줘.
이미지로 남겨야 하는 복잡한 SVG·그림은 어떤 요소인지 따로 알려줘.
밝은 테마 하나를 기준으로 만들고, HTML과 나란히 비교해 줄바꿈·겹침을 조정해줘.
편집 가능한 요소와 이미지로 남은 요소를 정리하고 원본 HTML도 보존해줘.
```

| HTML 요소 | PPT에서 만들 요소 | 옮길 때 확인할 것 |
|---|---|---|
| `h1`, `h2`, 문단, 불릿 | 텍스트 상자 | 글꼴·들여쓰기·줄바꿈 |
| `table` | 표 | 열 너비·셀 여백·행 높이 |
| `.card`, `.callout` | 사각형 + 텍스트 | 채우기·테두리·모서리 |
| `.flow` | 단계 도형 + 연결선 | 요소 사이 간격과 화살표 방향 |
| 수치 기반 그래프 | 차트 + 원자료 | 데이터가 있어야 다시 편집 가능 |
| 복잡한 SVG·사진 | 이미지 또는 재구성한 도형 | 이미지로 넣은 부분은 내부 요소 편집 불가 |
| `aside.notes` | 발표자 노트 | 화면의 본문과 분리 |

코드로 제작한다면 PptxGenJS의 [텍스트](https://gitbrent.github.io/PptxGenJS/docs/api-text/), [표](https://gitbrent.github.io/PptxGenJS/docs/api-tables/), [차트](https://gitbrent.github.io/PptxGenJS/docs/api-charts/) API를 사용할 수 있습니다. 이름이 비슷한 [HTML to PowerPoint 기능](https://gitbrent.github.io/PptxGenJS/docs/html-to-powerpoint/)은 **HTML 표를 옮기는 기능**으로, 이 덱의 CSS·카드·레이아웃 전체를 한 번에 변환하는 기능은 아닙니다.

1280×720 화면을 13⅓×7½인치에 옮길 때 좌표는 `px ÷ 96`, 글자 크기는 `px × 0.75`를 초기값으로 삼을 수 있습니다. 예를 들어 제목 `40px`은 `30pt`부터 맞춥니다. 이는 배치 계산의 출발점이며, 실제 글꼴과 줄바꿈을 확인해 조정해야 합니다.

## 3. PDF로 배포하기

`deck.html`을 브라우저에서 열고 `Cmd+P` / `Ctrl+P` → **PDF로 저장**을 선택합니다. 가로 방향, 배경 그래픽, 머리글·바닥글 및 여백 설정을 확인하고 모든 장이 한 페이지씩 나오는지 미리 봅니다.

기본 인쇄 CSS는 발표 화면과 별도로 슬라이드 높이를 `190mm`로 지정하며, 용지 크기와 여백을 강제하는 `@page` 설정은 없습니다. **화면의 16:9 비율이 인쇄 PDF에 그대로 보장되지는 않습니다.** 페이지가 넘어가거나 여백이 크면 인쇄 설정과 `@media print`를 조정해야 합니다. 발표 화면 보존이 목적이면 위의 PNG 방식이 더 적합합니다.

PDF를 PowerPoint에 넣는 것은 보통 그림이나 개체를 삽입하는 방식입니다. PDF를 넣었다고 문장·표가 편집 가능한 슬라이드로 바뀌지는 않습니다. [Microsoft의 PDF 삽입 안내](https://support.microsoft.com/en-us/powerpoint/insert-pdf-file-content-into-a-powerpoint-presentation)를 참고하세요.

## 수정은 어디에서 하나요?

- **HTML에서 수정했다면:** PPT·PDF를 다시 만들어야 합니다. 자동 동기화되지 않습니다.
- **PPT에서 수정했다면:** 그 내용이 HTML이나 라이브 편집 피드백으로 돌아오지 않습니다. 어느 파일을 원본으로 관리할지 정하세요.
- **발표 기능:** HTML의 `T` 테마 전환, `O` 목차, 라이브 편집 버튼과 JavaScript 동작은 PPT로 자동 이전되지 않습니다.

HTML 디자인을 먼저 조정하려면 [DESIGN.md](../DESIGN.md), 기본 사용법은 [README](../README.md)를 참고하세요.
