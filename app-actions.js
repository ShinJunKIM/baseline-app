/* 베이스라인 · 동작: 이벤트, 세션 수명주기, 마법사, 시트, 부팅 */
(function (BL) {
  'use strict';
  const { S, $, $$, esc, n0, n1, fmtD, fmtShort, toast, activeSession, activeProgram, todayMetric, openSheet, closeSheet, sheetHead, go, render, store, copyText, saveFile, startRest, stopRest, addRest, primeAudio, rxText } = BL;
  const E = BL.engine, X = BL.X;

  // ───────── 세션 저장 ─────────
  let sessT = null;
  function saveSession(s, now) {
    s.rev = (s.rev || 0) + 1; s.updatedAt = new Date().toISOString();
    clearTimeout(sessT);
    if (now) return store.set('sessions', s.id, s);
    sessT = setTimeout(() => store.set('sessions', s.id, s), 700);
  }
  function newSet() { return { id: E.uid(), w: null, r: null, t: null, rpe: null, done: false }; }
  function buildExercises(prog, day) {
    const wi = E.weekInfo(prog); const rd = E.readiness(todayMetric());
    const out = [];
    day.blocks.forEach((b, bi) => b.items.forEach((it, ii) => {
      const x = X[it.exId]; if (!x) return;
      const adj = E.adjustItem(it, wi, rd);
      const target = { sets: adj.sets, reps: adj.reps || null, time: adj.time || null, min: adj.min || null, rpe: adj.rpe || 0, rest: it.rest || (S.profile?.restDefault || 90), perSide: !!it.perSide, role: it.role };
      out.push({ id: E.uid(), exId: x.id, label: String.fromCharCode(65 + bi) + (b.items.length > 1 ? (ii + 1) : ''), blockId: b.id, target, sets: Array.from({ length: Math.max(1, adj.sets) }, newSet), note: '' });
    }));
    return out;
  }
  function startSession(doc) {
    const existing = activeSession();
    if (existing) { toast('이미 진행 중인 운동이 있어요. 먼저 마치거나 취소하세요.'); go('train'); return; }
    doc.id = doc.id || E.uid(); doc.status = 'active'; doc.date = doc.date || E.today(); doc.startedAt = doc.startedAt || new Date().toISOString(); doc.rev = 0;
    saveSession(doc, true); go('train'); render();
  }
  function startDay(i) {
    const prog = activeProgram(); if (!prog) return toast('프로그램이 없어요');
    const day = prog.days[i] || prog.days[0];
    startSession({ type: 'strength', title: day.name, programId: prog.id, dayId: day.id, exercises: buildExercises(prog, day), painPre: null });
  }
  function startFree() { startSession({ type: 'strength', title: '자유 운동', exercises: [], painPre: null }); setTimeout(() => openPicker({ mode: 'session' }), 100); }
  function addExerciseToSession(exId) {
    const s = activeSession(); if (!s) return; const x = X[exId]; if (!x) return;
    const prog = activeProgram(); const role = x.pat === 'mob' ? 'mob' : x.mode === 'cardio' ? 'cond' : 'accessory';
    const it = E.rx(prog ? prog.goal : (S.profile?.goal || 'general'), role, x, S.profile?.level || 1);
    const target = { sets: it.sets, reps: it.reps, time: it.time, min: it.min, rpe: it.rpe, rest: it.rest || (S.profile?.restDefault || 90), perSide: !!x.uni, role: it.role };
    s.exercises.push({ id: E.uid(), exId, label: '', blockId: null, target, sets: Array.from({ length: Math.max(1, it.sets) }, newSet), note: '' });
    saveSession(s); render(); toast(`${x.n} 추가`);
  }
  function replaceExerciseInSession(exi, exId) {
    const s = activeSession(); if (!s) return; const ex = s.exercises[exi]; const x = X[exId]; if (!ex || !x) return;
    ex.exId = exId; ex.sets = ex.sets.map(st => st.done ? st : newSet()); ex.target.perSide = !!x.uni;
    if (x.mode === 'time') { ex.target.time = ex.target.time || 30; ex.target.reps = null; } else if (x.mode === 'cardio') { ex.target.min = ex.target.min || 15; ex.target.reps = null; } else { ex.target.time = null; ex.target.min = null; ex.target.reps = ex.target.reps || [8, 12]; }
    saveSession(s); render();
  }

  // ───────── 운동 선택 시트 ─────────
  function openPicker(ctx) {
    S.ui.picker = Object.assign({ q: '', pat: '' }, ctx);
    openSheet(pickerHtml(), 'picker');
    const inp = $('#pick-q'); if (inp) inp.focus();
  }
  function pickerHtml() {
    const pk = S.ui.picker; const q = pk.q.trim().toLowerCase(); const P = S.profile || {};
    const exSet = E.excludedFlags(P.restrictions);
    let list = BL.EX.filter(x => !q || x.n.toLowerCase().includes(q) || x.en.toLowerCase().includes(q));
    if (pk.pat) list = list.filter(x => x.pat === pk.pat);
    if (pk.alts) list = pk.alts.concat(list.filter(x => !pk.alts.includes(x)));
    const pats = [['', '전체'], ['squat', '스쿼트'], ['hinge', '힌지'], ['lunge', '한 발'], ['lateral', '옆'], ['push_h', '밀기'], ['pull_h', '당기기'], ['core_anti', '코어'], ['plyo', '점프'], ['calf', '종아리'], ['cuff', '어깨'], ['cond', '유산소'], ['mob', '가동성']];
    const title = pk.mode === 'swap-session' || pk.mode === 'swap-program' ? '운동 교체' : '운동 추가';
    return `${sheetHead(title, pk.alts ? '같은 역할의 대안을 먼저 보여 줘요' : '')}<input class="inp" id="pick-q" data-act-input="pick-q" value="${esc(pk.q)}" placeholder="이름 검색"><div class="chips">${pats.map(([k, n]) => `<button class="chip tiny ${pk.pat === k ? 'on' : ''}" data-act="pick-pat" data-p="${k}">${n}</button>`).join('')}</div>
      <div class="stack-s" style="max-height:50vh;overflow:auto">${list.slice(0, 60).map(x => { const bad = E.isExcluded(x, exSet); const noeq = P.equipment && !E.hasEquip(x, P.equipment); return `<button class="libcard ${bad ? 'off' : ''}" data-act="pick-ex" data-ex="${x.id}">${BL.miniFigs(x)}<span><b>${esc(x.n)}</b><span class="meta"><span>${BL.PATTERNS[x.pat] || x.pat}</span><span>Lv${x.lv}</span>${noeq ? '<span class="tag">장비 없음</span>' : ''}${bad ? '<span class="tag crit">제약</span>' : ''}${pk.alts && pk.alts.includes(x) ? '<span class="tag acc">대안</span>' : ''}</span></span></button>`; }).join('') || '<p class="small muted">검색 결과가 없어요.</p>'}</div>`;
  }
  function pickExercise(exId) {
    const pk = S.ui.picker; if (!pk) return;
    if (pk.mode === 'session') { addExerciseToSession(exId); closeSheet(); }
    else if (pk.mode === 'swap-session') { replaceExerciseInSession(pk.exi, exId); closeSheet(); }
    else if (pk.mode === 'program-add' || pk.mode === 'swap-program') {
      const prog = S.programs.find(p => p.id === pk.pid); const day = prog && prog.days.find(d => d.id === pk.did); if (!day) return;
      const x = X[exId];
      if (pk.mode === 'swap-program') { day.blocks.forEach(b => b.items.forEach(it => { if (it.id === pk.iid) { it.exId = exId; it.perSide = !!x.uni; if (x.mode === 'time' && !it.time) { it.time = 30; it.reps = null; } if (x.mode === 'cardio') { it.min = it.min || 15; it.reps = null; } } })); }
      else { const it = E.rx(prog.goal, x.pat === 'mob' ? 'mob' : x.mode === 'cardio' ? 'cond' : 'accessory', x, prog.level); it.id = E.uid(); it.exId = exId; it.perSide = !!x.uni; day.blocks.push({ id: E.uid(), super: false, items: [it] }); }
      day.est = E.estimateDay(day); store.set('programs', prog.id, prog); closeSheet(); render(); toast('프로그램을 바꿨어요');
    }
  }

  // ───────── 세션 마치기 ─────────
  function finishHtml(s) {
    const dur = Math.max(1, Math.round((Date.now() - new Date(s.startedAt).getTime()) / 60000));
    const nDone = E.workSets(s).length;
    return `${sheetHead('운동 마치기', `${nDone}세트 완료 · ${dur}분`)}<form class="stack" id="finish-form" data-act-submit="finish-save">
      <div class="field"><span class="flabel">운동 후 통증 (0~10)</span><div class="pain-scale">${Array.from({ length: 11 }, (_, i) => `<button type="button" class="${(s.painPost ?? s.painPre) === i ? 'on' + (i >= 5 ? ' hi' : '') : ''}" data-act="fin-pain" data-v="${i}">${i}</button>`).join('')}</div><input type="hidden" name="painPost" value="${s.painPost ?? s.painPre ?? ''}"></div>
      <div class="field"><span class="flabel">세션 전체 강도 (RPE 1 매우 쉬움 ~ 10 한계)</span><div class="scale">${[4, 5, 6, 7, 8, 9, 10].map(r => `<button type="button" class="${s.sRPE === r ? 'on' : ''}" data-act="fin-rpe" data-v="${r}">${r}</button>`).join('')}</div><input type="hidden" name="sRPE" value="${s.sRPE ?? ''}"></div>
      <div class="fgrid"><div class="field"><label for="fin-title">제목</label><input class="inp" id="fin-title" name="title" value="${esc(s.title || '')}" placeholder="양발 기본기"></div><div class="field"><label for="fin-dur">시간 (분)</label><input class="inp" id="fin-dur" name="durationMin" type="number" inputmode="numeric" min="1" value="${s.durationMin || dur}"></div></div>
      <div class="field"><label for="fin-notes">메모</label><input class="inp" id="fin-notes" name="notes" value="${esc(s.notes || '')}" placeholder="무릎 괜찮았음, 스쿼트 자세 영상 찍음"></div>
      <div class="row between"><button class="btn ghost" type="button" data-act="sheet-close">계속 하기</button><button class="btn primary lg" type="submit">저장하고 마치기</button></div></form>`;
  }
  function finishSave(form) {
    const s = activeSession(); if (!s) return;
    const fd = new FormData(form);
    s.painPost = fd.get('painPost') !== '' ? +fd.get('painPost') : null; s.sRPE = fd.get('sRPE') ? +fd.get('sRPE') : null; s.durationMin = +fd.get('durationMin') || null; s.notes = fd.get('notes') || ''; s.title = fd.get('title') || s.title || '운동';
    if (!s.editing) s.endedAt = new Date().toISOString(); delete s.editing; s.status = 'done';
    s.exercises = s.exercises.filter(ex => ex.sets.some(st => st.done) || ex.note);
    saveSession(s, true); stopRest();
    const prs = E.sessionPRs(s, S.sessions); const L = E.sessionLoad(s); const ton = E.tonnage(s); const a = E.acwr(S.sessions);
    openSheet(`${sheetHead('수고했어요', `${fmtD(s.date)} · ${esc(s.title || '')}`)}<div class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div class="kpi"><div class="k">세트</div><div class="v">${E.workSets(s).length}</div></div><div class="kpi"><div class="k">볼륨</div><div class="v">${n0(ton)}<small>kg</small></div></div><div class="kpi"><div class="k">부하</div><div class="v">${n0(L)}</div></div></div>
      ${prs.length ? `<div class="summary-prs">${prs.map(p => `<div class="pr">🏆 ${esc(X[p.exId]?.n)} <b>${p.kind === 'e1rm' ? `e1RM ${n1(p.value)}kg (${p.w}×${p.r})` : p.kind === 'reps' ? `${p.value}회` : `${p.value}초`}</b>${p.prev ? `<span class="xs muted">이전 ${p.kind === 'e1rm' ? n1(p.prev) + 'kg' : p.prev}</span>` : '<span class="xs muted">첫 기록</span>'}</div>`).join('')}</div>` : '<p class="small muted">이번엔 PR이 없어요. 꾸준함이 PR이에요.</p>'}
      ${a.status === 'danger' ? '<div class="banner crit"><div><b>이번 주 부하가 평소의 1.5배를 넘었어요</b>내일은 가볍게. 통증이 있으면 쉬는 게 맞아요.</div></div>' : a.status === 'caution' ? '<div class="banner warn"><div><b>부하가 빠르게 늘고 있어요</b>다음 주는 이번 주 수준을 유지하는 게 안전해요.</div></div>' : ''}
      ${s.painPost != null && s.painPre != null && s.painPost > s.painPre ? `<div class="banner crit"><div><b>운동 후 통증이 ${s.painPre} → ${s.painPost}으로 올랐어요</b>다음 세션 전까지 2 이하로 내려오지 않으면 그 동작은 빼세요.</div></div>` : ''}
      <div class="row"><button class="btn primary" data-act="sheet-close-home">홈으로</button></div>`, 'summary');
  }

  // 원판 계산기
  function platesHtml(w, bar) {
    const PL = [25, 20, 15, 10, 5, 2.5, 1.25]; let side = Math.max(0, (w - bar) / 2); const out = [];
    for (const p of PL) { while (side >= p - 1e-9) { out.push(p); side -= p; } }
    const real = bar + out.reduce((a, b) => a + b, 0) * 2;
    const col = p => p >= 20 ? 56 : p >= 15 ? 48 : p >= 10 ? 40 : p >= 5 ? 30 : 22;
    return `${sheetHead('원판 계산', '한쪽에 끼울 원판')}<form class="stack" data-act-submit="plates-calc"><div class="fgrid"><div class="field"><label for="pl-w">목표 무게 (kg)</label><input class="inp num" id="pl-w" name="w" type="number" inputmode="decimal" step="0.5" min="0" value="${w}"></div><div class="field"><label for="pl-bar">바 무게</label><select class="inp" id="pl-bar" name="bar">${[20, 15, 10, 7, 0].map(b => `<option value="${b}" ${b === bar ? 'selected' : ''}>${b ? b + 'kg' : '없음 (덤벨·트랩바 합산)'}</option>`).join('')}</select></div></div><div class="row"><button class="btn primary" type="submit">계산</button></div></form>
      <div class="plates" aria-label="원판 배열">${out.length ? out.map(p => `<i style="width:16px;height:${col(p)}px" title="${p}kg">${p >= 5 ? p : ''}</i>`).join('') : '<span class="small muted">바만 (원판 없음)</span>'}</div>
      <p class="small">한쪽: <b>${out.length ? out.map(p => p + 'kg').join(' + ') : '없음'}</b> → 실제 ${real}kg${Math.abs(real - w) > 0.01 ? ` (목표보다 ${(real - w).toFixed(2)}kg)` : ''}</p>`;
  }

  // ───────── 빠른 기록 (테니스·유산소) ─────────
  function quickHtml(type, s) {
    s = s || {}; const isT = type === 'tennis';
    return `${sheetHead(isT ? '테니스 기록' : '유산소·기타 활동', '시간과 강도만 적으면 부하 계산에 합쳐져요')}<form class="stack" data-act-submit="quick-save"><input type="hidden" name="id" value="${s.id || ''}"><input type="hidden" name="type" value="${type}">
      <div class="fgrid"><div class="field"><label for="q-date">날짜</label><input class="inp" id="q-date" name="date" type="date" value="${s.date || E.today()}" required></div><div class="field"><label for="q-title">제목</label><input class="inp" id="q-title" name="title" value="${esc(s.title || (isT ? '테니스' : ''))}" placeholder="${isT ? '레슨 / 랠리 / 게임' : '달리기 5km'}"></div>
      <div class="field"><label for="q-dur">시간 (분)</label><input class="inp" id="q-dur" name="durationMin" type="number" inputmode="numeric" min="1" value="${s.durationMin || (isT ? 120 : 30)}" required></div><div class="field"><label for="q-rpe">강도 RPE (1~10)</label><select class="inp" id="q-rpe" name="sRPE">${[3, 4, 5, 6, 7, 8, 9, 10].map(r => `<option value="${r}" ${(s.sRPE || 6) === r ? 'selected' : ''}>${r}${r <= 4 ? ' 가벼움' : r <= 6 ? ' 보통' : r <= 8 ? ' 힘듦' : ' 한계'}</option>`).join('')}</select></div>
      ${isT ? `<div class="field"><label for="q-serves">서브 개수 (대략)</label><input class="inp" id="q-serves" name="serves" type="number" inputmode="numeric" min="0" value="${s.serves ?? ''}" placeholder="0"></div>` : ''}
      <div class="field"><label for="q-pain">운동 후 통증 (0~10)</label><input class="inp" id="q-pain" name="painPost" type="number" inputmode="numeric" min="0" max="10" value="${s.painPost ?? ''}"></div></div>
      <div class="field"><label for="q-notes">메모</label><textarea class="inp" id="q-notes" name="notes" placeholder="서브 연습 30분, 갈비 괜찮았음">${esc(s.notes || '')}</textarea></div>
      <div class="row"><button class="btn primary" type="submit">저장</button></div></form>`;
  }
  function quickSave(form) {
    const fd = new FormData(form); const id = fd.get('id') || E.uid();
    const prev = S.sessions.find(s => s.id === id) || {};
    const doc = Object.assign({}, prev, { id, type: fd.get('type'), date: fd.get('date'), title: fd.get('title') || (fd.get('type') === 'tennis' ? '테니스' : '유산소'), durationMin: +fd.get('durationMin') || null, sRPE: +fd.get('sRPE') || null, serves: fd.get('serves') ? +fd.get('serves') : null, painPost: fd.get('painPost') !== '' && fd.get('painPost') != null ? +fd.get('painPost') : null, notes: fd.get('notes') || '', status: 'done', exercises: [], startedAt: prev.startedAt || new Date(fd.get('date') + 'T12:00:00').toISOString(), endedAt: new Date().toISOString() });
    store.set('sessions', id, doc); closeSheet(); render(); toast('기록했어요');
  }

  // ───────── 체크인·테스트 ─────────
  function checkinSave(form) {
    const fd = new FormData(form); const date = E.today();
    const prev = todayMetric() || {};
    const num = k => fd.get(k) !== '' && fd.get(k) != null ? +fd.get(k) : null;
    const doc = Object.assign({}, prev, { id: date, date, sleepH: num('sleepH'), weightKg: num('weightKg'), sleepQ: num('sleepQ'), soreness: num('soreness'), fatigue: num('fatigue'), stress: num('stress'), mood: num('mood'), pain: num('pain'), painSite: fd.get('painSite') || '', notes: fd.get('notes') || '', updatedAt: new Date().toISOString() });
    store.set('metrics', date, doc);
    if (doc.weightKg && S.profile) { S.profile.weightKg = doc.weightKg; store.set('profile', 'me', S.profile); }
    closeSheet(); render(); const rd = E.readiness(doc); toast(rd ? `컨디션 ${rd.score}점 · ${rd.adjust.note}` : '저장했어요', 3500);
  }
  function testHtml() {
    return `${sheetHead('체력 테스트 기록', '같은 조건에서 4~6주마다')}<form class="stack" data-act-submit="test-save"><div class="fgrid"><div class="field"><label for="t-date">날짜</label><input class="inp" id="t-date" name="date" type="date" value="${E.today()}" required></div><div class="field"><label for="t-id">테스트</label><select class="inp" id="t-id" name="testId" data-act-change="test-pick">${BL.TESTS.map(t => `<option value="${t.id}">${t.n}</option>`).join('')}</select></div><div class="field"><label for="t-val">값 <span id="t-unit">(${BL.TESTS[0].unit})</span></label><input class="inp" id="t-val" name="value" type="number" inputmode="decimal" step="0.1" required></div></div><p class="small muted" id="t-hint">${BL.TESTS[0].hint}</p><div class="row"><button class="btn primary" type="submit">저장</button></div></form>`;
  }

  // ───────── 프로그램 마법사 ─────────
  function openWizard(onboard) {
    const P = S.profile || {};
    S.ui.wizard = { onboard: !!onboard, step: 0, name: P.name || '', age: P.age, heightCm: P.heightCm, weightKg: P.weightKg, trainDays: (P.trainDays || []).slice(), tennisWeekdays: (P.tennisWeekdays || []).slice(), goal: P.goal || 'tennis', level: +P.level || 1, daysPerWeek: P.daysPerWeek || 3, sessionMinutes: P.sessionMinutes || 60, tennisDays: P.tennisDays || 0, weakPoints: (P.weakPoints || []).slice(), equipment: (P.equipment || ['db', 'band', 'bench']).slice(), restrictions: (P.restrictions || []).slice(), preview: null, seed: null };
    openSheet(BL.wizardHtml(S.ui.wizard), 'wizard');
  }
  function wizardCollect() { const w = S.ui.wizard; if (!w) return; $$('#sheet-panel [data-wz]').forEach(el => { const k = el.dataset.wz; w[k] = el.type === 'number' ? (el.value === '' ? null : +el.value) : el.value; }); ['trainDays', 'tennisWeekdays'].forEach(k => { const els = $$(`#sheet-panel [data-wz-day="${k}"]`); if (els.length) w[k] = els.filter(e => e.checked).map(e => +e.value); }); if (w.onboard) { w.daysPerWeek = Math.max(2, Math.min(6, w.trainDays.length || w.daysPerWeek)); w.tennisDays = w.tennisWeekdays.length; } }
  function wizardRender() { $('#sheet-panel').innerHTML = BL.wizardHtml(S.ui.wizard); }
  function wizardGenerate(newSeed) {
    const w = S.ui.wizard; if (newSeed || w.seed == null) w.seed = Math.floor(Math.random() * 1e9);
    w.preview = E.generateProgram({ goal: w.goal, level: w.level, daysPerWeek: w.daysPerWeek, sessionMinutes: w.sessionMinutes, tennisDays: w.tennisDays, weakPoints: w.weakPoints, equipment: w.equipment, restrictions: w.restrictions }, { seed: w.seed });
  }
  function wizardApply() {
    const w = S.ui.wizard; if (!w.preview) wizardGenerate();
    const p = w.preview;
    S.programs.forEach(o => { if (o.active) { o.active = false; store.set('programs', o.id, o); } });
    store.set('programs', p.id, p);
    const P = Object.assign({}, S.profile || {}, { goal: w.goal, level: w.level, daysPerWeek: w.daysPerWeek, sessionMinutes: w.sessionMinutes, tennisDays: w.tennisDays, weakPoints: w.weakPoints, equipment: w.equipment, restrictions: w.restrictions, updatedAt: new Date().toISOString() });
    if (w.onboard) Object.assign(P, { name: w.name || '', age: w.age ?? null, heightCm: w.heightCm ?? null, weightKg: w.weightKg ?? null, trainDays: w.trainDays, tennisWeekdays: w.tennisWeekdays, restDefault: 90, sound: true, autoRest: true, dominantHand: 'R', createdAt: P.createdAt || new Date().toISOString() });
    store.set('profile', 'me', P);
    closeSheet(); go('program'); toast('프로그램을 적용했어요');
  }

  // 프로그램 항목 수정
  function itemEditHtml(pid, did, iid) {
    const prog = S.programs.find(p => p.id === pid); const day = prog.days.find(d => d.id === did); let it; day.blocks.forEach(b => b.items.forEach(i => { if (i.id === iid) it = i; })); const x = X[it.exId];
    return `${sheetHead(x.n, '세트·반복·강도·휴식')}<form class="stack" data-act-submit="item-save"><input type="hidden" name="pid" value="${pid}"><input type="hidden" name="did" value="${did}"><input type="hidden" name="iid" value="${iid}"><div class="fgrid"><div class="field"><label for="ie-sets">세트</label><input class="inp" id="ie-sets" name="sets" type="number" min="1" max="10" value="${it.sets}"></div>${it.reps ? `<div class="field"><label for="ie-lo">반복 최소</label><input class="inp" id="ie-lo" name="lo" type="number" min="1" max="50" value="${it.reps[0]}"></div><div class="field"><label for="ie-hi">반복 최대</label><input class="inp" id="ie-hi" name="hi" type="number" min="1" max="50" value="${it.reps[1]}"></div>` : ''}${it.time ? `<div class="field"><label for="ie-time">시간 (초)</label><input class="inp" id="ie-time" name="time" type="number" min="5" max="600" value="${it.time}"></div>` : ''}${it.min ? `<div class="field"><label for="ie-min">분</label><input class="inp" id="ie-min" name="min" type="number" min="1" max="180" value="${it.min}"></div>` : ''}<div class="field"><label for="ie-rpe">목표 RPE (0이면 폭발적)</label><input class="inp" id="ie-rpe" name="rpe" type="number" min="0" max="10" step="0.5" value="${it.rpe || 0}"></div><div class="field"><label for="ie-rest">휴식 (초)</label><input class="inp" id="ie-rest" name="rest" type="number" min="0" max="300" step="15" value="${it.rest}"></div></div><div class="row between"><button class="btn danger" type="button" data-act="item-remove" data-pid="${pid}" data-did="${did}" data-iid="${iid}">프로그램에서 빼기</button><button class="btn primary" type="submit">저장</button></div></form>`;
  }
  function itemSave(form) {
    const fd = new FormData(form); const prog = S.programs.find(p => p.id === fd.get('pid')); const day = prog.days.find(d => d.id === fd.get('did'));
    day.blocks.forEach(b => b.items.forEach(it => { if (it.id !== fd.get('iid')) return; it.sets = +fd.get('sets') || it.sets; if (fd.get('lo')) it.reps = [+fd.get('lo'), Math.max(+fd.get('lo'), +fd.get('hi'))]; if (fd.get('time')) it.time = +fd.get('time'); if (fd.get('min')) it.min = +fd.get('min'); it.rpe = +fd.get('rpe') || 0; it.rest = +fd.get('rest') || 0; }));
    day.est = E.estimateDay(day); store.set('programs', prog.id, prog); closeSheet(); render(); toast('저장했어요');
  }

  // ───────── 진행 사진 ─────────
  function shrinkImage(file, max) {
    return new Promise((resolve, reject) => {
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => { const sc = Math.min(1, max / Math.max(img.width, img.height)); const cv = document.createElement('canvas'); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url); cv.toBlob(b => b ? resolve(b) : reject(new Error('encode')), 'image/jpeg', 0.85); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지를 읽지 못했어요')); }; img.src = url;
    });
  }
  async function addPhoto(file) {
    toast('사진 준비 중…');
    try {
      const blob = await shrinkImage(file, 1200); const id = E.uid(); const date = E.today();
      if (store.mode === 'db') {
        if (!store.assets) return toast('사진 저장 기능을 쓸 수 없어요 (편집 권한 필요)');
        const up = await store.assets.upload(blob);
        await store.set('photos', id, { id, date, assetId: up.id, note: '' });
      } else {
        const small = await shrinkImage(file, 640); const dataUrl = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(small); });
        await store.set('photos', id, { id, date, src: dataUrl, note: '' });
      }
      render(); toast('사진을 저장했어요');
    } catch (e) { toast('사진 저장 실패: ' + (e.code || e.message || '')); }
  }

  // ───────── 보고서·AI·데이터 ─────────
  function reportHtml() {
    const txt = E.buildReport({ profile: S.profile, program: activeProgram(), sessions: S.sessions, metrics: S.metrics, tests: S.tests });
    return `${sheetHead('코치 보고서', '복사해서 채팅에 붙여 넣으면 코치가 분석해요')}<pre class="report" id="report-txt">${esc(txt)}</pre><div class="row"><button class="btn primary" data-act="report-copy">복사</button><button class="btn" data-act="report-save">파일로 저장</button></div>`;
  }
  async function aiFeedback() {
    if (!store.sample) return toast('이 화면에서는 AI 피드백을 쓸 수 없어요.');
    const report = E.buildReport({ profile: S.profile, program: activeProgram(), sessions: S.sessions, metrics: S.metrics, tests: S.tests });
    openSheet(`${sheetHead('AI 코치 피드백', '최근 7일 기록을 바탕으로')}<div class="ai-out" id="ai-out">생각 중…</div><div class="row"><button class="btn" data-act="sheet-close">닫기</button></div>`, 'ai');
    const prompt = `당신은 테니스 선수를 지도하는 스트렝스&컨디셔닝 코치다. 아래 주간 보고서를 읽고 한국어로 피드백을 써라. 형식: (1) 이번 주 한 줄 평가 (2) 부하·회복·통증에서 눈에 띄는 점 2~3개, 수치 근거와 함께 (3) 다음 주에 바꿀 것 2개, 구체적 세트·무게·휴식 단위로 (4) 병원 가야 할 신호가 있으면 명시. 과장된 격려 없이, 300자 안팎.\n\n${report}`;
    try {
      const res = await store.sample(prompt, { onText: ({ text }) => { const el = $('#ai-out'); if (el) el.textContent = text; }, cache: false });
      const el = $('#ai-out'); if (el) el.textContent = res.text;
    } catch (e) { const el = $('#ai-out'); if (el) el.textContent = e && e.code === 'not_granted' ? 'AI 기능 사용을 허용하지 않았어요.' : e && e.code === 'rate_limited' ? '잠시 뒤 다시 시도해 주세요.' : '피드백을 받지 못했어요. ' + (e && e.message || ''); }
  }
  function exportJson() { const data = { app: 'baseline', version: 1, exportedAt: new Date().toISOString(), profile: S.profile, programs: S.programs, sessions: S.sessions, metrics: S.metrics, tests: S.tests }; saveFile(`baseline-${E.today()}.json`, JSON.stringify(data, null, 2)); }
  function exportCsv() {
    const rows = [['date', 'session', 'type', 'exercise', 'set', 'weight_kg', 'reps', 'seconds', 'rpe']];
    E.doneSessions(S.sessions).sort((a, b) => a.date.localeCompare(b.date)).forEach(s => { if (!s.exercises || !s.exercises.length) { rows.push([s.date, s.title || '', s.type, '', '', '', '', (s.durationMin || 0) * 60, s.sRPE || '']); return; } s.exercises.forEach(ex => ex.sets.forEach((st, k) => { if (!st.done) return; rows.push([s.date, s.title || '', s.type, X[ex.exId]?.n || ex.exId, k + 1, st.w ?? '', st.r ?? '', st.t ?? '', st.rpe ?? '']); })); });
    saveFile(`baseline-sets-${E.today()}.csv`, '﻿' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n'));
  }
  async function importRun(text) {
    let data; try { data = JSON.parse(text); } catch (e) { return toast('JSON 형식이 아니에요.'); }
    if (!data || data.app !== 'baseline') return toast('베이스라인에서 내보낸 파일이 아니에요.');
    let n = 0;
    for (const c of ['programs', 'sessions', 'metrics', 'tests']) for (const d of (data[c] || [])) { if (d && d.id) { await store.set(c, d.id, d); n++; } }
    if (data.profile) { await store.set('profile', 'me', data.profile); n++; }
    closeSheet(); render(); toast(`${n}개 문서를 가져왔어요`);
  }
  async function wipeAll() {
    const ids = [['sessions', S.sessions.map(s => s.id)], ['metrics', S.metrics.map(m => m.id)], ['tests', S.tests.map(t => t.id)], ['programs', S.programs.map(p => p.id)]];
    for (const [c, list] of ids) for (const id of list) await store.del(c, id);
    await store.del('profile', 'me');
    closeSheet(); render(); toast('모든 기록을 지웠어요');
  }

  // ───────── 이벤트 위임 ─────────
  const A = {
    'go': b => go(b.dataset.v), 'noop': () => { },
    'sheet-close': () => closeSheet(), 'sheet-close-home': () => { closeSheet(); go('home'); },
    'chart-table': b => { S.ui.tables[b.dataset.id] = !S.ui.tables[b.dataset.id]; const c = b.closest('.chart'); c.querySelector('[data-svg]').hidden = S.ui.tables[b.dataset.id]; c.querySelector('[data-table]').hidden = !S.ui.tables[b.dataset.id]; b.textContent = S.ui.tables[b.dataset.id] ? '그래프' : '표'; },
    // 체크인
    'checkin-edit': () => openSheet(`${sheetHead('오늘 컨디션', fmtD(E.today()))}${BL.checkinForm(todayMetric() || {})}`, 'checkin'),
    'ck-scale': b => { const f = b.closest('form'); f.querySelector(`input[name="${b.dataset.k}"]`).value = b.dataset.v; b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); },
    'ck-pain': b => { const f = b.closest('form'); f.querySelector('input[name="pain"]').value = b.dataset.v; b.parentElement.querySelectorAll('button').forEach(x => { x.classList.toggle('on', x === b); x.classList.toggle('hi', x === b && +b.dataset.v >= 5); }); },
    'fin-pain': b => { const f = b.closest('form'); f.querySelector('input[name="painPost"]').value = b.dataset.v; b.parentElement.querySelectorAll('button').forEach(x => { x.classList.toggle('on', x === b); x.classList.toggle('hi', x === b && +b.dataset.v >= 5); }); },
    'fin-rpe': b => { const f = b.closest('form'); f.querySelector('input[name="sRPE"]').value = b.dataset.v; b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); },
    // 세션 시작
    'start-day': b => { const i = b.dataset.i != null ? +b.dataset.i : +($('#day-pick')?.value || 0); startDay(i); },
    'start-free': () => startFree(),
    'quicklog': b => openSheet(quickHtml(b.dataset.type), 'quick'),
    'quicklog-edit': b => { const s = S.sessions.find(x => x.id === b.dataset.id); if (s) openSheet(quickHtml(s.type, s), 'quick'); },
    'test-add': () => openSheet(testHtml(), 'test'),
    'test-pick': () => { }, // change handler below
    'wizard': () => { if (!S.profile) { toast('먼저 프로필을 저장해 주세요'); go('profile'); return; } openWizard(); },
    // 세션 상세
    'session-open': b => { const s = S.sessions.find(x => x.id === b.dataset.id); if (s) openSheet(BL.sessionDetail(s), 'session'); },
    'session-resume': b => { const s = S.sessions.find(x => x.id === b.dataset.id); if (!s) return; S.sessions.forEach(o => { if (o.status === 'active' && o.id !== s.id) { o.status = 'done'; o.endedAt = o.endedAt || new Date().toISOString(); store.set('sessions', o.id, o); } }); s.status = 'active'; saveSession(s, true); closeSheet(); go('train'); },
    'session-repeat': b => { const s = S.sessions.find(x => x.id === b.dataset.id); if (!s) return; closeSheet(); startSession({ type: 'strength', title: s.title, programId: s.programId || null, dayId: s.dayId || null, exercises: (s.exercises || []).map(ex => ({ id: E.uid(), exId: ex.exId, label: ex.label || '', blockId: ex.blockId || null, target: ex.target, sets: Array.from({ length: Math.max(1, ex.sets.length) }, newSet), note: '' })), painPre: null }); },
    'session-delete': b => { const id = b.dataset.id; const s = S.sessions.find(x => x.id === id); if (!s) return; openSheet(`${sheetHead('기록 삭제', `${fmtD(s.date)} ${esc(s.title || '')}`)}<p>이 기록을 지우면 되돌릴 수 없어요.</p><div class="row"><button class="btn danger" data-act="session-delete-yes" data-id="${id}">삭제</button><button class="btn" data-act="sheet-close">취소</button></div>`, 'confirm'); },
    'session-delete-yes': b => { store.del('sessions', b.dataset.id); closeSheet(); render(); toast('지웠어요'); },
    'session-cancel': () => { const s = activeSession(); if (!s) return; openSheet(`${sheetHead('운동 취소', '')}<p>${E.workSets(s).length ? `완료한 ${E.workSets(s).length}세트를 포함해 ` : ''}이 세션을 지울까요?</p><div class="row"><button class="btn danger" data-act="session-cancel-yes">세션 삭제</button><button class="btn" data-act="sheet-close">계속 운동</button></div>`, 'confirm'); },
    'session-cancel-yes': () => { const s = activeSession(); if (s) { clearTimeout(sessT); store.del('sessions', s.id); } stopRest(); closeSheet(); go('home'); render(); },
    'sess-pain': b => { const s = activeSession(); if (!s) return; s[b.dataset.k] = +b.dataset.v; saveSession(s); b.parentElement.querySelectorAll('button').forEach(x => { x.classList.toggle('on', x === b); x.classList.toggle('hi', x === b && +b.dataset.v >= 5); }); },
    // 로거
    'ex-info': b => { const x = X[b.dataset.ex]; if (x) openSheet(BL.exInfoHtml(x), 'exinfo'); },
    'ex-add': () => openPicker({ mode: 'session' }),
    'ex-add-to-session': b => { addExerciseToSession(b.dataset.ex); closeSheet(); },
    'ex-menu': b => { const i = +b.dataset.exi; const s = activeSession(); const ex = s.exercises[i]; const x = X[ex.exId]; openSheet(`${sheetHead(x.n, '')}<div class="stack-s"><button class="btn block" data-act="ex-swap" data-exi="${i}">다른 운동으로 교체</button><button class="btn block" data-act="ex-info" data-ex="${x.id}">자세·영상 보기</button><div class="row"><button class="btn" data-act="ex-move" data-exi="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''}>위로</button><button class="btn" data-act="ex-move" data-exi="${i}" data-d="1" ${i === s.exercises.length - 1 ? 'disabled' : ''}>아래로</button></div><button class="btn block danger" data-act="ex-remove" data-exi="${i}">이 운동 빼기</button></div>`, 'exmenu'); },
    'ex-swap': b => { const s = activeSession(); const ex = s.exercises[+b.dataset.exi]; const prog = activeProgram(); const alts = prog ? E.alternatives({ exId: ex.exId, role: ex.target.role || 'accessory' }, prog) : []; openPicker({ mode: 'swap-session', exi: +b.dataset.exi, alts }); },
    'ex-move': b => { const s = activeSession(); const i = +b.dataset.exi, d = +b.dataset.d; const j = i + d; if (j < 0 || j >= s.exercises.length) return; [s.exercises[i], s.exercises[j]] = [s.exercises[j], s.exercises[i]]; saveSession(s); closeSheet(); render(); },
    'ex-remove': b => { const s = activeSession(); s.exercises.splice(+b.dataset.exi, 1); saveSession(s); closeSheet(); render(); },
    'set-add': b => { const s = activeSession(); const ex = s.exercises[+b.dataset.exi]; const last = ex.sets[ex.sets.length - 1]; const st = newSet(); if (last) { st.w = last.w; st.r = last.r; st.t = last.t; } ex.sets.push(st); saveSession(s); rerenderEx(+b.dataset.exi); },
    'set-remove': b => { const s = activeSession(); const ex = s.exercises[+b.dataset.exi]; if (ex.sets.length > 1) { ex.sets.pop(); saveSession(s); rerenderEx(+b.dataset.exi); } },
    'set-done': b => { primeAudio(); const s = activeSession(); const i = +b.dataset.exi, k = +b.dataset.k; const ex = s.exercises[i]; const st = ex.sets[k]; const x = X[ex.exId];
      if (!st.done) {
        const row = b.closest('.set-row');
        const el = f => row.querySelector(`input[data-f="${f}"], select[data-f="${f}"]`);
        const g = f => { const e = el(f); return e ? e.value : ''; };
        const ph = f => { const e = el(f); return e ? (+e.placeholder || 0) : 0; };
        if (x.mode === 'cardio') { st.t = (+g('min') || ph('min')) * 60; }
        else if (x.mode === 'time') { st.w = +g('w') || 0; st.t = +g('t') || ph('t'); }
        else { st.w = g('w') !== '' ? +g('w') : ph('w'); st.r = g('r') !== '' ? +g('r') : ph('r'); }
        if (el('w') && g('w') === '') el('w').value = st.w; if (el('r') && g('r') === '') el('r').value = st.r;
        st.rpe = g('rpe') ? +g('rpe') : (st.rpe || null);
        st.done = true; st.at = new Date().toISOString();
        // 다음 세트에 값 미리 채우기 (워밍업 → 본 세트로는 안 넘김)
        const nx = ex.sets[k + 1]; if (nx && !nx.done && st.type !== 'warm') { if (nx.w == null) nx.w = st.w; if (nx.r == null) nx.r = st.r; if (nx.t == null) nx.t = st.t; }
        // PR 즉시 알림
        if (st.type !== 'warm' && x.mode === 'reps' && st.w > 0 && st.r > 0) { const prev = E.prTable(S.sessions.filter(o => o.id !== s.id))[x.id]; const e = E.e1rm(st.w, st.r, st.rpe); if (e > ((prev && prev.e1rm) || 0) + 0.01) BL.toast(`🏆 ${x.n} 새 기록: e1RM ${BL.n1(e)}kg (${st.w}×${st.r})`, 3200); }
        const rest = st.type === 'warm' ? 60 : (ex.target?.rest ?? (S.profile?.restDefault || 90)); if (S.profile?.autoRest !== false && rest > 0 && x.mode !== 'cardio' && x.pat !== 'mob') startRest(rest, `${x.n} ${st.type === 'warm' ? '워밍업' : (ex.sets.filter((q, qi) => qi <= k && q.type !== 'warm').length + '세트')} 후 휴식`);
      } else { st.done = false; }
      saveSession(s); rerenderEx(i); BL.$('#log-top') && (BL.$('#log-top').outerHTML = BL.views.trainHeader()); BL.render && null; },
    'finish-open': () => { const s = activeSession(); if (!s) return; if (s.type !== 'strength') { openSheet(quickHtml(s.type, s), 'quick'); return; } openSheet(finishHtml(s), 'finish'); },
    'warmup-add': b => { const s = activeSession(); const ex = s.exercises[+b.dataset.exi]; const x = X[ex.exId]; const sg = E.suggestNext(x, ex.target || {}, S.sessions, s.id); const w = sg.w || (ex.sets.find(st => st.w) || {}).w || 0; const plan = E.warmupPlan(w, x); if (!plan.length) return toast('본 세트 무게를 먼저 정하세요'); ex.sets = plan.map(p => Object.assign(newSet(), p)).concat(ex.sets); saveSession(s); rerenderEx(+b.dataset.exi); toast(`워밍업 ${plan.length}세트 추가 (${plan.map(p => p.w + '×' + p.r).join(', ')})`); },
    'plates': b => { const s = activeSession(); const ex = s.exercises[+b.dataset.exi]; const x = X[ex.exId]; const sg = E.suggestNext(x, ex.target || {}, S.sessions, s.id); const w = sg.w || (ex.sets.find(st => st.w) || {}).w || 60; openSheet(platesHtml(w, 20), 'plates'); },
    'session-edit': b => { const s = S.sessions.find(x => x.id === b.dataset.id); if (!s) return; if (activeSession()) return toast('진행 중인 운동을 먼저 마치세요'); s.status = 'active'; s.editing = true; saveSession(s, true); closeSheet(); go('train'); },
    'timer-add': b => addRest(+b.dataset.s), 'timer-skip': () => stopRest(),
    // 기록
    'hist-filter': b => { S.ui.histFilter = b.dataset.f; render(); },
    // 프로그램
    'day-toggle': b => { S.ui.openDays[b.dataset.id] = !S.ui.openDays[b.dataset.id]; render(); },
    'program-rename': b => { const p = S.programs.find(x => x.id === b.dataset.id); openSheet(`${sheetHead('프로그램 이름', '')}<form class="stack" data-act-submit="program-rename-save"><input type="hidden" name="id" value="${p.id}"><input class="inp" name="name" value="${esc(p.name)}" autofocus><div class="row"><button class="btn primary" type="submit">저장</button></div></form>`, 'rename'); },
    'program-restart': b => { const p = S.programs.find(x => x.id === b.dataset.id); p.startDate = E.today(); store.set('programs', p.id, p); render(); toast('오늘을 1주차 시작으로 잡았어요'); },
    'program-activate': b => { S.programs.forEach(p => { const on = p.id === b.dataset.id; if (!!p.active !== on) { p.active = on; store.set('programs', p.id, p); } }); render(); },
    'program-delete': b => { const p = S.programs.find(x => x.id === b.dataset.id); openSheet(`${sheetHead('프로그램 삭제', esc(p.name))}<p>지난 세션 기록은 남아요.</p><div class="row"><button class="btn danger" data-act="program-delete-yes" data-id="${p.id}">삭제</button><button class="btn" data-act="sheet-close">취소</button></div>`, 'confirm'); },
    'program-delete-yes': b => { store.del('programs', b.dataset.id); closeSheet(); render(); },
    'item-edit': b => openSheet(itemEditHtml(b.dataset.pid, b.dataset.did, b.dataset.iid), 'item'),
    'item-swap': b => { const prog = S.programs.find(p => p.id === b.dataset.pid); let it; prog.days.find(d => d.id === b.dataset.did).blocks.forEach(bl => bl.items.forEach(i => { if (i.id === b.dataset.iid) it = i; })); openPicker({ mode: 'swap-program', pid: b.dataset.pid, did: b.dataset.did, iid: b.dataset.iid, alts: E.alternatives(it, prog) }); },
    'item-add': b => openPicker({ mode: 'program-add', pid: b.dataset.pid, did: b.dataset.did }),
    'item-remove': b => { const prog = S.programs.find(p => p.id === b.dataset.pid); const day = prog.days.find(d => d.id === b.dataset.did); day.blocks.forEach(bl => { bl.items = bl.items.filter(i => i.id !== b.dataset.iid); bl.super = bl.items.length > 1; }); day.blocks = day.blocks.filter(bl => bl.items.length); day.est = E.estimateDay(day); store.set('programs', prog.id, prog); closeSheet(); render(); },
    // 마법사
    'wz-set': b => { const w = S.ui.wizard; w[b.dataset.k] = isNaN(+b.dataset.v) ? b.dataset.v : +b.dataset.v; w.preview = null; wizardRender(); },
    'wz-toggle': b => { const w = S.ui.wizard; const arr = w[b.dataset.k]; const i = arr.indexOf(b.dataset.v); if (i >= 0) arr.splice(i, 1); else { if (b.dataset.k === 'weakPoints' && arr.length >= 3) return toast('약점은 3개까지'); arr.push(b.dataset.v); } w.preview = null; wizardRender(); },
    'wz-equip-preset': b => { const w = S.ui.wizard; w.equipment = b.dataset.p === 'gym' ? Object.keys(BL.EQUIP).filter(k => k !== 'rope' && k !== 'trapbar' && k !== 'rower') : b.dataset.p === 'home' ? ['db', 'band'] : []; w.preview = null; wizardRender(); },
    'wz-step': b => { const w = S.ui.wizard; wizardCollect(); const last = w.onboard ? 4 : 3; w.step = Math.max(0, Math.min(last, w.step + +b.dataset.d)); if (w.step === last && !w.preview) wizardGenerate(); wizardRender(); $('#sheet-panel').scrollTop = 0; },
    'onboard': () => openWizard(true),
    // 로거 UI
    'step': b => { const s = activeSession(); if (!s) return; const ex = s.exercises[+b.dataset.exi]; const st = ex && ex.sets[+b.dataset.k]; if (!st) return; const f = b.dataset.f, d = +b.dataset.d; const inp = b.parentElement.querySelector('input'); const cur = inp.value !== '' ? +inp.value : (+inp.placeholder || 0); let v = Math.max(0, Math.round((cur + d) * 100) / 100); inp.value = v; if (f === 'min') st.t = v * 60; else st[f] = v; saveSession(s); },
    'set-type': b => { const s = activeSession(); const ex = s.exercises[+b.dataset.exi]; const st = ex.sets[+b.dataset.k]; st.type = st.type === 'warm' ? undefined : 'warm'; if (!st.type) delete st.type; saveSession(s); rerenderEx(+b.dataset.exi); },
    'ex-collapse': b => { const id = b.dataset.id; const s = activeSession(); const ex = s && s.exercises.find(e => e.id === id); if (!ex) return; S.ui.collapsed[id] = S.ui.collapsed[id] !== true; rerenderEx(s.exercises.indexOf(ex)); },
    'cal-nav': b => { S.ui.calMonth = b.dataset.m; render(); },
    'cal-day': b => { const ss = S.sessions.filter(s => s.status === 'done' && s.date === b.dataset.d); if (ss.length === 1) openSheet(BL.sessionDetail(ss[0]), 'session'); else if (ss.length) openSheet(`${sheetHead(BL.fmtD(b.dataset.d), `${ss.length}개 세션`)}<div class="slist">${ss.map(BL.sessionRow).join('')}</div>`, 'day'); },
    'measure-add': () => { const m = todayMetric() || {}; openSheet(`${sheetHead('신체 치수', '줄자로 같은 위치를 같은 시간대에')}<form class="stack" data-act-submit="measure-save"><div class="fgrid">${[['weightKg', '체중 (kg)'], ['waist', '허리 둘레 (cm, 배꼽 높이)'], ['chest', '가슴 둘레 (cm)'], ['hip', '엉덩이 둘레 (cm)'], ['thigh', '허벅지 둘레 (cm, 가장 굵은 곳)'], ['arm', '팔 둘레 (cm, 힘줬을 때)']].map(([k, n]) => `<div class="field"><label for="ms-${k}">${n}</label><input class="inp" id="ms-${k}" name="${k}" type="number" inputmode="decimal" step="0.1" min="0" value="${m[k] ?? ''}"></div>`).join('')}</div><div class="row"><button class="btn primary" type="submit">저장</button></div></form>`, 'measure'); },
    'photo-pick': () => { const f = $('#photo-file'); if (f) f.click(); else toast('진행 보기에서 사진을 올릴 수 있어요'); },
    'photo-delete': b => { const p = S.photos.find(x => x.id === b.dataset.id); if (!p) return; openSheet(`${sheetHead('사진 삭제', BL.fmtD(p.date))}<p>이 사진을 지울까요?</p><div class="row"><button class="btn danger" data-act="photo-delete-yes" data-id="${p.id}">삭제</button><button class="btn" data-act="sheet-close">취소</button></div>`, 'confirm'); },
    'photo-delete-yes': async b => { const p = S.photos.find(x => x.id === b.dataset.id); closeSheet(); if (!p) return; await store.del('photos', p.id); if (p.assetId && store.assets) { try { await store.assets.delete(p.assetId); } catch (e) { } } render(); toast('지웠어요'); },
    'wz-regen': () => { wizardGenerate(true); wizardRender(); },
    'wz-apply': () => wizardApply(),
    // 진행
    'range': b => { S.ui.range = +b.dataset.r; render(); },
    'heat-week': b => { S.ui.heatWeek = +b.dataset.w; render(); },
    // 도감·선택
    'lib-pat': b => { S.ui.libPat = b.dataset.p; render(); },
    'pick-pat': b => { S.ui.picker.pat = b.dataset.p; $('#sheet-panel').innerHTML = pickerHtml(); },
    'pick-ex': b => pickExercise(b.dataset.ex),
    // 설정·데이터
    'report': () => openSheet(reportHtml(), 'report'),
    'report-copy': () => copyText($('#report-txt').textContent, '보고서를 복사했어요. 채팅에 붙여 넣으세요.'),
    'report-save': () => saveFile(`baseline-report-${E.today()}.md`, $('#report-txt').textContent),
    'ai-feedback': () => aiFeedback(),
    'export-json': () => exportJson(), 'export-csv': () => exportCsv(),
    'import-open': () => openSheet(`${sheetHead('가져오기', '베이스라인에서 내보낸 JSON을 붙여 넣기')}<textarea class="inp" id="import-txt" style="min-height:160px" placeholder='{"app":"baseline", ...}'></textarea><div class="row"><button class="btn primary" data-act="import-run">가져오기</button></div>`, 'import'),
    'import-run': () => importRun($('#import-txt').value),
    'wipe-open': () => openSheet(`${sheetHead('모든 기록 삭제', '되돌릴 수 없어요')}<p class="small">세션 ${S.sessions.length}개, 체크인 ${S.metrics.length}개, 테스트 ${S.tests.length}개, 프로그램 ${S.programs.length}개와 프로필을 모두 지워요. 먼저 JSON으로 내보내 두는 걸 권해요.</p><input class="inp" id="wipe-confirm" placeholder='확인하려면 "삭제"를 입력'><div class="row"><button class="btn danger" data-act="wipe-run">전부 삭제</button><button class="btn" data-act="sheet-close">취소</button></div>`, 'wipe'),
    'wipe-run': () => { if ($('#wipe-confirm').value.trim() !== '삭제') return toast('"삭제"라고 입력해야 해요'); wipeAll(); }
  };
  function rerenderEx(i) { const s = activeSession(); const el = $(`.excard[data-exi="${i}"]`); if (el && s && s.exercises[i]) el.outerHTML = BL.exCard(s, s.exercises[i], i); }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    if (b.tagName === 'LABEL' || b.tagName === 'SELECT') return;
    const fn = A[b.dataset.act]; if (!fn) return;
    if (b.tagName === 'A') e.preventDefault();
    try { fn(b, e); } catch (err) { console.error(err); toast('오류: ' + err.message); }
  });
  const FORMS = {
    'checkin-save': checkinSave, 'finish-save': finishSave, 'quick-save': quickSave, 'item-save': itemSave,
    'plates-calc': f => { const fd = new FormData(f); $('#sheet-panel').innerHTML = platesHtml(+fd.get('w') || 0, +fd.get('bar') || 0); },
    'measure-save': f => { const fd = new FormData(f); const date = E.today(); const prev = todayMetric() || { id: date, date }; const num = k => fd.get(k) !== '' && fd.get(k) != null ? +fd.get(k) : null; const doc = Object.assign({}, prev, { id: date, date, updatedAt: new Date().toISOString() }); ['weightKg', 'waist', 'chest', 'hip', 'thigh', 'arm'].forEach(k => { const v = num(k); if (v != null) doc[k] = v; }); store.set('metrics', date, doc); if (doc.weightKg && S.profile) { S.profile.weightKg = doc.weightKg; store.set('profile', 'me', S.profile); } closeSheet(); render(); toast('치수를 기록했어요'); },
    'test-save': f => { const fd = new FormData(f); const id = E.uid(); store.set('tests', id, { id, date: fd.get('date'), testId: fd.get('testId'), value: +fd.get('value') }); closeSheet(); render(); toast('테스트를 기록했어요'); },
    'program-rename-save': f => { const fd = new FormData(f); const p = S.programs.find(x => x.id === fd.get('id')); p.name = fd.get('name') || p.name; store.set('programs', p.id, p); closeSheet(); render(); },
    'profile-save': f => {
      const fd = new FormData(f); const num = k => fd.get(k) !== '' && fd.get(k) != null ? +fd.get(k) : null;
      const trainDays = fd.getAll('trainDays').map(Number), tennisWeekdays = fd.getAll('tennisWeekdays').map(Number);
      const P = Object.assign({}, S.profile || {}, { name: fd.get('name') || '', age: num('age'), heightCm: num('heightCm'), weightKg: num('weightKg'), dominantHand: fd.get('dominantHand') || 'R', goal: fd.get('goal'), level: +fd.get('level') || 1, daysPerWeek: +fd.get('daysPerWeek') || 3, sessionMinutes: +fd.get('sessionMinutes') || 60, tennisDays: tennisWeekdays.length || +fd.get('tennisDays') || 0, trainDays, tennisWeekdays, restDefault: num('restDefault') || 90, equipment: fd.getAll('equipment'), restrictions: fd.getAll('restrictions'), weakPoints: fd.getAll('weakPoints').slice(0, 3), sound: fd.get('sound') === 'on', autoRest: fd.get('autoRest') === 'on', updatedAt: new Date().toISOString(), createdAt: (S.profile && S.profile.createdAt) || new Date().toISOString() });
      store.set('profile', 'me', P); toast('프로필을 저장했어요');
      if (!activeProgram()) openWizard(); else render();
    }
  };
  document.addEventListener('submit', e => { const f = e.target.closest('form[data-act-submit]'); if (!f) return; e.preventDefault(); const fn = FORMS[f.dataset.actSubmit]; if (fn) { try { fn(f); } catch (err) { console.error(err); toast('오류: ' + err.message); } } });

  // 입력: 세트 값, 검색
  const libQ = BL.debounce(v => { S.ui.libQ = v; render(); const i = $('[data-act-input="lib-q"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250);
  const pickQ = BL.debounce(v => { if (!S.ui.picker) return; S.ui.picker.q = v; const list = $('#sheet-panel .stack-s'); const tmp = document.createElement('div'); tmp.innerHTML = pickerHtml(); if (list) list.outerHTML = tmp.querySelector('.stack-s').outerHTML; }, 200);
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.actInput === 'lib-q') return libQ(t.value);
    if (t.dataset.actInput === 'pick-q') return pickQ(t.value);
    if (t.dataset.f) {
      const s = activeSession(); if (!s) return; const ex = s.exercises[+t.dataset.exi]; if (!ex) return;
      if (t.dataset.f === 'note') { ex.note = t.value; saveSession(s); return; }
      const st = ex.sets[+t.dataset.k]; if (!st) return;
      const v = t.value === '' ? null : +t.value;
      if (t.dataset.f === 'min') st.t = v == null ? null : v * 60; else st[t.dataset.f] = v;
      saveSession(s);
    }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.actChange === 'lib-mine') { S.ui.libMine = t.checked; render(); }
    else if (t.dataset.actChange === 'lib-safe') { S.ui.libSafe = t.checked; render(); }
    else if (t.dataset.actChange === 'photo-file') { const file = t.files && t.files[0]; t.value = ''; if (file) addPhoto(file); }
    else if (t.dataset.actChange === 'test-pick') { const d = BL.TESTS.find(x => x.id === t.value); $('#t-unit').textContent = `(${d.unit})`; $('#t-hint').textContent = d.hint; }
    else if (t.dataset.act === 'prog-ex') { S.ui.progEx = t.value; render(); }
    else if (t.dataset.f === 'rpe') { const s = activeSession(); if (!s) return; const st = s.exercises[+t.dataset.exi]?.sets[+t.dataset.k]; if (st) { st.rpe = t.value ? +t.value : null; saveSession(s); } }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#sheet').hidden) { closeSheet(); return; }
    if (e.key === 'Enter' && e.target && e.target.dataset && e.target.dataset.f && e.target.dataset.f !== 'note') { const row = e.target.closest('.set-row'); const b = row && row.querySelector('.done-btn'); if (b) { e.preventDefault(); e.target.blur(); b.click(); } }
  });

  // ───────── 부팅 ─────────
  BL.afterRender = function () { };
  BL.route();
  store.init().then(() => render());
  // 홈 화면 앱(PWA)으로 설치됐을 때만 오프라인 캐시 등록
  try { if (window.self === window.top && location.protocol === 'https:' && !/claude\.ai$/.test(location.hostname) && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { }); } catch (e) { }
})(window.BL);
