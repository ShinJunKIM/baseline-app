/* 베이스라인 · 화면 A: 홈, 운동(로거), 기록 */
(function (BL) {
  'use strict';
  const { S, esc, n0, n1, fmtD, fmtShort, fmtClock, fmtTime, activeSession, activeProgram, todayMetric, sparkline, miniFigs, subnav, ico, ring } = BL;
  const E = BL.engine, X = BL.X;
  BL.views = BL.views || {};

  const TYPE_N = { strength: '근력', tennis: '테니스', cond: '유산소', other: '기타' };
  const typeDot = t => `<i class="typedot dot-${t === 'strength' ? 'strength' : t === 'tennis' ? 'tennis' : t === 'cond' ? 'cond' : 'other'}"></i>`;
  const rxText = it => { const bits = []; bits.push(`${it.sets}세트`); if (it.reps) bits.push(it.reps[0] === it.reps[1] ? `${it.reps[0]}회` : `${it.reps[0]}–${it.reps[1]}회`); if (it.time) bits.push(`${it.time}초`); if (it.min) bits.push(`${it.min}분`); if (it.perSide) bits.push('/쪽'); if (it.rpe) bits.push(`RPE ${it.rpe}`); return bits.join(' · '); };
  BL.rxText = rxText; BL.TYPE_N = TYPE_N; BL.typeDot = typeDot;

  const readyPill = r => !r ? '' : `<span class="pill ${r.score >= 75 ? 'ok' : r.score >= 55 ? '' : 'warn'}"><i></i>컨디션 ${r.score} · ${r.label}</span>`;
  function loadingNote() { return (!S.loaded && BL.store.mode === 'db') ? `<div class="banner info"><div><b>기록을 불러오는 중</b>${S.stale ? '서버 응답이 늦어요. 잠시 뒤 자동으로 이어집니다.' : '잠시만요.'}</div></div>` : ''; }
  function readOnlyNote() { return BL.store.readOnly ? `<div class="banner warn"><div><b>읽기 전용으로 보고 있어요</b>이 페이지의 소유자만 기록을 추가하거나 바꿀 수 있어요.</div></div>` : ''; }
  function localNote() {
    if (BL.store.mode !== 'local') return '';
    const standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    if (standalone) return S.sessions.length ? '' : `<div class="banner info"><div><b>기록은 이 아이폰에 저장돼요</b>설정 → 데이터에서 JSON으로 백업할 수 있고, 코치 보고서를 복사해 Claude 채팅에 붙여 넣으면 분석을 받아요.</div></div>`;
    return `<div class="banner info"><div><b>이 브라우저에만 저장돼요</b>claude.ai에서 열면 클라우드에 저장되어 다른 기기에서도 보이고, 코치(Claude)가 직접 읽을 수 있어요.</div></div>`;
  }
  BL.notes = { loadingNote, readOnlyNote, localNote };

  function painConflict(ex) {
    const m = todayMetric(); if (!m || m.pain == null || m.pain < 4 || !m.painSite) return null;
    const r = BL.PAIN_SITE_RESTRICTION[m.painSite]; if (!r) return null;
    const flags = new Set(BL.RESTRICTIONS[r].ex);
    return ex.f.some(f => flags.has(f)) ? { site: m.painSite, pain: m.pain } : null;
  }
  BL.painConflict = painConflict;

  // ───────── 홈 ─────────
  BL.views.home = function () {
    const t = E.today(); const P = S.profile; const prog = activeProgram(); const act = activeSession(); const m = todayMetric(); const rd = E.readiness(m);
    const out = [];
    out.push(subnav('홈', readyPill(rd) || `<span class="pill"><i></i>${fmtD(t)}</span>`));
    out.push(`<div class="page-h"><div class="eyebrow">${fmtD(t)}</div><h1>${P && P.name ? esc(P.name) + '님, ' : ''}${act ? '운동이 진행 중이에요' : '오늘 할 일'}</h1></div>`);
    out.push(loadingNote(), readOnlyNote(), localNote());
    if (!P) out.push(`<div class="tile"><div class="eyebrow">시작하기</div><h2 style="font-size:28px;line-height:1.14">목표를 알려 주면 프로그램을 짜 드려요</h2><p class="lead" style="color:var(--on-tile-muted)">나이, 목표, 운동 가능한 요일과 장비, 아픈 곳. 2분이면 끝나요.</p><div class="cta-row"><button class="btn primary lg" data-act="onboard">${ico('bolt')} 시작하기</button><a href="#library">운동 도감 둘러보기 ›</a></div></div>`);
    if (act) { const tot = act.exercises.reduce((a, e) => a + e.sets.filter(s => s.type !== 'warm').length, 0), done = E.workSets(act).length; out.push(`<div class="tile" style="grid-template-columns:auto minmax(0,1fr) auto;display:grid;align-items:center;gap:16px">${ring(tot ? done / tot : 0, 56, `${done}`, { color: 'var(--link-dark)', font: 16 })}<div><div class="eyebrow">진행 중</div><h2>${esc(act.title || '운동')}</h2><div class="small muted">${fmtTime(act.startedAt)} 시작 · ${done}/${tot} 세트</div></div><button class="btn primary" data-act="go" data-v="train">${ico('play')} 이어서</button></div>`); }

    if (prog && !act) {
      const idx = E.nextDayIndex(prog, S.sessions); const day = prog.days[idx]; const wi = E.weekInfo(prog);
      const rows = day.blocks.flatMap((b, bi) => b.items.map((it, ii) => { const x = X[it.exId]; if (!x) return ''; const adj = E.adjustItem(it, wi, rd); const sg = E.suggestNext(x, adj, S.sessions); const lab = String.fromCharCode(65 + bi) + (b.items.length > 1 ? (ii + 1) : ''); const pc = painConflict(x); return `<div class="r"><span class="lbl">${lab}</span><div><div>${esc(x.n)}${pc ? ' <span class="tag crit">통증 부위</span>' : ''}</div><div class="sugg">${sg.w ? `<b>${sg.w}kg</b> · ` : ''}${esc(sg.note)}</div></div><span class="t">${rxText(adj)}</span></div>`; })).join('');
      const tags = [`${wi.week}주차`, wi.deload ? '디로드' : '', wi.intro ? '첫 주: 세트 −1' : ''].filter(Boolean).join(' · ');
      out.push(`<div class="tile"><div class="row between"><div><div class="eyebrow">다음 운동 · ${tags}</div><h2 style="font-size:28px;line-height:1.14;margin-top:4px">${esc(day.name)}</h2><div class="small muted" style="margin-top:4px">${esc(day.focus)} · 약 ${day.est || E.estimateDay(day)}분 · ${day.blocks.reduce((a, b) => a + b.items.length, 0)}개 운동</div></div><div class="cta-row"><select class="inp sm" id="day-pick" data-act="noop" aria-label="운동 날 선택">${prog.days.map((d, i) => `<option value="${i}" ${i === idx ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select><button class="btn primary lg" data-act="start-day">${ico('play')} 운동 시작</button></div></div><div class="next-ex">${rows}</div>${rd && rd.adjust.sets ? `<div class="small" style="color:var(--on-tile-muted)">${esc(rd.adjust.note)}</div>` : ''}</div>`);
      if (wi.week > 1 && wi.inCycle === 1) out.push(`<div class="banner info"><div><b>새 주기가 시작됐어요 (${wi.week}주차)</b>지난 4주 기록이 쌓였으니 프로그램을 다시 만들면 무게 제안이 그대로 이어지고 운동 조합이 조금 바뀌어요. 지금 조합이 마음에 들면 그대로 계속해도 돼요.</div><button class="btn sm" data-act="wizard">다시 만들기</button></div>`);
    } else if (!prog && P && !act) {
      out.push(`<div class="tile"><h2 style="font-size:28px">아직 프로그램이 없어요</h2><p style="color:var(--on-tile-muted)">프로필 기준으로 목표에 맞는 주간 프로그램을 만들어요.</p><div><button class="btn primary lg" data-act="wizard">${ico('bolt')} 프로그램 만들기</button></div></div>`);
    }

    if (!m) out.push(`<div class="card"><div class="card-h"><h2>오늘 컨디션 체크인</h2><span class="small muted">30초. 수면·피로를 보고 오늘 세트 수를 조정해요</span></div>${checkinForm({})}</div>`);
    else out.push(`<div class="card"><div class="card-h"><h2>오늘 컨디션</h2><button class="btn sm" data-act="checkin-edit">${ico('edit')} 수정</button></div><div class="row" style="gap:24px;align-items:center">${rd ? ring(rd.score / 100, 64, rd.score, { color: rd.score >= 75 ? 'var(--good)' : rd.score >= 55 ? 'var(--accent)' : 'var(--warn)', font: 18 }) : ''}<div><div class="xs muted">수면</div><div class="num" style="font-size:21px;font-weight:600">${m.sleepH != null ? m.sleepH + 'h' : '–'}</div></div><div><div class="xs muted">통증</div><div class="num" style="font-size:21px;font-weight:600">${m.pain != null ? m.pain + '/10' : '–'}</div>${m.painSite ? `<div class="xs muted">${esc(m.painSite)}</div>` : ''}</div>${m.weightKg ? `<div><div class="xs muted">체중</div><div class="num" style="font-size:21px;font-weight:600">${m.weightKg}kg</div></div>` : ''}</div>${rd ? `<p class="small muted" style="margin-top:10px">${esc(rd.adjust.note)}</p>` : ''}</div>`);

    if (!act) out.push(`<div class="row"><button class="btn" data-act="start-free">${ico('plus')} 자유 운동</button><button class="btn" data-act="quicklog" data-type="tennis">테니스 기록</button><button class="btn" data-act="quicklog" data-type="cond">유산소·기타</button><button class="btn" data-act="test-add">테스트 입력</button><button class="btn" data-act="measure-add">${ico('ruler')} 신체 치수</button></div>`);

    const ws = E.weekStart(t);
    const days = Array.from({ length: 7 }, (_, i) => E.addDays(ws, i));
    const trainDays = (P && P.trainDays) || [], tennisDays = (P && P.tennisWeekdays) || [];
    out.push(`<div class="week">${days.map((d, i) => { const wd = (i + 1) % 7; const ss = S.sessions.filter(s => s.date === d && s.status === 'done'); const planned = [trainDays.includes(wd) ? '근력' : '', tennisDays.includes(wd) ? '테니스' : ''].filter(Boolean).join('·'); return `<div class="wday ${d === t ? 'today' : ''}"><div class="dn">${BL.WEEKDAYS[wd]}</div><div class="dd">${+d.slice(8)}</div><div class="dots">${ss.map(s => typeDot(s.type)).join('')}</div>${planned && !ss.length && d >= t ? `<div class="pl">${planned}</div>` : ''}</div>`; }).join('')}</div>`);

    const ad = E.adherence(prog, S.sessions); const wl = E.weeklyLoads(S.sessions, 8); const cur = wl[wl.length - 1], prev = wl[wl.length - 2]; const a = E.acwr(S.sessions); const streak = E.weekStreak(prog, S.sessions);
    const lastPain = S.metrics.filter(x => x.pain != null).sort((x, y) => y.date.localeCompare(x.date))[0];
    const aLabel = { none: '데이터 없음', insufficient: `${a.days}일째 수집 중`, low: '부하 낮음', ok: '적정', caution: '주의', danger: '위험' }[a.status];
    out.push(`<div class="kpis">
      <div class="kpi"><div class="k">이번 주 근력 세션</div><div class="v">${ad.done}<small>/ ${ad.planned || '–'}</small></div><div class="d">${streak ? `<span class="streak">${ico('flame')} ${streak}주 연속</span>` : '계획을 채우면 연속 주가 쌓여요'}</div></div>
      <div class="kpi"><div class="k">주간 부하 (RPE×분)</div><div class="v">${n0(cur.total)}</div><div class="d ${prev.total ? (cur.total > prev.total * 1.15 ? 'down' : 'up') : ''}">${prev.total ? `지난주 ${n0(prev.total)} (${cur.total >= prev.total ? '+' : ''}${n0((cur.total - prev.total) / prev.total * 100)}%)` : '지난주 기록 없음'}</div>${sparkline(wl.map(w => w.total))}</div>
      <div class="kpi"><div class="k">급성:만성 부하비 (ACWR)</div><div class="v">${a.ratio != null && a.status !== 'insufficient' ? a.ratio.toFixed(2) : '–'}</div><div class="d ${a.status === 'danger' ? 'down' : a.status === 'ok' ? 'up' : ''}">${aLabel}${a.status === 'danger' ? ' · 이번 주 부하가 평소의 1.5배' : a.status === 'caution' ? ' · 늘리는 속도를 늦추기' : ''}</div></div>
      <div class="kpi"><div class="k">최근 통증</div><div class="v">${lastPain ? lastPain.pain : '–'}<small>/10</small></div><div class="d">${lastPain ? `${fmtShort(lastPain.date)} ${esc(lastPain.painSite || '')}` : '체크인에서 기록'}</div></div>
    </div>`);

    if (prev.sessions) { const lastWs = E.addDays(ws, -7); const pains = S.metrics.filter(x => x.pain != null && x.date >= lastWs && x.date < ws); const avgPain = pains.length ? (pains.reduce((s, x) => s + x.pain, 0) / pains.length).toFixed(1) : null; const str = S.sessions.filter(s => s.status === 'done' && s.type === 'strength' && s.date >= lastWs && s.date < ws).length; out.push(`<div class="banner"><div><b>지난주 요약</b>근력 ${str}${prog ? `/${prog.daysPerWeek}` : ''}회 · 세션 ${prev.sessions}개 · 부하 ${n0(prev.total)}${wl[wl.length - 3] && wl[wl.length - 3].total ? ` (전주 대비 ${prev.total >= wl[wl.length - 3].total ? '+' : ''}${n0((prev.total - wl[wl.length - 3].total) / wl[wl.length - 3].total * 100)}%)` : ''}${avgPain != null ? ` · 아침 통증 평균 ${avgPain}` : ''}</div><a href="#progress">진행 보기 ›</a></div>`); }
    const lastTest = S.tests.slice().sort((x, y) => y.date.localeCompare(x.date))[0];
    if (P && (!lastTest || E.diffDays(lastTest.date, t) > 42)) out.push(`<div class="banner"><div><b>${lastTest ? `체력 테스트를 ${Math.floor(E.diffDays(lastTest.date, t) / 7)}주 전에 쟀어요` : '아직 체력 테스트 기록이 없어요'}</b>제자리멀리뛰기, 5-10-5 셔틀, 발목 니투월을 4~6주마다 재면 근력 운동이 코트 능력으로 이어지는지 보여요.</div><button class="btn sm" data-act="test-add">기록</button></div>`);
    const recent = S.sessions.filter(s => s.status === 'done').sort((x, y) => (y.date + (y.endedAt || '')).localeCompare(x.date + (x.endedAt || ''))).slice(0, 4);
    out.push(`<div class="card"><div class="card-h"><h2>최근 기록</h2><a href="#history">전체 보기 ›</a></div>${recent.length ? `<div class="slist">${recent.map(sessionRow).join('')}</div>` : `<div class="empty"><div>아직 기록이 없어요.</div><div class="xs">운동을 시작하면 세트마다 무게·횟수·RPE가 여기에 쌓여요.</div></div>`}</div>`);
    return out.join('');
  };

  function sessionRow(s) {
    const L = E.sessionLoad(s); const ton = E.tonnage(s); const prs = s.type === 'strength' ? E.sessionPRs(s, S.sessions).length : 0;
    const meta = s.type === 'strength' ? `${(s.exercises || []).length}개 운동 · ${E.workSets(s).length}세트${ton ? ` · ${n0(ton)}kg` : ''}` : `${s.durationMin || '?'}분 · RPE ${s.sRPE || '?'}${s.serves ? ` · 서브 ${s.serves}개` : ''}`;
    return `<button class="srow" data-act="session-open" data-id="${s.id}"><span class="dt">${fmtShort(s.date)}</span><span><span class="ti">${typeDot(s.type)}${esc(s.title || TYPE_N[s.type] || '운동')}${prs ? `<span class="tag acc">${ico('trophy')} ${prs}</span>` : ''}${s.painPost != null && s.painPost >= 4 ? `<span class="tag crit">통증 ${s.painPost}</span>` : ''}</span><span class="me">${meta}</span></span><span class="st">${n0(L)}<br><span class="xs muted">부하</span></span></button>`;
  }
  BL.sessionRow = sessionRow;

  function checkinForm(m) {
    const sc = (id, labels, cur) => `<div class="scale">${labels.map((l, i) => `<button type="button" class="${cur === i + 1 ? 'on' : ''}" data-act="ck-scale" data-k="${id}" data-v="${i + 1}">${l}</button>`).join('')}</div>`;
    return `<form id="checkin-form" class="stack" data-act-submit="checkin-save">
      <div class="fgrid">
        <div class="field"><label for="ck-sleepH">수면 시간</label><input class="inp" id="ck-sleepH" name="sleepH" type="number" inputmode="decimal" step="0.5" min="0" max="14" value="${m.sleepH ?? ''}" placeholder="7.5"></div>
        <div class="field"><label for="ck-weight">체중 (kg, 선택)</label><input class="inp" id="ck-weight" name="weightKg" type="number" inputmode="decimal" step="0.1" min="30" max="200" value="${m.weightKg ?? ''}" placeholder="70.0"></div>
      </div>
      ${BL.CHECKIN.filter(c => c.type === 'scale').map(c => `<div class="field"><span class="flabel">${c.n}</span>${sc(c.id, c.labels, m[c.id])}<input type="hidden" name="${c.id}" value="${m[c.id] ?? ''}"></div>`).join('')}
      <div class="field"><span class="flabel">통증 <span class="help">0 없음 ~ 10 최악</span></span><div class="pain-scale">${Array.from({ length: 11 }, (_, i) => `<button type="button" class="${m.pain === i ? 'on' + (i >= 5 ? ' hi' : '') : ''}" data-act="ck-pain" data-v="${i}">${i}</button>`).join('')}</div><input type="hidden" name="pain" value="${m.pain ?? ''}"></div>
      <div class="fgrid"><div class="field"><label for="ck-site">아픈 부위</label><select class="inp" id="ck-site" name="painSite"><option value="">없음</option>${BL.PAIN_SITES.map(p => `<option ${m.painSite === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div><div class="field"><label for="ck-notes">메모</label><input class="inp" id="ck-notes" name="notes" value="${esc(m.notes || '')}" placeholder="어제 테니스 3시간, 서브 많이 침"></div></div>
      <div class="row"><button class="btn primary" type="submit">저장</button></div></form>`;
  }
  BL.checkinForm = checkinForm;

  // ───────── 운동 (로거) ─────────
  function sessionProgress(s) { const tot = s.exercises.reduce((a, e) => a + e.sets.filter(st => st.type !== 'warm').length, 0); const done = E.workSets(s).length; return { tot, done }; }
  BL.views.trainHeader = function () {
    const s = activeSession(); if (!s) return '<div id="log-top"></div>';
    const prog = activeProgram(); const wi = prog && s.programId === prog.id ? E.weekInfo(prog, s.date) : null; const pr = sessionProgress(s);
    return `<div id="log-top">${subnav(esc(s.title || '운동'), `<span class="progress-pill">${ring(pr.tot ? pr.done / pr.tot : 0, 28, '', { stroke: 3 })}${pr.done}/${pr.tot}</span><span class="elapsed" id="elapsed">0:00</span><button class="btn sm primary" data-act="finish-open">${ico('check')} 마치기</button>`, `${fmtD(s.date)}${wi ? ` · ${wi.week}주차${wi.deload ? ' · 디로드' : ''}` : ''}${E.tonnage(s) ? ` · ${n0(E.tonnage(s))}kg` : ''}`)}</div>`;
  };

  BL.views.train = function () {
    const s = activeSession();
    if (!s) return trainChooser();
    const rd = E.readiness(todayMetric());
    const out = [BL.views.trainHeader(), BL.notes.readOnlyNote()];
    if (rd && rd.adjust.sets) out.push(`<div class="banner warn"><div><b>컨디션 ${rd.score}점</b>${esc(rd.adjust.note)}</div></div>`);
    if (s.type !== 'strength') out.push(`<div class="card"><p>이 세션은 ${TYPE_N[s.type]} 기록이에요. 마치기에서 시간과 RPE를 입력하면 저장돼요.</p></div>`);
    out.push(`<div class="card" style="padding:14px 18px"><div class="row between"><span class="small"><b>운동 전 통증</b> <span class="muted">0 없음 ~ 10 최악</span></span></div><div class="pain-scale" style="margin-top:8px">${Array.from({ length: 11 }, (_, i) => `<button type="button" class="${s.painPre === i ? 'on' + (i >= 5 ? ' hi' : '') : ''}" data-act="sess-pain" data-k="painPre" data-v="${i}">${i}</button>`).join('')}</div></div>`);
    // 슈퍼세트 묶기
    const exs = s.exercises || []; let i = 0;
    while (i < exs.length) {
      const ex = exs[i]; const group = [];
      if (ex.blockId) { let j = i; while (j < exs.length && exs[j].blockId === ex.blockId) { group.push(j); j++; } }
      if (group.length > 1) { out.push(`<div class="superset"><div class="ss-h">${ico('swap')} ${esc(group.map(k => exs[k].label).join(' → '))} 번갈아 · 한 세트씩 돌아가며, 한 바퀴마다 쉬기</div>${group.map(k => exCard(s, exs[k], k)).join('')}</div>`); i += group.length; }
      else { out.push(exCard(s, ex, i)); i++; }
    }
    out.push(`<div class="row"><button class="btn" data-act="ex-add">${ico('plus')} 운동 추가</button><button class="btn primary" data-act="finish-open">${ico('check')} 운동 마치기</button><button class="btn ghost" data-act="session-cancel">세션 취소</button></div>`);
    return `<div class="logger">${out.join('')}</div>`;
  };

  function trainChooser() {
    const prog = activeProgram();
    const out = [subnav('운동', prog ? `<button class="btn sm primary" data-act="start-day">${ico('play')} 다음 운동</button>` : ''), `<div class="page-h"><div class="eyebrow">${fmtD(E.today())}</div><h1>어떤 운동을 할까요?</h1></div>`, BL.notes.readOnlyNote()];
    if (prog) {
      const idx = E.nextDayIndex(prog, S.sessions);
      out.push(`<div class="card"><div class="card-h"><h2>${esc(prog.name)}</h2><span class="small muted">다음 차례: ${esc(prog.days[idx].name)}</span></div><div class="stack-s">${prog.days.map((d, i) => `<button class="srow" data-act="start-day" data-i="${i}"><span class="lbl ${i === idx ? 'on' : ''}">${i + 1}</span><span><span class="ti">${esc(d.name)}${i === idx ? '<span class="tag acc">다음</span>' : ''}</span><span class="me">${esc(d.focus)} · ${d.blocks.reduce((a, b) => a + b.items.length, 0)}개 운동 · 약 ${d.est || E.estimateDay(d)}분</span></span><span class="st">${ico('right')}</span></button>`).join('')}</div></div>`);
    } else out.push(`<div class="tile"><h2 style="font-size:28px">프로그램이 없어요</h2><p style="color:var(--on-tile-muted)">목표에 맞는 프로그램을 만들면 여기서 바로 시작할 수 있어요.</p><div><button class="btn primary lg" data-act="wizard">${ico('bolt')} 프로그램 만들기</button></div></div>`);
    out.push(`<div class="grid3"><button class="card" style="text-align:left;cursor:pointer" data-act="start-free"><h3>${ico('plus')} 자유 운동</h3><p class="small muted" style="margin-top:4px">운동을 직접 고르면서 기록</p></button><button class="card" style="text-align:left;cursor:pointer" data-act="quicklog" data-type="tennis"><h3>테니스 기록</h3><p class="small muted" style="margin-top:4px">시간, 강도, 서브 개수</p></button><button class="card" style="text-align:left;cursor:pointer" data-act="quicklog" data-type="cond"><h3>유산소·기타</h3><p class="small muted" style="margin-top:4px">달리기, 자전거, 수영 등</p></button></div>`);
    return out.join('');
  }

  const RPE_OPTS = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
  const STEP = { bb_l: 2.5, bb_u: 2.5, db: 1, kb: 2, mach: 2.5 };
  const stepper = (f, i, k, val, ph, step, unit, label) => `<div class="stepper" aria-label="${label}"><button type="button" tabindex="-1" data-act="step" data-f="${f}" data-exi="${i}" data-k="${k}" data-d="${-step}" aria-label="${label} 줄이기">${ico('minus')}</button><input class="inp" type="number" inputmode="decimal" min="0" step="${step}" data-f="${f}" data-exi="${i}" data-k="${k}" value="${val ?? ''}" placeholder="${ph ?? ''}" aria-label="${label}"><button type="button" tabindex="-1" data-act="step" data-f="${f}" data-exi="${i}" data-k="${k}" data-d="${step}" aria-label="${label} 늘리기">${ico('plus')}</button></div>`;

  function exCard(s, ex, i) {
    const x = X[ex.exId]; if (!x) return '';
    const tg = ex.target || {}; const sg = E.suggestNext(x, tg, S.sessions, s.id);
    const last = sg.last; const workSets = ex.sets.filter(st => st.type !== 'warm'); const allDone = workSets.length && workSets.every(st => st.done);
    const mode = x.mode; const pc = painConflict(x);
    const collapsed = S.ui.collapsed[ex.id] === true;
    if (collapsed) {
      const sum = workSets.filter(st => st.done).map(st => mode === 'time' ? `${st.t}초` : mode === 'cardio' ? `${Math.round((st.t || 0) / 60)}분` : `${st.w || 0}×${st.r}`).join(' · ');
      return `<section class="excard collapsed ${allDone ? 'done' : ''}" data-exi="${i}" data-act="ex-collapse" data-id="${ex.id}"><span class="lbl ${ex.label ? 'on' : ''}">${esc(ex.label || (i + 1))}</span><span><span class="nm">${esc(x.n)}</span><div class="sum">${sum || '아직 기록 없음'}</div></span><span class="row">${allDone ? `<span class="tag acc">${ico('check')} 완료</span>` : ''}${ico('down')}</span></section>`;
    }
    const wStep = STEP[x.inc] || 1;
    let wi = 0;
    const rows = ex.sets.map((st, k) => {
      const warm = st.type === 'warm'; const idx = warm ? null : wi++;
      const prevSet = last && idx != null ? last.sets[idx] : null;
      const prevTxt = prevSet ? (mode === 'time' ? `${prevSet.t}초` : mode === 'cardio' ? `${Math.round((prevSet.t || 0) / 60)}분 @${prevSet.rpe || '-'}` : `${prevSet.w || 0}×${prevSet.r}${prevSet.rpe ? ' @' + prevSet.rpe : ''}`) : '';
      const rpeSel = `<select class="inp" data-f="rpe" data-exi="${i}" data-k="${k}" aria-label="RPE"><option value="">RPE</option>${RPE_OPTS.map(r => `<option value="${r}" ${+st.rpe === r ? 'selected' : ''}>${r}</option>`).join('')}</select>`;
      let cells;
      if (mode === 'cardio') cells = `${stepper('min', i, k, st.t ? Math.round(st.t / 60) : null, tg.min || '', 1, '분', '분')}<span></span>${rpeSel}`;
      else if (mode === 'time') cells = `${stepper('w', i, k, st.w || null, '0', wStep, 'kg', '무게')}${stepper('t', i, k, st.t || null, sg.time || tg.time || '', 5, '초', '시간')}${rpeSel}`;
      else cells = `${stepper('w', i, k, st.w ?? null, warm ? '' : (sg.w != null ? sg.w : (mode === 'bw' ? '0' : '')), wStep, 'kg', '무게')}${stepper('r', i, k, st.r ?? null, warm ? '' : (sg.reps || (tg.reps ? tg.reps[0] : '')), 1, '회', '횟수')}${warm ? '<span></span>' : rpeSel}`;
      return `<div class="set-row ${st.done ? 'done' : ''} ${warm ? 'warm' : ''}"><button type="button" class="n ${warm ? 'warm' : ''}" data-act="set-type" data-exi="${i}" data-k="${k}" title="눌러서 워밍업/본 세트 전환">${warm ? 'W' : idx + 1}</button><span class="prev">${prevTxt || '–'}</span>${cells}<button class="done-btn ${st.done ? 'on' : ''}" data-act="set-done" data-exi="${i}" data-k="${k}" aria-label="세트 완료">${ico('check')}</button></div>${prevTxt ? `<div class="prevline">이전 ${prevTxt}</div>` : ''}`;
    }).join('');
    const dir = sg.dir > 0 ? '<span class="dir up">↑ 올리기</span>' : sg.dir < 0 ? '<span class="dir down">↓ 낮추기</span>' : (last ? '<span class="dir">유지</span>' : '');
    const canWarm = mode === 'reps' && ['main', 'secondary'].includes(tg.role) && !ex.sets.some(st => st.type === 'warm') && (sg.w || 0) >= 10;
    const isBar = x.eq.some(g => g.includes('bb') || g.includes('trapbar'));
    const head = mode === 'cardio' ? ['#', '이전', '분', '', 'RPE', ''] : mode === 'time' ? ['#', '이전', 'kg', '초', 'RPE', ''] : ['#', '이전', 'kg', '회', 'RPE', ''];
    return `<section class="excard ${allDone ? 'done' : ''}" data-exi="${i}"><div class="ex-h"><span class="lbl ${ex.label ? 'on' : ''}">${esc(ex.label || (i + 1))}</span><div><button class="name" data-act="ex-info" data-ex="${x.id}">${esc(x.n)}</button><div class="target">${tg.sets ? rxText(tg) : BL.PATTERNS[x.pat] || ''}${tg.rest ? ` · 휴식 ${tg.rest}초` : ''}</div></div><div class="ex-menu"><button class="btn sm" data-act="ex-collapse" data-id="${ex.id}" data-force="1" aria-label="접기">${ico('up')}</button><button class="btn sm" data-act="ex-menu" data-exi="${i}" aria-label="메뉴">${ico('more')}</button></div></div>
      ${pc ? `<div class="banner crit" style="padding:10px 14px"><div><b>오늘 ${esc(pc.site)} 통증 ${pc.pain}/10</b>이 동작은 그 부위를 써요. 가볍게 하거나 메뉴에서 교체·빼기.</div></div>` : ''}
      <div class="sugg-line">${dir}${sg.w != null && mode === 'reps' ? `<b>${sg.w}kg</b>` : ''}<span>${esc(sg.note)}</span></div>
      ${last && last.note ? `<div class="lastnote">지난번 메모: ${esc(last.note)}</div>` : ''}
      <div class="sets"><div class="set-row head"><span>${head[0]}</span><span class="prev">${head[1]}</span><span>${head[2]}</span><span>${head[3]}</span><span>${head[4]}</span><span></span></div>${rows}</div>
      <div class="set-actions"><button class="btn sm" data-act="set-add" data-exi="${i}">${ico('plus')} 세트</button>${workSets.length > 1 ? `<button class="btn sm" data-act="set-remove" data-exi="${i}">${ico('minus')} 세트</button>` : ''}${canWarm ? `<button class="btn sm" data-act="warmup-add" data-exi="${i}">워밍업 추가</button>` : ''}${isBar ? `<button class="btn sm" data-act="plates" data-exi="${i}">원판 계산</button>` : ''}<input class="inp sm ex-note" data-f="note" data-exi="${i}" value="${esc(ex.note || '')}" placeholder="메모 (자세, 느낌)" style="flex:1;min-width:140px"></div></section>`;
  }
  BL.exCard = exCard;

  // ───────── 기록 (달력 + 목록) ─────────
  function calendar() {
    const t = E.today(); const base = S.ui.calMonth || t.slice(0, 7); const [y, mo] = base.split('-').map(Number);
    const first = new Date(y, mo - 1, 1); const startWd = (first.getDay() + 6) % 7; const dim = new Date(y, mo, 0).getDate();
    const cells = []; const prevDim = new Date(y, mo - 1, 0).getDate();
    for (let i = 0; i < startWd; i++) cells.push({ d: E.dstr(new Date(y, mo - 2, prevDim - startWd + 1 + i)), out: true });
    for (let d = 1; d <= dim; d++) cells.push({ d: E.dstr(new Date(y, mo - 1, d)), out: false });
    while (cells.length % 7) cells.push({ d: E.dstr(new Date(y, mo, cells.length - startWd - dim + 1)), out: true });
    const prevM = E.dstr(new Date(y, mo - 2, 1)).slice(0, 7), nextM = E.dstr(new Date(y, mo, 1)).slice(0, 7);
    const inMonth = S.sessions.filter(s => s.status === 'done' && s.date.startsWith(base));
    return `<div class="card"><div class="cal-h"><button class="btn sm" data-act="cal-nav" data-m="${prevM}" aria-label="이전 달">${ico('left')}</button><h2>${y}년 ${mo}월 <span class="small muted" style="font-weight:400">${inMonth.length}세션 · 부하 ${n0(inMonth.reduce((a, s) => a + E.sessionLoad(s), 0))}</span></h2><button class="btn sm" data-act="cal-nav" data-m="${nextM}" aria-label="다음 달" ${nextM > t.slice(0, 7) ? 'disabled' : ''}>${ico('right')}</button></div>
      <div class="cal">${['월', '화', '수', '목', '금', '토', '일'].map(d => `<div class="ch">${d}</div>`).join('')}${cells.map(c => { const ss = S.sessions.filter(s => s.status === 'done' && s.date === c.d); return `<button class="cd ${c.out ? 'out' : ''} ${c.d === t ? 'today' : ''}" data-act="cal-day" data-d="${c.d}" ${ss.length ? '' : 'disabled'}><span>${+c.d.slice(8)}</span><span class="dots">${ss.slice(0, 3).map(s => typeDot(s.type)).join('')}</span></button>`; }).join('')}</div></div>`;
  }
  BL.views.history = function () {
    const f = S.ui.histFilter;
    const list = S.sessions.filter(s => f === 'all' || s.type === f).sort((x, y) => (y.date + (y.endedAt || y.startedAt || '')).localeCompare(x.date + (x.endedAt || x.startedAt || '')));
    const act = list.filter(s => s.status === 'active'); const done = list.filter(s => s.status === 'done');
    const out = [subnav('기록', `<div class="seg">${[['all', '전체'], ['strength', '근력'], ['tennis', '테니스'], ['cond', '유산소']].map(([k, n]) => `<button class="${f === k ? 'on' : ''}" data-act="hist-filter" data-f="${k}">${n}</button>`).join('')}</div>`), BL.notes.loadingNote(), calendar()];
    if (act.length) out.push(`<div class="card"><div class="card-h"><h2>진행 중·미완료</h2></div><div class="slist">${act.map(s => `<button class="srow" data-act="session-open" data-id="${s.id}"><span class="dt">${fmtShort(s.date)}</span><span><span class="ti">${typeDot(s.type)}${esc(s.title || '운동')}<span class="tag warn">미완료</span></span><span class="me">${fmtTime(s.startedAt)} 시작 · ${E.workSets(s).length}세트 입력됨</span></span><span class="st">열기</span></button>`).join('')}</div></div>`);
    if (!done.length) out.push(`<div class="empty"><div>기록이 없어요.</div><div class="xs">운동 탭에서 세션을 시작하거나, 테니스·유산소를 빠르게 기록할 수 있어요.</div><button class="btn primary" data-act="go" data-v="train">${ico('play')} 운동 시작</button></div>`);
    else {
      const byWeek = {};
      done.forEach(s => { const ws = E.weekStart(s.date); (byWeek[ws] = byWeek[ws] || []).push(s); });
      Object.keys(byWeek).sort().reverse().forEach(ws => {
        const ss = byWeek[ws]; const L = ss.reduce((a, s) => a + E.sessionLoad(s), 0);
        out.push(`<div class="card"><div class="card-h"><h2>${fmtShort(ws)} ~ ${fmtShort(E.addDays(ws, 6))} 주</h2><span class="small muted">${ss.length}세션 · 부하 ${n0(L)}</span></div><div class="slist">${ss.map(sessionRow).join('')}</div></div>`);
      });
    }
    return out.join('');
  };

  BL.sessionDetail = function (s) {
    const prs = s.type === 'strength' ? E.sessionPRs(s, S.sessions) : [];
    const exs = (s.exercises || []).map(ex => { const x = X[ex.exId]; const sets = (ex.sets || []).filter(st => E.isWork(st)); if (!sets.length) return ''; return `<div class="pitem" style="grid-template-columns:minmax(0,1fr) auto"><span style="font-weight:600">${esc(x ? x.n : ex.exId)}${prs.some(p => p.exId === ex.exId) ? ` <span class="tag acc">${ico('trophy')} PR</span>` : ''}</span><span class="rx">${sets.map(st => st.t && x && x.mode === 'cardio' ? `${Math.round(st.t / 60)}분@${st.rpe || '-'}` : st.t ? `${st.t}초` : `${st.w || 0}×${st.r}${st.rpe ? '@' + st.rpe : ''}`).join(' · ')}</span></div>${ex.note ? `<div class="xs muted" style="padding-left:2px">${esc(ex.note)}</div>` : ''}`; }).join('');
    const dur = s.durationMin || (s.startedAt && s.endedAt ? Math.round((new Date(s.endedAt) - new Date(s.startedAt)) / 60000) : null);
    return `${BL.sheetHead(s.title || TYPE_N[s.type] || '운동', `${fmtD(s.date)}${s.startedAt ? ' · ' + fmtTime(s.startedAt) : ''}${s.status === 'active' ? ' · 미완료' : ''}`)}
      <div class="row" style="gap:20px">${dur ? `<div><div class="xs muted">시간</div><div class="num" style="font-weight:600">${dur}분</div></div>` : ''}<div><div class="xs muted">세션 RPE</div><div class="num" style="font-weight:600">${s.sRPE || '–'}</div></div><div><div class="xs muted">부하</div><div class="num" style="font-weight:600">${n0(E.sessionLoad(s))}</div></div>${s.type === 'strength' ? `<div><div class="xs muted">볼륨</div><div class="num" style="font-weight:600">${n0(E.tonnage(s))}kg</div></div>` : ''}${s.serves ? `<div><div class="xs muted">서브</div><div class="num" style="font-weight:600">${s.serves}개</div></div>` : ''}<div><div class="xs muted">통증 전→후</div><div class="num" style="font-weight:600">${s.painPre ?? '–'} → ${s.painPost ?? '–'}</div></div></div>
      ${exs ? `<div class="stack-s">${exs}</div>` : ''}
      ${prs.length ? `<div class="summary-prs">${prs.map(p => `<div class="pr">${ico('trophy')} ${esc(X[p.exId]?.n)} <b>${p.kind === 'e1rm' ? `e1RM ${n1(p.value)}kg (${p.w}×${p.r})` : p.kind === 'reps' ? `${p.value}회` : `${p.value}초`}</b></div>`).join('')}</div>` : ''}
      ${s.notes ? `<p class="small">${esc(s.notes)}</p>` : ''}
      <div class="row">${s.status === 'active' ? `<button class="btn primary" data-act="session-resume" data-id="${s.id}">${ico('play')} 이어서 하기</button>` : s.type === 'strength' ? `<button class="btn" data-act="session-repeat" data-id="${s.id}">같은 운동 다시 하기</button><button class="btn" data-act="session-edit" data-id="${s.id}">${ico('edit')} 기록 수정</button>` : `<button class="btn" data-act="quicklog-edit" data-id="${s.id}">${ico('edit')} 수정</button>`}<button class="btn danger" data-act="session-delete" data-id="${s.id}">${ico('trash')} 삭제</button></div>`;
  };
})(window.BL);
