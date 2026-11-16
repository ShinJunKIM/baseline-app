/* 베이스라인 · 코어: 유틸, 저장소, 상태, 라우터, 공용 컴포넌트, 차트 */
window.BL = window.BL || {};
(function (BL) {
  'use strict';
  const E = BL.engine, X = BL.X;

  // ───────── 유틸 ─────────
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const n1 = v => (Math.round(v * 10) / 10).toLocaleString('ko-KR');
  const n0 = v => Math.round(v).toLocaleString('ko-KR');
  const DOW = '일월화수목금토';
  const fmtD = s => { if (!s) return ''; const d = E.parse(s); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DOW[d.getDay()]})`; };
  const fmtShort = s => s ? `${+s.slice(5, 7)}/${+s.slice(8, 10)}` : '';
  const fmtClock = sec => `${Math.floor(sec / 60)}:${pad(Math.max(0, sec) % 60)}`;
  const fmtTime = iso => { if (!iso) return ''; const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const deep = o => JSON.parse(JSON.stringify(o));
  let toastT;
  function toast(msg, ms) { const el = $('#toast'); el.textContent = msg; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, ms || 2400); }

  // ───────── 상태 ─────────
  const S = {
    view: 'home', profile: null, programs: [], sessions: [], metrics: [], tests: [], stale: false, dbError: null, loaded: false,
    ui: { histFilter: 'all', libQ: '', libPat: '', libMine: false, libSafe: false, range: 12, progEx: null, heatWeek: 0, openDays: {}, sheet: null, dirty: false, tables: {} },
    timer: { end: null, total: 0, iv: null, over: false }, pending: {}
  };
  BL.S = S;
  const COLLS = ['profile', 'programs', 'sessions', 'metrics', 'tests', 'photos'];
  S.photos = []; S.ui.collapsed = {}; S.ui.calMonth = null;

  function collArray(c) { return c === 'profile' ? (S.profile ? [Object.assign({ id: 'me' }, S.profile)] : []) : S[c]; }
  function applyColl(c, docs) {
    if (c === 'profile') { S.profile = docs.find(d => d.id === 'me') || null; return; }
    if (c === 'sessions') {
      // 진행 중 세션은 로컬 수정본(rev가 큰 쪽)을 유지
      const act = activeSession();
      S.sessions = docs.map(d => (act && d.id === act.id && (act.rev || 0) > (d.rev || 0)) ? act : d);
      if (act && !docs.some(d => d.id === act.id) && store.inflight.has('sessions/' + act.id)) S.sessions.push(act);
      return;
    }
    S[c] = docs;
  }
  function upsertLocal(c, id, data) {
    const doc = Object.assign({}, data, { id });
    if (c === 'profile') { S.profile = doc; return; }
    const i = S[c].findIndex(d => d.id === id);
    if (i >= 0) S[c][i] = doc; else S[c].push(doc);
  }
  function removeLocal(c, id) { if (c === 'profile') { S.profile = null; return; } S[c] = S[c].filter(d => d.id !== id); }
  function activeSession() { const a = S.sessions.filter(s => s.status === 'active').sort((x, y) => (y.startedAt || '').localeCompare(x.startedAt || '')); return a[0] || null; }
  function activeProgram() { return S.programs.find(p => p.active) || S.programs.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0] || null; }
  function todayMetric() { const t = E.today(); return S.metrics.find(m => m.date === t || m.id === t) || null; }

  // ───────── 기기 저장소 (IndexedDB, 없으면 localStorage) ─────────
  const idb = {
    db: null,
    open() { return new Promise((res, rej) => { if (!('indexedDB' in window)) return rej(new Error('no idb')); let r; try { r = indexedDB.open('baseline', 1); } catch (e) { return rej(e); } r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('docs')) { const s = d.createObjectStore('docs', { keyPath: 'key' }); s.createIndex('coll', 'coll'); } }; r.onsuccess = () => { this.db = r.result; res(r.result); }; r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error('blocked')); }); },
    all(coll) { return new Promise((res, rej) => { const req = this.db.transaction('docs').objectStore('docs').index('coll').getAll(coll); req.onsuccess = () => res(req.result.map(x => x.doc)); req.onerror = () => rej(req.error); }); },
    put(coll, id, doc) { return new Promise((res, rej) => { const tx = this.db.transaction('docs', 'readwrite'); tx.objectStore('docs').put({ key: coll + '/' + id, coll, doc: Object.assign({}, doc, { id }) }); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); },
    del(coll, id) { return new Promise((res, rej) => { const tx = this.db.transaction('docs', 'readwrite'); tx.objectStore('docs').delete(coll + '/' + id); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); }
  };

  // ───────── 저장소 (db 가능하면 db, 아니면 이 기기) ─────────
  const store = {
    mode: 'local', db: null, user: null, readOnly: false, unsub: [], loadedC: new Set(), pending: new Map(), inflight: new Set(), retries: new Map(), downloads: null, sample: null, assets: null,
    async init() {
      let db = null, user = null;
      try {
        if (window.claude && typeof window.claude.use === 'function') {
          const res = await Promise.all([claude.use('db'), claude.use('user'), claude.use('downloads').catch(() => null), claude.use('sample').catch(() => null), claude.use('assets').catch(() => null)]);
          db = res[0]; user = res[1]; this.downloads = res[2]; this.sample = res[3]; this.assets = res[4];
        }
      } catch (e) { db = null; }
      this.user = user;
      if (db) {
        this.mode = 'db'; this.db = db;
        try { const c = await user?.can('data.write'); if (c === false) this.readOnly = true; } catch (e) { }
        this.subscribeAll();
      } else { this.mode = 'local'; await this.loadLocal(); }
      updatePill();
    },
    async loadLocal() {
      let ok = false;
      try { await idb.open(); ok = true; } catch (e) { ok = false; }
      if (ok) {
        this.idb = idb;
        try {
          for (const c of COLLS) { const docs = await idb.all(c); applyColl(c, docs); this.loadedC.add(c); }
          // 예전 localStorage 기록이 있으면 옮긴다
          const legacy = COLLS.filter(c => { try { return !!localStorage.getItem('bl:' + c); } catch (e) { return false; } });
          if (legacy.length && COLLS.every(c => !collArray(c).length)) {
            for (const c of legacy) { let arr = []; try { arr = JSON.parse(localStorage.getItem('bl:' + c) || '[]'); } catch (e) { } for (const d of (Array.isArray(arr) ? arr : [])) { if (d && d.id) await idb.put(c, d.id, d); } applyColl(c, await idb.all(c)); try { localStorage.removeItem('bl:' + c); } catch (e) { } }
          }
        } catch (e) { ok = false; this.idb = null; }
      }
      if (!ok) this.loadLocalLS();
      S.loaded = true; onData('all');
    },
    subscribeAll() {
      COLLS.forEach(c => {
        let q = this.db.collection(c);
        if (c === 'sessions' || c === 'metrics') q = q.orderBy('date', 'desc').limit(1000); else q = q.limit(1000);
        const timer = setTimeout(() => { if (!this.loadedC.has(c)) { S.stale = true; updatePill(); } }, 10000);
        const un = q.onSnapshot(snap => {
          clearTimeout(timer);
          const docs = snap.docs.filter(d => d.exists).map(d => Object.assign({}, d.data(), { id: d.id }));
          applyColl(c, docs);
          if (!snap.metadata.fromCache) { this.loadedC.add(c); S.stale = false; }
          S.loaded = COLLS.every(k => this.loadedC.has(k));
          updatePill(); onData(c);
        }, err => { clearTimeout(timer); this.loadedC.add(c); S.dbError = err.code; S.loaded = COLLS.every(k => this.loadedC.has(k)); updatePill(); onData(c); });
        this.unsub.push(un);
      });
    },
    loadLocalLS() {
      COLLS.forEach(c => { let arr = []; try { arr = JSON.parse(localStorage.getItem('bl:' + c) || '[]'); } catch (e) { } applyColl(c, Array.isArray(arr) ? arr : []); this.loadedC.add(c); });
    },
    saveLocal(c) { try { localStorage.setItem('bl:' + c, JSON.stringify(collArray(c))); } catch (e) { toast('이 기기에 저장하지 못했어요 (저장 공간 부족 또는 차단).'); } },
    set(c, id, data) {
      const clean = deep(data); delete clean.id;
      upsertLocal(c, id, clean);
      if (this.mode === 'local') { if (this.idb) return this.idb.put(c, id, clean).catch(() => this.saveLocal(c)); this.saveLocal(c); return Promise.resolve(); }
      if (this.readOnly) { toast('읽기 전용: 이 페이지의 소유자만 기록할 수 있어요.'); return Promise.resolve(); }
      const k = c + '/' + id; this.pending.set(k, clean); return this.flush(k);
    },
    async flush(k) {
      if (this.inflight.has(k)) return;
      const data = this.pending.get(k); if (!data) return; this.pending.delete(k);
      this.inflight.add(k);
      try { await this.db.doc(k).set(data); this.retries.delete(k); }
      catch (e) {
        const code = e && e.code;
        if (code === 'invalid_argument') { this.readOnly = true; updatePill(); toast('저장 권한이 없어요. 이 페이지의 소유자만 기록할 수 있어요.'); }
        else if (code === 'quota_exceeded') toast('저장 공간이 가득 찼어요. 오래된 기록을 지워 주세요.');
        else if (code === 'revoked' || code === 'not_granted') { toast('저장소 연결이 끊겼어요. 페이지를 다시 열어 주세요.'); }
        else {
          const n = (this.retries.get(k) || 0) + 1; this.retries.set(k, n);
          if (n <= 3) { this.inflight.delete(k); if (!this.pending.has(k)) this.pending.set(k, data); setTimeout(() => this.flush(k), 1200 * n + Math.random() * 800); return; }
          toast('저장에 계속 실패해요. 연결을 확인해 주세요.');
        }
      }
      this.inflight.delete(k);
      if (this.pending.has(k)) this.flush(k);
    },
    async del(c, id) {
      removeLocal(c, id);
      if (this.mode === 'local') { if (this.idb) { try { await this.idb.del(c, id); } catch (e) { this.saveLocal(c); } } else this.saveLocal(c); return; }
      if (this.readOnly) return;
      try { await this.db.doc(c + '/' + id).delete(); } catch (e) { toast('삭제 실패: ' + (e.code || '')); }
    }
  };
  BL.store = store;

  function updatePill() {
    const el = $('#store-pill'); if (!el) return;
    let cls = 'pill', txt = '';
    if (store.mode === 'db') {
      if (store.readOnly) { cls += ' warn'; txt = '읽기 전용'; }
      else if (S.dbError) { cls += ' crit'; txt = '저장소 오류'; }
      else if (S.stale) { cls += ' warn'; txt = '서버 연결 대기'; }
      else if (!S.loaded) { txt = '불러오는 중'; }
      else { cls += ' ok'; txt = '클라우드 저장'; }
    } else { cls += ' acc'; txt = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches ? '이 기기에 저장' : '이 브라우저에만 저장'; }
    el.className = cls; el.innerHTML = `<i></i>${txt}`;
  }

  // 데이터 도착 → 화면 갱신 (입력 중이면 미룸)
  function onData(c) {
    if (!document.body) return;
    const act = document.activeElement;
    const typing = act && $('#view') && $('#view').contains(act) && ['INPUT', 'TEXTAREA', 'SELECT'].includes(act.tagName);
    if (S.view === 'train' && c === 'sessions') { renderTrainHeader(); return; }
    if (typing || !$('#sheet').hidden) { S.ui.dirty = true; return; }
    render();
  }
  document.addEventListener('focusout', () => { setTimeout(() => { if (!S.ui.dirty) return; const act = document.activeElement; if (act && $('#view').contains(act) && ['INPUT', 'TEXTAREA', 'SELECT'].includes(act.tagName)) return; if (!$('#sheet').hidden) return; S.ui.dirty = false; render(); }, 80); });

  // ───────── 라우터 ─────────
  const VIEWS = ['home', 'train', 'history', 'program', 'progress', 'library', 'profile'];
  let lastView = null;
  function route() {
    const h = (location.hash || '').replace('#', '');
    S.view = VIEWS.includes(h) ? h : 'home';
    render();
    if (lastView !== S.view) { window.scrollTo(0, 0); lastView = S.view; }
  }
  function go(v) { if (location.hash === '#' + v) render(); else location.hash = v; }
  window.addEventListener('hashchange', route);

  function render() {
    $$('.tabs a, .bottom-tabs a').forEach(a => a.classList.toggle('on', a.dataset.v === S.view));
    const fn = BL.views && BL.views[S.view];
    const v = $('#view');
    if (!fn) { v.innerHTML = ''; return; }
    try { v.innerHTML = fn(); } catch (e) { console.error(e); v.innerHTML = `<div class="banner crit"><div><b>화면을 그리지 못했어요</b>${esc(e.message)}</div></div>`; }
    if (BL.afterRender) BL.afterRender();
    if (S.view === 'train') startElapsed(); else stopElapsed();
  }
  function renderTrainHeader() { const el = $('#log-top'); if (el && BL.views.trainHeader) el.outerHTML = BL.views.trainHeader(); }

  // 경과 시간
  let elapsedIv = null;
  function startElapsed() { stopElapsed(); const tick = () => { const s = activeSession(); const el = $('#elapsed'); if (!s || !el) return; const sec = Math.max(0, Math.round((Date.now() - new Date(s.startedAt).getTime()) / 1000)); el.textContent = `${Math.floor(sec / 3600) ? Math.floor(sec / 3600) + ':' : ''}${pad(Math.floor(sec / 60) % 60)}:${pad(sec % 60)}`; }; tick(); elapsedIv = setInterval(tick, 1000); }
  function stopElapsed() { if (elapsedIv) clearInterval(elapsedIv); elapsedIv = null; }

  // ───────── 시트(모달) ─────────
  function openSheet(html, key) { S.ui.sheet = key || 'x'; $('#sheet-panel').innerHTML = html; $('#sheet').hidden = false; document.body.style.overflow = 'hidden'; const f = $('#sheet-panel [autofocus]'); if (f) setTimeout(() => f.focus(), 50); }
  function closeSheet() { $('#sheet').hidden = true; $('#sheet-panel').innerHTML = ''; document.body.style.overflow = ''; S.ui.sheet = null; if (S.ui.dirty) { S.ui.dirty = false; render(); } }
  const sheetHead = (title, sub) => `<div class="sheet-h"><div><h2>${esc(title)}</h2>${sub ? `<div class="small muted">${sub}</div>` : ''}</div><button class="xbtn" data-act="sheet-close" aria-label="닫기">✕</button></div>`;
  const subnav = (title, right, sub) => `<div class="subnav"><div class="subnav-in"><div><h1>${title}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div><div class="row">${right || ''}</div></div></div>`;

  // ───────── 아이콘 · 링 ─────────
  const ICONS = {
    play: '<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>', plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', check: '<path d="M5 12l5 5L19 7"/>',
    down: '<path d="M6 9l6 6 6-6"/>', up: '<path d="M18 15l-6-6-6 6"/>', left: '<path d="M15 18l-6-6 6-6"/>', right: '<path d="M9 6l6 6-6 6"/>', swap: '<path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>',
    more: '<circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/>', timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
    flame: '<path d="M12 22c4.4 0 7-2.8 7-6.5 0-3-2-5.5-3.5-7.5-.5 2-1.5 3-2.5 3.5 0-3-1.5-6-4-8 .5 3-1 5-3 7.5A7 7 0 0 0 5 15.5C5 19.2 7.6 22 12 22z"/>', trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
    calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>', camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>', list: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    edit: '<path d="M4 20h4l10-10-4-4L4 16z"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', note: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 10h8M8 14h6"/>', ruler: '<path d="M3 17L17 3l4 4L7 21zM8 12l2 2M11 9l2 2M14 6l2 2"/>'
  };
  const ico = (n, cls) => `<svg class="ico ${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
  function ring(pct, size, inner, opts) {
    opts = opts || {}; size = size || 48; const sw = opts.stroke || 4; const r = (size - sw) / 2; const c = 2 * Math.PI * r; const p = Math.max(0, Math.min(1, pct || 0));
    return `<span class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="${sw}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${opts.color || 'var(--accent)'}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - p)).toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg><span class="rv" style="font-size:${opts.font || Math.round(size * 0.3)}px">${inner == null ? '' : inner}</span></span>`;
  }

  // ───────── 근육 그림 ─────────
  function figure(view, opts) {
    opts = opts || {};
    const heat = opts.heat || null, hit = opts.hit ? new Set(opts.hit) : null, mini = !!opts.mini;
    const max = heat ? Math.max(1, ...Object.values(heat)) : 1;
    let s = `<svg viewBox="0 0 200 462" class="fig${mini ? ' mini' : ''}" role="img" aria-label="${view === 'f' ? '몸 앞면' : '몸 뒷면'}">`;
    s += `<g class="base"><ellipse cx="100" cy="32" rx="17" ry="21"/><path d="${BL.SIL}"/><path d="${BL.SIL}" transform="${BL.MIR}"/></g>`;
    let L = '', D = '';
    for (const m of BL.MUSCLES) {
      for (const [v, l, d] of m.sh) {
        if (v !== view) continue;
        let cls = 'mm';
        if (hit) { if (!hit.has(m.id)) { if (l === 'd' || mini) continue; } else cls += ' hit'; }
        else if (heat) { const val = heat[m.id] || 0; if (!val && l === 'd') continue; if (val) { const step = Math.min(5, Math.max(1, Math.ceil(val / max * 5))); cls += ' h' + step; } }
        else if (l === 'd') continue;
        const el = `<path class="${cls}" d="${d}"><title>${esc(m.n)}${heat && heat[m.id] ? ` · ${n1(heat[m.id])}세트` : ''}</title></path><path class="${cls}" d="${d}" transform="${BL.MIR}"/>`;
        if (l === 'd') D += el; else L += el;
      }
    }
    return s + `<g>${D}</g><g>${L}</g></svg>`;
  }
  const miniFigs = ex => `<span class="mini">${figure('f', { hit: ex.m.p.concat(ex.m.s), mini: true })}${figure('b', { hit: ex.m.p.concat(ex.m.s), mini: true })}</span>`;

  // ───────── 차트 ─────────
  const CH = {};
  function niceTicks(max, n) { if (max <= 0) return [0, 1]; const raw = max / n; const p = Math.pow(10, Math.floor(Math.log10(raw))); const f = raw / p; const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; const out = []; for (let v = 0; v <= max + step * 0.999; v += step) out.push(+v.toFixed(6)); return out; }
  // 선 차트: series [{name, cls(1..4), ys:[number|null]}], xs:[label], fmt(v), band:{lo,hi}, yMax, yMin
  function lineChart(o) {
    const id = o.id; const W = 600, H = o.height || 200, pl = 40, pr = o.endLabels ? 54 : 14, pt = 12, pb = 26;
    const xs = o.xs; const n = xs.length;
    const all = o.series.flatMap(s => s.ys.filter(v => v != null));
    let yMax = o.yMax != null ? o.yMax : Math.max(0, ...all), yMin = o.yMin != null ? o.yMin : Math.min(0, ...all);
    if (o.yMin == null && all.length && Math.min(...all) > 0 && yMax > 0 && (Math.max(...all) - Math.min(...all)) / yMax < 0.3) yMin = Math.floor(Math.min(...all) * 0.9);
    if (yMax === yMin) yMax = yMin + 1;
    const ticks = o.yMax != null ? niceTicks(yMax, 4).filter(t => t >= yMin) : niceTicks(yMax - yMin, 4).map(t => t + yMin);
    const tMax = Math.max(yMax, ticks[ticks.length - 1]);
    const sx = i => n <= 1 ? pl + (W - pl - pr) / 2 : pl + (W - pl - pr) * i / (n - 1);
    const sy = v => pt + (H - pt - pb) * (1 - (v - yMin) / (tMax - yMin));
    const fmt = o.fmt || (v => n1(v));
    let g = '';
    if (o.band) g += `<rect class="band" x="${pl}" y="${sy(o.band.hi)}" width="${W - pl - pr}" height="${Math.max(0, sy(o.band.lo) - sy(o.band.hi))}"/><line class="bandline" x1="${pl}" x2="${W - pr}" y1="${sy(o.band.lo)}" y2="${sy(o.band.lo)}"/><line class="bandline" x1="${pl}" x2="${W - pr}" y1="${sy(o.band.hi)}" y2="${sy(o.band.hi)}"/>`;
    g += `<g class="grid">${ticks.map(t => `<line x1="${pl}" x2="${W - pr}" y1="${sy(t)}" y2="${sy(t)}"/>`).join('')}</g>`;
    g += `<g class="axis">${ticks.map(t => `<text x="${pl - 6}" y="${sy(t) + 3}" text-anchor="end">${esc(fmt(t))}</text>`).join('')}`;
    const step = Math.max(1, Math.ceil(n / 8));
    g += xs.map((x, i) => (i % step === 0 || i === n - 1) ? `<text x="${sx(i)}" y="${H - 8}" text-anchor="middle">${esc(x)}</text>` : '').join('') + '</g>';
    o.series.forEach((s, si) => {
      const pts = s.ys.map((v, i) => v == null ? null : [sx(i), sy(v)]);
      let path = '', started = false;
      pts.forEach(p => { if (!p) { started = false; return; } path += (started ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); started = true; });
      if (o.area && o.series.length === 1 && path) { const first = pts.find(Boolean), last = [...pts].reverse().find(Boolean); g += `<path class="ar ser-${s.cls}" d="${path} L${last[0].toFixed(1)},${sy(yMin)} L${first[0].toFixed(1)},${sy(yMin)} Z"/>`; }
      g += `<path class="ln ser-${s.cls}" d="${path}"/>`;
      pts.forEach((p, i) => { if (p && (n <= 24 || i === n - 1)) g += `<circle class="mk ser-${s.cls}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4"/>`; });
      const lastIdx = s.ys.map((v, i) => v == null ? -1 : i).filter(i => i >= 0).pop();
      if (o.endLabels && lastIdx != null && lastIdx >= 0) g += `<text class="endlab" x="${sx(lastIdx) + 8}" y="${sy(s.ys[lastIdx]) + 4}">${esc(fmt(s.ys[lastIdx]))}</text>`;
    });
    g += `<line class="xh" id="xh-${id}" x1="0" x2="0" y1="${pt}" y2="${H - pb}" visibility="hidden"/>`;
    CH[id] = { type: 'line', xs, series: o.series, fmt, sx: Array.from({ length: n }, (_, i) => sx(i)), W, pl, pr, names: o.series.map(s => s.name) };
    const table = `<div class="tscroll"><table class="ctable"><thead><tr><th>${esc(o.xName || '시점')}</th>${o.series.map(s => `<th>${esc(s.name)}</th>`).join('')}</tr></thead><tbody>${xs.map((x, i) => `<tr><td>${esc(o.xFull ? o.xFull[i] : x)}</td>${o.series.map(s => `<td>${s.ys[i] == null ? '–' : esc(fmt(s.ys[i]))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    return chartShell(id, o, `<svg viewBox="0 0 ${W} ${H}" data-cid="${id}">${g}</svg>`, table, o.series.length >= 2 ? o.series.map(s => `<span><i class="c${s.cls}"></i>${esc(s.name)}</span>`).join('') : '');
  }
  // 막대 차트 (누적): series [{name, cls, ys}], xs
  function barChart(o) {
    const id = o.id; const W = 600, H = o.height || 200, pl = 40, pr = 14, pt = 12, pb = 26;
    const xs = o.xs, n = xs.length;
    const totals = xs.map((_, i) => o.series.reduce((a, s) => a + (s.ys[i] || 0), 0));
    const yMax = Math.max(1, ...totals, o.yMax || 0);
    const ticks = niceTicks(yMax, 4); const tMax = ticks[ticks.length - 1];
    const slot = (W - pl - pr) / Math.max(1, n); const bw = Math.min(24, slot * 0.6);
    const sy = v => pt + (H - pt - pb) * (1 - v / tMax);
    const fmt = o.fmt || (v => n0(v));
    let g = `<g class="grid">${ticks.map(t => `<line x1="${pl}" x2="${W - pr}" y1="${sy(t)}" y2="${sy(t)}"/>`).join('')}</g>`;
    g += `<g class="axis">${ticks.map(t => `<text x="${pl - 6}" y="${sy(t) + 3}" text-anchor="end">${esc(fmt(t))}</text>`).join('')}`;
    const step = Math.max(1, Math.ceil(n / 8));
    g += xs.map((x, i) => (i % step === 0 || i === n - 1) ? `<text x="${pl + slot * i + slot / 2}" y="${H - 8}" text-anchor="middle">${esc(x)}</text>` : '').join('') + '</g>';
    if (o.refLine != null) g += `<line class="ref" x1="${pl}" x2="${W - pr}" y1="${sy(o.refLine)}" y2="${sy(o.refLine)}"/>`;
    xs.forEach((_, i) => {
      let acc = 0; const x = pl + slot * i + slot / 2 - bw / 2;
      o.series.forEach((s, si) => {
        const v = s.ys[i] || 0; if (!v) return;
        const y0 = sy(acc), y1 = sy(acc + v); const h = Math.max(0, y0 - y1 - (acc ? 2 : 0));
        const isTop = o.series.slice(si + 1).every(t => !(t.ys[i] || 0));
        const r = isTop ? 4 : 0; const yy = y1 + (acc ? 2 : 0);
        g += `<path class="bar ser-${s.cls}" data-i="${i}" d="M${x},${yy + h} V${yy + r} Q${x},${yy} ${x + r},${yy} H${x + bw - r} Q${x + bw},${yy} ${x + bw},${yy + r} V${yy + h} Z"/>`;
        acc += v;
      });
      g += `<rect class="bar" data-i="${i}" x="${pl + slot * i}" y="${pt}" width="${slot}" height="${H - pt - pb}" fill="transparent"/>`;
    });
    CH[id] = { type: 'bar', xs, series: o.series, fmt, totals, names: o.series.map(s => s.name), xFull: o.xFull };
    const table = `<div class="tscroll"><table class="ctable"><thead><tr><th>${esc(o.xName || '주')}</th>${o.series.map(s => `<th>${esc(s.name)}</th>`).join('')}${o.series.length > 1 ? '<th>합계</th>' : ''}</tr></thead><tbody>${xs.map((x, i) => `<tr><td>${esc(o.xFull ? o.xFull[i] : x)}</td>${o.series.map(s => `<td>${esc(fmt(s.ys[i] || 0))}</td>`).join('')}${o.series.length > 1 ? `<td>${esc(fmt(totals[i]))}</td>` : ''}</tr>`).join('')}</tbody></table></div>`;
    return chartShell(id, o, `<svg viewBox="0 0 ${W} ${H}" data-cid="${id}">${g}</svg>`, table, o.series.length >= 2 ? o.series.map(s => `<span><i class="sq c${s.cls}"></i>${esc(s.name)}</span>`).join('') : '');
  }
  function chartShell(id, o, svg, table, legend) {
    const showT = !!S.ui.tables[id];
    return `<div class="chart" data-chart="${id}"><div class="chart-h"><div><h3>${esc(o.title || '')}</h3>${o.sub ? `<div class="xs muted">${esc(o.sub)}</div>` : ''}</div><div class="row">${legend ? `<div class="legend">${legend}</div>` : ''}<button class="btn sm ghost" data-act="chart-table" data-id="${id}">${showT ? '그래프' : '표'}</button></div></div><div class="chart-wrap" data-svg ${showT ? 'hidden' : ''}>${svg}</div><div data-table ${showT ? '' : 'hidden'}>${table}</div></div>`;
  }
  function sparkline(ys, cls) {
    const vals = ys.filter(v => v != null); if (vals.length < 2) return '';
    const W = 120, H = 28, max = Math.max(...vals), min = Math.min(...vals); const r = max - min || 1;
    const pts = ys.map((v, i) => v == null ? null : [i / (ys.length - 1) * (W - 6) + 3, H - 3 - (v - min) / r * (H - 8)]).filter(Boolean);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('');
    const last = pts[pts.length - 1];
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="var(--${cls || 's1'})" stroke-width="2" stroke-linejoin="round"/><circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="3" fill="var(--${cls || 's1'})"/></svg>`;
  }
  // 툴팁
  function chartTip(svg, ev) {
    const id = svg.dataset.cid, c = CH[id]; if (!c) return;
    const wrap = svg.parentElement; let tip = wrap.querySelector('.tip'); if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; wrap.appendChild(tip); }
    const rect = svg.getBoundingClientRect();
    let i;
    if (c.type === 'line') { const x = (ev.clientX - rect.left) / rect.width * c.W; i = 0; let best = Infinity; c.sx.forEach((px, k) => { const d = Math.abs(px - x); if (d < best) { best = d; i = k; } }); const xh = svg.querySelector('#xh-' + id); if (xh) { xh.setAttribute('x1', c.sx[i]); xh.setAttribute('x2', c.sx[i]); xh.setAttribute('visibility', 'visible'); } }
    else { const t = ev.target.closest('[data-i]'); if (!t) { tip.hidden = true; return; } i = +t.dataset.i; }
    const rows = c.series.map((s, si) => `<div class="tr"><span><i class="c${s.cls}"></i>${esc(s.name)}</span><b>${s.ys[i] == null ? '–' : esc(c.fmt(s.ys[i]))}</b></div>`).join('');
    tip.innerHTML = `<div class="muted" style="opacity:.8">${esc(c.xFull ? c.xFull[i] : c.xs[i])}</div>${rows}${c.type === 'bar' && c.series.length > 1 ? `<div class="tr"><span>합계</span><b>${esc(c.fmt(c.totals[i]))}</b></div>` : ''}`;
    tip.hidden = false;
    const tx = ev.clientX - rect.left + 12, ty = ev.clientY - rect.top - 10;
    tip.style.left = Math.min(tx, rect.width - tip.offsetWidth - 4) + 'px'; tip.style.top = Math.max(0, ty - tip.offsetHeight) + 'px';
  }
  function chartTipHide(svg) { const wrap = svg.parentElement; const tip = wrap.querySelector('.tip'); if (tip) tip.hidden = true; const xh = svg.querySelector('[id^="xh-"]'); if (xh) xh.setAttribute('visibility', 'hidden'); }
  document.addEventListener('pointermove', e => { const svg = e.target.closest && e.target.closest('svg[data-cid]'); if (svg) chartTip(svg, e); });
  document.addEventListener('pointerleave', e => { const svg = e.target && e.target.closest && e.target.closest('svg[data-cid]'); if (svg) chartTipHide(svg); }, true);
  document.addEventListener('pointerout', e => { const svg = e.target.closest && e.target.closest('svg[data-cid]'); if (svg && !(e.relatedTarget && svg.contains(e.relatedTarget))) chartTipHide(svg); });

  // ───────── 소리 ─────────
  let actx = null;
  function beep() {
    if (S.profile && S.profile.sound === false) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime;
      [0, 0.22, 0.44].forEach(off => { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(actx.destination); g.gain.setValueAtTime(0.0001, t + off); g.gain.exponentialRampToValueAtTime(0.25, t + off + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.18); o.start(t + off); o.stop(t + off + 0.2); });
    } catch (e) { }
    try { if (navigator.vibrate) navigator.vibrate([150, 80, 150]); } catch (e) { }
  }
  function primeAudio() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) { } }

  // ───────── 휴식 타이머 ─────────
  function startRest(sec, label) {
    sec = Math.max(10, Math.round(sec || 90));
    const T = S.timer; T.end = Date.now() + sec * 1000; T.total = sec; T.over = false; T.label = label || '휴식';
    const el = $('#timer'); el.hidden = false; el.classList.remove('over'); $('#timer-lab').textContent = T.label;
    if (T.iv) clearInterval(T.iv);
    T.iv = setInterval(tickRest, 250); tickRest();
  }
  function tickRest() {
    const T = S.timer; if (!T.end) return;
    const rem = Math.ceil((T.end - Date.now()) / 1000);
    $('#timer-t').textContent = fmtClock(Math.max(0, rem));
    $('#timer-bar').style.width = Math.min(100, Math.max(0, (1 - rem / T.total) * 100)) + '%';
    if (rem <= 0 && !T.over) { T.over = true; $('#timer').classList.add('over'); $('#timer-lab').textContent = '휴식 끝. 다음 세트!'; beep(); setTimeout(() => { if (T.over) stopRest(); }, 4000); }
  }
  function stopRest() { const T = S.timer; if (T.iv) clearInterval(T.iv); T.iv = null; T.end = null; T.over = false; $('#timer').hidden = true; }
  function addRest(s) { const T = S.timer; if (!T.end) return; T.end += s * 1000; T.total = Math.max(10, T.total + s); if (T.over) { T.over = false; $('#timer').classList.remove('over'); $('#timer-lab').textContent = T.label; } tickRest(); }

  // ───────── 다운로드/복사 ─────────
  async function saveFile(name, text) {
    if (store.downloads) { try { await store.downloads.save({ filename: name, data: text }); toast('저장했어요'); return; } catch (e) { if (e && e.code === 'declined') return; } }
    copyText(text, '파일로 저장할 수 없어서 내용을 복사했어요. 메모장에 붙여넣기 하세요.');
  }
  function copyText(text, msg) {
    const done = () => toast(msg || '복사했어요');
    const fallback = () => { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('복사가 막혀 있어요. 텍스트를 직접 선택해 복사하세요.'); } ta.remove(); };
    try { navigator.clipboard.writeText(text).then(done).catch(fallback); } catch (e) { fallback(); }
  }

  Object.assign(BL, { $, $$, esc, pad, n1, n0, fmtD, fmtShort, fmtClock, fmtTime, debounce, deep, toast, COLLS, activeSession, activeProgram, todayMetric, route, go, render, openSheet, closeSheet, sheetHead, subnav, ico, ring, figure, miniFigs, lineChart, barChart, sparkline, CH, beep, primeAudio, startRest, stopRest, addRest, saveFile, copyText, updatePill, onData });
})(window.BL);
