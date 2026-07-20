# 슬라이드 마크업 문법

골격(`assets/deck-skeleton.html`)에 정의된 클래스만 쓴다. 새 클래스를 만들면 스타일이 어긋난다.
불가피하게 새 스타일이 필요하면 `<style>` 블록 안 해당 섹션에 추가하고, 디자인 토큰(`var(--accent)` 등)을 쓴다.

## 슬라이드 기본형

```html
<section class="slide" data-sid="s08">
  <h2>주장을 담은 제목</h2>
  <p class="lead">제목을 한 문장으로 풀어 쓴 핵심 메시지.</p>
  <!-- 본문 -->
  <p class="src">출처: 기관명(2025), 「자료명」, 표 3.</p>
  <aside class="notes">말로 덧붙일 것, 예상 질문, 시간 배분.</aside>
</section>
```

`class="slide"` 와 `data-sid` 는 필수. 첫 슬라이드에만 `active` 를 붙인다.

## 유형별

### 표지 · 간지

```html
<section class="slide cover active" data-sid="s01">
  <span class="kicker">강의 · 2026</span>
  <h1>제목<br>두 줄까지</h1>
  <p class="lead">한 문장 부제</p>
  <div class="meta"><span>이름</span><span>소속</span><span>2026. 8. 1.</span></div>
</section>

<section class="slide divider" data-sid="s03">
  <h2>1. 왜 지금인가</h2>
  <p class="sub">이 축에서 답할 질문</p>
</section>
```

### 불릿

```html
<ul class="bullets">
  <li>주장 한 줄 <span class="note">한 줄짜리 보조 설명</span></li>
  <li>다음 주장</li>
</ul>
```
3~5개. 넘으면 슬라이드를 쪼갠다(`s08` + `s08-2`).

### 대비형 표

```html
<table>
  <thead><tr><th style="width:22%">구분</th><th>기존</th><th>제안</th></tr></thead>
  <tbody>
    <tr><td class="em">관점</td><td>무엇을 했는가</td><td>무엇이 바뀌었는가</td></tr>
  </tbody>
</table>
```
`td.em` 은 행 이름(강조색). 열 3개 이하. 셀에 보조 예시를 달 때는 `<span class="eg">예: …</span>`
(골격에 없으면 `td .eg{display:block;font-size:14.5px;color:var(--muted);margin-top:5px}` 을 CSS에 추가).

### 카드 · 통계

```html
<div class="grid-3">
  <div class="card"><div class="stat"><span class="num">62%</span><span class="cap">지표 설명</span></div></div>
  <div class="card accent"><h3>제목</h3><p>설명</p></div>
</div>
```
`.grid-2` 는 2열(비교), `.grid-3` 은 3열(병렬). `.card.accent` 는 강조 카드 하나에만.

### 흐름도

```html
<div class="flow">
  <div class="step"><b>1단계</b>무엇을 한다</div><span class="arrow">→</span>
  <div class="step"><b>2단계</b>무엇을 한다</div>
</div>
```
4단계를 넘으면 두 줄로 나뉘어 흐름이 끊긴다. 그때는 슬라이드를 쪼갠다.

### 콜아웃

```html
<div class="callout">기억할 한 문장.</div>
<div class="callout warn">흔한 오해나 주의점.</div>
```
한 장에 하나만. 두 개면 강조가 사라진다.

## 레이아웃 요령

- 세로 여백이 남으면 `<div class="fill"></div>` 로 밀어 아래 요소를 하단에 붙인다.
- 슬라이드 높이는 720px 고정이다. 내용이 넘치면 **줄이지 말고 쪼갠다**
  (스크롤이 생기면 발표 중 잘린다).
- 넘침 확인은 브라우저 스크린샷이 가장 빠르다. 표 5행·불릿 6개부터 위험하다.

## 차트가 필요할 때

`dataviz` 스킬을 Read 하고 **인라인 SVG** 로 그린다. 외부 차트 라이브러리를 부르지 않는다.
`viewBox` 를 쓰고 색은 `var(--accent)` / `var(--accent-2)` / `var(--muted)` 로 맞춘다.
막대 3~5개, 선 2~3개를 넘기면 슬라이드에서 읽히지 않는다.

## 흔한 실수

| 실수 | 결과 | 대신 |
|---|---|---|
| 제목을 주제로 씀 | 나열식·방어적 슬라이드 | 주장으로 씀 |
| 한 장에 메시지 2개 | 청중이 무엇을 기억할지 모름 | 쪼갠다 |
| 문장을 통째로 불릿에 | 발표자가 읽게 됨 | 핵심구 + `.note` 보조 |
| 표 5열 | 판독 불가 | 3열 이하, 아니면 카드로 |
| 재번호 매기기 | 대기 중 피드백이 엉뚱한 장을 가리킴 | sid 승계 규칙 준수 |
