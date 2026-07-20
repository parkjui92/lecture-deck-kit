/*
 * lecture-live-edit — 편집 오버레이
 *
 * 이 스크립트는 server.py 가 HTML 응답에 끼워 넣는다. 원본 파일에는 들어가지 않으므로
 * 디스크의 강의자료는 언제나 그대로 배포 가능한 클린 상태로 남는다.
 *
 * 주 제스처: 화면에서 고치고 싶은 문장을 드래그해 선택 → 뜨는 [수정 지시] 버튼을 눌러
 *            어떻게 고칠지 적어 보낸다. Claude 가 곧바로 반영하고 화면이 갱신된다.
 */
(function () {
  'use strict';
  if (window.__lectureLiveEdit) return;
  window.__lectureLiveEdit = true;

  var POLL_MS = 1000;
  var POLL_BACKOFF_MS = 5000;
  var STALE_HINT_MS = 60000;
  var DRAFT_KEY = 'lle:draft';
  var POS_KEY = 'lle:pos';
  var SEEN_KEY = 'lle:onboarded';

  var QUICK_CHIPS = [
    '둘로 쪼개기', '근거 보강', '덜 방어적으로', '더 간결하게',
    '표를 대비형으로', '시각화 추가', '예시 추가', '톤 부드럽게'
  ];

  var state = {
    version: null,
    pending: 0,
    needsInput: 0,
    online: true,
    pendingSince: 0,
    reloadQueued: false,
    target: null,      // {el, index, sid, title}
    selection: null,   // {text, before, after, hint}
    pickMode: false
  };

  // ── 슬라이드/섹션 단위 해석 ───────────────────────────────────
  function collectUnits() {
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-sid]'));
    if (!els.length) els = Array.prototype.slice.call(document.querySelectorAll('.slide'));
    if (!els.length) {
      els = Array.prototype.slice.call(
        document.querySelectorAll('main > section, article > section, body > section, .section'));
    }
    return els.filter(function (el) { return !host.contains(el); });
  }

  function isDeckMode(units) {
    if (!units.length) return false;
    if (units[0].classList.contains('slide')) return true;
    var shown = units.filter(isShown);
    return units.length > 1 && shown.length === 1;
  }

  function isShown(el) {
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    var cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none';
  }

  function sidOf(el, index) {
    return el.getAttribute('data-sid') || null;
  }

  function titleOf(el) {
    var h = el.querySelector('h1, h2, h3, .title, .slide-title, header');
    var src = h || el;
    // <br> 로 나뉜 제목이 붙어 읽히지 않게 innerText 를 우선 쓴다.
    var t = src.innerText || src.textContent || '';
    return t.replace(/\s+/g, ' ').trim().slice(0, 60);
  }

  function describeUnit(el, index) {
    return { el: el, index: index + 1, sid: sidOf(el, index), title: titleOf(el) };
  }

  function resolveUnit(node) {
    var units = collectUnits();
    var el = (node && node.nodeType === 3) ? node.parentElement : node;
    while (el && el !== document.body && el !== document.documentElement) {
      var i = units.indexOf(el);
      if (i >= 0) return describeUnit(el, i);
      el = el.parentElement;
    }
    return null;
  }

  function currentUnit() {
    var units = collectUnits();
    if (!units.length) return null;
    for (var i = 0; i < units.length; i++) {
      if (units[i].classList.contains('active')) return describeUnit(units[i], i);
    }
    for (var j = 0; j < units.length; j++) {
      if (isShown(units[j])) return describeUnit(units[j], j);
    }
    return describeUnit(units[0], 0);
  }

  // 선택 지점이 어떤 종류의 요소 안인지 힌트를 만든다 (CSS 경로 대신 '의미'를 보낸다).
  var HINT_TAGS = ['TABLE', 'UL', 'OL', 'PRE', 'BLOCKQUOTE', 'FIGURE', 'IMG', 'SVG',
                   'H1', 'H2', 'H3', 'H4', 'LI', 'TD', 'TH'];
  var HINT_LABEL = { TABLE: '표', UL: '목록', OL: '번호목록', PRE: '코드블록',
                     BLOCKQUOTE: '인용', FIGURE: '그림', IMG: '이미지', SVG: '도식',
                     H1: '제목', H2: '소제목', H3: '소제목', H4: '소제목',
                     LI: '항목', TD: '표 셀', TH: '표 머리' };

  function elementHint(node, unitEl) {
    var el = (node && node.nodeType === 3) ? node.parentElement : node;
    while (el && el !== unitEl) {
      if (HINT_TAGS.indexOf(el.tagName) >= 0) {
        var same = unitEl.querySelectorAll(el.tagName.toLowerCase());
        var idx = Array.prototype.indexOf.call(same, el);
        return {
          kind: HINT_LABEL[el.tagName] || el.tagName.toLowerCase(),
          kindIndex: idx >= 0 ? idx + 1 : null,
          textExcerpt: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80)
        };
      }
      el = el.parentElement;
    }
    return null;
  }

  function contextAround(unitEl, text) {
    var full = (unitEl.textContent || '').replace(/\s+/g, ' ');
    var flat = text.replace(/\s+/g, ' ');
    var at = full.indexOf(flat);
    if (at < 0) return { before: '', after: '' };
    return {
      before: full.slice(Math.max(0, at - 80), at).trim(),
      after: full.slice(at + flat.length, at + flat.length + 80).trim()
    };
  }

  // ── UI 뼈대 ────────────────────────────────────────────────────
  var host = document.createElement('div');
  host.id = 'lecture-live-edit-host';
  host.setAttribute('data-lle-ui', '');
  var shadow = host.attachShadow({ mode: 'open' });
  document.documentElement.appendChild(host);

  var forceSelect = document.createElement('style');
  forceSelect.setAttribute('data-lle-injected', '');
  forceSelect.textContent =
    '*,*::before,*::after{-webkit-user-select:text!important;user-select:text!important;}' +
    // 트랙패드 가로 스와이프가 브라우저 뒤로가기로 먹히는 것을 막는다.
    // 문장을 드래그해 선택할 때 가로 성분이 조금만 섞여도 페이지가 넘어가 버린다.
    'html,body{overscroll-behavior-x:none;overscroll-behavior-y:contain;}' +
    '#lecture-live-edit-host{position:fixed;inset:0;width:0;height:0;z-index:2147483000;}';
  document.head.appendChild(forceSelect);

  // 트랙패드 두 손가락 가로 스와이프 = 브라우저 뒤로/앞으로 가기.
  // 문장을 드래그해 선택할 때 가로 성분이 조금만 섞여도 발동해 보던 슬라이드에서 튕겨 나간다.
  // overscroll-behavior 만으로는 환경에 따라 막히지 않으므로 제스처 자체를 취소한다.
  function scrollableX(node) {
    var el = (node && node.nodeType === 3) ? node.parentElement : node;
    while (el && el !== document.body && el !== document.documentElement) {
      if (el.scrollWidth > el.clientWidth + 1) {
        var ox = getComputedStyle(el).overflowX;
        if (ox === 'auto' || ox === 'scroll') return true;   // 진짜 가로 스크롤 영역은 살려 둔다
      }
      el = el.parentElement;
    }
    return false;
  }

  window.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;     // 세로 스크롤은 건드리지 않는다
    if (scrollableX(e.target)) return;
    e.preventDefault();
  }, { passive: false, capture: true });

  shadow.innerHTML = [
    '<style>',
    ':host{all:initial;}',
    '*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",',
    '"Pretendard","Noto Sans KR",sans-serif;}',
    '.fx{position:fixed;z-index:2147483000;}',
    'button{font:inherit;cursor:pointer;border:0;background:none;color:inherit;}',
    '',
    '/* 선택 시 뜨는 버튼 */',
    '#selbtn{display:none;align-items:center;gap:6px;padding:7px 12px;border-radius:999px;',
    'background:#4f46e5;color:#fff;font-size:13px;font-weight:600;',
    'box-shadow:0 6px 20px rgba(0,0,0,.28);white-space:nowrap;}',
    '#selbtn:hover{background:#4338ca;}',
    '',
    '/* 슬라이드 호버 배지 */',
    '#badge{display:none;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;',
    'background:rgba(15,23,42,.86);color:#e2e8f0;font-size:12px;font-weight:600;',
    'backdrop-filter:blur(6px);box-shadow:0 4px 14px rgba(0,0,0,.24);}',
    '#badge:hover{background:#4f46e5;color:#fff;}',
    '',
    '/* 지시 입력 패널 */',
    '#panel{display:none;flex-direction:column;width:min(420px,calc(100vw - 32px));',
    'background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:14px;',
    'box-shadow:0 24px 60px rgba(0,0,0,.45);overflow:hidden;}',
    '#panel header{display:flex;align-items:center;gap:8px;padding:11px 14px;',
    'background:#1e293b;border-bottom:1px solid #334155;}',
    '#panel header .who{font-size:12.5px;font-weight:700;color:#a5b4fc;',
    'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;}',
    '#panel header .x{font-size:16px;color:#94a3b8;padding:0 4px;line-height:1;}',
    '#panel header .x:hover{color:#fff;}',
    '.body{padding:12px 14px;display:flex;flex-direction:column;gap:10px;}',
    '.quote{font-size:12.5px;line-height:1.55;color:#cbd5e1;background:#1e293b;',
    'border-left:3px solid #6366f1;border-radius:0 8px 8px 0;padding:8px 10px;',
    'max-height:96px;overflow:auto;white-space:pre-wrap;word-break:break-word;}',
    '.chips{display:flex;flex-wrap:wrap;gap:6px;}',
    '.chip{padding:5px 10px;border-radius:999px;font-size:12px;background:#1e293b;',
    'color:#cbd5e1;border:1px solid #334155;}',
    '.chip:hover{border-color:#6366f1;color:#fff;}',
    '.chip[aria-pressed="true"]{background:#4f46e5;border-color:#4f46e5;color:#fff;}',
    'textarea{width:100%;min-height:84px;max-height:220px;resize:vertical;padding:10px;',
    'font-size:13.5px;line-height:1.6;border-radius:9px;border:1px solid #334155;',
    'background:#020617;color:#f1f5f9;outline:none;}',
    'textarea:focus{border-color:#6366f1;}',
    '.row{display:flex;align-items:center;gap:8px;}',
    '.grow{flex:1;}',
    '.hint{font-size:11.5px;color:#64748b;}',
    '.send{padding:8px 16px;border-radius:9px;background:#4f46e5;color:#fff;',
    'font-size:13px;font-weight:700;}',
    '.send:hover{background:#4338ca;}',
    '.send[disabled]{opacity:.45;cursor:default;}',
    '.ghost{padding:7px 11px;border-radius:9px;border:1px solid #334155;',
    'font-size:12px;color:#cbd5e1;}',
    '.ghost:hover{border-color:#6366f1;color:#fff;}',
    '.ghost[aria-pressed="true"]{background:#4f46e5;border-color:#4f46e5;color:#fff;}',
    '',
    '/* 상태 필 */',
    '#pill{right:16px;bottom:16px;display:flex;align-items:center;gap:9px;',
    'padding:7px 13px;border-radius:999px;background:rgba(15,23,42,.9);color:#cbd5e1;',
    'font-size:12px;backdrop-filter:blur(8px);border:1px solid #334155;',
    'box-shadow:0 6px 22px rgba(0,0,0,.3);transition:opacity .2s;opacity:.55;}',
    '#pill:hover{opacity:1;}',
    '#pill.busy,#pill.warn{opacity:1;}',
    '#pill .dot{width:7px;height:7px;border-radius:50%;background:#22c55e;flex:none;}',
    '#pill.busy .dot{background:#f59e0b;}',
    '#pill.warn .dot{background:#ef4444;}',
    '#pill .deck{border-left:1px solid #334155;padding-left:9px;color:#a5b4fc;',
    'font-weight:600;}',
    '#pill .deck:hover{color:#fff;}',
    '',
    '/* 토스트 · 온보딩 */',
    '#toast{left:50%;bottom:22px;transform:translateX(-50%);display:none;',
    'padding:9px 16px;border-radius:999px;background:#4f46e5;color:#fff;font-size:13px;',
    'font-weight:600;box-shadow:0 10px 30px rgba(0,0,0,.35);}',
    '#intro{left:50%;top:18px;transform:translateX(-50%);display:none;align-items:center;',
    'gap:12px;padding:10px 14px;border-radius:12px;background:rgba(15,23,42,.94);',
    'color:#e2e8f0;font-size:12.5px;border:1px solid #334155;',
    'box-shadow:0 10px 30px rgba(0,0,0,.35);max-width:min(560px,calc(100vw - 32px));}',
    '#intro b{color:#a5b4fc;}',
    '#intro .x{color:#94a3b8;font-size:15px;}',
    '.pick-outline{outline:2px dashed #6366f1!important;outline-offset:2px!important;}',
    '</style>',
    '<button id="selbtn" class="fx">💬 <span>이 부분 수정 지시</span></button>',
    '<button id="badge" class="fx"><span id="badgenum"></span> 💬</button>',
    '<div id="panel" class="fx">',
    '  <header><span class="who" id="who"></span><button class="x" id="close">✕</button></header>',
    '  <div class="body">',
    '    <div class="quote" id="quote"></div>',
    '    <div class="chips" id="chips"></div>',
    '    <textarea id="ta" placeholder="어떻게 고칠까요?  (예: 이 문장 근거가 약해요. 통계 하나 붙여주세요)"></textarea>',
    '    <div class="row">',
    '      <button class="ghost" id="pick" aria-pressed="false">요소 지정</button>',
    '      <span class="hint grow" id="hint">⌘+Enter 전송</span>',
    '      <button class="send" id="send">보내기</button>',
    '    </div>',
    '  </div>',
    '</div>',
    '<div id="pill" class="fx"><span class="dot"></span><span id="pilltext">편집 대기 중</span>',
    '<button class="deck" id="deckbtn">덱 전체</button></div>',
    '<div id="toast" class="fx"></div>',
    '<div id="intro" class="fx"><span>고치고 싶은 <b>문장을 드래그해 선택</b>하면 그 자리에서 수정 지시를 남길 수 있어요.</span><button class="x" id="introx">✕</button></div>'
  ].join('\n');

  var $ = function (id) { return shadow.getElementById(id); };
  var selbtn = $('selbtn'), badge = $('badge'), badgenum = $('badgenum'), panel = $('panel');
  var who = $('who'), quote = $('quote'), chipsBox = $('chips'), ta = $('ta');
  var pillEl = $('pill'), pillText = $('pilltext'), toastEl = $('toast'), introEl = $('intro');

  QUICK_CHIPS.forEach(function (label) {
    var b = document.createElement('button');
    b.className = 'chip';
    b.type = 'button';
    b.textContent = label;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', function () {
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      updateSendState();
    });
    chipsBox.appendChild(b);
  });

  function selectedChips() {
    return Array.prototype.slice.call(chipsBox.querySelectorAll('.chip'))
      .filter(function (c) { return c.getAttribute('aria-pressed') === 'true'; })
      .map(function (c) { return c.textContent; });
  }

  function clearChips() {
    Array.prototype.forEach.call(chipsBox.querySelectorAll('.chip'), function (c) {
      c.setAttribute('aria-pressed', 'false');
    });
  }

  function place(el, x, y) {
    el.style.display = 'flex';
    var r = el.getBoundingClientRect();
    var left = Math.max(10, Math.min(x, window.innerWidth - r.width - 10));
    var top = Math.max(10, Math.min(y, window.innerHeight - r.height - 10));
    el.style.left = left + 'px';
    el.style.top = top + 'px';
  }

  // ── 선택 감지 ─────────────────────────────────────────────────
  function insideUI(node) {
    var el = (node && node.nodeType === 3) ? node.parentElement : node;
    return !!(el && (el === host || host.contains(el) || (el.closest && el.closest('[data-lle-ui]'))));
  }

  function onSelectionChange(ev) {
    if (panel.style.display === 'flex') return;
    if (ev && insideUI(ev.target)) return;
    setTimeout(function () {
      var sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) { selbtn.style.display = 'none'; return; }
      var text = String(sel).trim();
      if (text.length < 2) { selbtn.style.display = 'none'; return; }
      var range = sel.getRangeAt(0);
      if (insideUI(range.commonAncestorContainer)) { selbtn.style.display = 'none'; return; }
      var unit = resolveUnit(range.commonAncestorContainer);
      if (!unit) { selbtn.style.display = 'none'; return; }

      var ctx = contextAround(unit.el, text);
      state.target = unit;
      state.selection = {
        text: text.slice(0, 1200),
        before: ctx.before,
        after: ctx.after,
        hint: elementHint(range.startContainer, unit.el)
      };
      var r = range.getBoundingClientRect();
      state.selection.rect = { left: r.left, top: r.top, bottom: r.bottom, right: r.right };
      place(selbtn, r.left, r.bottom + 8);
    }, 10);
  }

  document.addEventListener('mouseup', onSelectionChange, true);
  document.addEventListener('keyup', function (e) {
    if (e.shiftKey || e.key === 'Shift') onSelectionChange(e);
  }, true);

  selbtn.addEventListener('click', function () {
    selbtn.style.display = 'none';
    openPanel('selection');
  });

  // ── 슬라이드 호버 배지 ────────────────────────────────────────
  var hovered = null;
  document.addEventListener('mouseover', function (e) {
    if (panel.style.display === 'flex' || state.pickMode) return;
    if (insideUI(e.target)) return;
    var unit = resolveUnit(e.target);
    if (!unit) { badge.style.display = 'none'; hovered = null; return; }
    hovered = unit;
    badgenum.textContent = unit.index;
    var r = unit.el.getBoundingClientRect();
    place(badge, r.right - 74, r.top + 10);
  }, true);

  window.addEventListener('scroll', function () { badge.style.display = 'none'; }, true);

  badge.addEventListener('click', function () {
    if (!hovered) return;
    badge.style.display = 'none';
    state.target = hovered;
    state.selection = null;
    openPanel('slide');
  });

  $('deckbtn').addEventListener('click', function () {
    state.target = null;
    state.selection = null;
    openPanel('deck');
  });

  // ── 패널 ──────────────────────────────────────────────────────
  var scope = 'selection';

  function openPanel(kind) {
    scope = kind;
    var label;
    if (kind === 'deck') {
      label = '📚 자료 전체에 대한 지시';
      quote.style.display = 'none';
    } else {
      var t = state.target;
      label = (t.sid ? t.sid + ' · ' : '') + t.index + '번' + (t.title ? ' · ' + t.title : '');
      if (kind === 'selection') {
        quote.style.display = 'block';
        quote.textContent = '"' + state.selection.text + '"';
      } else {
        quote.style.display = 'block';
        quote.textContent = '이 슬라이드 전체';
      }
    }
    who.textContent = label;

    var draft = '';
    try { draft = localStorage.getItem(DRAFT_KEY) || ''; } catch (e) {}
    ta.value = draft;
    updateSendState();

    placePanel();
    setTimeout(function () { ta.focus(); }, 20);
    blockKeys(true);
  }

  // 패널이 '지금 고치려는 그 문장'을 가리면 안 된다.
  // 선택 영역 아래에 두되, 자리가 없으면 위로 넘긴다.
  function placePanel() {
    panel.style.display = 'flex';
    var ph = panel.getBoundingClientRect().height || 340;
    var pw = panel.getBoundingClientRect().width || 420;
    var rect = (state.selection && state.selection.rect) ||
               (state.target ? state.target.el.getBoundingClientRect() : null);
    if (!rect) { place(panel, window.innerWidth - pw - 24, 90); return; }

    var gap = 14;
    var below = rect.bottom + gap;
    var above = rect.top - ph - gap;
    var y = (below + ph <= window.innerHeight - 10) ? below
          : (above >= 10 ? above : Math.max(10, window.innerHeight - ph - 10));
    place(panel, rect.left, y);
  }

  function closePanel() {
    panel.style.display = 'none';
    state.pickMode = false;
    $('pick').setAttribute('aria-pressed', 'false');
    clearPickOutline();
    blockKeys(false);
    if (state.reloadQueued) doReload();
  }

  $('close').addEventListener('click', closePanel);

  function updateSendState() {
    var ok = ta.value.trim().length > 0 || selectedChips().length > 0;
    $('send').disabled = !ok;
  }

  ta.addEventListener('input', function () {
    updateSendState();
    try { localStorage.setItem(DRAFT_KEY, ta.value); } catch (e) {}
  });

  // ── 키 격리 ───────────────────────────────────────────────────
  // 덱은 keydown 으로 슬라이드를 넘기므로, 패널에 타이핑할 때 화면이 넘어가면 안 된다.
  // 캡처 단계에서 먼저 가로채 덱의 (비캡처) 리스너에 닿지 않게 한다.
  function keyGuard(e) {
    if (!insideUI(e.target)) return;
    if (e.key === 'Escape') { e.stopPropagation(); closePanel(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.stopPropagation(); send(); return; }
    e.stopPropagation();
  }

  function blockKeys(on) {
    ['keydown', 'keypress', 'keyup'].forEach(function (t) {
      if (on) document.addEventListener(t, keyGuard, true);
      else document.removeEventListener(t, keyGuard, true);
    });
  }

  // ── 요소 지정 모드 ────────────────────────────────────────────
  var pickedEl = null;

  function clearPickOutline() {
    if (pickedEl) { pickedEl.classList.remove('lle-pick'); pickedEl.style.outline = ''; pickedEl = null; }
  }

  $('pick').addEventListener('click', function () {
    state.pickMode = !state.pickMode;
    this.setAttribute('aria-pressed', String(state.pickMode));
    $('hint').textContent = state.pickMode
      ? '표·목록·그림을 클릭해 지정하세요 (ESC 취소)'
      : '⌘+Enter 전송';
  });

  document.addEventListener('click', function (e) {
    if (!state.pickMode || insideUI(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    var unit = resolveUnit(e.target) || state.target;
    if (!unit) return;
    var hint = elementHint(e.target, unit.el);
    if (!hint) return;
    state.target = unit;
    state.selection = state.selection || { text: '', before: '', after: '', hint: null };
    state.selection.hint = hint;
    quote.style.display = 'block';
    quote.textContent = '지정: ' + hint.kind +
      (hint.kindIndex ? ' #' + hint.kindIndex : '') +
      (hint.textExcerpt ? ' — "' + hint.textExcerpt + '"' : '');
    state.pickMode = false;
    $('pick').setAttribute('aria-pressed', 'false');
    $('hint').textContent = '⌘+Enter 전송';
  }, true);

  // ── 전송 ──────────────────────────────────────────────────────
  $('send').addEventListener('click', send);

  function send() {
    var text = ta.value.trim();
    var chips = selectedChips();
    if (!text && !chips.length) return;

    var t = state.target;
    var units = collectUnits();
    var payload = {
      scope: scope,
      sid: t ? t.sid : null,
      index: t ? t.index : null,
      total: units.length,
      titleExcerpt: t ? t.title : null,
      selectedText: state.selection ? state.selection.text : null,
      contextBefore: state.selection ? state.selection.before : null,
      contextAfter: state.selection ? state.selection.after : null,
      elemHint: state.selection ? state.selection.hint : null,
      quickActions: chips,
      instruction: text,
      page: location.pathname
    };

    $('send').disabled = true;
    post(payload, 2).then(function (res) {
      try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
      ta.value = '';
      clearChips();
      closePanel();
      toast('보냈어요 · 대기 ' + (res && res.queued != null ? res.queued : '') + '건');
      poll();
    }).catch(function () {
      $('send').disabled = false;
      toast('⚠ 전송 실패 — 서버가 떠 있는지 확인하세요 (입력은 보관됨)');
    });
  }

  function post(payload, tries) {
    return fetch('/__feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store'
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).catch(function (err) {
      if (tries > 1) return post(payload, tries - 1);
      throw err;
    });
  }

  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.style.display = 'none'; }, 2600);
  }

  // ── 상태 폴링 · 자동 갱신 ─────────────────────────────────────
  function poll() {
    fetch('/__status', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (s) {
        state.online = true;
        if (state.version === null) state.version = s.version;
        else if (s.version !== state.version) {
          state.version = s.version;
          if (panel.style.display === 'flex') {
            state.reloadQueued = true;
            toast('반영 완료 — 창을 닫으면 갱신됩니다');
          } else {
            doReload();
            return;
          }
        }
        if (s.pending > 0 && !state.pendingSince) state.pendingSince = Date.now();
        if (s.pending === 0) state.pendingSince = 0;
        state.pending = s.pending;
        state.needsInput = s.needsInput;
        renderPill();
        schedule(POLL_MS);
      })
      .catch(function () {
        state.online = false;
        renderPill();
        schedule(POLL_BACKOFF_MS);
      });
  }

  var pollTimer = null;
  function schedule(ms) { clearTimeout(pollTimer); pollTimer = setTimeout(poll, ms); }

  function renderPill() {
    pillEl.classList.remove('busy', 'warn');
    if (!state.online) {
      pillEl.classList.add('warn');
      pillText.textContent = '서버 연결 끊김';
      return;
    }
    if (state.pending > 0) {
      pillEl.classList.add('busy');
      var stale = state.pendingSince && (Date.now() - state.pendingSince > STALE_HINT_MS);
      pillText.textContent = '반영 대기 ' + state.pending + '건' +
        (stale ? ' · 채팅에 “ㄱ” 입력' : '');
      return;
    }
    if (state.needsInput > 0) {
      pillEl.classList.add('warn');
      pillText.textContent = '확인 필요 ' + state.needsInput + '건 · 채팅 보기';
      return;
    }
    pillText.textContent = '편집 대기 중';
  }

  // ── 위치 보존 후 새로고침 ─────────────────────────────────────
  function doReload() {
    var units = collectUnits();
    var cur = currentUnit();
    var deck = isDeckMode(units);
    try {
      sessionStorage.setItem(POS_KEY, JSON.stringify({
        sid: cur ? cur.sid : null,
        index: cur ? cur.index : 1,
        y: window.scrollY,
        deck: deck
      }));
    } catch (e) {}
    if (deck && cur && cur.sid && document.documentElement.hasAttribute('data-lle-runtime')) {
      // 표준 골격은 해시로 곧장 복원된다. 단, `location.hash = …` 는 히스토리 항목을 쌓아
      // 뒤로가기 한 번에 엉뚱한 슬라이드로 튀게 만들므로 replaceState 로 갈아 끼운다.
      history.replaceState(null, '', '#' + cur.sid);
    }
    location.reload();
  }

  function restorePosition() {
    var raw = null;
    try {
      raw = sessionStorage.getItem(POS_KEY);
      sessionStorage.removeItem(POS_KEY);
    } catch (e) {}
    if (!raw) return;
    var pos;
    try { pos = JSON.parse(raw); } catch (e) { return; }

    if (!pos.deck) { window.scrollTo(0, pos.y || 0); return; }

    var units = collectUnits();
    if (!units.length) return;
    var target = -1;
    if (pos.sid) {
      for (var i = 0; i < units.length; i++) {
        if (units[i].getAttribute('data-sid') === pos.sid) { target = i; break; }
      }
    }
    if (target < 0) target = Math.min(Math.max((pos.index || 1) - 1, 0), units.length - 1);

    // 덱마다 내부 인덱스가 있으므로 클래스를 직접 건드리지 않고
    // 방향키 이벤트를 흘려보내 덱 자신이 이동하게 한다 (어떤 덱에서도 통한다).
    var guard = 0, lastDir = 0;
    (function step() {
      var fresh = collectUnits();
      var cur = -1;
      for (var i = 0; i < fresh.length; i++) {
        if (fresh[i].classList.contains('active')) { cur = i; break; }
      }
      if (cur < 0) for (var j = 0; j < fresh.length; j++) { if (isShown(fresh[j])) { cur = j; break; } }
      if (cur < 0 || cur === target || guard++ > fresh.length + 4) return;
      var dir = cur < target ? 1 : -1;
      if (lastDir && dir !== lastDir) return;   // 방향이 뒤집혔다 = 지나쳤다 → 즉시 멈춘다
      lastDir = dir;
      var key = cur < target ? 'ArrowRight' : 'ArrowLeft';
      document.body.dispatchEvent(new KeyboardEvent('keydown', {
        key: key, code: key, bubbles: true, cancelable: true
      }));
      setTimeout(step, 60);
    })();
  }

  // ── 온보딩 ────────────────────────────────────────────────────
  function maybeIntro() {
    var seen = null;
    try { seen = localStorage.getItem(SEEN_KEY); } catch (e) {}
    if (seen) return;
    // 한 번 보여줬으면 그것으로 끝. 반영할 때마다 새로고침되므로 매번 뜨면 성가시다.
    try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) {}
    introEl.style.display = 'flex';
    setTimeout(function () { introEl.style.display = 'none'; }, 12000);
  }
  $('introx').addEventListener('click', function () {
    introEl.style.display = 'none';
    try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) {}
  });

  // ── 시작 ──────────────────────────────────────────────────────
  function boot() {
    restorePosition();
    maybeIntro();
    poll();
  }
  if (document.readyState === 'complete') setTimeout(boot, 80);
  else window.addEventListener('load', function () { setTimeout(boot, 80); });
})();
